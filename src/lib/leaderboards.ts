import { SupabaseClient } from '@supabase/supabase-js';
import { getIstWeekDetails } from '@/lib/quests';

export interface LeaderboardEntry {
  studentId: string;
  name: string;
  rollNo?: string;
  department?: string;
  yearOfStudy?: number;
  totalXp: number;
  rank: number;
  isMe: boolean;
  isAnonymous: boolean;
}

export interface LeaderboardQueryOptions {
  scope: 'campus' | 'batch';
  timeframe: 'weekly' | 'all-time';
  department?: string;
  yearOfStudy?: number;
  requesterId?: string;
  requesterRole?: 'student' | 'faculty' | 'admin';
  customDate?: string | Date;
}

/**
 * Pure function: Formats and anonymizes leaderboard entries based on requester role and identity.
 * Strictly guarantees that peer students never receive real name or roll number of an anonymous student in the payload.
 */
export function formatLeaderboardEntries(
  rawList: {
    studentId: string;
    fullName: string;
    rollNo: string;
    department: string;
    yearOfStudy: number;
    totalXp: number;
    isAnonymous: boolean;
  }[],
  requesterId?: string,
  requesterRole: 'student' | 'faculty' | 'admin' = 'student'
): LeaderboardEntry[] {
  // 1. Sort descending by XP, then tie-break deterministically
  const sorted = [...rawList].sort((a, b) => {
    if (b.totalXp !== a.totalXp) {
      return b.totalXp - a.totalXp;
    }
    return a.studentId.localeCompare(b.studentId);
  });

  // 2. Format with rank and server-enforced privacy
  return sorted.map((item, index) => {
    const isMe = requesterId === item.studentId;
    const canViewRealIdentity =
      requesterRole === 'faculty' || requesterRole === 'admin' || isMe || !item.isAnonymous;

    return {
      studentId: item.studentId,
      name: canViewRealIdentity ? item.fullName : 'Anonymous',
      rollNo: canViewRealIdentity ? item.rollNo : undefined,
      department: item.department,
      yearOfStudy: item.yearOfStudy,
      totalXp: item.totalXp,
      rank: index + 1,
      isMe,
      isAnonymous: item.isAnonymous,
    };
  });
}

/**
 * Fetches and builds campus or batch leaderboard from the immutable xp_events ledger.
 * Excludes voided events. Supports fake dates for testing.
 */
export async function getLeaderboardData(
  adminClient: SupabaseClient,
  options: LeaderboardQueryOptions
): Promise<LeaderboardEntry[]> {
  const { scope, timeframe, department, yearOfStudy, requesterId, requesterRole = 'student', customDate } = options;
  const { weekStart, weekEnd } = getIstWeekDetails(customDate);

  // 1. Query students with their profiles
  let query = adminClient
    .from('students')
    .select('id, roll_no, department, year_of_study, profiles(full_name, is_anonymous)');

  if (scope === 'batch') {
    if (department) query = query.eq('department', department);
    if (yearOfStudy) query = query.eq('year_of_study', yearOfStudy);
  }

  const { data: students, error: studentsErr } = await query;
  if (studentsErr || !students) {
    console.error('Error fetching students for leaderboard:', studentsErr);
    return [];
  }

  // 2. Query valid XP events from ledger
  let xpQuery = adminClient
    .from('xp_events')
    .select('student_id, xp_amount, created_at')
    .eq('status', 'valid');

  if (timeframe === 'weekly') {
    // Include events where IST date falls between Monday and Sunday of that week
    xpQuery = xpQuery
      .gte('created_at', `${weekStart}T00:00:00+05:30`)
      .lte('created_at', `${weekEnd}T23:59:59.999+05:30`);
  }

  const { data: xpEvents, error: xpErr } = await xpQuery;
  if (xpErr) {
    console.error('Error fetching xp_events for leaderboard:', xpErr);
    return [];
  }

  // 3. Aggregate XP per student
  const xpMap = new Map<string, number>();
  (xpEvents || []).forEach((e) => {
    xpMap.set(e.student_id, (xpMap.get(e.student_id) || 0) + e.xp_amount);
  });

  // 4. Map raw student entries
  const rawEntries = students.map((s) => {
    const profile = (s.profiles as any) || {};
    return {
      studentId: s.id,
      fullName: profile.full_name || 'Student',
      rollNo: s.roll_no,
      department: s.department,
      yearOfStudy: s.year_of_study,
      totalXp: xpMap.get(s.id) || 0,
      isAnonymous: profile.is_anonymous || false,
    };
  });

  return formatLeaderboardEntries(rawEntries, requesterId, requesterRole);
}
