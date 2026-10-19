-- Migration 028: Enforce Daily Practice Cap Inside award_xp Procedure
-- Atomically caps practice problem XP to daily_practice_xp_cap (default 40 XP in Asia/Kolkata)

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
  v_daily_practice_cap INT := 40;

  -- Current totals today
  v_today_total_xp BIGINT := 0;
  v_today_game_xp BIGINT := 0;
  v_today_learning_xp BIGINT := 0;
  v_today_practice_xp BIGINT := 0;

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

  -- 8.5. Enforce Daily Practice XP Cap for coding practice solves
  IF p_action_type IN ('PRACTICE_EASY', 'PRACTICE_MEDIUM', 'PRACTICE_HARD', 'PRACTICE_SOLVE') THEN
    SELECT COALESCE((value::text)::int, 40) INTO v_daily_practice_cap
    FROM public.app_settings WHERE key = 'daily_practice_xp_cap';

    SELECT COALESCE(SUM(xp_amount), 0)::BIGINT INTO v_today_practice_xp
    FROM public.xp_events
    WHERE student_id = p_student_id
      AND status = 'valid'
      AND action_type IN ('PRACTICE_EASY', 'PRACTICE_MEDIUM', 'PRACTICE_HARD', 'PRACTICE_SOLVE')
      AND (created_at AT TIME ZONE 'Asia/Kolkata')::date = v_ist_date;

    IF v_today_practice_xp >= v_daily_practice_cap THEN
      SELECT COALESCE(SUM(xp_amount), 0)::BIGINT INTO v_new_total
      FROM public.xp_events WHERE student_id = p_student_id AND status = 'valid';

      RETURN jsonb_build_object(
        'status', 'limit_reached',
        'reason', 'daily_practice_xp_cap',
        'ceiling', v_daily_practice_cap,
        'today_practice_xp', v_today_practice_xp,
        'xp_awarded', 0,
        'new_total', v_new_total,
        'event_id', NULL
      );
    END IF;

    -- Partially cap v_xp_amount to the remaining allowance
    v_xp_amount := LEAST(v_xp_amount, (v_daily_practice_cap - v_today_practice_xp)::int);
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
