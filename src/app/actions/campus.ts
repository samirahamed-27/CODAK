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
 * Server Action: Initial campus assignment for users without a campus.
 * Enforces that campus is fixed once assigned (cannot be overwritten by user).
 */
export async function assignInitialCampusAction(
  campusId: string,
  otherName?: string
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
    .select('id, campus_id')
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

  // 3. Update profile with campus_id and campus_other_name
  const { error: updateErr } = await adminClient
    .from('profiles')
    .update({
      campus_id: validation.campus.id,
      campus_other_name: validation.sanitizedOtherName || null,
    })
    .eq('id', user.id);

  if (updateErr) {
    return { success: false, error: updateErr.message || 'Failed to assign campus' };
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
