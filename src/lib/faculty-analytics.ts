import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { levelFromXp } from '@/lib/levels';
import { getRankForLevel } from '@/lib/ranks';

export interface FacultyAnalyticsFilter {
  campusId?: string;
  department?: string;
  yearOfStudy?: number;
  batch?: string;
  asOfDate?: Date | string;
  minTopicAnswers?: number;
  quietDaysThreshold?: number;
}

export interface TopicPerformance {
  topic: string;
  totalAnswers: number;
  correctAnswers: number;
  correctRate: number; // percentage 0 - 100
}

export interface QuietStudent {
  id: string;
  fullName: string;
  rollNo: string;
  department: string;
  yearOfStudy: number;
  campusName?: string;
  lastActiveDate: string | null;
  daysInactive: number;
  level?: number;
  rankTier?: {
    name: string;
    slug: string;
    color: string;
    min_level: number;
  };
}

export interface XpTrendDay {
  date: string; // YYYY-MM-DD
  totalXp: number;
  eventCount: number;
}

export interface FacultyCampusOption {
  id: string;
  name: string;
  city: string;
  displayName: string;
}

export interface FacultyAnalyticsData {
  totalStudents: number;
  activeStudents7d: number;
  activeRate7d: number; // percentage 0 - 100
  dailyQuizCompletionRate: number; // percentage 0 - 100
  dailyQuizCompletedCount: number;
  averageStreak: number;
  xpTrend: XpTrendDay[];
  topWeakTopics: TopicPerformance[];
  quietStudents: QuietStudent[];
  availableBatches: { department: string; yearOfStudy: number; label: string }[];
  availableCampuses: FacultyCampusOption[];
  callerCampusId?: string | null;
  selectedCampusId?: string;
}

function getAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(supabaseUrl, serviceRoleKey);
}

function toIstDateString(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function parseDate(input?: Date | string): Date {
  if (!input) return new Date();
  if (typeof input === 'string') {
    return new Date(input);
  }
  return input;
}

/**
 * Calculates academic analytics on the server using immutable ledger and quiz tables.
 */
export async function getFacultyAnalytics(
  filter: FacultyAnalyticsFilter = {},
  client?: SupabaseClient
): Promise<FacultyAnalyticsData> {
  const db = client || getAdminClient();
  const asOf = parseDate(filter.asOfDate);
  const todayStr = toIstDateString(asOf);

  // 1. Fetch Config Defaults if not explicitly overridden
  let minTopicAnswers = filter.minTopicAnswers;
  let quietDaysThreshold = filter.quietDaysThreshold;

  if (minTopicAnswers === undefined || quietDaysThreshold === undefined) {
    const { data: settings } = await db
      .from('app_settings')
      .select('key, value')
      .in('key', ['weak_topic_min_answers', 'quiet_student_days']);

    if (settings) {
      for (const s of settings) {
        if (s.key === 'weak_topic_min_answers' && minTopicAnswers === undefined) {
          minTopicAnswers = typeof s.value === 'number' ? s.value : parseInt(s.value, 10);
        }
        if (s.key === 'quiet_student_days' && quietDaysThreshold === undefined) {
          quietDaysThreshold = typeof s.value === 'number' ? s.value : parseInt(s.value, 10);
        }
      }
    }
  }

  minTopicAnswers = minTopicAnswers ?? 20;
  quietDaysThreshold = quietDaysThreshold ?? 5;

  // Fetch active campuses for the filter dropdown
  const { data: campusesRaw } = await db
    .from('campuses')
    .select('id, name, city, is_other, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  const availableCampuses: FacultyCampusOption[] = (campusesRaw || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    city: c.city,
    displayName: c.is_other ? 'Other campuses' : (c.city ? `${c.name}, ${c.city}` : c.name),
  }));

  // 2. Fetch Students and Cohorts
  let studentQuery = db
    .from('students')
    .select('id, roll_no, department, year_of_study, created_at, profiles!inner(full_name, is_anonymous, campus_id, campus_other_name, campuses(id, name, city, is_other))');

  // Apply campus filter if specified
  if (filter.campusId && filter.campusId !== 'all') {
    studentQuery = studentQuery.eq('profiles.campus_id', filter.campusId);
  }

  // Apply batch filter if specified
  if (filter.batch) {
    // Check if batch is formatted as "DEPT-YEAR" (e.g. "CSE-1") or department code
    const parts = filter.batch.split('-');
    if (parts.length === 2 && !isNaN(parseInt(parts[1], 10))) {
      studentQuery = studentQuery.eq('department', parts[0]).eq('year_of_study', parseInt(parts[1], 10));
    } else {
      studentQuery = studentQuery.eq('department', filter.batch);
    }
  } else {
    if (filter.department) studentQuery = studentQuery.eq('department', filter.department);
    if (filter.yearOfStudy) studentQuery = studentQuery.eq('year_of_study', filter.yearOfStudy);
  }

  const { data: studentsRaw, error: studentErr } = await studentQuery;
  if (studentErr) {
    console.error('Error fetching students for faculty analytics:', studentErr);
    throw new Error(studentErr.message);
  }

  const students = (studentsRaw || []).map((s: any) => {
    const prof = s.profiles;
    let campusName: string | undefined;
    if (prof?.campuses) {
      campusName = prof.campuses.is_other
        ? (prof.campus_other_name || 'Other')
        : (prof.campuses.city ? `${prof.campuses.name}, ${prof.campuses.city}` : prof.campuses.name);
    }
    return {
      id: s.id,
      rollNo: s.roll_no,
      department: s.department,
      yearOfStudy: s.year_of_study,
      fullName: prof?.full_name || 'Student',
      campusName,
      createdAt: s.created_at,
    };
  });

  const studentIds = students.map((s) => s.id);
  const totalStudents = students.length;

  // Compute available distinct batches across all students
  const { data: allBatchesData } = await db
    .from('students')
    .select('department, year_of_study');

  const batchMap = new Map<string, { department: string; yearOfStudy: number; label: string }>();
  (allBatchesData || []).forEach((b: any) => {
    const key = `${b.department}-${b.year_of_study}`;
    if (!batchMap.has(key)) {
      batchMap.set(key, {
        department: b.department,
        yearOfStudy: b.year_of_study,
        label: `${b.department} - Year ${b.year_of_study}`,
      });
    }
  });
  const availableBatches = Array.from(batchMap.values()).sort((a, b) => a.label.localeCompare(b.label));

  if (totalStudents === 0) {
    return {
      totalStudents: 0,
      activeStudents7d: 0,
      activeRate7d: 0,
      dailyQuizCompletionRate: 0,
      dailyQuizCompletedCount: 0,
      averageStreak: 0,
      xpTrend: [],
      topWeakTopics: [],
      quietStudents: [],
      availableBatches,
      availableCampuses,
    };
  }

  // 3. Compute Active Students in Last 7 Days (XP events in [asOf - 7d, asOf])
  const sevenDaysAgo = new Date(asOf.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysAgoIso = sevenDaysAgo.toISOString();
  const asOfIso = asOf.toISOString();

  const { data: activeEventsRaw } = await db
    .from('xp_events')
    .select('student_id, xp_amount, created_at')
    .eq('status', 'valid')
    .in('student_id', studentIds)
    .gte('created_at', sevenDaysAgoIso)
    .lte('created_at', asOfIso);

  const activeStudentIds = new Set((activeEventsRaw || []).map((e: any) => e.student_id));
  const activeStudents7d = activeStudentIds.size;
  const activeRate7d = Math.round((activeStudents7d / totalStudents) * 1000) / 10;

  // 4. Compute Daily Quiz Completion Rate for Today
  const { data: todayAttempts } = await db
    .from('quiz_attempts')
    .select('student_id')
    .eq('quiz_date', todayStr)
    .eq('status', 'completed')
    .in('student_id', studentIds);

  const completedStudentIds = new Set((todayAttempts || []).map((a: any) => a.student_id));
  const dailyQuizCompletedCount = completedStudentIds.size;
  const dailyQuizCompletionRate = Math.round((dailyQuizCompletedCount / totalStudents) * 1000) / 10;

  // 5. Compute Average Streak
  const { data: streaksRaw } = await db
    .from('student_streaks')
    .select('student_id, current_streak')
    .in('student_id', studentIds);

  let totalStreak = 0;
  (streaksRaw || []).forEach((s: any) => {
    totalStreak += s.current_streak || 0;
  });
  const averageStreak = totalStudents > 0 ? Math.round((totalStreak / totalStudents) * 10) / 10 : 0;

  // 6. Compute XP per day trend (last 7 calendar days up to asOf)
  const daysTrendMap = new Map<string, { totalXp: number; eventCount: number }>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(asOf.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = toIstDateString(d);
    daysTrendMap.set(dateStr, { totalXp: 0, eventCount: 0 });
  }

  (activeEventsRaw || []).forEach((e: any) => {
    const eventDate = toIstDateString(new Date(e.created_at));
    const entry = daysTrendMap.get(eventDate);
    if (entry) {
      entry.totalXp += e.xp_amount || 0;
      entry.eventCount += 1;
    }
  });

  const xpTrend: XpTrendDay[] = Array.from(daysTrendMap.entries()).map(([date, val]) => ({
    date,
    totalXp: val.totalXp,
    eventCount: val.eventCount,
  }));

  // 7. Top 3 Weak Topics
  // Query quiz_answers joined with questions(topic)
  const { data: answersRaw } = await db
    .from('quiz_answers')
    .select('is_correct, questions!inner(topic), quiz_attempts!inner(student_id)')
    .in('quiz_attempts.student_id', studentIds);

  const topicMap = new Map<string, { total: number; correct: number }>();
  (answersRaw || []).forEach((ans: any) => {
    const topic = ans.questions?.topic || 'General';
    const current = topicMap.get(topic) || { total: 0, correct: 0 };
    current.total += 1;
    if (ans.is_correct) {
      current.correct += 1;
    }
    topicMap.set(topic, current);
  });

  const eligibleTopics: TopicPerformance[] = [];
  topicMap.forEach((stats, topic) => {
    if (stats.total >= minTopicAnswers) {
      const correctRate = Math.round((stats.correct / stats.total) * 1000) / 10;
      eligibleTopics.push({
        topic,
        totalAnswers: stats.total,
        correctAnswers: stats.correct,
        correctRate,
      });
    }
  });

  // Sort ascending by correctRate (lowest correct rate first)
  eligibleTopics.sort((a, b) => a.correctRate - b.correctRate || b.totalAnswers - a.totalAnswers);
  const topWeakTopics = eligibleTopics.slice(0, 3);

  // 8. Quiet Students (no XP-earning action for >= quietDaysThreshold)
  // Query latest valid event per student
  const { data: allXpEvents } = await db
    .from('xp_events')
    .select('student_id, xp_amount, created_at')
    .eq('status', 'valid')
    .in('student_id', studentIds)
    .lte('created_at', asOfIso)
    .order('created_at', { ascending: false });

  const latestEventMap = new Map<string, Date>();
  const studentXpMap = new Map<string, number>();
  (allXpEvents || []).forEach((e: any) => {
    if (!latestEventMap.has(e.student_id)) {
      latestEventMap.set(e.student_id, new Date(e.created_at));
    }
    studentXpMap.set(e.student_id, (studentXpMap.get(e.student_id) || 0) + (e.xp_amount || 0));
  });

  const quietStudents: QuietStudent[] = [];
  students.forEach((student) => {
    const lastActive = latestEventMap.get(student.id);
    let daysInactive: number;
    let lastActiveDate: string | null = null;

    if (!lastActive) {
      // Inactive since account registration (or large default if unavailable)
      const baseTime = student.createdAt ? new Date(student.createdAt).getTime() : 0;
      daysInactive = Math.max(Math.floor((asOf.getTime() - baseTime) / (24 * 60 * 60 * 1000)), 0);
    } else {
      lastActiveDate = toIstDateString(lastActive);
      daysInactive = Math.max(Math.floor((asOf.getTime() - lastActive.getTime()) / (24 * 60 * 60 * 1000)), 0);
    }

    if (daysInactive >= quietDaysThreshold) {
      const totalXp = studentXpMap.get(student.id) || 0;
      const { level } = levelFromXp(totalXp);
      const tier = getRankForLevel(level);

      quietStudents.push({
        id: student.id,
        fullName: student.fullName,
        rollNo: student.rollNo,
        department: student.department,
        yearOfStudy: student.yearOfStudy,
        campusName: student.campusName,
        lastActiveDate,
        daysInactive,
        level,
        rankTier: {
          name: tier.name,
          slug: tier.slug,
          color: tier.color,
          min_level: tier.min_level,
        },
      });
    }
  });

  // Sort quiet students by days inactive descending
  quietStudents.sort((a, b) => b.daysInactive - a.daysInactive);

  return {
    totalStudents,
    activeStudents7d,
    activeRate7d,
    dailyQuizCompletionRate,
    dailyQuizCompletedCount,
    averageStreak,
    xpTrend,
    topWeakTopics,
    quietStudents,
    availableBatches,
    availableCampuses,
  };
}
