'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getIstWeekDetails } from '@/lib/quests';
import { levelFromXp } from '@/lib/levels';
import { getRankForLevel } from '@/lib/ranks';

export interface CampusStandingItem {
  campusId: string;
  name: string;
  city: string;
  displayName: string;
  isOther: boolean;
  totalStudents: number;
  activeStudents: number;
  totalXp: number;
  averageXpPerActive: number;
  averageXpPerStudent: number;
  highestXp: number;
  topStudentName: string;
  rank: number;
  tier: 'high_avg' | 'core_avg' | 'low_avg';
  deltaFromGlobalAvg: number; // percentage +/-
}

export interface DepartmentAverageItem {
  department: string;
  totalStudents: number;
  activeStudents: number;
  totalXp: number;
  averageXp: number;
  status: 'high_avg' | 'low_avg' | 'core_avg';
  diffFromCampusAvg: number;
}

export interface StudentLeaderboardRow {
  studentId: string;
  name: string;
  rollNo: string;
  department: string;
  yearOfStudy: number;
  campusName: string;
  totalXp: number;
  streak: number;
  level: number;
  rankTier: {
    name: string;
    slug: string;
    color: string;
    min_level: number;
  };
  rank: number;
  isAboveAverage: boolean;
  diffFromCampusAvg: number;
}

export interface AcademicLeaderboardResponse {
  success: boolean;
  error?: string;
  timeframe: 'weekly' | 'all-time';
  callerRole: 'faculty' | 'admin';
  callerCampusId?: string | null;
  selectedCampusId: string;
  allCampuses: { id: string; name: string; city: string; displayName: string }[];
  globalBenchmark: {
    totalStudents: number;
    activeStudents: number;
    totalXp: number;
    globalAverageXp: number;
    highestAvgCampus: { name: string; avg: number } | null;
    lowestAvgCampus: { name: string; avg: number } | null;
  };
  interCampusStandings: CampusStandingItem[];
  intraCampus: {
    campusId: string;
    campusName: string;
    totalStudents: number;
    activeStudents: number;
    totalXp: number;
    campusAverageXp: number;
    departmentAverages: DepartmentAverageItem[];
    students: StudentLeaderboardRow[];
    highAvgCount: number;
    lowAvgCount: number;
  };
}

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Server configuration error: missing service role credentials');
  }
  return createAdminClient(supabaseUrl, serviceRoleKey);
}

export async function getAcademicLeaderboardAction(options?: {
  timeframe?: 'weekly' | 'all-time';
  campusId?: string;
  department?: string;
  yearOfStudy?: number;
}): Promise<AcademicLeaderboardResponse> {
  const timeframe = options?.timeframe || 'all-time';
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized: Authentication required.');
  }

  const adminClient = getAdminClient();

  // 1. Fetch requester profile
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role, campus_id')
    .eq('id', user.id)
    .single();

  const callerRole = (profile?.role === 'admin' ? 'admin' : 'faculty') as 'faculty' | 'admin';
  const callerCampusId = profile?.campus_id;

  // 2. Fetch all active campuses
  const { data: rawCampuses } = await adminClient
    .from('campuses')
    .select('id, name, city, is_other, slug')
    .eq('is_active', true)
    .order('name');

  const allCampuses = (rawCampuses || []).map((c) => ({
    id: c.id,
    name: c.name,
    city: c.city || '',
    displayName: c.is_other ? 'Other Campuses' : c.city ? `${c.name}, ${c.city}` : c.name,
  }));

  // Resolve target campus: options.campusId > callerCampusId > first campus in list
  const selectedCampusId =
    options?.campusId ||
    callerCampusId ||
    (allCampuses.length > 0 ? allCampuses[0].id : '');

  // 3. Query all registered students with profile and campus info
  const { data: studentsRaw, error: studErr } = await adminClient
    .from('students')
    .select('id, roll_no, department, year_of_study, profiles!inner(role, full_name, campus_id, is_anonymous, campuses(name, city, is_other))')
    .eq('profiles.role', 'student');

  if (studErr || !studentsRaw) {
    console.error('Error fetching students:', studErr);
    return {
      success: false,
      error: 'Failed to fetch student data for leaderboard.',
      timeframe,
      callerRole,
      callerCampusId,
      selectedCampusId,
      allCampuses,
      globalBenchmark: {
        totalStudents: 0,
        activeStudents: 0,
        totalXp: 0,
        globalAverageXp: 0,
        highestAvgCampus: null,
        lowestAvgCampus: null,
      },
      interCampusStandings: [],
      intraCampus: {
        campusId: selectedCampusId,
        campusName: '',
        totalStudents: 0,
        activeStudents: 0,
        totalXp: 0,
        campusAverageXp: 0,
        departmentAverages: [],
        students: [],
        highAvgCount: 0,
        lowAvgCount: 0,
      },
    };
  }

  // 4. Query valid XP events (weekly or all-time)
  let xpQuery = adminClient
    .from('xp_events')
    .select('student_id, xp_amount, created_at')
    .eq('status', 'valid');

  if (timeframe === 'weekly') {
    const { weekStart, weekEnd } = getIstWeekDetails();
    xpQuery = xpQuery
      .gte('created_at', `${weekStart}T00:00:00+05:30`)
      .lte('created_at', `${weekEnd}T23:59:59.999+05:30`);
  }

  const { data: xpEventsRaw } = await xpQuery;
  const xpMap = new Map<string, number>();
  for (const ev of xpEventsRaw || []) {
    xpMap.set(ev.student_id, (xpMap.get(ev.student_id) || 0) + (ev.xp_amount || 0));
  }

  // 5. Query streaks for active decay check
  const studentIds = studentsRaw.map((s) => s.id);
  const streakMap = new Map<string, number>();
  if (studentIds.length > 0) {
    const { data: streaks } = await adminClient
      .from('student_streaks')
      .select('student_id, current_streak, last_quiz_date, freeze_days_used_this_month, freeze_days_month')
      .in('student_id', studentIds);

    const todayDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
    }).format(new Date());
    const currentMonth = todayDate.substring(0, 7);

    for (const st of streaks || []) {
      let s = st.current_streak || 0;
      if (st.last_quiz_date && st.last_quiz_date !== todayDate) {
        const d1 = new Date(`${st.last_quiz_date}T00:00:00Z`);
        const d2 = new Date(`${todayDate}T00:00:00Z`);
        const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 1) {
          const freezeUsed =
            st.freeze_days_month === currentMonth ? st.freeze_days_used_this_month ?? 0 : 0;
          const freezesRemaining = Math.max(0, 2 - freezeUsed);
          if (diffDays - 1 > freezesRemaining) {
            s = 0;
          }
        }
      }
      streakMap.set(st.student_id, s);
    }
  }

  // 6. Aggregate Inter-Campus Standings
  const campusStudentsMap = new Map<string, any[]>();
  for (const c of allCampuses) {
    campusStudentsMap.set(c.id, []);
  }

  for (const s of studentsRaw) {
    const prof = s.profiles as any;
    const cid = prof?.campus_id;
    if (cid && campusStudentsMap.has(cid)) {
      campusStudentsMap.get(cid)!.push(s);
    }
  }

  // Calculate Global Benchmark metrics
  let totalGlobalStudents = studentsRaw.length;
  let totalGlobalActive = 0;
  let totalGlobalXp = 0;

  for (const s of studentsRaw) {
    const xp = xpMap.get(s.id) || 0;
    if (xp > 0) totalGlobalActive++;
    totalGlobalXp += xp;
  }

  const globalAverageXp =
    totalGlobalStudents > 0
      ? Number((totalGlobalXp / totalGlobalStudents).toFixed(1))
      : 0;

  const standingsList: CampusStandingItem[] = allCampuses.map((c) => {
    const cStudents = campusStudentsMap.get(c.id) || [];
    const totalStudents = cStudents.length;
    let activeStudents = 0;
    let totalXp = 0;
    let highestXp = 0;
    let topStudentName = 'None';

    for (const s of cStudents) {
      const xp = xpMap.get(s.id) || 0;
      if (xp > 0) activeStudents++;
      totalXp += xp;
      if (xp > highestXp) {
        highestXp = xp;
        topStudentName = (s.profiles as any)?.full_name || 'Student';
      }
    }

    const averageXpPerActive =
      activeStudents > 0 ? Number((totalXp / activeStudents).toFixed(1)) : 0;
    const averageXpPerStudent =
      totalStudents > 0 ? Number((totalXp / totalStudents).toFixed(1)) : 0;

    // Delta from global average
    const delta =
      globalAverageXp > 0
        ? Number((((averageXpPerStudent - globalAverageXp) / globalAverageXp) * 100).toFixed(1))
        : 0;

    let tier: 'high_avg' | 'core_avg' | 'low_avg' = 'core_avg';
    if (averageXpPerStudent > globalAverageXp * 1.1) {
      tier = 'high_avg';
    } else if (averageXpPerStudent < globalAverageXp * 0.9) {
      tier = 'low_avg';
    }

    return {
      campusId: c.id,
      name: c.name,
      city: c.city,
      displayName: c.displayName,
      isOther: false,
      totalStudents,
      activeStudents,
      totalXp,
      averageXpPerActive,
      averageXpPerStudent,
      highestXp,
      topStudentName,
      rank: 0,
      tier,
      deltaFromGlobalAvg: delta,
    };
  });

  // Sort standings by averageXpPerStudent DESC, then totalXp DESC
  standingsList.sort((a, b) => {
    if (b.averageXpPerStudent !== a.averageXpPerStudent) {
      return b.averageXpPerStudent - a.averageXpPerStudent;
    }
    return b.totalXp - a.totalXp;
  });

  standingsList.forEach((item, index) => {
    item.rank = index + 1;
  });

  const highestAvgCampus =
    standingsList.length > 0 && standingsList[0].totalStudents > 0
      ? { name: standingsList[0].displayName, avg: standingsList[0].averageXpPerStudent }
      : null;

  const lowestAvgCampus =
    standingsList.length > 0 && standingsList[standingsList.length - 1].totalStudents > 0
      ? {
          name: standingsList[standingsList.length - 1].displayName,
          avg: standingsList[standingsList.length - 1].averageXpPerStudent,
        }
      : null;

  // 7. Aggregate Intra-Campus Data (Selected Campus)
  const targetCampusStudents = studentsRaw.filter((s) => {
    const prof = s.profiles as any;
    return prof?.campus_id === selectedCampusId;
  });

  const selectedCampusObj = allCampuses.find((c) => c.id === selectedCampusId);
  const selectedCampusName = selectedCampusObj?.displayName || 'Selected Campus';

  let intraTotalXp = 0;
  let intraActiveCount = 0;
  for (const s of targetCampusStudents) {
    const xp = xpMap.get(s.id) || 0;
    if (xp > 0) intraActiveCount++;
    intraTotalXp += xp;
  }

  const campusAverageXp =
    targetCampusStudents.length > 0
      ? Number((intraTotalXp / targetCampusStudents.length).toFixed(1))
      : 0;

  // Group by Department inside this campus
  const deptMap = new Map<
    string,
    { students: any[]; totalXp: number; activeCount: number }
  >();

  for (const s of targetCampusStudents) {
    const dept = s.department || 'General Studies';
    if (!deptMap.has(dept)) {
      deptMap.set(dept, { students: [], totalXp: 0, activeCount: 0 });
    }
    const bucket = deptMap.get(dept)!;
    bucket.students.push(s);
    const xp = xpMap.get(s.id) || 0;
    if (xp > 0) bucket.activeCount++;
    bucket.totalXp += xp;
  }

  const departmentAverages: DepartmentAverageItem[] = Array.from(deptMap.entries()).map(
    ([dept, info]) => {
      const avg =
        info.students.length > 0 ? Number((info.totalXp / info.students.length).toFixed(1)) : 0;
      const diff = Number((avg - campusAverageXp).toFixed(1));
      let status: 'high_avg' | 'low_avg' | 'core_avg' = 'core_avg';
      if (avg > campusAverageXp * 1.05) status = 'high_avg';
      else if (avg < campusAverageXp * 0.95) status = 'low_avg';

      return {
        department: dept,
        totalStudents: info.students.length,
        activeStudents: info.activeCount,
        totalXp: info.totalXp,
        averageXp: avg,
        status,
        diffFromCampusAvg: diff,
      };
    }
  );

  // Sort department averages descending by averageXp
  departmentAverages.sort((a, b) => b.averageXp - a.averageXp);

  // Map and rank all students in this campus (applying department/year filters if provided)
  let filteredStudents = targetCampusStudents;
  if (options?.department && options.department !== 'all') {
    filteredStudents = filteredStudents.filter((s) => s.department === options.department);
  }
  if (options?.yearOfStudy) {
    filteredStudents = filteredStudents.filter((s) => s.year_of_study === options.yearOfStudy);
  }

  let highAvgCount = 0;
  let lowAvgCount = 0;

  const studentRows: StudentLeaderboardRow[] = filteredStudents.map((s) => {
    const prof = s.profiles as any;
    const totalXp = xpMap.get(s.id) || 0;
    const streak = streakMap.get(s.id) || 0;
    const { level } = levelFromXp(totalXp);
    const rankTier = getRankForLevel(level);

    const isAboveAverage = totalXp >= campusAverageXp;
    if (isAboveAverage) highAvgCount++;
    else lowAvgCount++;

    const diff = Number((totalXp - campusAverageXp).toFixed(1));

    return {
      studentId: s.id,
      name: prof?.full_name || 'Student',
      rollNo: s.roll_no || 'Unassigned',
      department: s.department || 'General',
      yearOfStudy: s.year_of_study || 1,
      campusName: selectedCampusName,
      totalXp,
      streak,
      level,
      rankTier: {
        name: rankTier.name,
        slug: rankTier.slug,
        color: rankTier.color,
        min_level: rankTier.min_level,
      },
      rank: 0,
      isAboveAverage,
      diffFromCampusAvg: diff,
    };
  });

  // Sort students by totalXp DESC, then streak DESC, then rollNo ASC
  studentRows.sort((a, b) => {
    if (b.totalXp !== a.totalXp) return b.totalXp - a.totalXp;
    if (b.streak !== a.streak) return b.streak - a.streak;
    return a.rollNo.localeCompare(b.rollNo);
  });

  studentRows.forEach((s, idx) => {
    s.rank = idx + 1;
  });

  return {
    success: true,
    timeframe,
    callerRole,
    callerCampusId,
    selectedCampusId,
    allCampuses,
    globalBenchmark: {
      totalStudents: totalGlobalStudents,
      activeStudents: totalGlobalActive,
      totalXp: totalGlobalXp,
      globalAverageXp,
      highestAvgCampus,
      lowestAvgCampus,
    },
    interCampusStandings: standingsList,
    intraCampus: {
      campusId: selectedCampusId,
      campusName: selectedCampusName,
      totalStudents: targetCampusStudents.length,
      activeStudents: intraActiveCount,
      totalXp: intraTotalXp,
      campusAverageXp,
      departmentAverages,
      students: studentRows,
      highAvgCount,
      lowAvgCount,
    },
  };
}
