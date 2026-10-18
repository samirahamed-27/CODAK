-- ==============================================================================
-- PHASE 3 MIGRATION: 024_practice_and_competitions.sql
-- 1. Adds PRACTICE_SOLVE and HACKERRANK_COMPETITION rules to xp_rules
-- 2. Extends practice_links for faculty-created custom competitions
-- 3. Creates student_practice_completions ledger table for tracking solves & claiming XP
-- ==============================================================================

-- 1. ADD PRACTICE AND COMPETITION XP RULES
INSERT INTO public.xp_rules (action_type, display_name, base_xp, extra_xp, daily_limit, active)
VALUES
  ('PRACTICE_SOLVE', 'Practice Problem Solved', 10, 0, 5, TRUE),
  ('HACKERRANK_COMPETITION', 'Faculty HackerRank Challenge Solved', 25, 0, 2, TRUE)
ON CONFLICT (action_type) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  base_xp = EXCLUDED.base_xp,
  extra_xp = EXCLUDED.extra_xp,
  daily_limit = EXCLUDED.daily_limit,
  active = EXCLUDED.active;

-- 2. EXTEND practice_links WITH COMPETITION METADATA
ALTER TABLE public.practice_links
  ADD COLUMN IF NOT EXISTS is_competition BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS instructions TEXT NULL,
  ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_practice_links_competition ON public.practice_links(is_competition);
CREATE INDEX IF NOT EXISTS idx_practice_links_created_by ON public.practice_links(created_by);

-- 3. CREATE student_practice_completions TABLE
CREATE TABLE IF NOT EXISTS public.student_practice_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  practice_link_id UUID NOT NULL REFERENCES public.practice_links(id) ON DELETE CASCADE,
  submission_proof TEXT NULL,
  xp_awarded INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_student_practice_completion UNIQUE (student_id, practice_link_id)
);

CREATE INDEX IF NOT EXISTS idx_student_practice_completions_student ON public.student_practice_completions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_practice_completions_link ON public.student_practice_completions(practice_link_id);

-- 4. RLS ON student_practice_completions
ALTER TABLE public.student_practice_completions ENABLE ROW LEVEL SECURITY;

-- Students can read their own completions
DROP POLICY IF EXISTS "student_practice_completions_select_own" ON public.student_practice_completions;
CREATE POLICY "student_practice_completions_select_own"
ON public.student_practice_completions
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- Faculty & Admin can read all completions (e.g. for contest review)
DROP POLICY IF EXISTS "student_practice_completions_select_staff" ON public.student_practice_completions;
CREATE POLICY "student_practice_completions_select_staff"
ON public.student_practice_completions
FOR SELECT
TO authenticated
USING (public.get_my_role() IN ('faculty', 'admin'));

-- Revoke client writes (All inserts/updates go through trusted server actions / service role)
REVOKE INSERT, UPDATE, DELETE ON public.student_practice_completions FROM authenticated, anon, public;
