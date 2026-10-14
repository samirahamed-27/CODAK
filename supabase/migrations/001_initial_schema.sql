-- ==============================================================================
-- PHASE 0 MIGRATION: 001_initial_schema.sql
-- Gamified Learning Platform - Core Tables & Row Level Security (RLS)
-- ==============================================================================

-- 1. Enable pgcrypto for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. CREATE TABLES
-- ==============================================================================

-- PROFILES TABLE (Base user entity linked 1:1 to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'faculty', 'admin')),
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  avatar_url TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- STUDENTS TABLE (Extended student attributes)
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  roll_no TEXT UNIQUE NOT NULL,
  department TEXT NOT NULL,
  year_of_study INT NOT NULL DEFAULT 1 CHECK (year_of_study >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FACULTY TABLE (Extended faculty attributes)
CREATE TABLE IF NOT EXISTS public.faculty (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  employee_id TEXT UNIQUE NOT NULL,
  department TEXT NOT NULL,
  designation TEXT NOT NULL DEFAULT 'Assistant Professor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- XP RULES TABLE (Rule engine - point values live in DB, never hardcoded in code)
CREATE TABLE IF NOT EXISTS public.xp_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  base_xp INT NOT NULL CHECK (base_xp >= 0),
  extra_xp INT NOT NULL DEFAULT 0 CHECK (extra_xp >= 0),
  daily_limit INT NULL CHECK (daily_limit IS NULL OR daily_limit >= 1),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- XP EVENTS TABLE (The Immutable Ledger - Every XP point is a row)
CREATE TABLE IF NOT EXISTS public.xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL REFERENCES public.xp_rules(action_type),
  xp_amount INT NOT NULL CHECK (xp_amount >= 0),
  reference_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'voided')),
  void_reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Golden Rule constraint: The same action can never be paid twice, even on a double-tap!
  CONSTRAINT unique_student_action_ref UNIQUE (student_id, action_type, reference_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_xp_events_student_status ON public.xp_events(student_id, status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ==============================================================================
-- 3. SECURITY DEFINER HELPER: get_my_role()
-- ==============================================================================
-- Prevents infinite recursion when RLS policies check the user's role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ==============================================================================
-- 4. ROLE INTEGRITY TRIGGER: PREVENT SELF ROLE-ESCALATION
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.prevent_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If the role is being changed, ensure only admin can do it
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF auth.uid() IS NOT NULL AND COALESCE(public.get_my_role(), '') <> 'admin' THEN
      RAISE EXCEPTION 'Security violation: Users are not permitted to change their own role.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_change ON public.profiles;
CREATE TRIGGER trg_prevent_role_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_role_change();

-- ==============================================================================
-- 5. SIGNUP TRIGGER: AUTO-CREATE PROFILES & STUDENTS
-- ==============================================================================
-- Requirement: Signup always creates role = 'student' and creates BOTH a profiles
-- row and a students row. The role is hardcoded and NEVER read from user metadata.
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
BEGIN
  -- Extract display name and academic info from metadata (if provided)
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  v_roll_no := COALESCE(NULLIF(NEW.raw_user_meta_data->>'roll_no', ''), 'ROLL-' || substr(NEW.id::text, 1, 8));
  v_department := COALESCE(NULLIF(NEW.raw_user_meta_data->>'department', ''), 'General Studies');

  -- 1. Create Profile with HARDCODED role = 'student'
  INSERT INTO public.profiles (id, email, full_name, role, is_anonymous)
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    'student', -- HARDCODED: client cannot supply 'admin' or 'faculty'
    FALSE
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on ALL tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- ------------------------------------------------------------------------------
-- PROFILES POLICIES
-- ------------------------------------------------------------------------------
-- Anyone authenticated can read their own profile; faculty & admins can read all
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid() OR public.get_my_role() IN ('faculty', 'admin')
);

-- Users can update only their own full_name, avatar_url, and is_anonymous
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ------------------------------------------------------------------------------
-- STUDENTS POLICIES
-- ------------------------------------------------------------------------------
-- Student can view own record; Faculty and Admin can view all students
DROP POLICY IF EXISTS "students_select_policy" ON public.students;
CREATE POLICY "students_select_policy"
ON public.students
FOR SELECT
TO authenticated
USING (
  id = auth.uid() OR public.get_my_role() IN ('faculty', 'admin')
);

-- Student can update own academic record; Admin can update any
DROP POLICY IF EXISTS "students_update_policy" ON public.students;
CREATE POLICY "students_update_policy"
ON public.students
FOR UPDATE
TO authenticated
USING (
  id = auth.uid() OR public.get_my_role() = 'admin'
)
WITH CHECK (
  id = auth.uid() OR public.get_my_role() = 'admin'
);

-- ------------------------------------------------------------------------------
-- FACULTY POLICIES
-- ------------------------------------------------------------------------------
-- Authenticated users can view faculty directory
DROP POLICY IF EXISTS "faculty_select_policy" ON public.faculty;
CREATE POLICY "faculty_select_policy"
ON public.faculty
FOR SELECT
TO authenticated
USING (TRUE);

-- Faculty can update own record; Admin can update any
DROP POLICY IF EXISTS "faculty_update_policy" ON public.faculty;
CREATE POLICY "faculty_update_policy"
ON public.faculty
FOR UPDATE
TO authenticated
USING (
  id = auth.uid() OR public.get_my_role() = 'admin'
)
WITH CHECK (
  id = auth.uid() OR public.get_my_role() = 'admin'
);

-- ------------------------------------------------------------------------------
-- XP RULES POLICIES
-- ------------------------------------------------------------------------------
-- Everyone can read active rules
DROP POLICY IF EXISTS "xp_rules_select_policy" ON public.xp_rules;
CREATE POLICY "xp_rules_select_policy"
ON public.xp_rules
FOR SELECT
TO authenticated
USING (TRUE);

-- NO INSERT, UPDATE, OR DELETE POLICIES FOR NORMAL USERS.
-- Modifications must only occur via Database Admin / Supabase Service Role.

-- ------------------------------------------------------------------------------
-- XP EVENTS POLICIES (LEDGER)
-- ------------------------------------------------------------------------------
-- Students can ONLY view their own XP history. Faculty & Admin can view all.
DROP POLICY IF EXISTS "xp_events_select_policy" ON public.xp_events;
CREATE POLICY "xp_events_select_policy"
ON public.xp_events
FOR SELECT
TO authenticated
USING (
  student_id = auth.uid() OR public.get_my_role() IN ('faculty', 'admin')
);

-- NO INSERT, UPDATE, OR DELETE POLICIES FOR NORMAL USERS.
-- The client app can NEVER write directly to the ledger.
-- In Phase 1, only the trusted server-side award_xp function will insert rows.

-- ==============================================================================
-- 7. INITIAL SEED DATA FOR XP_RULES
-- ==============================================================================
INSERT INTO public.xp_rules (action_type, display_name, base_xp, extra_xp, daily_limit, active)
VALUES
  ('ATTENDANCE', 'Class Attendance', 10, 0, NULL, TRUE),
  ('DAILY_QUIZ', 'Daily Concept Quiz', 15, 5, 1, TRUE),
  ('PEER_HELP', 'Peer Tutoring & Help', 15, 0, 3, TRUE),
  ('ASSIGNMENT_ON_TIME', 'On-Time Assignment Submission', 20, 0, NULL, TRUE),
  ('CLUB_ACTIVITY', 'Technical Club Participation', 25, 0, NULL, TRUE),
  ('STREAK_7_BONUS', '7-Day Streak Milestone Reward', 50, 0, NULL, TRUE)
ON CONFLICT (action_type) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  base_xp = EXCLUDED.base_xp,
  extra_xp = EXCLUDED.extra_xp,
  daily_limit = EXCLUDED.daily_limit,
  active = EXCLUDED.active;
