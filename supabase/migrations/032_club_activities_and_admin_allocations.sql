-- ==============================================================================
-- MIGRATION 032: 032_club_activities_and_admin_allocations.sql
-- Gamified Learning Platform - Faculty/Admin Club Activity XP & Admin Allocations
-- ==============================================================================

-- 1. CLUBS DIRECTORY TABLE
CREATE TABLE IF NOT EXISTS public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL DEFAULT 'Technical',
  description TEXT NULL,
  lead_faculty_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clubs_code ON public.clubs(code);
CREATE INDEX IF NOT EXISTS idx_clubs_lead ON public.clubs(lead_faculty_id);

-- 2. CLUB ACTIVITIES TABLE
CREATE TABLE IF NOT EXISTS public.club_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NULL,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled')),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_club_activities_club ON public.club_activities(club_id, activity_date);

-- 3. CLUB PARTICIPATIONS TABLE (Verified Student XP Records)
CREATE TABLE IF NOT EXISTS public.club_participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.club_activities(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'verified' CHECK (status IN ('pending', 'verified', 'rejected')),
  verified_by UUID NOT NULL REFERENCES public.profiles(id),
  rejection_reason TEXT NULL,
  override_reason TEXT NULL,
  xp_awarded INT NOT NULL DEFAULT 0,
  xp_event_id UUID NULL REFERENCES public.xp_events(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_activity_student UNIQUE (activity_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_club_participations_student ON public.club_participations(student_id);
CREATE INDEX IF NOT EXISTS idx_club_participations_activity ON public.club_participations(activity_id);

-- 4. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_participations ENABLE ROW LEVEL SECURITY;

-- CLUBS POLICIES
DROP POLICY IF EXISTS "clubs_select_all" ON public.clubs;
CREATE POLICY "clubs_select_all" ON public.clubs
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "clubs_admin_manage" ON public.clubs;
CREATE POLICY "clubs_admin_manage" ON public.clubs
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'admin' OR lead_faculty_id = auth.uid())
  WITH CHECK (public.get_my_role() = 'admin' OR lead_faculty_id = auth.uid());

-- CLUB ACTIVITIES POLICIES
DROP POLICY IF EXISTS "club_activities_select_all" ON public.club_activities;
CREATE POLICY "club_activities_select_all" ON public.club_activities
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "club_activities_manage" ON public.club_activities;
CREATE POLICY "club_activities_manage" ON public.club_activities
  FOR ALL TO authenticated
  USING (
    public.get_my_role() = 'admin'
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.clubs c
      WHERE c.id = club_activities.club_id AND c.lead_faculty_id = auth.uid()
    )
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.clubs c
      WHERE c.id = club_activities.club_id AND c.lead_faculty_id = auth.uid()
    )
  );

-- CLUB PARTICIPATIONS POLICIES
DROP POLICY IF EXISTS "club_participations_select" ON public.club_participations;
CREATE POLICY "club_participations_select" ON public.club_participations
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR public.get_my_role() IN ('faculty', 'admin')
  );

DROP POLICY IF EXISTS "club_participations_manage" ON public.club_participations;
CREATE POLICY "club_participations_manage" ON public.club_participations
  FOR ALL TO authenticated
  USING (public.get_my_role() IN ('faculty', 'admin'))
  WITH CHECK (public.get_my_role() IN ('faculty', 'admin'));

-- 5. REGISTER CLUB_ACTIVITY IN xp_rules
INSERT INTO public.xp_rules (action_type, display_name, base_xp, extra_xp, daily_limit, active)
VALUES ('CLUB_ACTIVITY', 'Club / Extracurricular Activity', 15, 0, 2, true)
ON CONFLICT (action_type) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  base_xp = EXCLUDED.base_xp,
  extra_xp = EXCLUDED.extra_xp,
  daily_limit = EXCLUDED.daily_limit,
  active = EXCLUDED.active;

-- 6. SEED INITIAL TECHNICAL CLUBS
-- Assign first faculty found as lead or default
DO $$
DECLARE
  v_lead_id UUID;
BEGIN
  SELECT id INTO v_lead_id FROM public.faculty LIMIT 1;

  INSERT INTO public.clubs (name, code, category, description, lead_faculty_id)
  VALUES 
    (
      'ACM Student Chapter',
      'ACM',
      'Technical & Algorithms',
      'Association for Computing Machinery chapter organizing algorithmic problem solving, code sprints, and technical talks.',
      v_lead_id
    ),
    (
      'Google Developer Student Club',
      'GDSC',
      'Software Engineering & Cloud',
      'Community group for university students interested in Google developer technologies, mobile development, and cloud computing.',
      v_lead_id
    ),
    (
      'CyberSecurity & CTF Guild',
      'CYBER',
      'Security & Cryptography',
      'Hands-on security research, reverse engineering, web exploitation, and inter-collegiate CTF competitions.',
      v_lead_id
    )
  ON CONFLICT (code) DO NOTHING;
END $$;
