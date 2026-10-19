-- Migration 026: Practice and Competition XP Approval, Difficulty XP Rules, Daily Caps & IP Rate Limiting

-- 1. IP Rate Limiting Table & Stored Procedure
CREATE TABLE IF NOT EXISTS public.ip_rate_limits (
  id BIGSERIAL PRIMARY KEY,
  ip_address TEXT NOT NULL,
  action_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ip_rate_limits_window ON public.ip_rate_limits (ip_address, action_name, created_at);
ALTER TABLE public.ip_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ip_rate_limits FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_ip_rate_limit(
  p_ip TEXT,
  p_action_name TEXT,
  p_max_attempts INT DEFAULT 5,
  p_window_minutes INT DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.ip_rate_limits
  WHERE ip_address = p_ip
    AND action_name = p_action_name
    AND created_at >= (now() - (p_window_minutes || ' minutes')::INTERVAL);

  IF v_count >= p_max_attempts THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'count', v_count,
      'retry_after_seconds', p_window_minutes * 60
    );
  END IF;

  INSERT INTO public.ip_rate_limits (ip_address, action_name, created_at)
  VALUES (p_ip, p_action_name, now());

  -- Prune old entries
  DELETE FROM public.ip_rate_limits WHERE created_at < (now() - INTERVAL '1 day');

  RETURN jsonb_build_object('allowed', true, 'count', v_count + 1);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_ip_rate_limit(TEXT, TEXT, INT, INT) FROM PUBLIC, anon, authenticated;

-- 2. Extend student_practice_completions with review and approval status columns
ALTER TABLE public.student_practice_completions
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_student_practice_completions_status ON public.student_practice_completions(status);

-- 3. Update / Insert practice difficulty XP rules
INSERT INTO public.xp_rules (action_type, display_name, base_xp, extra_xp, daily_limit, active)
VALUES
  ('PRACTICE_EASY', 'Practice Problem Solved (Easy)', 10, 0, NULL, TRUE),
  ('PRACTICE_MEDIUM', 'Practice Problem Solved (Medium)', 20, 0, NULL, TRUE),
  ('PRACTICE_HARD', 'Practice Problem Solved (Hard)', 40, 0, NULL, TRUE),
  ('HACKERRANK_COMPETITION', 'Faculty HackerRank Challenge Solved', 25, 0, 2, TRUE),
  ('PRACTICE_SOLVE', 'Practice Problem Solved', 10, 0, 5, TRUE)
ON CONFLICT (action_type) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  base_xp = EXCLUDED.base_xp,
  extra_xp = EXCLUDED.extra_xp,
  daily_limit = EXCLUDED.daily_limit,
  active = EXCLUDED.active;

-- 4. Add daily practice cap to app_settings (default 40 XP per day, admin editable)
INSERT INTO public.app_settings (key, value, description)
VALUES
  ('daily_practice_xp_cap', '40'::jsonb, 'Maximum daily XP a student can earn from coding practice problem approvals')
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description;
