-- ==============================================================================
-- MIGRATION 031: 031_attendance_core.sql
-- Gamified Learning Platform - Faculty/Admin-Controlled Attendance & XP System
-- ==============================================================================

-- 1. FACULTY_SUBJECTS (Course/Section Assignments)
CREATE TABLE IF NOT EXISTS public.faculty_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  section TEXT NOT NULL DEFAULT 'A',
  academic_year TEXT NOT NULL DEFAULT '2026-2027',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_faculty_subject_section UNIQUE (faculty_id, subject_id, section, academic_year)
);

CREATE INDEX IF NOT EXISTS idx_faculty_subjects_lookup 
  ON public.faculty_subjects(faculty_id, subject_id, section);

-- 2. STUDENT_SUBJECTS (Course/Section Enrollments)
CREATE TABLE IF NOT EXISTS public.student_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  section TEXT NOT NULL DEFAULT 'A',
  academic_year TEXT NOT NULL DEFAULT '2026-2027',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_student_subject_year UNIQUE (student_id, subject_id, academic_year)
);

CREATE INDEX IF NOT EXISTS idx_student_subjects_lookup 
  ON public.student_subjects(student_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_student_subjects_class 
  ON public.student_subjects(subject_id, section);

-- 3. ATTENDANCE_SESSIONS (Class Lecture Instances)
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  section TEXT NOT NULL DEFAULT 'A',
  faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  session_topic TEXT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_filter 
  ON public.attendance_sessions(subject_id, section, session_date);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_faculty 
  ON public.attendance_sessions(faculty_id);

-- 4. ATTENDANCE_RECORDS (Attendance Ledger & Verification)
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'excused')),
  marked_by UUID NOT NULL REFERENCES public.profiles(id),
  override_reason TEXT NULL,
  verification_method TEXT NOT NULL DEFAULT 'manual' CHECK (verification_method IN ('manual', 'session_code', 'ble', 'gps')),
  xp_awarded INT NOT NULL DEFAULT 0,
  xp_event_id UUID NULL REFERENCES public.xp_events(id) ON DELETE SET NULL,
  marked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_session_student UNIQUE (session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_records_student 
  ON public.attendance_records(student_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session 
  ON public.attendance_records(session_id);

-- 5. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.faculty_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- FACULTY_SUBJECTS POLICIES
DROP POLICY IF EXISTS "faculty_subjects_select" ON public.faculty_subjects;
CREATE POLICY "faculty_subjects_select" ON public.faculty_subjects
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "faculty_subjects_admin_manage" ON public.faculty_subjects;
CREATE POLICY "faculty_subjects_admin_manage" ON public.faculty_subjects
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'admin' OR faculty_id = auth.uid())
  WITH CHECK (public.get_my_role() = 'admin' OR faculty_id = auth.uid());

-- STUDENT_SUBJECTS POLICIES
DROP POLICY IF EXISTS "student_subjects_select" ON public.student_subjects;
CREATE POLICY "student_subjects_select" ON public.student_subjects
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid() 
    OR public.get_my_role() IN ('faculty', 'admin')
  );

DROP POLICY IF EXISTS "student_subjects_manage" ON public.student_subjects;
CREATE POLICY "student_subjects_manage" ON public.student_subjects
  FOR ALL TO authenticated
  USING (public.get_my_role() IN ('faculty', 'admin'))
  WITH CHECK (public.get_my_role() IN ('faculty', 'admin'));

-- ATTENDANCE_SESSIONS POLICIES
DROP POLICY IF EXISTS "attendance_sessions_select" ON public.attendance_sessions;
CREATE POLICY "attendance_sessions_select" ON public.attendance_sessions
  FOR SELECT TO authenticated
  USING (
    faculty_id = auth.uid()
    OR public.get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.student_subjects ss
      WHERE ss.student_id = auth.uid()
        AND ss.subject_id = attendance_sessions.subject_id
        AND ss.section = attendance_sessions.section
    )
  );

DROP POLICY IF EXISTS "attendance_sessions_manage" ON public.attendance_sessions;
CREATE POLICY "attendance_sessions_manage" ON public.attendance_sessions
  FOR ALL TO authenticated
  USING (faculty_id = auth.uid() OR public.get_my_role() = 'admin')
  WITH CHECK (faculty_id = auth.uid() OR public.get_my_role() = 'admin');

-- ATTENDANCE_RECORDS POLICIES
DROP POLICY IF EXISTS "attendance_records_select" ON public.attendance_records;
CREATE POLICY "attendance_records_select" ON public.attendance_records
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR public.get_my_role() IN ('faculty', 'admin')
  );

DROP POLICY IF EXISTS "attendance_records_manage" ON public.attendance_records;
CREATE POLICY "attendance_records_manage" ON public.attendance_records
  FOR ALL TO authenticated
  USING (public.get_my_role() IN ('faculty', 'admin'))
  WITH CHECK (public.get_my_role() IN ('faculty', 'admin'));

-- 6. REGISTER ATTENDANCE_MARKED IN xp_rules
INSERT INTO public.xp_rules (action_type, display_name, base_xp, extra_xp, daily_limit, active)
VALUES ('ATTENDANCE_MARKED', 'Class Attendance', 5, 0, 6, true)
ON CONFLICT (action_type) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  base_xp = EXCLUDED.base_xp,
  extra_xp = EXCLUDED.extra_xp,
  daily_limit = EXCLUDED.daily_limit,
  active = EXCLUDED.active;

-- 7. SEED INITIAL FACULTY ASSIGNMENTS AND STUDENT ENROLLMENTS
-- Ensure all existing faculty have CS101 and CS102 assignments
INSERT INTO public.faculty_subjects (faculty_id, subject_id, section, academic_year)
SELECT f.id, s.id, 'A', '2026-2027'
FROM public.faculty f
CROSS JOIN public.subjects s
ON CONFLICT (faculty_id, subject_id, section, academic_year) DO NOTHING;

-- Ensure all existing students are enrolled in CS101 and CS102
INSERT INTO public.student_subjects (student_id, subject_id, section, academic_year)
SELECT st.id, s.id, 'A', '2026-2027'
FROM public.students st
CROSS JOIN public.subjects s
ON CONFLICT (student_id, subject_id, academic_year) DO NOTHING;
