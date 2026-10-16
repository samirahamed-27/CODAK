'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getLeaderboardData, LeaderboardEntry } from '@/lib/leaderboards';

export interface LeaderboardActionResult {
  success: boolean;
  leaderboard: LeaderboardEntry[];
  error?: string;
}

/**
 * Server Action: Get Leaderboard with server-enforced anonymous mode.
 */
export async function getLeaderboardAction(options: {
  scope: 'campus' | 'batch';
  timeframe: 'weekly' | 'all-time';
  department?: string;
  yearOfStudy?: number;
  customDate?: string;
}): Promise<LeaderboardActionResult> {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  let requesterId = user?.id;
  let requesterRole: 'student' | 'faculty' | 'admin' = 'student';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    return { success: false, leaderboard: [], error: 'Server configuration error' };
  }

  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);

  if (user) {
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role) {
      requesterRole = profile.role as 'student' | 'faculty' | 'admin';
    }
  } else {
    // Demo student fallback
    const { data: demoStudent } = await adminClient
      .from('students')
      .select('id')
      .limit(1)
      .single();
    requesterId = demoStudent?.id;
  }

  try {
    const leaderboard = await getLeaderboardData(adminClient, {
      scope: options.scope,
      timeframe: options.timeframe,
      department: options.department,
      yearOfStudy: options.yearOfStudy,
      requesterId,
      requesterRole,
      customDate: options.customDate,
    });

    return {
      success: true,
      leaderboard,
    };
  } catch (err: any) {
    return {
      success: false,
      leaderboard: [],
      error: err.message,
    };
  }
}

/**
 * Server Action: Update student anonymous mode preference in profiles table.
 */
export async function updateAnonymousPreferenceAction(isAnonymous: boolean): Promise<{
  success: boolean;
  isAnonymous: boolean;
  error?: string;
}> {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  let studentId = user?.id;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  const adminClient = serviceRoleKey
    ? createAdminClient(supabaseUrl, serviceRoleKey)
    : supabaseServer;

  if (!studentId) {
    const { data: demoStudent } = await adminClient
      .from('students')
      .select('id')
      .limit(1)
      .single();
    studentId = demoStudent?.id;
  }

  if (!studentId) {
    return { success: false, isAnonymous: false, error: 'Unauthorized: Student record not found' };
  }

  const { error: updateErr } = await adminClient
    .from('profiles')
    .update({ is_anonymous: isAnonymous })
    .eq('id', studentId);

  if (updateErr) {
    return { success: false, isAnonymous: false, error: updateErr.message };
  }

  return { success: true, isAnonymous };
}
