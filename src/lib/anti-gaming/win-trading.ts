import { createAdminClient } from '@/lib/supabase/admin';

export interface WinTradingOptions {
  windowDays?: number;
  windowStart?: string;
  windowEnd?: string;
  studentId?: string;
  secondStudentId?: string;
  maxDuelsThreshold?: number;
  oneSidedThreshold?: number;
}

export interface WinTradingFlagResult {
  id?: string;
  studentA: string;
  studentB: string;
  totalDuels: number;
  studentAWins: number;
  studentBWins: number;
  draws: number;
  oneSidedRatio: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface WinTradingDetectionResult {
  evaluatedPairs: number;
  flaggedCount: number;
  flags: WinTradingFlagResult[];
}

export async function runWinTradingDetection(
  options?: WinTradingOptions
): Promise<WinTradingDetectionResult> {
  const adminClient = createAdminClient();

  // 1. Thresholds from app_settings
  const { data: settings } = await adminClient
    .from('app_settings')
    .select('key, value')
    .in('key', ['win_trading_max_duels_window']);

  const settingsMap = new Map<string, any>((settings || []).map((s) => [s.key, s.value]));

  const maxDuelsThreshold = options?.maxDuelsThreshold ?? Number(settingsMap.get('win_trading_max_duels_window') ?? 6);
  const oneSidedThreshold = options?.oneSidedThreshold ?? 0.80;
  const windowDays = options?.windowDays ?? 7;

  // Window bounds
  const windowEnd = options?.windowEnd || new Date().toISOString();
  const defaultStart = new Date(new Date(windowEnd).getTime() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const windowStart = options?.windowStart || defaultStart;

  // 2. Query completed duels in window
  const query = adminClient
    .from('duels')
    .select(`
      id,
      challenger_id,
      challenged_id,
      status,
      winner_id,
      is_draw,
      challenger_score,
      challenged_score,
      created_at
    `)
    .eq('status', 'completed')
    .gte('created_at', windowStart)
    .lte('created_at', windowEnd);

  const { data: duels, error: duelErr } = await query;
  if (duelErr || !duels) {
    console.error('Error fetching completed duels for win-trading detection:', duelErr);
    return { evaluatedPairs: 0, flaggedCount: 0, flags: [] };
  }

  // 3. Group duels by normalized student pair
  const pairDuelsMap = new Map<string, typeof duels>();

  for (const duel of duels) {
    if (!duel.challenger_id || !duel.challenged_id) continue;
    const s1 = duel.challenger_id < duel.challenged_id ? duel.challenger_id : duel.challenged_id;
    const s2 = duel.challenger_id < duel.challenged_id ? duel.challenged_id : duel.challenger_id;

    if (options?.studentId && options?.secondStudentId) {
      const targetS1 = options.studentId < options.secondStudentId ? options.studentId : options.secondStudentId;
      const targetS2 = options.studentId < options.secondStudentId ? options.secondStudentId : options.studentId;
      if (s1 !== targetS1 || s2 !== targetS2) continue;
    } else if (options?.studentId) {
      if (s1 !== options.studentId && s2 !== options.studentId) continue;
    }

    const pairKey = `${s1}:${s2}`;
    if (!pairDuelsMap.has(pairKey)) {
      pairDuelsMap.set(pairKey, []);
    }
    pairDuelsMap.get(pairKey)!.push(duel);
  }

  const createdFlags: WinTradingFlagResult[] = [];
  let evaluatedPairs = 0;

  for (const [pairKey, pairDuels] of pairDuelsMap.entries()) {
    evaluatedPairs++;
    const [s1, s2] = pairKey.split(':');
    const totalDuels = pairDuels.length;

    let winsA = 0;
    let winsB = 0;
    let draws = 0;
    let minTime = Infinity;
    let maxTime = -Infinity;

    for (const d of pairDuels) {
      const t = new Date(d.created_at).getTime();
      minTime = Math.min(minTime, t);
      maxTime = Math.max(maxTime, t);

      if (d.winner_id === s1) {
        winsA++;
      } else if (d.winner_id === s2) {
        winsB++;
      } else {
        draws++;
      }
    }

    const maxWins = Math.max(winsA, winsB);
    const oneSidedRatio = totalDuels > 0 ? maxWins / totalDuels : 0;

    // Trigger condition:
    // 1) More than maxDuelsThreshold duels in the window (default > 6)
    // OR
    // 2) At least 4 duels and >= 80% one-sided results (farming XP to one player)
    const isExceededVolume = totalDuels > maxDuelsThreshold;
    const isOneSidedFarming = totalDuels >= 4 && oneSidedRatio >= oneSidedThreshold;

    if (isExceededVolume || isOneSidedFarming) {
      const severity = totalDuels >= 10 || (totalDuels >= 6 && oneSidedRatio >= 0.9) ? 'high' : 'medium';
      const windowStartTs = minTime !== Infinity ? new Date(minTime).toISOString() : windowStart;
      const windowEndTs = maxTime !== -Infinity ? new Date(maxTime).toISOString() : windowEnd;

      const evidence = {
        total_duels: totalDuels,
        student_a_wins: winsA,
        student_b_wins: winsB,
        draws,
        one_sided_ratio: Number(oneSidedRatio.toFixed(2)),
        threshold_duels: maxDuelsThreshold,
        one_sided_threshold: oneSidedThreshold,
        reason: isExceededVolume && isOneSidedFarming
          ? 'Excessive duel volume and high one-sided win ratio'
          : isExceededVolume
          ? 'Excessive duel volume between same pair'
          : 'High one-sided win ratio in duels',
        duels_summary: pairDuels.map((d) => ({
          duel_id: d.id,
          created_at: d.created_at,
          challenger_id: d.challenger_id,
          challenged_id: d.challenged_id,
          winner_id: d.winner_id,
          score_diff: Math.abs((d.challenger_score || 0) - (d.challenged_score || 0)),
        })),
      };

      const { data: flagRow, error: flagErr } = await adminClient
        .from('flags')
        .insert({
          kind: 'win_trading',
          severity,
          student_id: s1,
          second_student_id: s2,
          window_start: windowStartTs,
          window_end: windowEndTs,
          evidence,
          status: 'open',
        })
        .select('id')
        .single();

      if (!flagErr && flagRow) {
        createdFlags.push({
          id: flagRow.id,
          studentA: s1,
          studentB: s2,
          totalDuels,
          studentAWins: winsA,
          studentBWins: winsB,
          draws,
          oneSidedRatio: Number(oneSidedRatio.toFixed(2)),
          severity,
        });
      }
    }
  }

  return {
    evaluatedPairs,
    flaggedCount: createdFlags.length,
    flags: createdFlags,
  };
}
