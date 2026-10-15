-- ==============================================================================
-- MIGRATION 004: CONSOLIDATE QUIZ FINALIZATION PATH
-- ==============================================================================
-- Quiz finalization is orchestrated exclusively via Next.js Server Actions
-- (src/app/actions/quiz.ts) using pure domain logic (src/lib/streaks.ts)
-- and the atomic award_xp procedure for tamper-proof ledger updates.
--
-- Retire the redundant finalize_daily_quiz SQL procedure to ensure a single,
-- unified source of truth.
-- ==============================================================================

DROP FUNCTION IF EXISTS public.finalize_daily_quiz(UUID, UUID);
