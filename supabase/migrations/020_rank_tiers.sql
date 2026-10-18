-- ==============================================================================
-- MIGRATION 020: Rank Tiers & Rank Badges
-- Creates rank_tiers table, updates badges for rank category and xp_reward,
-- and seeds canonical rank progression.
-- ==============================================================================

-- 1. RANK TIERS TABLE (Admin-editable lifetime rank bands)
CREATE TABLE IF NOT EXISTS public.rank_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  min_level INT NOT NULL,
  color TEXT NOT NULL,
  icon_key TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rank_tiers_min_level ON public.rank_tiers(min_level ASC);
CREATE INDEX IF NOT EXISTS idx_rank_tiers_sort_order ON public.rank_tiers(sort_order ASC);

-- 2. ROW LEVEL SECURITY (RLS) FOR RANK TIERS
ALTER TABLE public.rank_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rank_tiers_select_all" ON public.rank_tiers;
CREATE POLICY "rank_tiers_select_all"
ON public.rank_tiers
FOR SELECT
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "rank_tiers_admin_manage" ON public.rank_tiers;
CREATE POLICY "rank_tiers_admin_manage"
ON public.rank_tiers
FOR ALL
TO authenticated
USING (public.get_my_role() = 'admin')
WITH CHECK (public.get_my_role() = 'admin');

-- 3. BADGES TABLE UPDATE: ADD xp_reward AND EXPAND CATEGORY CHECK
ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS xp_reward INT NOT NULL DEFAULT 20;

ALTER TABLE public.badges DROP CONSTRAINT IF EXISTS badges_category_check;
ALTER TABLE public.badges ADD CONSTRAINT badges_category_check
  CHECK (category IN ('MILESTONE', 'QUEST', 'IMPROVEMENT', 'RANK'));

-- 4. SEED CANONICAL 7 RANK TIERS
INSERT INTO public.rank_tiers (slug, name, min_level, color, icon_key, description, sort_order)
VALUES
  ('apprentice', 'Apprentice', 1, '#94A3B8', 'terminal', 'Learning the fundamental syntax, problem solving and campus orientation', 10),
  ('scripter', 'Scripter', 2, '#38BDF8', 'code', 'Writing functional scripts, daily quizzes and basic algorithmic solutions', 20),
  ('debugger', 'Debugger', 4, '#34D399', 'bug', 'Squashing edge cases, mastering core data structures and consistent streaks', 30),
  ('architect', 'Architect', 8, '#818CF8', 'cpu', 'Designing modular systems, competitive duels and multi-file algorithms', 40),
  ('strategist', 'Strategist', 12, '#F59E0B', 'shield', 'Commanding team battles, high streak stability and campus problem solving', 50),
  ('innovator', 'Innovator', 15, '#EC4899', 'zap', 'High-velocity breakthroughs and leading inter-campus leaderboard contention', 60),
  ('grandmaster', 'Grandmaster', 18, '#A855F7', 'crown', 'Campus champion, academic luminary and highest competitive mastery', 70)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  min_level = EXCLUDED.min_level,
  color = EXCLUDED.color,
  icon_key = EXCLUDED.icon_key,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

-- 5. SEED CORRESPONDING 7 RANK BADGES (xp_reward = 0 to avoid loops and spikes)
INSERT INTO public.badges (code, name, description, category, criteria, active, xp_reward)
VALUES
  ('rank_apprentice', 'Apprentice Rank', 'Attained the Apprentice rank by beginning your coding journey', 'RANK', '{"min_rank": "Apprentice", "min_level": 1}'::jsonb, TRUE, 0),
  ('rank_scripter', 'Scripter Rank', 'Attained the Scripter rank by mastering basic syntax and quizzes', 'RANK', '{"min_rank": "Scripter", "min_level": 2}'::jsonb, TRUE, 0),
  ('rank_debugger', 'Debugger Rank', 'Attained the Debugger rank through algorithmic precision and bug squashing', 'RANK', '{"min_rank": "Debugger", "min_level": 4}'::jsonb, TRUE, 0),
  ('rank_architect', 'Architect Rank', 'Attained the Architect rank by mastering system structure and duels', 'RANK', '{"min_rank": "Architect", "min_level": 8}'::jsonb, TRUE, 0),
  ('rank_strategist', 'Strategist Rank', 'Attained the Strategist rank through battle leadership and consistency', 'RANK', '{"min_rank": "Strategist", "min_level": 12}'::jsonb, TRUE, 0),
  ('rank_innovator', 'Innovator Rank', 'Attained the Innovator rank through breakthroughs and leaderboard standing', 'RANK', '{"min_rank": "Innovator", "min_level": 15}'::jsonb, TRUE, 0),
  ('rank_grandmaster', 'Grandmaster Rank', 'Attained the Grandmaster rank — the highest academic achievement on campus', 'RANK', '{"min_rank": "Grandmaster", "min_level": 18}'::jsonb, TRUE, 0)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  criteria = EXCLUDED.criteria,
  active = EXCLUDED.active,
  xp_reward = EXCLUDED.xp_reward;
