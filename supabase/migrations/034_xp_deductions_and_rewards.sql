-- ==============================================================================
-- PHASE 5 MIGRATION: 034_xp_deductions_and_rewards.sql
-- XP Deductions, Rewards Store Redemptions, and Timed Exam Boss Battle
-- ==============================================================================

-- 1. UPDATE CHECK CONSTRAINT ON xp_events TO ALLOW NEGATIVE XP (DEDUCTIONS/REDEMPTIONS)
ALTER TABLE public.xp_events DROP CONSTRAINT IF EXISTS xp_events_xp_amount_check;

-- 2. REGISTER NEW ACTION TYPES IN xp_rules
INSERT INTO public.xp_rules (action_type, display_name, base_xp, extra_xp, daily_limit, active)
VALUES
  ('REWARD_REDEMPTION', 'Reward Store Redemption', 0, 0, NULL, TRUE),
  ('XP_DEDUCTION', 'Faculty / Admin XP Penalty', 0, 0, NULL, TRUE),
  ('BOSS_BATTLE_WIN', 'Boss Battle Victory', 100, 0, 1, TRUE)
ON CONFLICT (action_type) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  base_xp = EXCLUDED.base_xp,
  extra_xp = EXCLUDED.extra_xp,
  daily_limit = EXCLUDED.daily_limit,
  active = EXCLUDED.active;

-- 3. SEED BOSS SLAYER BADGE
INSERT INTO public.badges (code, name, description, category, criteria, active)
VALUES (
  'boss_slayer',
  'Boss Slayer',
  'Defeated the comprehensive semester Final Boss in a 20-minute timed exam revision challenge',
  'MILESTONE',
  '{"type": "boss_battle_win", "threshold": 1}'::jsonb,
  TRUE
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  criteria = EXCLUDED.criteria,
  active = EXCLUDED.active;

-- 4. CREATE STORED PROCEDURE: deduct_xp
CREATE OR REPLACE FUNCTION public.deduct_xp(
  p_student_id UUID,
  p_amount INT,
  p_action_type TEXT,
  p_reason TEXT,
  p_reference_id TEXT,
  p_actor UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_xp BIGINT;
  v_new_total BIGINT;
  v_event_id UUID;
  v_effective_ref TEXT;
BEGIN
  -- 1. Validation
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'invalid_amount',
      'error', 'Deduction amount must be strictly positive.'
    );
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'invalid_reason',
      'error', 'A specific deduction reason of at least 3 characters is mandatory.'
    );
  END IF;

  IF p_action_type IS NULL OR p_action_type NOT IN ('REWARD_REDEMPTION', 'XP_DEDUCTION') THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'invalid_action_type',
      'error', 'Action type must be REWARD_REDEMPTION or XP_DEDUCTION.'
    );
  END IF;

  v_effective_ref := COALESCE(NULLIF(trim(p_reference_id), ''), p_action_type || '_' || gen_random_uuid());

  -- 2. Verify student exists and lock their ledger rows
  SELECT COALESCE(SUM(xp_amount), 0)::BIGINT INTO v_current_xp
  FROM public.xp_events
  WHERE student_id = p_student_id AND status = 'valid';

  IF v_current_xp < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'insufficient_xp',
      'error', 'Insufficient XP balance. Student currently has ' || v_current_xp || ' XP, but deduction requires ' || p_amount || ' XP.',
      'current_xp', v_current_xp,
      'required_xp', p_amount
    );
  END IF;

  -- 3. Insert negative XP ledger row
  INSERT INTO public.xp_events (
    student_id,
    action_type,
    xp_amount,
    reference_id,
    status,
    void_reason
  ) VALUES (
    p_student_id,
    p_action_type,
    -p_amount,
    v_effective_ref,
    'valid',
    trim(p_reason)
  )
  RETURNING id INTO v_event_id;

  v_new_total := v_current_xp - p_amount;

  -- 4. Record in audit_logs
  INSERT INTO public.audit_logs (
    actor_id,
    action,
    target_type,
    target_id,
    reason,
    details
  ) VALUES (
    p_actor,
    'deduct_xp',
    'student',
    p_student_id::text,
    trim(p_reason),
    jsonb_build_object(
      'event_id', v_event_id,
      'deducted_amount', p_amount,
      'action_type', p_action_type,
      'previous_xp', v_current_xp,
      'new_total', v_new_total,
      'reference_id', v_effective_ref
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'status', 'success',
    'event_id', v_event_id,
    'deducted_amount', p_amount,
    'previous_xp', v_current_xp,
    'new_total', v_new_total,
    'reference_id', v_effective_ref
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.deduct_xp FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_xp TO service_role, postgres;

-- 5. REWARDS STORE REDEMPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.student_reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  reward_id TEXT NOT NULL,
  reward_title TEXT NOT NULL,
  reward_category TEXT NOT NULL DEFAULT 'merchandise',
  xp_cost INT NOT NULL CHECK (xp_cost > 0),
  claim_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'claimed', 'expired', 'refunded')),
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at TIMESTAMPTZ NULL,
  notes TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_redemptions_student ON public.student_reward_redemptions(student_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_claim_code ON public.student_reward_redemptions(claim_code);

ALTER TABLE public.student_reward_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "redemptions_student_select" ON public.student_reward_redemptions;
CREATE POLICY "redemptions_student_select"
ON public.student_reward_redemptions
FOR SELECT
TO authenticated
USING (student_id = auth.uid() OR public.get_my_role() IN ('faculty', 'admin'));

-- 6. BOSS BATTLE SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.boss_battle_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  boss_name TEXT NOT NULL DEFAULT 'The Semester Gorgon',
  boss_max_hp INT NOT NULL DEFAULT 100,
  boss_current_hp INT NOT NULL DEFAULT 100,
  total_questions INT NOT NULL DEFAULT 15,
  correct_answers INT NOT NULL DEFAULT 0,
  wrong_answers INT NOT NULL DEFAULT 0,
  time_limit_seconds INT NOT NULL DEFAULT 1200,
  time_spent_seconds INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'won', 'lost', 'abandoned')),
  score_percentage INT NOT NULL DEFAULT 0,
  xp_awarded INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_boss_battles_student ON public.boss_battle_sessions(student_id);

ALTER TABLE public.boss_battle_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "boss_battles_student_select" ON public.boss_battle_sessions;
CREATE POLICY "boss_battles_student_select"
ON public.boss_battle_sessions
FOR SELECT
TO authenticated
USING (student_id = auth.uid() OR public.get_my_role() IN ('faculty', 'admin'));
