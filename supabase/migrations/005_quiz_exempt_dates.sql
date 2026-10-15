-- ==============================================================================
-- MIGRATION 005: QUIZ EXEMPT DATES & QUESTION APPROVAL TIMESTAMPS
-- ==============================================================================
-- Tracks dates where daily quizzes are officially excused/exempt
-- (e.g., empty question bank, institute holidays, server maintenance).
-- Guarantees that students' streaks are preserved without consuming freezes.
-- ==============================================================================

-- 1. Table for explicit exempt dates
CREATE TABLE IF NOT EXISTS public.quiz_exempt_dates (
  date DATE PRIMARY KEY,
  reason TEXT NOT NULL DEFAULT 'insufficient_questions',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Add approved_at timestamp to questions table for point-in-time bank queries
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ NULL;
UPDATE public.questions SET approved_at = created_at WHERE status = 'approved' AND approved_at IS NULL;

-- 3. Row Level Security on quiz_exempt_dates
ALTER TABLE public.quiz_exempt_dates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quiz_exempt_dates_select_policy" ON public.quiz_exempt_dates;
CREATE POLICY "quiz_exempt_dates_select_policy" ON public.quiz_exempt_dates
  FOR SELECT TO authenticated USING (TRUE);

-- STRICT SECURITY RULE:
-- Students and anon have ZERO insert, update, or delete policies.
-- Only server code running with service_role can modify quiz_exempt_dates.
REVOKE ALL ON public.quiz_exempt_dates FROM anon;
GRANT SELECT ON public.quiz_exempt_dates TO authenticated;
GRANT ALL ON public.quiz_exempt_dates TO service_role;
