-- ==============================================================================
-- PHASE 3 MIGRATION: 007_quests.sql
-- Quests, Tasks, Student Quest Progress, RLS, and XP Rule Configuration
-- ==============================================================================

-- 1. QUESTS TABLE
CREATE TABLE IF NOT EXISTS public.quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('weekly', 'one-time')),
  reward_xp INT NOT NULL CHECK (reward_xp >= 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. QUEST TASKS TABLE
CREATE TABLE IF NOT EXISTS public.quest_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  action_type TEXT NOT NULL, -- e.g. 'daily_quiz_completed', 'streak_days_maintained', 'practice_completed'
  target_count INT NOT NULL CHECK (target_count >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quest_tasks_quest ON public.quest_tasks(quest_id);

-- 3. STUDENT QUEST PROGRESS TABLE
CREATE TABLE IF NOT EXISTS public.student_quest_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  period_key TEXT NOT NULL, -- e.g. '2026-W42' or 'one-time'
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ NULL,
  reward_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  reward_claimed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_student_quest_period UNIQUE (student_id, quest_id, period_key)
);

CREATE INDEX IF NOT EXISTS idx_student_quest_student_period ON public.student_quest_progress(student_id, period_key);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_quest_progress ENABLE ROW LEVEL SECURITY;

-- Quests & Tasks: Anyone authenticated can read active quests
DROP POLICY IF EXISTS "quests_select_all" ON public.quests;
CREATE POLICY "quests_select_all"
ON public.quests
FOR SELECT
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "quest_tasks_select_all" ON public.quest_tasks;
CREATE POLICY "quest_tasks_select_all"
ON public.quest_tasks
FOR SELECT
TO authenticated, anon
USING (true);

-- Quests & Tasks: Admin write only
DROP POLICY IF EXISTS "quests_admin_manage" ON public.quests;
CREATE POLICY "quests_admin_manage"
ON public.quests
FOR ALL
TO authenticated
USING (public.get_my_role() = 'admin')
WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "quest_tasks_admin_manage" ON public.quest_tasks;
CREATE POLICY "quest_tasks_admin_manage"
ON public.quest_tasks
FOR ALL
TO authenticated
USING (public.get_my_role() = 'admin')
WITH CHECK (public.get_my_role() = 'admin');

-- Student Quest Progress: Students read own; faculty/admin can inspect
DROP POLICY IF EXISTS "student_quest_progress_select" ON public.student_quest_progress;
CREATE POLICY "student_quest_progress_select"
ON public.student_quest_progress
FOR SELECT
TO authenticated
USING (student_id = auth.uid() OR public.get_my_role() IN ('faculty', 'admin'));

-- Student Quest Progress: Revoke client insert/update/delete (Server-only via service_role)
REVOKE INSERT, UPDATE, DELETE ON public.student_quest_progress FROM authenticated, anon, public;

-- 5. REGISTER QUEST_REWARD IN xp_rules (base_xp = 0, extra_xp = 1 so extra_units dynamically determines reward)
INSERT INTO public.xp_rules (action_type, display_name, base_xp, extra_xp, daily_limit, active)
VALUES ('QUEST_REWARD', 'Quest Completion Reward', 0, 1, NULL, TRUE)
ON CONFLICT (action_type) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  base_xp = 0,
  extra_xp = 1,
  daily_limit = EXCLUDED.daily_limit,
  active = EXCLUDED.active;

-- 6. SEED 3 SAMPLE QUESTS (2 Weekly, 1 One-time)
DO $$
DECLARE
  v_q1 UUID := '11111111-1111-1111-1111-111111111111';
  v_q2 UUID := '22222222-2222-2222-2222-222222222222';
  v_q3 UUID := '33333333-3333-3333-3333-333333333333';
BEGIN
  -- Quest 1: Weekly Scholar
  INSERT INTO public.quests (id, title, description, period, reward_xp, active)
  VALUES (v_q1, 'Weekly Scholar', 'Complete 3 daily quizzes and keep a 3-day streak alive this week.', 'weekly', 50, TRUE)
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    period = EXCLUDED.period,
    reward_xp = EXCLUDED.reward_xp,
    active = EXCLUDED.active;

  DELETE FROM public.quest_tasks WHERE quest_id = v_q1;
  INSERT INTO public.quest_tasks (quest_id, description, action_type, target_count)
  VALUES
    (v_q1, 'Complete 3 daily quizzes', 'daily_quiz_completed', 3),
    (v_q1, 'Maintain a streak of at least 3 days', 'streak_days_maintained', 3);

  -- Quest 2: Knowledge Marathon
  INSERT INTO public.quests (id, title, description, period, reward_xp, active)
  VALUES (v_q2, 'Knowledge Marathon', 'Master the week with 5 completed daily quizzes.', 'weekly', 75, TRUE)
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    period = EXCLUDED.period,
    reward_xp = EXCLUDED.reward_xp,
    active = EXCLUDED.active;

  DELETE FROM public.quest_tasks WHERE quest_id = v_q2;
  INSERT INTO public.quest_tasks (quest_id, description, action_type, target_count)
  VALUES
    (v_q2, 'Complete 5 daily quizzes', 'daily_quiz_completed', 5);

  -- Quest 3: Academy Initiation
  INSERT INTO public.quests (id, title, description, period, reward_xp, active)
  VALUES (v_q3, 'Academy Initiation', 'Begin your journey by completing your first daily quiz.', 'one-time', 30, TRUE)
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    period = EXCLUDED.period,
    reward_xp = EXCLUDED.reward_xp,
    active = EXCLUDED.active;

  DELETE FROM public.quest_tasks WHERE quest_id = v_q3;
  INSERT INTO public.quest_tasks (quest_id, description, action_type, target_count)
  VALUES
    (v_q3, 'Complete your first daily quiz', 'daily_quiz_completed', 1);
END;
$$;
