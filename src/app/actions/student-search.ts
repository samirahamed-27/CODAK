'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export interface StudentSearchResult {
  id: string;
  rollNo: string;
  fullName: string;
  department: string;
  yearOfStudy: number;
  campusName?: string;
}

export interface StudentSearchResponse {
  success: boolean;
  error?: string;
  statusCode?: number;
  students: StudentSearchResult[];
}

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createAdminClient(supabaseUrl, serviceRoleKey);
}

/**
 * Searches students by roll number or full name (max 10 results).
 * Strictly restricted to faculty and admin roles; students receive 403.
 */
export async function searchStudentsAction(query: string): Promise<StudentSearchResponse> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      statusCode: 401,
      error: 'Unauthorized: Authentication required.',
      students: [],
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
      students: [],
    };
  }

  const trimmed = query?.trim();
  if (!trimmed) {
    return {
      success: true,
      statusCode: 200,
      students: [],
    };
  }

  const adminClient = getAdminClient();

  // Search by roll number or full name via profiles join
  // PostgREST syntax for searching joined table: profiles.full_name.ilike
  const { data: studentsData, error } = await adminClient
    .from('students')
    .select('id, roll_no, department, year_of_study, profiles!inner(full_name, campus_other_name, campuses(name, city, is_other))')
    .or(`roll_no.ilike.%${trimmed}%,profiles.full_name.ilike.%${trimmed}%`)
    .limit(10);

  if (error) {
    console.error('Error searching students:', error);
    return {
      success: false,
      statusCode: 500,
      error: error.message,
      students: [],
    };
  }

  const { formatCampusDisplayName } = await import('@/lib/campus');

  const students: StudentSearchResult[] = (studentsData || []).slice(0, 10).map((s: any) => ({
    id: s.id,
    rollNo: s.roll_no,
    fullName: s.profiles?.full_name || 'Student',
    department: s.department,
    yearOfStudy: s.year_of_study,
    campusName: formatCampusDisplayName(s.profiles?.campuses, s.profiles?.campus_other_name),
  }));

  return {
    success: true,
    statusCode: 200,
    students,
  };
}
