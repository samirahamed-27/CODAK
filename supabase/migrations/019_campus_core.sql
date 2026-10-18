-- Migration 019: Campus Core
-- Implements:
-- 1. campuses table with 4 required seeded campuses
-- 2. profiles table campus_id and campus_other_name columns with indexes
-- 3. Immutability trigger for campus assignments (admin only can modify once assigned, writes to audit_logs)
-- 4. app_settings default for campus_min_active (default 5)
-- 5. Updated handle_new_user to capture and validate campus metadata on signup

-- ==============================================================================
-- 1. CAMPUSES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.campuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_other BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campuses_sort_order ON public.campuses(sort_order);
CREATE INDEX IF NOT EXISTS idx_campuses_is_active ON public.campuses(is_active);

-- Enable RLS
ALTER TABLE public.campuses ENABLE ROW LEVEL SECURITY;

-- Read policy: Available to both anon and authenticated users (needed on signup)
DROP POLICY IF EXISTS "campuses_select_all" ON public.campuses;
CREATE POLICY "campuses_select_all" ON public.campuses
  FOR SELECT TO anon, authenticated
  USING (true);

-- Revoke client mutations (writes only via service_role or admin)
DROP POLICY IF EXISTS "campuses_admin_insert" ON public.campuses;
CREATE POLICY "campuses_admin_insert" ON public.campuses
  FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "campuses_admin_update" ON public.campuses;
CREATE POLICY "campuses_admin_update" ON public.campuses
  FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "campuses_admin_delete" ON public.campuses;
CREATE POLICY "campuses_admin_delete" ON public.campuses
  FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');

-- Seed the 4 official campuses
INSERT INTO public.campuses (slug, name, city, sort_order, is_active, is_other)
VALUES
  ('hi-tech-delhi', 'Hi-Tech Institute of Technology', 'Delhi', 1, true, false),
  ('jagannath-jaipur', 'Jagannath University', 'Jaipur', 2, true, false),
  ('rathinam-bengaluru', 'Rathinam Institute of Technology', 'Bengaluru', 3, true, false),
  ('other', 'Other', '', 4, true, true)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  is_other = EXCLUDED.is_other;

-- ==============================================================================
-- 2. PROFILES TABLE EXTENSION
-- ==============================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campus_other_name TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_campus_id ON public.profiles(campus_id);

-- ==============================================================================
-- 3. CAMPUS IMMUTABILITY & AUDIT TRIGGER
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.prevent_campus_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_is_service_role BOOLEAN;
BEGIN
  -- If campus was already set, prevent self-modification by student or faculty
  IF OLD.campus_id IS NOT NULL AND (
    NEW.campus_id IS DISTINCT FROM OLD.campus_id OR
    NEW.campus_other_name IS DISTINCT FROM OLD.campus_other_name
  ) THEN
    v_is_service_role := (auth.role() = 'service_role');
    v_caller_role := COALESCE(public.get_my_role(), '');

    IF NOT v_is_service_role AND v_caller_role <> 'admin' THEN
      RAISE EXCEPTION 'Security violation: Users are not permitted to change their own campus once assigned.';
    END IF;

    -- If admin modified the campus, log to immutable audit_logs
    INSERT INTO public.audit_logs (
      actor_id,
      action,
      target_type,
      target_id,
      reason,
      details
    ) VALUES (
      auth.uid(),
      'CAMPUS_CHANGE',
      'PROFILE',
      NEW.id::text,
      'Admin updated campus assignment',
      jsonb_build_object(
        'old_campus_id', OLD.campus_id,
        'new_campus_id', NEW.campus_id,
        'old_other_name', OLD.campus_other_name,
        'new_other_name', NEW.campus_other_name
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_campus_change ON public.profiles;
CREATE TRIGGER trg_prevent_campus_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_campus_change();

-- ==============================================================================
-- 4. APP SETTINGS: campus_min_active
-- ==============================================================================
INSERT INTO public.app_settings (key, value, description)
VALUES ('campus_min_active', '5', 'Minimum active students required for a campus to appear in ranked campus standings')
ON CONFLICT (key) DO NOTHING;

-- ==============================================================================
-- 5. UPDATE SIGNUP TRIGGER: handle_new_user WITH CAMPUS SUPPORT
-- ==============================================================================
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
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  v_roll_no := COALESCE(NULLIF(NEW.raw_user_meta_data->>'roll_no', ''), 'ROLL-' || substr(NEW.id::text, 1, 8));
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

  -- 2. Create Student entry
  INSERT INTO public.students (id, roll_no, department, year_of_study)
  VALUES (
    NEW.id,
    v_roll_no,
    v_department,
    1
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;
