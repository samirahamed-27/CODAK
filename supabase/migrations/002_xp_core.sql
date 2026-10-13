-- ==============================================================================
-- PHASE 1 MIGRATION: 002_xp_core.sql
-- Gamified Learning Platform - XP Core Engine, History, Rules Audit & Functions
-- ==============================================================================

-- 1. ADD awarded_by TO xp_events
ALTER TABLE public.xp_events
ADD COLUMN IF NOT EXISTS awarded_by UUID NULL REFERENCES auth.users(id);

-- ==============================================================================
-- 2. CREATE xp_rules_history AUDIT TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.xp_rules_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  old_base_xp INT NOT NULL,
  new_base_xp INT NOT NULL,
  old_extra_xp INT NOT NULL,
  new_extra_xp INT NOT NULL,
  old_daily_limit INT NULL,
  new_daily_limit INT NULL,
  old_active BOOLEAN NOT NULL,
  new_active BOOLEAN NOT NULL,
  changed_by UUID NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS on xp_rules_history: Only Admin can read; no public write policies
ALTER TABLE public.xp_rules_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "xp_rules_history_select_admin" ON public.xp_rules_history;
CREATE POLICY "xp_rules_history_select_admin"
ON public.xp_rules_history
FOR SELECT
TO authenticated
USING (public.get_my_role() = 'admin');

-- ==============================================================================
-- 3. AUDIT TRIGGER ON xp_rules (LOG CHANGES & FREEZE action_type)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.log_xp_rule_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Strict Rule: action_type is an immutable identifier
  IF NEW.action_type IS DISTINCT FROM OLD.action_type THEN
    RAISE EXCEPTION 'Security violation: action_type is immutable and cannot be modified.';
  END IF;

  -- Record audit trail row into xp_rules_history
  INSERT INTO public.xp_rules_history (
    rule_id,
    action_type,
    old_base_xp,
    new_base_xp,
    old_extra_xp,
    new_extra_xp,
    old_daily_limit,
    new_daily_limit,
    old_active,
    new_active,
    changed_by,
    changed_at
  ) VALUES (
    OLD.id,
    OLD.action_type,
    OLD.base_xp,
    NEW.base_xp,
    OLD.extra_xp,
    NEW.extra_xp,
    OLD.daily_limit,
    NEW.daily_limit,
    OLD.active,
    NEW.active,
    auth.uid(),
    now()
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_xp_rule_change ON public.xp_rules;
CREATE TRIGGER trg_log_xp_rule_change
BEFORE UPDATE ON public.xp_rules
FOR EACH ROW
EXECUTE FUNCTION public.log_xp_rule_change();

-- Allow Admins to UPDATE xp_rules (display_name, base_xp, extra_xp, daily_limit, active)
DROP POLICY IF EXISTS "xp_rules_update_admin" ON public.xp_rules;
CREATE POLICY "xp_rules_update_admin"
ON public.xp_rules
FOR UPDATE
TO authenticated
USING (public.get_my_role() = 'admin')
WITH CHECK (public.get_my_role() = 'admin');

-- ==============================================================================
-- 4. SEED NEW RULE: HACKATHON_PARTICIPATION
-- ==============================================================================
INSERT INTO public.xp_rules (action_type, display_name, base_xp, extra_xp, daily_limit, active)
VALUES ('HACKATHON_PARTICIPATION', 'Hackathon Participation', 40, 0, NULL, TRUE)
ON CONFLICT (action_type) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  base_xp = EXCLUDED.base_xp,
  extra_xp = EXCLUDED.extra_xp,
  daily_limit = EXCLUDED.daily_limit,
  active = EXCLUDED.active;

-- ==============================================================================
-- 5. TOTAL XP HELPER FUNCTION & SECURE VIEW
-- ==============================================================================

-- Helper Function: Returns total valid XP for a student
CREATE OR REPLACE FUNCTION public.get_student_xp(p_student_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_caller_role TEXT;
  v_total BIGINT;
BEGIN
  -- Security check: student can only query own total; faculty & admin can query any
  IF auth.uid() IS NOT NULL THEN
    v_caller_role := public.get_my_role();
    IF auth.uid() <> p_student_id AND COALESCE(v_caller_role, '') NOT IN ('faculty', 'admin') THEN
      RAISE EXCEPTION 'Access denied: You are not authorized to view another student''s XP total.';
    END IF;
  END IF;

  SELECT COALESCE(SUM(xp_amount), 0)::BIGINT INTO v_total
  FROM public.xp_events
  WHERE student_id = p_student_id
    AND status = 'valid';

  RETURN v_total;
END;
$$;

-- Secure View: Computes total XP and valid event count with security_invoker = true
CREATE OR REPLACE VIEW public.student_xp_totals
WITH (security_invoker = true)
AS
SELECT
  s.id AS student_id,
  COALESCE(SUM(e.xp_amount) FILTER (WHERE e.status = 'valid'), 0)::BIGINT AS total_xp,
  COUNT(e.id) FILTER (WHERE e.status = 'valid')::BIGINT AS valid_events_count
FROM public.students s
LEFT JOIN public.xp_events e ON s.id = e.student_id
GROUP BY s.id;

-- ==============================================================================
-- 6. STORED PROCEDURE: award_xp
-- ==============================================================================
-- ONE function, SECURITY DEFINER, ONE transaction.
-- Callable ONLY by server code with the Service Role key.
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

  -- 5. Daily limit check (Asia/Kolkata day cut-off)
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
        'xp_awarded', 0,
        'new_total', v_new_total,
        'event_id', NULL
      );
    END IF;
  END IF;

  -- 6. Calculate XP amount = base_xp + extra_xp * extra_units
  v_xp_amount := v_rule.base_xp + (v_rule.extra_xp * GREATEST(0, COALESCE(p_extra_units, 0)));

  -- 7. Insert into ledger (gracefully handle duplicate reference via ON CONFLICT)
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

  -- 8. Compute updated total XP
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

-- Security Lockdown: Revoke execute from public/anon/authenticated
REVOKE EXECUTE ON FUNCTION public.award_xp FROM public, anon, authenticated;

-- ==============================================================================
-- 7. STORED PROCEDURE: void_xp
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

  -- Update status to voided (the row and its reference_id remain to preserve audit trail)
  UPDATE public.xp_events
  SET
    status = 'voided',
    void_reason = trim(p_reason)
  WHERE id = p_event_id;

  -- Recalculate total XP
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

-- Security Lockdown: Revoke execute from public/anon/authenticated
REVOKE EXECUTE ON FUNCTION public.void_xp FROM public, anon, authenticated;
