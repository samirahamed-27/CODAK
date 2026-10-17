-- ==============================================================================
-- PHASE 3 MIGRATION: 011_concept_match.sql
-- Concept Match Mini-Game XP Rule (Daily Capped, Server Awarded)
-- ==============================================================================

INSERT INTO public.xp_rules (action_type, display_name, base_xp, extra_xp, daily_limit, active)
VALUES
  ('CONCEPT_MATCH', 'Concept Match Mini-Game Mastery', 10, 0, 2, TRUE)
ON CONFLICT (action_type) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  base_xp = EXCLUDED.base_xp,
  daily_limit = EXCLUDED.daily_limit,
  active = EXCLUDED.active;
