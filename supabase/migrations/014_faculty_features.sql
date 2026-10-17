-- ==============================================================================
-- 014_faculty_features.sql
-- Question review queue (rejection_reason) & Faculty Analytics configuration
-- ==============================================================================

-- 1. Add rejection_reason column to questions table
ALTER TABLE public.questions 
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL;

-- 2. Seed faculty analytics app settings
INSERT INTO public.app_settings (key, value, description)
VALUES 
  ('weak_topic_min_answers', '20'::jsonb, 'Minimum number of quiz answers required for a topic to be eligible for weak-topic ranking'),
  ('quiet_student_days', '5'::jsonb, 'Threshold in calendar days without any XP-earning event to classify a student as quiet/disengaged')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description;
