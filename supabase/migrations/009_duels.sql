-- ==============================================================================
-- PHASE 3 MIGRATION: 009_duels.sql
-- Async Quiz Duels, Question Sets, Server Answer Verification, and XP Rules
-- ==============================================================================

-- 1. DUELS TABLE
CREATE TABLE IF NOT EXISTS public.duels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  challenged_id UUID NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('open', 'active', 'completed', 'expired', 'declined')) DEFAULT 'open',
  challenger_score INT NULL,
  challenger_time_seconds INT NULL,
  challenger_submitted_at TIMESTAMPTZ NULL,
  challenged_score INT NULL,
  challenged_time_seconds INT NULL,
  challenged_submitted_at TIMESTAMPTZ NULL,
  winner_id UUID NULL REFERENCES public.students(id),
  is_draw BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  CONSTRAINT prevent_self_duel CHECK (challenger_id IS DISTINCT FROM challenged_id)
);

CREATE INDEX IF NOT EXISTS idx_duels_challenger ON public.duels(challenger_id);
CREATE INDEX IF NOT EXISTS idx_duels_challenged ON public.duels(challenged_id);
CREATE INDEX IF NOT EXISTS idx_duels_status ON public.duels(status);

-- 2. DUEL QUESTIONS TABLE (Exact same 5 questions for both players)
CREATE TABLE IF NOT EXISTS public.duel_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id UUID NOT NULL REFERENCES public.duels(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  question_order INT NOT NULL CHECK (question_order BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_duel_question UNIQUE (duel_id, question_id),
  CONSTRAINT unique_duel_order UNIQUE (duel_id, question_order)
);

CREATE INDEX IF NOT EXISTS idx_duel_questions_duel ON public.duel_questions(duel_id);

-- 3. DUEL ANSWERS TABLE
CREATE TABLE IF NOT EXISTS public.duel_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id UUID NOT NULL REFERENCES public.duels(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_choice TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  time_spent_seconds INT NOT NULL DEFAULT 0,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_duel_student_question UNIQUE (duel_id, student_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_duel_answers_duel_student ON public.duel_answers(duel_id, student_id);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.duels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duel_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duel_answers ENABLE ROW LEVEL SECURITY;

-- Duels: Participants or open matchmaking can view
DROP POLICY IF EXISTS "duels_select_participants" ON public.duels;
CREATE POLICY "duels_select_participants"
ON public.duels
FOR SELECT
TO authenticated
USING (
  challenger_id = auth.uid() OR
  challenged_id = auth.uid() OR
  (status = 'open' AND challenged_id IS NULL) OR
  public.get_my_role() IN ('faculty', 'admin')
);

-- Duel Questions: Participants can view question mappings
DROP POLICY IF EXISTS "duel_questions_select_participants" ON public.duel_questions;
CREATE POLICY "duel_questions_select_participants"
ON public.duel_questions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.duels d
    WHERE d.id = duel_id AND (
      d.challenger_id = auth.uid() OR
      d.challenged_id = auth.uid() OR
      (d.status = 'open' AND d.challenged_id IS NULL)
    )
  )
);

-- Duel Answers: Students view only their own submitted answers (cannot inspect opponent answers early)
DROP POLICY IF EXISTS "duel_answers_select_own" ON public.duel_answers;
CREATE POLICY "duel_answers_select_own"
ON public.duel_answers
FOR SELECT
TO authenticated
USING (
  student_id = auth.uid() OR
  public.get_my_role() IN ('faculty', 'admin')
);

-- Revoke write policies from students/anon (Server-only via service_role)
REVOKE INSERT, UPDATE, DELETE ON public.duels FROM authenticated, anon, public;
REVOKE INSERT, UPDATE, DELETE ON public.duel_questions FROM authenticated, anon, public;
REVOKE INSERT, UPDATE, DELETE ON public.duel_answers FROM authenticated, anon, public;

-- 5. REGISTER DUEL XP RULES IN xp_rules (with daily caps)
INSERT INTO public.xp_rules (action_type, display_name, base_xp, extra_xp, daily_limit, active)
VALUES
  ('DUEL_WIN', 'Quiz Duel Victory Bonus', 25, 0, 5, TRUE),
  ('DUEL_PARTICIPATION', 'Quiz Duel Participation', 10, 0, 5, TRUE)
ON CONFLICT (action_type) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  base_xp = EXCLUDED.base_xp,
  daily_limit = EXCLUDED.daily_limit,
  active = EXCLUDED.active;
