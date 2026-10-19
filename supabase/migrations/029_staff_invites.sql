-- Migration 029: Staff Invites & Secure Role Promotion
-- Implements staff_invites table, faculty table enhancements, and atomic promote_to_staff()

-- 1. Create staff_invites Table
CREATE TABLE IF NOT EXISTS public.staff_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('faculty', 'admin')),
  code_hash TEXT NOT NULL UNIQUE,
  campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  max_uses INT NOT NULL DEFAULT 1 CHECK (max_uses >= 1),
  used_count INT NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  revoked_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_invites_code_hash ON public.staff_invites(code_hash);
CREATE INDEX IF NOT EXISTS idx_staff_invites_role ON public.staff_invites(role);
CREATE INDEX IF NOT EXISTS idx_staff_invites_expires ON public.staff_invites(expires_at);

-- RLS: No client access at all. Only server-side service role touches it.
ALTER TABLE public.staff_invites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.staff_invites FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.staff_invites TO service_role, postgres;

-- 2. Enhance faculty table: make employee_id optional and add campus_id
ALTER TABLE public.faculty ALTER COLUMN employee_id DROP NOT NULL;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL;

-- 3. Update role change protection trigger to allow internal promote_to_staff
CREATE OR REPLACE FUNCTION public.prevent_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Allow internal system promotion
  IF current_setting('app.in_promote_to_staff', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- If the role is being changed, ensure only admin can do it
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF auth.uid() IS NOT NULL AND COALESCE(public.get_my_role(), '') <> 'admin' THEN
      RAISE EXCEPTION 'Security violation: Users are not permitted to change their own role.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Atomic promote_to_staff function (SECURITY DEFINER, service_role only)
CREATE OR REPLACE FUNCTION public.promote_to_staff(
  p_user_id UUID,
  p_role TEXT,
  p_invite_id UUID,
  p_department TEXT DEFAULT 'General',
  p_designation TEXT DEFAULT 'Assistant Professor',
  p_campus_id UUID DEFAULT NULL,
  p_employee_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
  v_effective_campus_id UUID;
BEGIN
  -- 1. Validate target role
  IF p_role NOT IN ('faculty', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid target role.');
  END IF;

  -- 2. Lock and re-check the invite row
  SELECT * INTO v_invite
  FROM public.staff_invites
  WHERE id = p_invite_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired code');
  END IF;

  IF v_invite.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired code');
  END IF;

  IF v_invite.expires_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired code');
  END IF;

  IF v_invite.used_count >= v_invite.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired code');
  END IF;

  IF v_invite.role <> p_role THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired code');
  END IF;

  -- 3. Check for student activity. Refuse promotion if account has active game data.
  IF EXISTS (SELECT 1 FROM public.xp_events WHERE student_id = p_user_id) OR
     EXISTS (SELECT 1 FROM public.quiz_attempts WHERE student_id = p_user_id) OR
     EXISTS (SELECT 1 FROM public.duels WHERE challenger_id = p_user_id OR challenged_id = p_user_id) OR
     EXISTS (SELECT 1 FROM public.battle_participants WHERE student_id = p_user_id) OR
     EXISTS (SELECT 1 FROM public.student_practice_completions WHERE student_id = p_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Account has existing student activity and cannot be promoted to staff.'
    );
  END IF;

  -- 4. Delete the student row created by sign-up trigger
  DELETE FROM public.students WHERE id = p_user_id;

  -- 5. Determine effective campus ID
  v_effective_campus_id := COALESCE(v_invite.campus_id, p_campus_id);

  -- 6. Update user profile to new role
  PERFORM set_config('app.in_promote_to_staff', 'true', true);

  UPDATE public.profiles
  SET
    role = p_role,
    campus_id = COALESCE(v_effective_campus_id, profiles.campus_id)
  WHERE id = p_user_id;

  -- 7. If promoting to faculty, upsert the faculty record
  IF p_role = 'faculty' THEN
    INSERT INTO public.faculty (id, employee_id, department, designation, campus_id)
    VALUES (
      p_user_id,
      NULLIF(TRIM(p_employee_id), ''),
      COALESCE(NULLIF(TRIM(p_department), ''), 'General Studies'),
      COALESCE(NULLIF(TRIM(p_designation), ''), 'Faculty Member'),
      v_effective_campus_id
    )
    ON CONFLICT (id) DO UPDATE SET
      department = EXCLUDED.department,
      designation = EXCLUDED.designation,
      campus_id = COALESCE(EXCLUDED.campus_id, public.faculty.campus_id),
      employee_id = COALESCE(EXCLUDED.employee_id, public.faculty.employee_id);
  END IF;

  -- 8. Atomically increment used_count on the invite
  UPDATE public.staff_invites
  SET used_count = used_count + 1
  WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'success', true,
    'role', p_role,
    'invite_id', v_invite.id
  );
END;
$$;

-- 5. Strictly enforce permissions on promote_to_staff
REVOKE ALL ON FUNCTION public.promote_to_staff(UUID, TEXT, UUID, TEXT, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.promote_to_staff(UUID, TEXT, UUID, TEXT, TEXT, UUID, TEXT) TO service_role, postgres;
