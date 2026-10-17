-- Migration 018: Anti-Gaming Core
-- Implements:
-- 1. audit_logs (append-only ledger for all privileged actions)
-- 2. flags (unified flags table for anti-gaming statistical and rate-limit detections)
-- 3. action_rate_limits & check_action_rate_limit stored procedure
-- 4. app_settings defaults for caps, rate limits, and detection jobs
-- 5. Enhanced award_xp with overall daily ceiling and category ceilings (exempting manual faculty awards)
-- 6. Enhanced void_xp with audit_logs integration and idempotent double-void safety

-- ==============================================================================
-- 1. AUDIT LOGS TABLE (Append-Only)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.audit_logs (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Read policy: Faculty and Admin only. Students cannot read audit_logs.
DROP POLICY IF EXISTS "audit_logs_read_faculty_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_read_faculty_admin" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.get_my_role() IN ('faculty', 'admin'));

-- Insert policy: Service role and authenticated faculty/admin
DROP POLICY IF EXISTS "audit_logs_insert_faculty_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_faculty_admin" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() IN ('faculty', 'admin'));

-- Immutability Trigger: prevent UPDATE and DELETE on audit_logs
CREATE OR REPLACE FUNCTION public.prevent_audit_logs_tamper()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.role() = 'service_role' OR current_setting('app.allow_audit_cleanup', true) = 'on' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
      RETURN NEW;
    END IF;
  END IF;

  RAISE EXCEPTION 'Immutable audit log violation: UPDATE and DELETE are strictly prohibited on audit_logs.';
END;
$$;

DROP TRIGGER IF EXISTS audit_logs_immutable_trigger ON public.audit_logs;
CREATE TRIGGER audit_logs_immutable_trigger
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_logs_tamper();

REVOKE UPDATE, DELETE, TRUNCATE ON public.audit_logs FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_audit_logs_tamper() FROM PUBLIC, anon, authenticated;

-- ==============================================================================
-- 2. FLAGS TABLE (Unified Anti-Gaming Detections)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('spike', 'answer_sharing', 'win_trading', 'rate_limit')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  second_student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed', 'confirmed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT
);

-- Unique index to prevent duplicate flags per window and student/pair
CREATE UNIQUE INDEX IF NOT EXISTS idx_flags_unique_dedup ON public.flags (
  kind,
  student_id,
  COALESCE(second_student_id, '00000000-0000-0000-0000-000000000000'::uuid),
  window_start,
  window_end
);

CREATE INDEX IF NOT EXISTS idx_flags_student ON public.flags (student_id);
CREATE INDEX IF NOT EXISTS idx_flags_status ON public.flags (status);
CREATE INDEX IF NOT EXISTS idx_flags_kind ON public.flags (kind);

-- Enable RLS
ALTER TABLE public.flags ENABLE ROW LEVEL SECURITY;

-- Read policy: Faculty and Admin only. Students cannot read flags.
DROP POLICY IF EXISTS "flags_read_faculty_admin" ON public.flags;
CREATE POLICY "flags_read_faculty_admin" ON public.flags
  FOR SELECT TO authenticated
  USING (public.get_my_role() IN ('faculty', 'admin'));

-- Write policy: Faculty and Admin only can update flags.
DROP POLICY IF EXISTS "flags_write_faculty_admin" ON public.flags;
CREATE POLICY "flags_write_faculty_admin" ON public.flags
  FOR ALL TO authenticated
  USING (public.get_my_role() IN ('faculty', 'admin'))
  WITH CHECK (public.get_my_role() IN ('faculty', 'admin'));

-- ==============================================================================
-- 3. ACTION RATE LIMITS TABLE & STORED PROCEDURE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.action_rate_limits (
  id BIGSERIAL PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  action_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_action_rate_limits_window ON public.action_rate_limits (student_id, action_name, created_at);

ALTER TABLE public.action_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.action_rate_limits FROM public, anon, authenticated;

-- Rate Limit Stored Procedure
CREATE OR REPLACE FUNCTION public.check_action_rate_limit(
  p_student_id UUID,
  p_action_name TEXT,
  p_max_per_minute INT DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
  v_recent_flag_exists BOOLEAN;
BEGIN
  -- Count requests in the preceding 60 seconds
  SELECT COUNT(*) INTO v_count
  FROM public.action_rate_limits
  WHERE student_id = p_student_id
    AND action_name = p_action_name
    AND created_at >= (now() - INTERVAL '1 minute');

  IF v_count >= p_max_per_minute THEN
    -- Check if a rate_limit flag exists for this student in the last 1 hour
    SELECT EXISTS (
      SELECT 1 FROM public.flags
      WHERE student_id = p_student_id
        AND kind = 'rate_limit'
        AND created_at >= (now() - INTERVAL '1 hour')
    ) INTO v_recent_flag_exists;

    IF NOT v_recent_flag_exists THEN
      INSERT INTO public.flags (
        kind,
        severity,
        student_id,
        window_start,
        window_end,
        evidence,
        status
      ) VALUES (
        'rate_limit',
        'low',
        p_student_id,
        now() - INTERVAL '1 minute',
        now(),
        jsonb_build_object(
          'action_name', p_action_name,
          'requests_in_minute', v_count + 1,
          'limit_per_minute', p_max_per_minute
        ),
        'open'
      ) ON CONFLICT DO NOTHING;
    END IF;

    RETURN jsonb_build_object(
      'allowed', false,
      'retry_after_seconds', 60,
      'current_count', v_count,
      'limit', p_max_per_minute
    );
  END IF;

  -- Record request
  INSERT INTO public.action_rate_limits (student_id, action_name, created_at)
  VALUES (p_student_id, p_action_name, now());

  -- Periodically purge rows older than 1 hour (probabilistic cleanup)
  IF random() < 0.05 THEN
    DELETE FROM public.action_rate_limits WHERE created_at < (now() - INTERVAL '1 hour');
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_action_rate_limit(UUID, TEXT, INT) FROM PUBLIC, anon, authenticated;

-- ==============================================================================
-- 4. APP SETTINGS DEFAULTS FOR ANTI-GAMING
-- ==============================================================================
INSERT INTO public.app_settings (key, value, description)
VALUES
  ('daily_xp_ceiling', '1000'::jsonb, 'Overall maximum XP a student can earn per calendar day in Asia/Kolkata (excluding manual faculty awards)'),
  ('daily_game_xp_ceiling', '350'::jsonb, 'Maximum game XP (duels, battles, concept match) per student per calendar day in Asia/Kolkata'),
  ('daily_learning_xp_ceiling', '800'::jsonb, 'Maximum learning XP (daily quizzes, streaks, assignments, quests) per student per day in Asia/Kolkata'),
  ('rate_limits_config', '{"quiz_answer": 20, "duel_action": 15, "concept_match": 15, "battle_submit": 30, "search": 30}'::jsonb, 'Per-student requests per minute allowed on sensitive server actions'),
  ('spike_min_xp', '200'::jsonb, 'Minimum daily XP required before a student is eligible for spike detection'),
  ('spike_ratio_threshold', '3.0'::jsonb, 'Multiple of 14-day active average required to trigger an XP spike flag'),
  ('spike_min_baseline_days', '5'::jsonb, 'Minimum distinct active history days required to calculate spike baseline ratio'),
  ('answer_sharing_min_common', '10'::jsonb, 'Minimum shared questions answered between a pair to evaluate answer sharing'),
  ('answer_sharing_wrong_threshold', '0.6'::jsonb, 'Minimum proportion of identical WRONG choices to flag answer sharing'),
  ('win_trading_max_duels_window', '6'::jsonb, 'Maximum duels between same pair within window before triggering win-trading evaluation')
ON CONFLICT (key) DO NOTHING;

-- ==============================================================================
-- 5. ENHANCED award_xp WITH CEILINGS AND CATEGORY LIMITS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.award_xp(
  p_student_id UUID,
  p_action_type TEXT,
  p_reference_id TEXT,
  p_extra_units INT DEFAULT 0,
  p_actor UUID DEFAULT NULL,
  p_custom_timestamp TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule RECORD;
  v_student_exists BOOLEAN;
  v_current_ts TIMESTAMPTZ;
  v_ist_date DATE;
  v_daily_count INT;
  v_xp_amount INT;
  v_inserted_id UUID;
  v_new_total BIGINT;
  v_is_manual_faculty_award BOOLEAN := false;

  -- Ceiling thresholds
  v_daily_xp_ceiling INT := 1000;
  v_daily_game_xp_ceiling INT := 350;
  v_daily_learning_xp_ceiling INT := 800;

  -- Current totals today
  v_today_total_xp BIGINT := 0;
  v_today_game_xp BIGINT := 0;
  v_today_learning_xp BIGINT := 0;

  v_is_game_action BOOLEAN;
BEGIN
  -- 1. Check if student exists
  SELECT EXISTS(SELECT 1 FROM public.students WHERE id = p_student_id) INTO v_student_exists;
  IF NOT v_student_exists THEN
    RETURN jsonb_build_object(
      'status', 'student_not_found',
      'xp_awarded', 0,
      'new_total', 0,
      'event_id', NULL
    );
  END IF;

  -- 2. Lookup rule
  SELECT * INTO v_rule
  FROM public.xp_rules
  WHERE action_type = p_action_type;

  IF NOT FOUND THEN
    SELECT COALESCE(SUM(xp_amount), 0)::BIGINT INTO v_new_total
    FROM public.xp_events WHERE student_id = p_student_id AND status = 'valid';

    RETURN jsonb_build_object(
      'status', 'rule_not_found',
      'xp_awarded', 0,
      'new_total', v_new_total,
      'event_id', NULL
    );
  END IF;

  IF NOT v_rule.active THEN
    SELECT COALESCE(SUM(xp_amount), 0)::BIGINT INTO v_new_total
    FROM public.xp_events WHERE student_id = p_student_id AND status = 'valid';

    RETURN jsonb_build_object(
      'status', 'rule_inactive',
      'xp_awarded', 0,
      'new_total', v_new_total,
      'event_id', NULL
    );
  END IF;

  -- 3. Concurrency serialization lock (student_id + action_type)
  PERFORM pg_advisory_xact_lock(
    hashtext(p_student_id::text),
    hashtext(p_action_type)
  );

  -- 4. Calculate calendar date in Asia/Kolkata
  v_current_ts := COALESCE(p_custom_timestamp, now());
  v_ist_date := (v_current_ts AT TIME ZONE 'Asia/Kolkata')::date;

  -- 5. Per-action Daily limit check (Asia/Kolkata day cut-off)
  IF v_rule.daily_limit IS NOT NULL THEN
    SELECT COUNT(*) INTO v_daily_count
    FROM public.xp_events
    WHERE student_id = p_student_id
      AND action_type = p_action_type
      AND status = 'valid'
      AND (created_at AT TIME ZONE 'Asia/Kolkata')::date = v_ist_date;

    IF v_daily_count >= v_rule.daily_limit THEN
      SELECT COALESCE(SUM(xp_amount), 0)::BIGINT INTO v_new_total
      FROM public.xp_events WHERE student_id = p_student_id AND status = 'valid';

      RETURN jsonb_build_object(
        'status', 'limit_reached',
        'reason', 'action_daily_limit',
        'xp_awarded', 0,
        'new_total', v_new_total,
        'event_id', NULL
      );
    END IF;
  END IF;

  -- 6. Calculate XP amount to award
  v_xp_amount := v_rule.base_xp + (v_rule.extra_xp * GREATEST(0, COALESCE(p_extra_units, 0)));

  -- 7. Check if this is an authorized manual faculty or admin award
  IF p_actor IS NOT NULL AND p_actor <> p_student_id THEN
    SELECT (role IN ('faculty', 'admin'))
    INTO v_is_manual_faculty_award
    FROM public.profiles
    WHERE id = p_actor;
  END IF;

  -- 8. Enforce Overall and Category Daily Ceilings (Exempting manual faculty awards)
  IF NOT COALESCE(v_is_manual_faculty_award, false) THEN
    -- Read configurable ceilings from app_settings
    SELECT COALESCE((value::text)::int, 1000) INTO v_daily_xp_ceiling
    FROM public.app_settings WHERE key = 'daily_xp_ceiling';

    SELECT COALESCE((value::text)::int, 350) INTO v_daily_game_xp_ceiling
    FROM public.app_settings WHERE key = 'daily_game_xp_ceiling';

    SELECT COALESCE((value::text)::int, 800) INTO v_daily_learning_xp_ceiling
    FROM public.app_settings WHERE key = 'daily_learning_xp_ceiling';

    -- Compute student's valid XP earned today in Asia/Kolkata
    SELECT COALESCE(SUM(xp_amount), 0)::BIGINT INTO v_today_total_xp
    FROM public.xp_events
    WHERE student_id = p_student_id
      AND status = 'valid'
      AND (created_at AT TIME ZONE 'Asia/Kolkata')::date = v_ist_date;

    -- Check overall daily ceiling
    IF (v_today_total_xp + v_xp_amount) > v_daily_xp_ceiling THEN
      SELECT COALESCE(SUM(xp_amount), 0)::BIGINT INTO v_new_total
      FROM public.xp_events WHERE student_id = p_student_id AND status = 'valid';

      RETURN jsonb_build_object(
        'status', 'limit_reached',
        'reason', 'daily_xp_ceiling',
        'ceiling', v_daily_xp_ceiling,
        'today_xp', v_today_total_xp,
        'xp_awarded', 0,
        'new_total', v_new_total,
        'event_id', NULL
      );
    END IF;

    -- Check category ceiling
    v_is_game_action := p_action_type IN (
      'BATTLE_PARTICIPATION', 'BATTLE_WIN', 'CONCEPT_MATCH', 'DUEL_PARTICIPATION', 'DUEL_WIN'
    );

    IF v_is_game_action THEN
      SELECT COALESCE(SUM(xp_amount), 0)::BIGINT INTO v_today_game_xp
      FROM public.xp_events
      WHERE student_id = p_student_id
        AND status = 'valid'
        AND action_type IN ('BATTLE_PARTICIPATION', 'BATTLE_WIN', 'CONCEPT_MATCH', 'DUEL_PARTICIPATION', 'DUEL_WIN')
        AND (created_at AT TIME ZONE 'Asia/Kolkata')::date = v_ist_date;

      IF (v_today_game_xp + v_xp_amount) > v_daily_game_xp_ceiling THEN
        SELECT COALESCE(SUM(xp_amount), 0)::BIGINT INTO v_new_total
        FROM public.xp_events WHERE student_id = p_student_id AND status = 'valid';

        RETURN jsonb_build_object(
          'status', 'limit_reached',
          'reason', 'daily_game_xp_ceiling',
          'ceiling', v_daily_game_xp_ceiling,
          'today_game_xp', v_today_game_xp,
          'xp_awarded', 0,
          'new_total', v_new_total,
          'event_id', NULL
        );
      END IF;
    ELSE
      SELECT COALESCE(SUM(xp_amount), 0)::BIGINT INTO v_today_learning_xp
      FROM public.xp_events
      WHERE student_id = p_student_id
        AND status = 'valid'
        AND action_type NOT IN ('BATTLE_PARTICIPATION', 'BATTLE_WIN', 'CONCEPT_MATCH', 'DUEL_PARTICIPATION', 'DUEL_WIN')
        AND (created_at AT TIME ZONE 'Asia/Kolkata')::date = v_ist_date;

      IF (v_today_learning_xp + v_xp_amount) > v_daily_learning_xp_ceiling THEN
        SELECT COALESCE(SUM(xp_amount), 0)::BIGINT INTO v_new_total
        FROM public.xp_events WHERE student_id = p_student_id AND status = 'valid';

        RETURN jsonb_build_object(
          'status', 'limit_reached',
          'reason', 'daily_learning_xp_ceiling',
          'ceiling', v_daily_learning_xp_ceiling,
          'today_learning_xp', v_today_learning_xp,
          'xp_awarded', 0,
          'new_total', v_new_total,
          'event_id', NULL
        );
      END IF;
    END IF;
  END IF;

  -- 9. Insert into ledger (gracefully handle duplicate reference via ON CONFLICT)
  INSERT INTO public.xp_events (
    student_id,
    action_type,
    xp_amount,
    reference_id,
    status,
    awarded_by,
    created_at
  ) VALUES (
    p_student_id,
    p_action_type,
    v_xp_amount,
    p_reference_id,
    'valid',
    p_actor,
    v_current_ts
  )
  ON CONFLICT (student_id, action_type, reference_id) DO NOTHING
  RETURNING id INTO v_inserted_id;

  -- If duplicate was blocked
  IF v_inserted_id IS NULL THEN
    SELECT COALESCE(SUM(xp_amount), 0)::BIGINT INTO v_new_total
    FROM public.xp_events WHERE student_id = p_student_id AND status = 'valid';

    RETURN jsonb_build_object(
      'status', 'duplicate',
      'xp_awarded', 0,
      'new_total', v_new_total,
      'event_id', NULL
    );
  END IF;

  -- 10. Compute updated total XP
  SELECT COALESCE(SUM(xp_amount), 0)::BIGINT INTO v_new_total
  FROM public.xp_events WHERE student_id = p_student_id AND status = 'valid';

  RETURN jsonb_build_object(
    'status', 'awarded',
    'xp_awarded', v_xp_amount,
    'new_total', v_new_total,
    'event_id', v_inserted_id
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.award_xp FROM PUBLIC, anon, authenticated;

-- ==============================================================================
-- 6. ENHANCED void_xp WITH AUDIT_LOGS INTEGRATION AND IDEMPOTENCY
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.void_xp(
  p_event_id UUID,
  p_reason TEXT,
  p_actor UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event RECORD;
  v_new_total BIGINT;
BEGIN
  -- Validation: void reason is mandatory and cannot be blank
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Validation error: Void reason is required and cannot be empty.';
  END IF;

  SELECT * INTO v_event
  FROM public.xp_events
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'event_not_found',
      'event_id', p_event_id,
      'new_total', 0
    );
  END IF;

  -- If already voided, return harmlessly without re-writing or failing
  IF v_event.status = 'voided' THEN
    SELECT COALESCE(SUM(xp_amount), 0)::BIGINT INTO v_new_total
    FROM public.xp_events
    WHERE student_id = v_event.student_id AND status = 'valid';

    RETURN jsonb_build_object(
      'status', 'already_voided',
      'event_id', p_event_id,
      'student_id', v_event.student_id,
      'new_total', v_new_total
    );
  END IF;

  -- Update status to voided (original row stays to preserve ledger history)
  UPDATE public.xp_events
  SET
    status = 'voided',
    void_reason = trim(p_reason)
  WHERE id = p_event_id;

  -- Write audit log record
  INSERT INTO public.audit_logs (
    actor_id,
    action,
    target_type,
    target_id,
    reason,
    details
  ) VALUES (
    p_actor,
    'void_xp',
    'xp_event',
    p_event_id::text,
    trim(p_reason),
    jsonb_build_object(
      'student_id', v_event.student_id,
      'action_type', v_event.action_type,
      'xp_amount', v_event.xp_amount,
      'reference_id', v_event.reference_id
    )
  );

  -- Recalculate total valid XP
  SELECT COALESCE(SUM(xp_amount), 0)::BIGINT INTO v_new_total
  FROM public.xp_events
  WHERE student_id = v_event.student_id AND status = 'valid';

  RETURN jsonb_build_object(
    'status', 'voided',
    'event_id', p_event_id,
    'student_id', v_event.student_id,
    'new_total', v_new_total
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.void_xp FROM PUBLIC, anon, authenticated;
