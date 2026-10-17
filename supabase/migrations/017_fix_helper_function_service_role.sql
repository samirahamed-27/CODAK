-- Migration 017: Refine get_student_xp and prevent_xp_events_tamper for service_role and maintenance
-- Allows service_role and direct administrative connections to execute get_student_xp and run test cleanups

CREATE OR REPLACE FUNCTION public.get_student_xp(p_student_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_id UUID;
  v_is_privileged BOOLEAN := false;
  v_xp BIGINT;
BEGIN
  -- Service role and direct administrative connections bypass caller checks
  IF auth.role() = 'service_role' OR auth.role() IS NULL THEN
    SELECT COALESCE(SUM(xp_amount), 0)
    INTO v_xp
    FROM public.xp_events
    WHERE student_id = p_student_id
      AND status = 'valid';
    RETURN v_xp;
  END IF;

  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: Authentication required to view student XP total.';
  END IF;

  -- Check if caller is faculty or admin
  SELECT (role IN ('faculty', 'admin'))
  INTO v_is_privileged
  FROM public.profiles
  WHERE id = v_caller_id;

  -- Caller can only view their own XP unless faculty/admin
  IF v_caller_id <> p_student_id AND NOT COALESCE(v_is_privileged, false) THEN
    RAISE EXCEPTION 'Access denied: You may only view your own XP total.';
  END IF;

  SELECT COALESCE(SUM(xp_amount), 0)
  INTO v_xp
  FROM public.xp_events
  WHERE student_id = p_student_id
    AND status = 'valid';

  RETURN v_xp;
END;
$$;

-- Immutability trigger refinement
CREATE OR REPLACE FUNCTION public.prevent_xp_events_tamper()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Allow service role or explicit database maintenance session flag
  IF auth.role() = 'service_role' OR current_setting('app.allow_ledger_cleanup', true) = 'on' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
      RETURN NEW;
    END IF;
  END IF;

  RAISE EXCEPTION 'Immutable ledger violation: xp_events is strictly append-only. Direct UPDATE and DELETE are prohibited.';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prevent_xp_events_tamper() FROM PUBLIC, anon, authenticated;
