import { createAdminClient } from '@/lib/supabase/admin';
import { getKolkataDate } from '@/lib/streaks';

export interface SpikeDetectionOptions {
  targetDate?: string; // YYYY-MM-DD in Asia/Kolkata
  studentId?: string; // Optional single student filter
}

export interface SpikeDetectionResult {
  date: string;
  evaluatedStudents: number;
  flaggedCount: number;
  flags: Array<{
    id?: string;
    student_id: string;
    ratio: number;
    today_xp: number;
    baseline_avg: number;
    baseline_days: number;
  }>;
}

export async function runSpikeDetection(
  options?: SpikeDetectionOptions
): Promise<SpikeDetectionResult> {
  const adminClient = createAdminClient();
  const targetDate = options?.targetDate || getKolkataDate();

  // Define window in Asia/Kolkata (+05:30)
  const windowStart = `${targetDate}T00:00:00.000+05:30`;
  const windowEnd = `${targetDate}T23:59:59.999+05:30`;

  // 1. Fetch configurable thresholds from app_settings
  const { data: settings } = await adminClient
    .from('app_settings')
    .select('key, value')
    .in('key', ['spike_min_xp', 'spike_ratio_threshold', 'spike_min_baseline_days']);

  const settingsMap = new Map<string, any>((settings || []).map((s) => [s.key, s.value]));

  const minXp = Number(settingsMap.get('spike_min_xp') ?? 200);
  const ratioThreshold = Number(settingsMap.get('spike_ratio_threshold') ?? 3.0);
  const minBaselineDays = Number(settingsMap.get('spike_min_baseline_days') ?? 5);

  // 2. Fetch distinct students who earned valid XP on targetDate
  let studentsQuery = adminClient
    .from('xp_events')
    .select('student_id')
    .eq('status', 'valid')
    .gte('created_at', windowStart)
    .lte('created_at', windowEnd);

  if (options?.studentId) {
    studentsQuery = studentsQuery.eq('student_id', options.studentId);
  }

  const { data: activeRows, error: activeErr } = await studentsQuery;
  if (activeErr) {
    console.error('Error fetching active students for spike detection:', activeErr);
    return { date: targetDate, evaluatedStudents: 0, flaggedCount: 0, flags: [] };
  }

  const uniqueStudentIds = Array.from(new Set((activeRows || []).map((r) => r.student_id)));

  let flaggedCount = 0;
  const createdFlags: any[] = [];

  for (const sId of uniqueStudentIds) {
    // 3. Compute student's XP today by action_type
    const { data: todayEvents, error: evErr } = await adminClient
      .from('xp_events')
      .select('id, action_type, xp_amount')
      .eq('student_id', sId)
      .eq('status', 'valid')
      .gte('created_at', windowStart)
      .lte('created_at', windowEnd);

    if (evErr || !todayEvents || todayEvents.length === 0) continue;

    const todayXp = todayEvents.reduce((acc, ev) => acc + (ev.xp_amount || 0), 0);

    // Rule: must earn at least minimum XP (config, default 200)
    if (todayXp < minXp) continue;

    const todayByAction: Record<string, number> = {};
    const eventIds: string[] = [];
    for (const ev of todayEvents) {
      todayByAction[ev.action_type] = (todayByAction[ev.action_type] || 0) + ev.xp_amount;
      eventIds.push(ev.id);
    }

    // 4. Query previous 14 active days prior to targetDate
    // An active day is a distinct calendar day where valid XP was earned
    const { data: baselineRows, error: baseErr } = await adminClient
      .from('xp_events')
      .select('created_at, xp_amount')
      .eq('student_id', sId)
      .eq('status', 'valid')
      .lt('created_at', windowStart)
      .order('created_at', { ascending: false });

    if (baseErr) continue;

    // Group earlier events by Asia/Kolkata date
    const dailyMap = new Map<string, number>();
    for (const row of baselineRows || []) {
      const rowDate = getKolkataDate(new Date(row.created_at));
      dailyMap.set(rowDate, (dailyMap.get(rowDate) || 0) + row.xp_amount);
    }

    // Sort distinct earlier dates descending and take up to 14
    const sortedDates = Array.from(dailyMap.keys()).sort().reverse().slice(0, 14);
    const activeDaysCount = sortedDates.length;

    // Rule: Must have at least 5 baseline active days.
    // Students without baseline are never flagged by ratio (daily ceilings cover them).
    if (activeDaysCount < minBaselineDays) continue;

    const baselineSum = sortedDates.reduce((acc, d) => acc + (dailyMap.get(d) || 0), 0);
    const baselineAvg = baselineSum / activeDaysCount;

    if (baselineAvg <= 0) continue;

    const ratio = todayXp / baselineAvg;

    // Rule: Today > 3x baseline average
    if (ratio > ratioThreshold) {
      const roundedRatio = Number(ratio.toFixed(2));
      const severity = roundedRatio >= 5.0 ? 'high' : 'medium';

      const evidence = {
        today_xp: todayXp,
        baseline_avg: Number(baselineAvg.toFixed(2)),
        ratio: roundedRatio,
        baseline_active_days: activeDaysCount,
        baseline_days_analyzed: sortedDates,
        today_by_action_type: todayByAction,
        event_ids: eventIds,
      };

      const { data: flagRow, error: flagErr } = await adminClient
        .from('flags')
        .insert({
          kind: 'spike',
          severity,
          student_id: sId,
          window_start: windowStart,
          window_end: windowEnd,
          evidence,
          status: 'open',
        })
        .select('id')
        .single();

      if (!flagErr && flagRow) {
        flaggedCount++;
        createdFlags.push({
          id: flagRow.id,
          student_id: sId,
          ratio: roundedRatio,
          today_xp: todayXp,
          baseline_avg: Number(baselineAvg.toFixed(2)),
          baseline_days: activeDaysCount,
        });
      }
    }
  }

  return {
    date: targetDate,
    evaluatedStudents: uniqueStudentIds.length,
    flaggedCount,
    flags: createdFlags,
  };
}
