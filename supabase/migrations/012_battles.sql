-- ==============================================================================
-- PHASE 4 MIGRATION: 012_battles.sql
-- Live Battles, Teams, Submissions, Aggregate Scores, and Atomic Evaluation
-- ==============================================================================

-- 1. BATTLES TABLE
CREATE TABLE IF NOT EXISTS public.battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'live', 'finished')),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  config JSONB NOT NULL DEFAULT '{"points_per_correct": 10, "auto_split": false}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. BATTLE TEAMS TABLE
CREATE TABLE IF NOT EXISTS public.battle_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_battle_team_name UNIQUE (battle_id, name)
);

-- 3. BATTLE TEAM MEMBERS TABLE (Unique per battle + student)
CREATE TABLE IF NOT EXISTS public.battle_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.battle_teams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_battle_student UNIQUE (battle_id, student_id)
);

-- 4. BATTLE QUESTIONS TABLE (Approved questions only)
CREATE TABLE IF NOT EXISTS public.battle_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  question_order INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_battle_question UNIQUE (battle_id, question_id),
  CONSTRAINT unique_battle_question_order UNIQUE (battle_id, question_order)
);

-- 5. BATTLE SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.battle_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.battle_teams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  points INT NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submission_id UUID NOT NULL UNIQUE,
  CONSTRAINT unique_battle_student_question UNIQUE (battle_id, student_id, question_id)
);

-- 6. BATTLE SCORES AGGREGATE TABLE (For Supabase Realtime broadcast)
CREATE TABLE IF NOT EXISTS public.battle_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.battle_teams(id) ON DELETE CASCADE,
  total_points INT NOT NULL DEFAULT 0,
  member_count INT NOT NULL DEFAULT 0,
  answered_count INT NOT NULL DEFAULT 0,
  avg_points NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
  last_submission_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_battle_team_score UNIQUE (battle_id, team_id)
);

-- 7. REGISTER BATTLE XP RULES IN xp_rules
INSERT INTO public.xp_rules (action_type, display_name, base_xp, extra_xp, daily_limit, active)
VALUES
  ('BATTLE_PARTICIPATION', 'Battle Arena Participation', 15, 0, 3, TRUE),
  ('BATTLE_WIN', 'Battle Arena Victory Bonus', 35, 0, 3, TRUE)
ON CONFLICT (action_type) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  base_xp = EXCLUDED.base_xp,
  daily_limit = EXCLUDED.daily_limit,
  active = EXCLUDED.active;

-- 8. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_battle_team_members_battle ON public.battle_team_members(battle_id);
CREATE INDEX IF NOT EXISTS idx_battle_team_members_student ON public.battle_team_members(student_id);
CREATE INDEX IF NOT EXISTS idx_battle_submissions_battle ON public.battle_submissions(battle_id);
CREATE INDEX IF NOT EXISTS idx_battle_submissions_team ON public.battle_submissions(team_id);
CREATE INDEX IF NOT EXISTS idx_battle_scores_battle ON public.battle_scores(battle_id);

-- 9. ATOMIC SUBMISSION FUNCTION: submit_battle_answer
CREATE OR REPLACE FUNCTION public.submit_battle_answer(
  p_battle_id UUID,
  p_student_id UUID,
  p_question_id UUID,
  p_answer TEXT,
  p_submission_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id UUID;
  v_battle_status TEXT;
  v_ends_at TIMESTAMPTZ;
  v_points_per_correct INT := 10;
  v_actual_correct TEXT;
  v_is_correct BOOLEAN;
  v_points INT := 0;
  v_existing_id UUID;
  v_existing_correct BOOLEAN;
  v_existing_points INT;
  v_member_count INT;
  v_total_points INT;
  v_answered_count INT;
  v_avg_points NUMERIC(10, 4);
BEGIN
  -- A. Idempotency Check on submission_id
  SELECT id, is_correct, points, team_id
  INTO v_existing_id, v_existing_correct, v_existing_points, v_team_id
  FROM public.battle_submissions
  WHERE submission_id = p_submission_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'status', 'duplicate_submission',
      'is_correct', v_existing_correct,
      'points', v_existing_points,
      'team_id', v_team_id,
      'submission_id', p_submission_id
    );
  END IF;

  -- B. Membership Check
  SELECT team_id INTO v_team_id
  FROM public.battle_team_members
  WHERE battle_id = p_battle_id AND student_id = p_student_id;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Forbidden: Student % is not an enrolled member of battle %', p_student_id, p_battle_id;
  END IF;

  -- C. Battle Active & Deadline Check
  SELECT status, ends_at, COALESCE((config->>'points_per_correct')::int, 10)
  INTO v_battle_status, v_ends_at, v_points_per_correct
  FROM public.battles
  WHERE id = p_battle_id;

  IF v_battle_status IS NULL THEN
    RAISE EXCEPTION 'Battle % not found', p_battle_id;
  END IF;

  IF v_battle_status != 'live' THEN
    RAISE EXCEPTION 'Battle is not active (current status: %)', v_battle_status;
  END IF;

  IF v_ends_at IS NOT NULL AND NOW() > v_ends_at THEN
    RAISE EXCEPTION 'Battle deadline has passed (ended at: %)', v_ends_at;
  END IF;

  -- D. Question Belongs to Battle Check
  PERFORM 1 FROM public.battle_questions
  WHERE battle_id = p_battle_id AND question_id = p_question_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Question % is not part of battle %', p_question_id, p_battle_id;
  END IF;

  -- E. Already Answered Check (unique per student + battle + question)
  SELECT id, is_correct, points
  INTO v_existing_id, v_existing_correct, v_existing_points
  FROM public.battle_submissions
  WHERE battle_id = p_battle_id
    AND student_id = p_student_id
    AND question_id = p_question_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'status', 'already_answered',
      'is_correct', v_existing_correct,
      'points', v_existing_points,
      'team_id', v_team_id,
      'submission_id', p_submission_id
    );
  END IF;

  -- F. Check Answer Against Server Key
  SELECT correct_answer INTO v_actual_correct
  FROM public.questions
  WHERE id = p_question_id;

  v_is_correct := (LOWER(TRIM(v_actual_correct)) = LOWER(TRIM(p_answer)));
  IF v_is_correct THEN
    v_points := v_points_per_correct;
  ELSE
    v_points := 0;
  END IF;

  -- G. Insert Submission
  INSERT INTO public.battle_submissions (
    battle_id,
    team_id,
    student_id,
    question_id,
    answer,
    is_correct,
    points,
    submitted_at,
    submission_id
  ) VALUES (
    p_battle_id,
    v_team_id,
    p_student_id,
    p_question_id,
    p_answer,
    v_is_correct,
    v_points,
    NOW(),
    p_submission_id
  );

  -- H. Recalculate Aggregate Team Score Inside Transaction
  -- Total team members
  SELECT COUNT(*)::int INTO v_member_count
  FROM public.battle_team_members
  WHERE team_id = v_team_id;

  -- Total team points & answered count
  SELECT COALESCE(SUM(points), 0)::int, COUNT(*)::int
  INTO v_total_points, v_answered_count
  FROM public.battle_submissions
  WHERE team_id = v_team_id;

  IF v_member_count > 0 THEN
    v_avg_points := ROUND((v_total_points::numeric / v_member_count::numeric), 4);
  ELSE
    v_avg_points := 0.0000;
  END IF;

  -- Upsert battle_scores
  INSERT INTO public.battle_scores (
    battle_id,
    team_id,
    total_points,
    member_count,
    answered_count,
    avg_points,
    last_submission_at,
    updated_at
  ) VALUES (
    p_battle_id,
    v_team_id,
    v_total_points,
    v_member_count,
    v_answered_count,
    v_avg_points,
    NOW(),
    NOW()
  )
  ON CONFLICT (battle_id, team_id) DO UPDATE SET
    total_points = EXCLUDED.total_points,
    member_count = EXCLUDED.member_count,
    answered_count = EXCLUDED.answered_count,
    avg_points = EXCLUDED.avg_points,
    last_submission_at = EXCLUDED.last_submission_at,
    updated_at = NOW();

  RETURN jsonb_build_object(
    'status', 'submitted',
    'is_correct', v_is_correct,
    'points', v_points,
    'team_id', v_team_id,
    'submission_id', p_submission_id,
    'team_avg_points', v_avg_points
  );
END;
$$;

-- 10. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_scores ENABLE ROW LEVEL SECURITY;

-- Block client direct mutations across all battle tables
REVOKE INSERT, UPDATE, DELETE ON public.battles FROM authenticated, anon, public;
REVOKE INSERT, UPDATE, DELETE ON public.battle_teams FROM authenticated, anon, public;
REVOKE INSERT, UPDATE, DELETE ON public.battle_team_members FROM authenticated, anon, public;
REVOKE INSERT, UPDATE, DELETE ON public.battle_questions FROM authenticated, anon, public;
REVOKE INSERT, UPDATE, DELETE ON public.battle_submissions FROM authenticated, anon, public;
REVOKE INSERT, UPDATE, DELETE ON public.battle_scores FROM authenticated, anon, public;

-- Grant execute on submit_battle_answer to authenticated
GRANT EXECUTE ON FUNCTION public.submit_battle_answer TO authenticated;

-- SELECT Policies:
-- Battles: authenticated can read non-draft battles or any battle if faculty/admin
CREATE POLICY "Read Battles Policy" ON public.battles
FOR SELECT TO authenticated
USING (status != 'draft' OR public.get_my_role() IN ('faculty', 'admin'));

-- Teams: read teams for readable battles
CREATE POLICY "Read Teams Policy" ON public.battle_teams
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.battles b
  WHERE b.id = battle_teams.battle_id
    AND (b.status != 'draft' OR public.get_my_role() IN ('faculty', 'admin'))
));

-- Team Members: read members of readable battles
CREATE POLICY "Read Team Members Policy" ON public.battle_team_members
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.battles b
  WHERE b.id = battle_team_members.battle_id
    AND (b.status != 'draft' OR public.get_my_role() IN ('faculty', 'admin'))
));

-- Battle Questions: read questions for battles you are enrolled in or if faculty/admin
CREATE POLICY "Read Battle Questions Policy" ON public.battle_questions
FOR SELECT TO authenticated
USING (
  public.get_my_role() IN ('faculty', 'admin')
  OR EXISTS (
    SELECT 1 FROM public.battle_team_members btm
    WHERE btm.battle_id = battle_questions.battle_id
      AND btm.student_id = auth.uid()
  )
);

-- Battle Submissions: students can ONLY read their own submissions. NEVER other students'.
CREATE POLICY "Read My Own Submissions Policy" ON public.battle_submissions
FOR SELECT TO authenticated
USING (student_id = auth.uid() OR public.get_my_role() IN ('faculty', 'admin'));

-- Battle Scores: students can only read scores for battles they participate in; faculty/admin can read all
CREATE POLICY "Read Battle Scores Policy" ON public.battle_scores
FOR SELECT TO authenticated
USING (
  public.get_my_role() IN ('faculty', 'admin')
  OR EXISTS (
    SELECT 1 FROM public.battle_team_members btm
    WHERE btm.battle_id = battle_scores.battle_id
      AND btm.student_id = auth.uid()
  )
);

-- 11. ENABLE REALTIME ON battle_scores
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'battle_scores'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_scores;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback for environments where publication management is restricted
    NULL;
END;
$$;
