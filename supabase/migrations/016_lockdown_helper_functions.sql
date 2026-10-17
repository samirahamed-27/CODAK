-- ==============================================================================
-- PHASE 5 MIGRATION: 016_lockdown_helper_functions.sql
-- Restricts get_student_xp and get_my_role execution grants, enforces strict
-- caller validation on get_student_xp, and adds tamper-prevention trigger on xp_events.
-- ==============================================================================

-- 1. HARDEN get_student_xp: STRICT CALLER RESTRICTION & REVOKE ANON
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
  -- Security check: Caller MUST be authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Access denied: Authentication required to view student XP total.';
  END IF;

  v_caller_role := public.get_my_role();

  -- Students can only query their own XP; faculty and admin can query any student
  IF auth.uid() <> p_student_id AND COALESCE(v_caller_role, '') NOT IN ('faculty', 'admin') THEN
    RAISE EXCEPTION 'Access denied: You are not authorized to view another student''s XP total.';
  END IF;

  SELECT COALESCE(SUM(xp_amount), 0)::BIGINT INTO v_total
  FROM public.xp_events
  WHERE student_id = p_student_id
    AND status = 'valid';

  RETURN v_total;
END;
$$;

-- Revoke execute from public and anon, allow authenticated and service_role
REVOKE EXECUTE ON FUNCTION public.get_student_xp(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_student_xp(UUID) TO authenticated, service_role, postgres;

-- 2. HARDEN get_my_role: REVOKE EXECUTE FROM ANON
REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated, service_role, postgres;

-- 3. ENFORCE IMMUTABLE LEDGER ON xp_events: TAMPER PREVENTION TRIGGER & REVOKE WRITE
CREATE OR REPLACE FUNCTION public.prevent_xp_events_tamper()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RAISE EXCEPTION 'Immutable ledger violation: xp_events is strictly append-only. Direct UPDATE and DELETE are prohibited.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_xp_events_tamper ON public.xp_events;
CREATE TRIGGER trg_prevent_xp_events_tamper
BEFORE UPDATE OR DELETE ON public.xp_events
FOR EACH ROW
EXECUTE FUNCTION public.prevent_xp_events_tamper();

-- Revoke execute from public/anon/authenticated on trigger function
REVOKE EXECUTE ON FUNCTION public.prevent_xp_events_tamper() FROM PUBLIC, anon, authenticated;

-- Revoke all write/delete grants from anon and authenticated on xp_events
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.xp_events FROM anon, authenticated;
