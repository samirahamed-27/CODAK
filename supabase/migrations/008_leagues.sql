-- ==============================================================================
-- PHASE 3 MIGRATION: 008_leagues.sql
-- Weekly Leagues, Tiers, Groups, Memberships, Outcomes, and RLS
-- ==============================================================================

-- 1. LEAGUE TIERS TABLE
CREATE TABLE IF NOT EXISTS public.league_tiers (
  id TEXT PRIMARY KEY, -- 'bronze', 'silver', 'gold', 'diamond'
  name TEXT NOT NULL,
  tier_order INT NOT NULL UNIQUE, -- 1: Bronze, 2: Silver, 3: Gold, 4: Diamond
  min_level INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. LEAGUE CONFIG TABLE (Admin editable, no hardcoded magic numbers)
CREATE TABLE IF NOT EXISTS public.league_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  target_group_size INT NOT NULL DEFAULT 20 CHECK (target_group_size >= 2),
  min_group_size_for_relegation INT NOT NULL DEFAULT 10 CHECK (min_group_size_for_relegation >= 2),
  promotion_count INT NOT NULL DEFAULT 5 CHECK (promotion_count >= 1),
  relegation_count INT NOT NULL DEFAULT 5 CHECK (relegation_count >= 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. STUDENT LEAGUE STATUS TABLE (Tracks student current tier)
CREATE TABLE IF NOT EXISTS public.student_league_status (
  student_id UUID PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE,
  current_tier_id TEXT NOT NULL REFERENCES public.league_tiers(id) DEFAULT 'bronze',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. LEAGUE GROUPS TABLE (Weekly buckets per tier)
CREATE TABLE IF NOT EXISTS public.league_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id TEXT NOT NULL REFERENCES public.league_tiers(id) ON DELETE CASCADE,
  week_key TEXT NOT NULL, -- e.g. '2026-W42'
  group_number INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_tier_week_group UNIQUE (tier_id, week_key, group_number)
);

CREATE INDEX IF NOT EXISTS idx_league_groups_tier_week ON public.league_groups(tier_id, week_key);

-- 5. LEAGUE MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.league_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.league_groups(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  week_key TEXT NOT NULL,
  initial_tier_id TEXT NOT NULL REFERENCES public.league_tiers(id),
  final_rank INT NULL,
  final_weekly_xp INT NULL,
  outcome TEXT NULL CHECK (outcome IN ('promoted', 'relegated', 'retained', 'no_action')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_student_league_week UNIQUE (student_id, week_key)
);

CREATE INDEX IF NOT EXISTS idx_league_members_group ON public.league_members(group_id);
CREATE INDEX IF NOT EXISTS idx_league_members_student ON public.league_members(student_id);

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.league_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_league_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;

-- Read policies: Authenticated can read tiers, config, groups, and members
DROP POLICY IF EXISTS "league_tiers_select" ON public.league_tiers;
CREATE POLICY "league_tiers_select" ON public.league_tiers FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "league_config_select" ON public.league_config;
CREATE POLICY "league_config_select" ON public.league_config FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "student_league_status_select" ON public.student_league_status;
CREATE POLICY "student_league_status_select" ON public.student_league_status FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "league_groups_select" ON public.league_groups;
CREATE POLICY "league_groups_select" ON public.league_groups FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "league_members_select" ON public.league_members;
CREATE POLICY "league_members_select" ON public.league_members FOR SELECT TO authenticated USING (true);

-- Admin management policies
DROP POLICY IF EXISTS "league_config_admin" ON public.league_config;
CREATE POLICY "league_config_admin" ON public.league_config FOR ALL TO authenticated
USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');

-- Revoke write policies from students/anon (Server-only via service_role)
REVOKE INSERT, UPDATE, DELETE ON public.student_league_status FROM authenticated, anon, public;
REVOKE INSERT, UPDATE, DELETE ON public.league_groups FROM authenticated, anon, public;
REVOKE INSERT, UPDATE, DELETE ON public.league_members FROM authenticated, anon, public;

-- 7. SEED TIERS AND DEFAULT CONFIG
INSERT INTO public.league_tiers (id, name, tier_order, min_level)
VALUES
  ('bronze', 'Bronze League', 1, 1),
  ('silver', 'Silver League', 2, 3),
  ('gold', 'Gold League', 3, 6),
  ('diamond', 'Diamond League', 4, 10)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tier_order = EXCLUDED.tier_order,
  min_level = EXCLUDED.min_level;

INSERT INTO public.league_config (id, target_group_size, min_group_size_for_relegation, promotion_count, relegation_count)
VALUES ('default', 20, 10, 5, 5)
ON CONFLICT (id) DO UPDATE SET
  target_group_size = EXCLUDED.target_group_size,
  min_group_size_for_relegation = EXCLUDED.min_group_size_for_relegation,
  promotion_count = EXCLUDED.promotion_count,
  relegation_count = EXCLUDED.relegation_count;
