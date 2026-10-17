import { createAdminClient } from '@/lib/supabase/admin';

export interface AnswerSharingOptions {
  windowStart?: string;
  windowEnd?: string;
  studentId?: string;
  secondStudentId?: string;
  minCommon?: number;
  wrongThreshold?: number;
  maxTimeDeltaSeconds?: number;
}

export interface AnswerSharingFlagResult {
  id?: string;
  studentA: string;
  studentB: string;
  commonQuestionsCount: number;
  sharedWrongCount: number;
  sharedRightCount: number;
  wrongMatchRatio: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface AnswerSharingDetectionResult {
  evaluatedPairs: number;
  flaggedCount: number;
  flags: AnswerSharingFlagResult[];
}

interface StudentAnswerRecord {
  id: string;
  student_id: string;
  question_id: string;
  selected_option: string;
  is_correct: boolean;
  answered_at: string;
}

export async function runAnswerSharingDetection(
  options?: AnswerSharingOptions
): Promise<AnswerSharingDetectionResult> {
  const adminClient = createAdminClient();

  // 1. Thresholds from app_settings with fallbacks
  const { data: settings } = await adminClient
    .from('app_settings')
    .select('key, value')
    .in('key', ['answer_sharing_min_common', 'answer_sharing_wrong_threshold']);

  const settingsMap = new Map<string, any>((settings || []).map((s) => [s.key, s.value]));

  const minCommon = options?.minCommon ?? Number(settingsMap.get('answer_sharing_min_common') ?? 10);
  const wrongThreshold = options?.wrongThreshold ?? Number(settingsMap.get('answer_sharing_wrong_threshold') ?? 0.6);
  const maxTimeDeltaSeconds = options?.maxTimeDeltaSeconds ?? 120;

  // Window bounds (default last 7 days to now)
  const windowEnd = options?.windowEnd || new Date().toISOString();
  const defaultStart = new Date(new Date(windowEnd).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const windowStart = options?.windowStart || defaultStart;

  // 2. Fetch quiz answers in window
  let query = adminClient
    .from('quiz_answers')
    .select(`
      id,
      question_id,
      selected_option,
      is_correct,
      answered_at,
      quiz_attempts!inner(student_id)
    `)
    .gte('answered_at', windowStart)
    .lte('answered_at', windowEnd);

  const { data: answerRows, error: ansErr } = await query;
  if (ansErr || !answerRows) {
    console.error('Error querying quiz_answers for answer sharing:', ansErr);
    return { evaluatedPairs: 0, flaggedCount: 0, flags: [] };
  }

  // Flatten answer records
  const records: StudentAnswerRecord[] = [];
  for (const row of answerRows) {
    const studentId = (row.quiz_attempts as any)?.student_id;
    if (!studentId) continue;
    records.push({
      id: row.id,
      student_id: studentId,
      question_id: row.question_id,
      selected_option: row.selected_option,
      is_correct: row.is_correct,
      answered_at: row.answered_at,
    });
  }

  // Group records by student
  const studentAnswersMap = new Map<string, Map<string, StudentAnswerRecord>>();
  for (const rec of records) {
    if (!studentAnswersMap.has(rec.student_id)) {
      studentAnswersMap.set(rec.student_id, new Map());
    }
    const studentMap = studentAnswersMap.get(rec.student_id)!;
    // If multiple attempts at same question, keep latest
    const existing = studentMap.get(rec.question_id);
    if (!existing || new Date(rec.answered_at).getTime() > new Date(existing.answered_at).getTime()) {
      studentMap.set(rec.question_id, rec);
    }
  }

  const allStudentIds = Array.from(studentAnswersMap.keys());
  let targetPairs: Array<[string, string]> = [];

  if (options?.studentId && options?.secondStudentId) {
    const s1 = options.studentId < options.secondStudentId ? options.studentId : options.secondStudentId;
    const s2 = options.studentId < options.secondStudentId ? options.secondStudentId : options.studentId;
    targetPairs.push([s1, s2]);
  } else if (options?.studentId) {
    for (const otherId of allStudentIds) {
      if (otherId === options.studentId) continue;
      const s1 = options.studentId < otherId ? options.studentId : otherId;
      const s2 = options.studentId < otherId ? otherId : options.studentId;
      targetPairs.push([s1, s2]);
    }
  } else {
    for (let i = 0; i < allStudentIds.length; i++) {
      for (let j = i + 1; j < allStudentIds.length; j++) {
        const s1 = allStudentIds[i] < allStudentIds[j] ? allStudentIds[i] : allStudentIds[j];
        const s2 = allStudentIds[i] < allStudentIds[j] ? allStudentIds[j] : allStudentIds[i];
        targetPairs.push([s1, s2]);
      }
    }
  }

  // Deduplicate target pairs
  const pairKeySet = new Set<string>();
  const uniquePairs: Array<[string, string]> = [];
  for (const [s1, s2] of targetPairs) {
    const k = `${s1}:${s2}`;
    if (!pairKeySet.has(k)) {
      pairKeySet.add(k);
      uniquePairs.push([s1, s2]);
    }
  }

  // 3. Pre-fetch battle team partnerships to exclude battle teammate questions
  // If students were on the same battle team, collaboration is legitimate for that battle's questions!
  const { data: battleTeammates } = await adminClient
    .from('battle_team_members')
    .select('battle_id, team_id, student_id');

  // Map of "studentA:studentB" -> Set of battle_ids where they shared a team
  const sharedBattlesMap = new Map<string, Set<string>>();
  if (battleTeammates && battleTeammates.length > 0) {
    // Group team members by "battle_id:team_id"
    const teamGroups = new Map<string, string[]>();
    for (const m of battleTeammates) {
      const k = `${m.battle_id}:${m.team_id}`;
      if (!teamGroups.has(k)) teamGroups.set(k, []);
      teamGroups.get(k)!.push(m.student_id);
    }

    for (const [key, members] of teamGroups.entries()) {
      const battleId = key.split(':')[0];
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          const s1 = members[i] < members[j] ? members[i] : members[j];
          const s2 = members[i] < members[j] ? members[j] : members[i];
          const pairKey = `${s1}:${s2}`;
          if (!sharedBattlesMap.has(pairKey)) sharedBattlesMap.set(pairKey, new Set());
          sharedBattlesMap.get(pairKey)!.add(battleId);
        }
      }
    }
  }

  // Map battle_id -> Set of question_ids in that battle
  const { data: battleQuestions } = await adminClient
    .from('battle_questions')
    .select('battle_id, question_id');

  const battleQuestionsMap = new Map<string, Set<string>>();
  if (battleQuestions) {
    for (const bq of battleQuestions) {
      if (!battleQuestionsMap.has(bq.battle_id)) battleQuestionsMap.set(bq.battle_id, new Set());
      battleQuestionsMap.get(bq.battle_id)!.add(bq.question_id);
    }
  }

  const createdFlags: AnswerSharingFlagResult[] = [];
  let evaluatedPairs = 0;

  for (const [s1, s2] of uniquePairs) {
    evaluatedPairs++;
    const map1 = studentAnswersMap.get(s1);
    const map2 = studentAnswersMap.get(s2);
    if (!map1 || !map2) continue;

    // Collect questions to exclude for this pair (e.g. shared battle team questions)
    const pairKey = `${s1}:${s2}`;
    const excludedQuestions = new Set<string>();
    const sharedBattles = sharedBattlesMap.get(pairKey);
    if (sharedBattles) {
      for (const bId of sharedBattles) {
        const qIds = battleQuestionsMap.get(bId);
        if (qIds) {
          for (const qId of qIds) excludedQuestions.add(qId);
        }
      }
    }

    // Find common questions
    const commonQIds: string[] = [];
    for (const qId of map1.keys()) {
      if (excludedQuestions.has(qId)) continue; // Exclude legitimate battle team questions
      if (map2.has(qId)) {
        commonQIds.push(qId);
      }
    }

    if (commonQIds.length < minCommon) {
      // Below threshold of shared questions; do not evaluate
      continue;
    }

    // Evaluate answers
    let sharedWrongCount = 0;
    let sharedRightCount = 0;
    let qualifyingCommonCount = 0;
    const sampleSharedWrong: any[] = [];
    let minTime = Infinity;
    let maxTime = -Infinity;

    for (const qId of commonQIds) {
      const ans1 = map1.get(qId)!;
      const ans2 = map2.get(qId)!;

      const t1 = new Date(ans1.answered_at).getTime();
      const t2 = new Date(ans2.answered_at).getTime();
      const timeDeltaSeconds = Math.abs(t1 - t2) / 1000;

      // Submission time delta filter
      if (maxTimeDeltaSeconds > 0 && timeDeltaSeconds > maxTimeDeltaSeconds) {
        continue;
      }

      qualifyingCommonCount++;
      minTime = Math.min(minTime, t1, t2);
      maxTime = Math.max(maxTime, t1, t2);

      if (!ans1.is_correct && !ans2.is_correct && ans1.selected_option === ans2.selected_option) {
        sharedWrongCount++;
        if (sampleSharedWrong.length < 10) {
          sampleSharedWrong.push({
            question_id: qId,
            selected_option: ans1.selected_option,
            time_delta_seconds: Math.round(timeDeltaSeconds),
          });
        }
      } else if (ans1.is_correct && ans2.is_correct) {
        sharedRightCount++;
      }
    }

    if (qualifyingCommonCount < minCommon) {
      continue;
    }

    const wrongMatchRatio = sharedWrongCount / qualifyingCommonCount;

    // Must meet wrongThreshold and have at least 1 shared wrong choice
    if (wrongMatchRatio >= wrongThreshold && sharedWrongCount > 0) {
      const severity = wrongMatchRatio >= 0.85 || sharedWrongCount >= 10 ? 'high' : 'medium';
      const windowStartTs = minTime !== Infinity ? new Date(minTime).toISOString() : windowStart;
      const windowEndTs = maxTime !== -Infinity ? new Date(maxTime).toISOString() : windowEnd;

      const evidence = {
        common_questions_count: qualifyingCommonCount,
        shared_wrong_count: sharedWrongCount,
        shared_right_count: sharedRightCount,
        wrong_match_ratio: Number(wrongMatchRatio.toFixed(2)),
        threshold_used: wrongThreshold,
        min_common_used: minCommon,
        time_delta_seconds_limit: maxTimeDeltaSeconds,
        sample_shared_wrong: sampleSharedWrong,
      };

      const { data: flagRow, error: flagErr } = await adminClient
        .from('flags')
        .insert({
          kind: 'answer_sharing',
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
          commonQuestionsCount: qualifyingCommonCount,
          sharedWrongCount,
          sharedRightCount,
          wrongMatchRatio: Number(wrongMatchRatio.toFixed(2)),
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
