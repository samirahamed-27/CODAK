-- ==============================================================================
-- PHASE 3 MIGRATION: 006_badges.sql
-- Badges, Student Badges, RLS, and XP Rule Configuration
-- ==============================================================================

-- 1. BADGES TABLE
CREATE TABLE IF NOT EXISTS public.badges (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('MILESTONE', 'QUEST', 'IMPROVEMENT')),
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. STUDENT BADGES TABLE
CREATE TABLE IF NOT EXISTS public.student_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  badge_code TEXT NOT NULL REFERENCES public.badges(code) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_student_badge UNIQUE (student_id, badge_code)
);

CREATE INDEX IF NOT EXISTS idx_student_badges_student ON public.student_badges(student_id);
CREATE INDEX IF NOT EXISTS idx_student_badges_badge ON public.student_badges(badge_code);

-- 3. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_badges ENABLE ROW LEVEL SECURITY;

-- Badges: Anyone authenticated can read active/all badges
DROP POLICY IF EXISTS "badges_select_all" ON public.badges;
CREATE POLICY "badges_select_all"
ON public.badges
FOR SELECT
TO authenticated, anon
USING (true);

-- Badges: Only admin can insert/update/delete badges
DROP POLICY IF EXISTS "badges_admin_manage" ON public.badges;
CREATE POLICY "badges_admin_manage"
ON public.badges
FOR ALL
TO authenticated
USING (public.get_my_role() = 'admin')
WITH CHECK (public.get_my_role() = 'admin');

-- Student Badges: Anyone authenticated can read (needed for student profiles & leaderboards)
DROP POLICY IF EXISTS "student_badges_select" ON public.student_badges;
CREATE POLICY "student_badges_select"
ON public.student_badges
FOR SELECT
TO authenticated
USING (true);

-- Student Badges: Revoke client insert/update/delete (Server-only via service_role)
REVOKE INSERT, UPDATE, DELETE ON public.student_badges FROM authenticated, anon, public;

-- 4. REGISTER BADGE_EARNED IN xp_rules
INSERT INTO public.xp_rules (action_type, display_name, base_xp, extra_xp, daily_limit, active)
VALUES ('BADGE_EARNED', 'Badge Earned', 20, 0, NULL, TRUE)
ON CONFLICT (action_type) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  base_xp = EXCLUDED.base_xp,
  extra_xp = EXCLUDED.extra_xp,
  daily_limit = EXCLUDED.daily_limit,
  active = EXCLUDED.active;

-- 5. SEED INITIAL 6 BADGES (2 MILESTONE, 2 QUEST, 2 IMPROVEMENT)
INSERT INTO public.badges (code, name, description, category, criteria, active)
VALUES
  -- 2 MILESTONE BADGES
  ('first_quiz', 'First Step', 'Completed your first daily quiz session', 'MILESTONE', '{"type": "quiz_count", "threshold": 1}'::jsonb, TRUE),
  ('streak_7', 'Week of Fire', 'Maintained a 7-day daily quiz streak', 'MILESTONE', '{"type": "streak_days", "threshold": 7}'::jsonb, TRUE),

  -- 2 QUEST BADGES
  ('quest_first', 'Adventurer', 'Completed your first learning quest', 'QUEST', '{"type": "quest_count", "threshold": 1}'::jsonb, TRUE),
  ('quest_trio', 'Quest Master', 'Completed 3 learning quests', 'QUEST', '{"type": "quest_count", "threshold": 3}'::jsonb, TRUE),

  -- 2 IMPROVEMENT BADGES (Comparing student with THEMSELVES)
  ('improvement_score', 'Leveling Up', 'Achieved a daily quiz score higher than your own 7-day average', 'IMPROVEMENT', '{"type": "score_improvement", "window_days": 7}'::jsonb, TRUE),
  ('comeback_kid', 'Phoenix', 'Rebuilt a daily streak of at least 2 days after a streak reset', 'IMPROVEMENT', '{"type": "streak_comeback", "threshold": 2}'::jsonb, TRUE)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  criteria = EXCLUDED.criteria,
  active = EXCLUDED.active;
