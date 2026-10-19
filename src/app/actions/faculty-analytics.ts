'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { getFacultyAnalytics, FacultyAnalyticsFilter, FacultyAnalyticsData } from '@/lib/faculty-analytics';

export interface FacultyAnalyticsResponse {
  success: boolean;
  error?: string;
  statusCode?: number;
  data?: FacultyAnalyticsData;
  callerRole?: string;
}

/**
 * Server Action: Fetch engagement, weak topics, and quiet students for faculty.
 * Strictly checks caller role; students receive a 403 error.
 */
export async function getFacultyAnalyticsAction(
  filter: FacultyAnalyticsFilter = {}
): Promise<FacultyAnalyticsResponse> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      statusCode: 401,
      error: 'Unauthorized: Authentication required.',
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, campus_id')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'faculty' && profile.role !== 'admin')) {
    return {
      success: false,
      statusCode: 403,
      error: 'Forbidden: Faculty or Administrator access required.',
    };
  }

  // Determine effective campus filter:
  // Faculty default to their own campus with an "All campuses" option; admin defaults to all.
  let targetCampusId = filter.campusId;
  if (targetCampusId === undefined) {
    if (profile.role === 'faculty') {
      targetCampusId = profile.campus_id || 'all';
    } else {
      targetCampusId = 'all';
    }
  }

  const effectiveFilter: FacultyAnalyticsFilter = {
    ...filter,
    campusId: targetCampusId,
  };

  try {
    const data = await getFacultyAnalytics(effectiveFilter);
    return {
      success: true,
      data: {
        ...data,
        callerCampusId: profile.campus_id,
        selectedCampusId: targetCampusId,
      },
      callerRole: profile.role,
    };
  } catch (err: any) {
    return {
      success: false,
      statusCode: 500,
      error: err.message || 'Failed to generate academic analytics.',
    };
  }
}
