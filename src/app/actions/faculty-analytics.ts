'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { getFacultyAnalytics, FacultyAnalyticsFilter, FacultyAnalyticsData } from '@/lib/faculty-analytics';

export interface FacultyAnalyticsResponse {
  success: boolean;
  error?: string;
  statusCode?: number;
  data?: FacultyAnalyticsData;
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
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'faculty' && profile.role !== 'admin')) {
    return {
      success: false,
      statusCode: 403,
      error: 'Forbidden: Faculty or Administrator access required.',
    };
  }

  try {
    const data = await getFacultyAnalytics(filter);
    return {
      success: true,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      statusCode: 500,
      error: err.message || 'Failed to generate academic analytics.',
    };
  }
}
