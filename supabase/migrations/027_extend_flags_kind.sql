-- Migration 027: Extend flags kind constraint to support duplicate_proof and practice_velocity
ALTER TABLE public.flags DROP CONSTRAINT IF EXISTS flags_kind_check;

ALTER TABLE public.flags ADD CONSTRAINT flags_kind_check
  CHECK (kind IN ('spike', 'answer_sharing', 'win_trading', 'rate_limit', 'duplicate_proof', 'practice_velocity'));
