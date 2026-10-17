-- ==============================================================================
-- PHASE 4 AUDIT MIGRATION: 015_audit_fixes.sql
-- Fixes security definer grants, restores canonical XP rules, and adds missing hot indexes.
-- ==============================================================================

-- 1. SECURITY FIX: Revoke execute on submit_battle_answer from public/anon/authenticated.
-- Submissions are routed strictly through the server action (using service_role).
REVOKE EXECUTE ON FUNCTION public.submit_battle_answer(UUID, UUID, UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_battle_answer(UUID, UUID, UUID, TEXT, UUID) TO service_role, postgres;

-- 2. HOT INDEXES: Accelerate daily cap evaluation, weekly leaderboards, and battle score lookups
CREATE INDEX IF NOT EXISTS idx_xp_events_student_created ON public.xp_events(student_id, created_at);
CREATE INDEX IF NOT EXISTS idx_battle_submissions_composite ON public.battle_submissions(battle_id, team_id, student_id);

-- 3. DATA RECONCILIATION: Reset ASSIGNMENT_ON_TIME in xp_rules back to Phase 0 canonical values
UPDATE public.xp_rules
SET
  base_xp = 20,
  extra_xp = 0,
  daily_limit = NULL,
  active = TRUE
WHERE action_type = 'ASSIGNMENT_ON_TIME';
