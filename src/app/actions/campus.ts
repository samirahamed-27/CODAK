'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Campus } from '@/types/database';
import { getActiveCampuses, validateCampusInput } from '@/lib/campus';

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Server configuration error: missing service role credentials');
  }
  return createAdminClient(supabaseUrl, serviceRoleKey);
}

export interface StudentOnboardingDetails {
  fullName?: string;
  rollNo?: string;
  department?: string;
  yearOfStudy?: number;
}

/**
 * Server Action: Fetches active campuses.
 */
export async function getCampusesAction(): Promise<{
  success: boolean;
  campuses: Campus[];
  error?: string;
}> {
  try {
    const supabaseServer = await createServerClient();
    const campuses = await getActiveCampuses(supabaseServer);
    return { success: true, campuses };
  } catch (err: any) {
    return { success: false, campuses: [], error: err.message || 'Failed to fetch campuses' };
  }
}

/**
 * Server Action: Fetches user and student onboarding details + active campuses.
 * Pre-populates the onboarding form with authenticated user details.
 */
export async function getStudentOnboardingInfoAction(): Promise<{
  success: boolean;
  campuses: Campus[];
  user?: {
    id: string;
    email: string;
    fullName: string;
    rollNo: string;
    department: string;
    yearOfStudy: number;
    campusId: string | null;
  };
  error?: string;
}> {
  try {
    const supabaseServer = await createServerClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    const campuses = await getActiveCampuses(supabaseServer);

    if (!user) {
      return { success: true, campuses };
    }

    const adminClient = getAdminClient();
    const { data: profile } = await adminClient
      .from('profiles')
      .select('id, email, full_name, campus_id')
      .eq('id', user.id)
      .maybeSingle();

    const { data: student } = await adminClient
      .from('students')
      .select('roll_no, department, year_of_study')
      .eq('id', user.id)
      .maybeSingle();

    const metadataName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.user_metadata?.display_name ||
      '';

    const emailName = user.email ? user.email.split('@')[0] : '';
    const formattedEmailName = emailName
      ? emailName.charAt(0).toUpperCase() + emailName.slice(1)
      : '';

    const initialFullName =
      profile?.full_name &&
      profile.full_name !== 'Student User' &&
      !profile.full_name.startsWith('user_')
        ? profile.full_name
        : metadataName || formattedEmailName || '';

    return {
      success: true,
      campuses,
      user: {
        id: user.id,
        email: user.email || '',
        fullName: initialFullName,
        rollNo: student?.roll_no?.startsWith('ROLL-') ? '' : student?.roll_no || '',
        department:
          student?.department && student.department !== 'General Studies'
            ? student.department
            : '',
        yearOfStudy: student?.year_of_study || 1,
        campusId: profile?.campus_id || null,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      campuses: [],
      error: err.message || 'Failed to fetch onboarding info',
    };
  }
}

/**
 * Server Action: Initial campus & student profile assignment for users without a campus.
 * Enforces that campus is fixed once assigned (cannot be overwritten by user).
 * Persists student name, roll number, department, and year of study.
 */
export async function assignInitialCampusAction(
  campusId: string,
  otherName?: string,
  studentDetails?: StudentOnboardingDetails
): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized: Session required' };
  }

  const adminClient = getAdminClient();

  // 1. Fetch user's current profile to check if campus is already set
  const { data: profile, error: profErr } = await adminClient
    .from('profiles')
    .select('id, campus_id, full_name')
    .eq('id', user.id)
    .single();

  if (profErr || !profile) {
    return { success: false, error: 'Profile not found' };
  }

  if (profile.campus_id) {
    return { success: false, error: 'Campus is already set and cannot be changed.' };
  }

  // 2. Validate selected campus
  const campuses = await getActiveCampuses(adminClient);
  const validation = await validateCampusInput(campusId, otherName, campuses);
  if (!validation.valid || !validation.campus) {
    return { success: false, error: validation.error || 'Invalid campus' };
  }

  // 3. Update profile with campus_id, campus_other_name, and optional full_name
  const profileUpdates: Record<string, any> = {
    campus_id: validation.campus.id,
    campus_other_name: validation.sanitizedOtherName || null,
  };

  if (studentDetails?.fullName && studentDetails.fullName.trim().length >= 2) {
    profileUpdates.full_name = studentDetails.fullName.trim();
  }

  const { error: updateErr } = await adminClient
    .from('profiles')
    .update(profileUpdates)
    .eq('id', user.id);

  if (updateErr) {
    return { success: false, error: updateErr.message || 'Failed to assign campus' };
  }

  // 4. Update or upsert student record with academic details
  const trimmedRollNo = studentDetails?.rollNo?.trim();
  const trimmedDept = studentDetails?.department?.trim();
  const validYear =
    typeof studentDetails?.yearOfStudy === 'number' &&
    studentDetails.yearOfStudy >= 1 &&
    studentDetails.yearOfStudy <= 6
      ? studentDetails.yearOfStudy
      : 1;

  const { data: existingStudent } = await adminClient
    .from('students')
    .select('id, roll_no, department, year_of_study')
    .eq('id', user.id)
    .maybeSingle();

  if (existingStudent) {
    const studentUpdates: Record<string, any> = {
      year_of_study: validYear,
    };
    if (trimmedDept) {
      studentUpdates.department = trimmedDept;
    }
    if (trimmedRollNo && trimmedRollNo !== existingStudent.roll_no) {
      studentUpdates.roll_no = trimmedRollNo;
    }

    const { error: studentUpdErr } = await adminClient
      .from('students')
      .update(studentUpdates)
      .eq('id', user.id);

    if (studentUpdErr) {
      if (studentUpdErr.code === '23505') {
        return {
          success: false,
          error: `Roll number "${trimmedRollNo}" is already taken by another student. Please enter your unique roll number.`,
        };
      }
      console.warn('Student academic details update warning:', studentUpdErr.message);
    }
  } else {
    const cleanId = user.id.replace(/-/g, '').toUpperCase();
    const fallbackRoll = trimmedRollNo || `ROLL-${cleanId.slice(0, 12)}`;
    const { error: studentInsErr } = await adminClient.from('students').insert({
      id: user.id,
      roll_no: fallbackRoll,
      department: trimmedDept || 'General Studies',
      year_of_study: validYear,
    });

    if (studentInsErr && studentInsErr.code === '23505') {
      return {
        success: false,
        error: `Roll number "${trimmedRollNo}" is already taken. Please enter your unique roll number.`,
      };
    }
  }

  return { success: true };
}

/**
 * Core admin campus updater function (reusable by actions and server scripts).
 */
export async function adminUpdateCampus(
  adminClient: any,
  params: {
    targetUserId: string;
    newCampusId: string;
    newOtherName?: string;
    reason?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  // Validate new campus
  const campuses = await getActiveCampuses(adminClient);
  const validation = await validateCampusInput(params.newCampusId, params.newOtherName, campuses);
  if (!validation.valid || !validation.campus) {
    return { success: false, error: validation.error || 'Invalid campus' };
  }

  // Perform update as admin
  const { error: updateErr } = await adminClient
    .from('profiles')
    .update({
      campus_id: validation.campus.id,
      campus_other_name: validation.sanitizedOtherName || null,
    })
    .eq('id', params.targetUserId);

  if (updateErr) {
    return { success: false, error: updateErr.message || 'Failed to update campus' };
  }

  return { success: true };
}

/**
 * Server Action: Admin-only campus assignment update.
 * Writes to immutable audit_logs via database trigger.
 */
export async function adminUpdateCampusAction(
  targetUserIdOrParams:
    | string
    | {
        targetUserId: string;
        newCampusId: string;
        newOtherName?: string;
        reason?: string;
      },
  newCampusIdArg?: string,
  newOtherNameArg?: string,
  reasonArg: string = 'Admin reassignment'
): Promise<{
  success: boolean;
  error?: string;
}> {
  const params =
    typeof targetUserIdOrParams === 'object'
      ? targetUserIdOrParams
      : {
          targetUserId: targetUserIdOrParams,
          newCampusId: newCampusIdArg || '',
          newOtherName: newOtherNameArg,
          reason: reasonArg,
        };

  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  const adminClient = getAdminClient();

  // If user session exists, verify admin role
  if (user) {
    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (callerProfile?.role !== 'admin') {
      return { success: false, error: 'Forbidden: Admin role required to update campus' };
    }
  }

  return adminUpdateCampus(adminClient, params);
}
