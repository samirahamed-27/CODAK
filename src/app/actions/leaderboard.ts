'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getLeaderboardData, LeaderboardEntry } from '@/lib/leaderboards';
import { getCampusStandings, CampusStanding } from '@/lib/campus-standings';

export interface LeaderboardActionResult {
  success: boolean;
  leaderboard: LeaderboardEntry[];
  error?: string;
}

export interface CampusStandingsActionResult {
  success: boolean;
  standings: CampusStanding[];
  minActiveRequired: number;
  weekStart: string;
  weekEnd: string;
  error?: string;
}

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Server configuration error: missing service role credentials');
  }
  return createAdminClient(supabaseUrl, serviceRoleKey);
}

/**
 * Server Action: Get Leaderboard with server-enforced anonymous mode and campus scoping.
 */
export async function getLeaderboardAction(options: {
  scope: 'my_campus' | 'all_campuses' | 'batch' | 'campus';
  timeframe: 'weekly' | 'all-time';
  campusId?: string;
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

  const adminClient = getAdminClient();

  if (user) {
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role) {
      requesterRole = profile.role as 'student' | 'faculty' | 'admin';
    }
  }

  try {
    const leaderboard = await getLeaderboardData(adminClient, {
      scope: options.scope,
      timeframe: options.timeframe,
      campusId: options.campusId,
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
 * Server Action: Get Campus Standings ranked by average weekly XP per active student.
 */
export async function getCampusStandingsAction(
  customDate?: string
): Promise<CampusStandingsActionResult> {
  try {
    const adminClient = getAdminClient();
    const result = await getCampusStandings(adminClient, customDate);

    return {
      success: true,
      standings: result.standings,
      minActiveRequired: result.minActiveRequired,
      weekStart: result.weekStart,
      weekEnd: result.weekEnd,
    };
  } catch (err: any) {
    return {
      success: false,
      standings: [],
      minActiveRequired: 5,
      weekStart: '',
      weekEnd: '',
      error: err.message || 'Failed to calculate campus standings',
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
  const adminClient = getAdminClient();

  if (!studentId) {
    return { success: false, isAnonymous: false, error: 'Unauthorized: Student session required' };
  }

  const { error } = await adminClient
    .from('profiles')
    .update({ is_anonymous: isAnonymous })
    .eq('id', studentId);

  if (error) {
    return { success: false, isAnonymous: !isAnonymous, error: error.message };
  }

  return { success: true, isAnonymous };
}
