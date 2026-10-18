-- ==============================================================================
-- Migration 023: Ensure Student Records & Harden Signup Trigger
-- Description: Backfills missing public.students rows for existing profiles (e.g. faculty/admin
--              testing student features), and updates handle_new_user() with unique fallback
--              to prevent duplicate roll_no collisions on signup.
-- ==============================================================================

-- 1. BACKFILL MISSING STUDENT RECORDS FOR ANY PROFILE
INSERT INTO public.students (id, roll_no, department, year_of_study)
SELECT
  p.id,
  'ROLL-' || substr(replace(p.id::text, '-', ''), 1, 12),
  COALESCE(NULLIF(p.role, ''), 'General Studies'),
  1
FROM public.profiles p
LEFT JOIN public.students s ON s.id = p.id
WHERE s.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 2. HARDEN handle_new_user TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_roll_no TEXT;
  v_department TEXT;
  v_campus_id UUID;
  v_campus_other_name TEXT;
  v_is_valid_campus BOOLEAN;
  v_is_other_campus BOOLEAN;
BEGIN
  -- Extract display name and academic info from metadata (if provided)
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  v_roll_no := COALESCE(NULLIF(NEW.raw_user_meta_data->>'roll_no', ''), 'ROLL-' || substr(replace(NEW.id::text, '-', ''), 1, 12));
  v_department := COALESCE(NULLIF(NEW.raw_user_meta_data->>'department', ''), 'General Studies');

  -- Extract and validate campus info if passed during signup
  IF NEW.raw_user_meta_data ? 'campus_id' AND NULLIF(NEW.raw_user_meta_data->>'campus_id', '') IS NOT NULL THEN
    BEGIN
      v_campus_id := (NEW.raw_user_meta_data->>'campus_id')::uuid;
      SELECT is_active, is_other INTO v_is_valid_campus, v_is_other_campus
      FROM public.campuses
      WHERE id = v_campus_id AND is_active = true;

      IF v_is_valid_campus IS NOT TRUE THEN
        v_campus_id := NULL;
      ELSE
        IF v_is_other_campus THEN
          v_campus_other_name := NULLIF(trim(regexp_replace(NEW.raw_user_meta_data->>'campus_other_name', '<[^>]*>', '', 'g')), '');
          IF length(v_campus_other_name) > 60 THEN
            v_campus_other_name := substring(v_campus_other_name from 1 for 60);
          END IF;
        ELSE
          v_campus_other_name := NULL;
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_campus_id := NULL;
      v_campus_other_name := NULL;
    END;
  END IF;

  -- 1. Create Profile with HARDCODED role = 'student'
  INSERT INTO public.profiles (id, email, full_name, role, is_anonymous, campus_id, campus_other_name)
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    'student', -- HARDCODED: client cannot supply 'admin' or 'faculty'
    FALSE,
    v_campus_id,
    v_campus_other_name
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Create Student entry with collision resilience
  BEGIN
    INSERT INTO public.students (id, roll_no, department, year_of_study)
    VALUES (
      NEW.id,
      v_roll_no,
      v_department,
      1
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN
    -- Fallback to full 32-character hex ID if roll_no collided
    INSERT INTO public.students (id, roll_no, department, year_of_study)
    VALUES (
      NEW.id,
      'ROLL-' || replace(NEW.id::text, '-', ''),
      v_department,
      1
    )
    ON CONFLICT (id) DO NOTHING;
  END;

  RETURN NEW;
END;
$$;
