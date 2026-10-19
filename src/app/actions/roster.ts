'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { levelFromXp } from '@/lib/levels';
import { getRankForLevel } from '@/lib/ranks';

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createAdminClient(supabaseUrl, serviceRoleKey);
}

export interface StudentRosterItem {
  id: string;
  fullName: string;
  email: string;
  rollNo: string;
  department: string;
  yearOfStudy: number;
  campusName: string;
  totalXp: number;
  currentStreak: number;
  level: number;
  rankName: string;
  rankSlug: string;
  rankColor: string;
}

export interface FacultyRosterItem {
  id: string;
  fullName: string;
  email: string;
  role: 'faculty' | 'admin';
  department: string;
  designation: string;
  campusName: string;
  employeeId?: string | null;
  redeemedInvite?: {
    note: string | null;
    role: string;
    redeemedAt: string;
  } | null;
  createdAt: string;
}

/**
 * Server Action: Get student directory for Faculty or Admin.
 * Returns real names, roll numbers, department, campus, lifetime XP, streak, and rank tier.
 */
export async function getStudentDirectoryAction(params?: {
  campusId?: string;
  department?: string;
  search?: string;
}): Promise<{
  success: boolean;
  students: StudentRosterItem[];
  error?: string;
  statusCode?: number;
}> {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    return { success: false, students: [], error: 'Unauthorized: Session required.', statusCode: 401 };
  }

  const adminClient = getAdminClient();

  // Verify caller is faculty or admin
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role, campus_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || (profile.role !== 'faculty' && profile.role !== 'admin')) {
    return {
      success: false,
      students: [],
      error: 'Forbidden: Faculty or Administrator access required.',
      statusCode: 403,
    };
  }

  try {
    let query = adminClient
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        campus_id,
        campus_other_name,
        campuses:campus_id (name, city, is_other),
        students!inner (roll_no, department, year_of_study)
      `)
      .eq('role', 'student');

    // Faculty default to their campus if specified or not 'all'
    const targetCampus = params?.campusId;
    if (targetCampus && targetCampus !== 'all') {
      query = query.eq('campus_id', targetCampus);
    } else if (profile.role === 'faculty' && (!targetCampus || targetCampus === 'my')) {
      if (profile.campus_id) {
        query = query.eq('campus_id', profile.campus_id);
      }
    }

    const { data: profilesRaw, error: profErr } = await query;

    if (profErr || !profilesRaw) {
      console.error('Error fetching student roster:', profErr);
      return { success: false, students: [], error: 'Failed to fetch student directory.' };
    }

    const studentIds = profilesRaw.map((p: any) => p.id);

    // Fetch total XP from xp_events for these students
    const xpMap = new Map<string, number>();
    if (studentIds.length > 0) {
      const { data: xpEvents } = await adminClient
        .from('xp_events')
        .select('student_id, xp_amount')
        .in('student_id', studentIds)
        .eq('status', 'valid');

      if (xpEvents) {
        for (const ev of xpEvents) {
          xpMap.set(ev.student_id, (xpMap.get(ev.student_id) || 0) + (ev.xp_amount || 0));
        }
      }
    }

    // Fetch streaks for these students
    const streakMap = new Map<string, number>();
    if (studentIds.length > 0) {
      const { data: streaks } = await adminClient
        .from('student_streaks')
        .select('student_id, current_streak, last_quiz_date, freeze_days_used_this_month, freeze_days_month')
        .in('student_id', studentIds);

      if (streaks) {
        const todayDate = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Kolkata',
        }).format(new Date());
        const currentMonth = todayDate.substring(0, 7);

        for (const st of streaks) {
          let s = st.current_streak || 0;
          if (st.last_quiz_date && st.last_quiz_date !== todayDate) {
            const d1 = new Date(`${st.last_quiz_date}T00:00:00Z`);
            const d2 = new Date(`${todayDate}T00:00:00Z`);
            const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays > 1) {
              const freezeUsed = st.freeze_days_month === currentMonth ? (st.freeze_days_used_this_month ?? 0) : 0;
              const freezesRemaining = Math.max(0, 2 - freezeUsed);
              if (diffDays - 1 > freezesRemaining) {
                s = 0;
              }
            }
          }
          streakMap.set(st.student_id, s);
        }
      }
    }

    let students: StudentRosterItem[] = profilesRaw.map((p: any) => {
      const stud = Array.isArray(p.students) ? p.students[0] : p.students;
      const totalXp = xpMap.get(p.id) || 0;
      const currentStreak = streakMap.get(p.id) || 0;
      const levelInfo = levelFromXp(totalXp);
      const rank = getRankForLevel(levelInfo.level);

      let campusName = 'Unassigned';
      if (p.campuses) {
        campusName = p.campuses.is_other
          ? p.campus_other_name || 'Other Campus'
          : p.campuses.city
          ? `${p.campuses.name}, ${p.campuses.city}`
          : p.campuses.name;
      }

      return {
        id: p.id,
        fullName: p.full_name || 'Student User',
        email: p.email || '',
        rollNo: stud?.roll_no || 'Unassigned',
        department: stud?.department || 'General Studies',
        yearOfStudy: stud?.year_of_study || 1,
        campusName,
        totalXp,
        currentStreak,
        level: levelInfo.level,
        rankName: rank.name,
        rankSlug: rank.slug,
        rankColor: rank.color,
      };
    });

    // Optional Search Filter
    if (params?.search && params.search.trim()) {
      const s = params.search.toLowerCase().trim();
      students = students.filter(
        (st) =>
          st.fullName.toLowerCase().includes(s) ||
          st.email.toLowerCase().includes(s) ||
          st.rollNo.toLowerCase().includes(s) ||
          st.department.toLowerCase().includes(s)
      );
    }

    // Sort descending by XP
    students.sort((a, b) => b.totalXp - a.totalXp);

    return { success: true, students };
  } catch (err: any) {
    console.error('Unexpected error in getStudentDirectoryAction:', err);
    return { success: false, students: [], error: err.message || 'Server error' };
  }
}

/**
 * Server Action: Get faculty directory for Admin.
 * Returns faculty details along with which access key/invite they redeemed.
 */
export async function getFacultyDirectoryAction(params?: {
  campusId?: string;
  search?: string;
}): Promise<{
  success: boolean;
  faculty: FacultyRosterItem[];
  error?: string;
  statusCode?: number;
}> {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    return { success: false, faculty: [], error: 'Unauthorized: Session required.', statusCode: 401 };
  }

  const adminClient = getAdminClient();

  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'admin') {
    return {
      success: false,
      faculty: [],
      error: 'Forbidden: Administrator privileges required.',
      statusCode: 403,
    };
  }

  try {
    let query = adminClient
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        role,
        created_at,
        campus_id,
        campus_other_name,
        campuses:campus_id (name, city, is_other),
        faculty (department, designation, employee_id)
      `)
      .in('role', ['faculty', 'admin'])
      .order('created_at', { ascending: false });

    if (params?.campusId && params.campusId !== 'all') {
      query = query.eq('campus_id', params.campusId);
    }

    const { data: profilesRaw, error: profErr } = await query;

    if (profErr || !profilesRaw) {
      console.error('Error fetching faculty directory:', profErr);
      return { success: false, faculty: [], error: 'Failed to fetch faculty directory.' };
    }

    const userIds = profilesRaw.map((p: any) => p.id);

    // Fetch redemption mappings for staff
    const redemptionsMap = new Map<string, { note: string | null; role: string; redeemedAt: string }>();
    if (userIds.length > 0) {
      try {
        const { data: redRaw } = await adminClient
          .from('staff_invite_redemptions')
          .select(`
            user_id,
            role,
            redeemed_at,
            staff_invites (note)
          `)
          .in('user_id', userIds);

        if (redRaw) {
          for (const r of redRaw) {
            const inviteNote = (r as any).staff_invites?.note || null;
            redemptionsMap.set(r.user_id, {
              note: inviteNote,
              role: r.role,
              redeemedAt: r.redeemed_at,
            });
          }
        }
      } catch (redErr) {
        console.warn('Could not fetch staff invite redemptions mapping:', redErr);
      }
    }

    let facultyList: FacultyRosterItem[] = profilesRaw.map((p: any) => {
      const fac = Array.isArray(p.faculty) ? p.faculty[0] : p.faculty;

      let campusName = 'Any / Unassigned';
      if (p.campuses) {
        campusName = p.campuses.is_other
          ? p.campus_other_name || 'Other Campus'
          : p.campuses.city
          ? `${p.campuses.name}, ${p.campuses.city}`
          : p.campuses.name;
      }

      return {
        id: p.id,
        fullName: p.full_name || (p.role === 'admin' ? 'Administrator' : 'Faculty Member'),
        email: p.email || '',
        role: p.role,
        department: fac?.department || (p.role === 'admin' ? 'Administration' : 'General Studies'),
        designation: fac?.designation || (p.role === 'admin' ? 'System Administrator' : 'Faculty Staff'),
        campusName,
        employeeId: fac?.employee_id || null,
        redeemedInvite: redemptionsMap.get(p.id) || null,
        createdAt: p.created_at,
      };
    });

    if (params?.search && params.search.trim()) {
      const s = params.search.toLowerCase().trim();
      facultyList = facultyList.filter(
        (f) =>
          f.fullName.toLowerCase().includes(s) ||
          f.email.toLowerCase().includes(s) ||
          f.department.toLowerCase().includes(s) ||
          f.designation.toLowerCase().includes(s)
      );
    }

    return { success: true, faculty: facultyList };
  } catch (err: any) {
    console.error('Unexpected error in getFacultyDirectoryAction:', err);
    return { success: false, faculty: [], error: err.message || 'Server error' };
  }
}
