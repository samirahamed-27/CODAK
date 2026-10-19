import { SupabaseClient } from '@supabase/supabase-js';
import { getIstWeekDetails } from '@/lib/quests';

export interface CampusStanding {
  campusId: string;
  slug: string;
  name: string;
  city: string;
  displayName: string;
  isOther: boolean;
  activeStudentCount: number;
  totalWeeklyXp: number;
  averageWeeklyXp: number;
  rank: number | null;
  ranked: boolean;
  statusText?: string;
}

export interface CampusStandingsResult {
  standings: CampusStanding[];
  minActiveRequired: number;
  weekStart: string;
  weekEnd: string;
}

/**
 * Computes Campus Standings for the current IST week.
 *
 * Rules:
 * 1. Ranked by AVERAGE weekly XP per ACTIVE student (total weekly XP / active student count).
 * 2. Active student = A student belonging to that campus who earned >0 valid XP this week.
 * 3. Voided XP events are strictly excluded.
 * 4. A campus with fewer than N active students (campus_min_active setting, default 5)
 *    is unranked and displays "Not enough players yet".
 * 5. Deterministic tie-break: highest average weekly XP, then activeStudentCount DESC, then campus name ASC.
 * 6. "Other" campus is labeled as "Other campuses".
 */
export async function getCampusStandings(
  adminClient: SupabaseClient,
  customDate?: string | Date
): Promise<CampusStandingsResult> {
  const { weekStart, weekEnd } = getIstWeekDetails(customDate);

  // 1. Fetch configurable minimum active students setting
  let minActive = 5;
  const { data: settingRow } = await adminClient
    .from('app_settings')
    .select('value')
    .eq('key', 'campus_min_active')
    .single();

  if (settingRow?.value) {
    const parsed = parseInt(settingRow.value, 10);
    if (!isNaN(parsed) && parsed > 0) {
      minActive = parsed;
    }
  }

  // 2. Fetch all active campuses
  const { data: campuses, error: campErr } = await adminClient
    .from('campuses')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (campErr || !campuses) {
    console.error('Error fetching campuses for standings:', campErr);
    return { standings: [], minActiveRequired: minActive, weekStart, weekEnd };
  }

  // 3. Fetch all students with their campus_id (strictly excluding faculty and admin accounts)
  const { data: students, error: studErr } = await adminClient
    .from('students')
    .select('id, profiles!inner(campus_id, role)')
    .eq('profiles.role', 'student');

  if (studErr || !students) {
    console.error('Error fetching students for standings:', studErr);
    return { standings: [], minActiveRequired: minActive, weekStart, weekEnd };
  }

  const studentCampusMap = new Map<string, string>();
  for (const s of students) {
    const campusId = (s.profiles as any)?.campus_id;
    if (campusId) {
      studentCampusMap.set(s.id, campusId);
    }
  }

  // 4. Fetch valid weekly XP events from ledger
  const { data: xpEvents, error: xpErr } = await adminClient
    .from('xp_events')
    .select('student_id, xp_amount, created_at')
    .eq('status', 'valid')
    .gte('created_at', `${weekStart}T00:00:00+05:30`)
    .lte('created_at', `${weekEnd}T23:59:59.999+05:30`);

  if (xpErr) {
    console.error('Error fetching weekly xp_events for standings:', xpErr);
    return { standings: [], minActiveRequired: minActive, weekStart, weekEnd };
  }

  // 5. Aggregate student weekly XP
  const studentWeeklyXp = new Map<string, number>();
  for (const event of xpEvents || []) {
    const current = studentWeeklyXp.get(event.student_id) || 0;
    studentWeeklyXp.set(event.student_id, current + event.xp_amount);
  }

  // 6. Aggregate per campus
  const campusActiveMap = new Map<string, Set<string>>();
  const campusWeeklyXpMap = new Map<string, number>();

  for (const campus of campuses) {
    campusActiveMap.set(campus.id, new Set<string>());
    campusWeeklyXpMap.set(campus.id, 0);
  }

  studentWeeklyXp.forEach((xp, studentId) => {
    if (xp > 0) {
      const campusId = studentCampusMap.get(studentId);
      if (campusId && campusActiveMap.has(campusId)) {
        campusActiveMap.get(campusId)!.add(studentId);
        campusWeeklyXpMap.set(campusId, (campusWeeklyXpMap.get(campusId) || 0) + xp);
      }
    }
  });

  const standings = computeCampusStandingsMath(campuses, campusActiveMap, campusWeeklyXpMap, minActive);

  return {
    standings,
    minActiveRequired: minActive,
    weekStart,
    weekEnd,
  };
}

/**
 * Pure function: Calculates and ranks campuses by average weekly XP per active student.
 * Applies the minimum active players rule, deterministic tie-breakers, and unranked status formatting.
 */
export function computeCampusStandingsMath(
  campuses: Array<{ id: string; slug: string; name: string; city?: string; is_other?: boolean }>,
  campusActiveMap: Map<string, Set<string>>,
  campusWeeklyXpMap: Map<string, number>,
  minActive: number
): CampusStanding[] {
  const standingItems: CampusStanding[] = campuses.map((campus) => {
    const activeStudents = campusActiveMap.get(campus.id) || new Set<string>();
    const activeCount = activeStudents.size;
    const totalXp = campusWeeklyXpMap.get(campus.id) || 0;
    const averageWeeklyXp = activeCount > 0 ? Number((totalXp / activeCount).toFixed(2)) : 0;
    const isRanked = activeCount >= minActive;

    const displayName = campus.is_other
      ? 'Other campuses'
      : campus.city
      ? `${campus.name}, ${campus.city}`
      : campus.name;

    return {
      campusId: campus.id,
      slug: campus.slug,
      name: campus.name,
      city: campus.city || '',
      displayName,
      isOther: Boolean(campus.is_other),
      activeStudentCount: activeCount,
      totalWeeklyXp: totalXp,
      averageWeeklyXp,
      rank: null,
      ranked: isRanked,
      statusText: isRanked ? undefined : 'Not enough players yet',
    };
  });

  const rankedCampuses = standingItems
    .filter((c) => c.ranked)
    .sort((a, b) => {
      if (b.averageWeeklyXp !== a.averageWeeklyXp) {
        return b.averageWeeklyXp - a.averageWeeklyXp;
      }
      if (b.activeStudentCount !== a.activeStudentCount) {
        return b.activeStudentCount - a.activeStudentCount;
      }
      return a.name.localeCompare(b.name);
    });

  rankedCampuses.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  const unrankedCampuses = standingItems
    .filter((c) => !c.ranked)
    .sort((a, b) => {
      if (b.activeStudentCount !== a.activeStudentCount) {
        return b.activeStudentCount - a.activeStudentCount;
      }
      return a.name.localeCompare(b.name);
    });

  return [...rankedCampuses, ...unrankedCampuses];
}
