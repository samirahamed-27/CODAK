'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import {
  determineDuelWinner,
  sanitizeDuelQuestions,
  SafeDuelQuestion,
  validateDuelChallenge,
  validateDuelSubmission,
  formatDuelSummaries,
  isWithinLevelBand,
  canEarnPairDuelXp,
} from '@/lib/duels';
import { levelFromXp } from '@/lib/levels';
import { checkRateLimit } from '@/lib/rate-limits';

import { RankTier } from '@/types/database';

export interface DuelSubmissionInput {
  duelId: string;
  answers: {
    questionId: string;
    selectedChoice: string;
    timeSpentSeconds: number;
  }[];
  totalTimeSeconds: number;
}

export interface DuelSummary {
  id: string;
  status: 'open' | 'active' | 'completed' | 'expired' | 'declined';
  opponentName: string;
  opponentRollNo?: string;
  opponentLevel?: number;
  opponentRankTier?: RankTier;
  isChallenger: boolean;
  myScore?: number | null;
  myTime?: number | null;
  mySubmitted: boolean;
  opponentScore?: number | null;
  opponentTime?: number | null;
  opponentSubmitted: boolean;
  isWinner?: boolean;
  isDraw?: boolean;
  expiresAt: string;
  createdAt: string;
}

/**
 * Server Action: Joins open matchmaking or creates a new open challenge.
 */
export async function createOrJoinAutoMatchAction(): Promise<{
  success: boolean;
  duelId?: string;
  isNew?: boolean;
  error?: string;
  statusCode?: number;
}> {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  const studentId = user?.id;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    return { success: false, error: 'Server configuration error' };
  }

  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);

  if (!studentId) {
    return { success: false, error: 'Unauthorized: Student session required' };
  }

  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', studentId)
    .maybeSingle();

  if (!profile || profile.role !== 'student') {
    return { success: false, error: 'Forbidden: Only students can participate in duels.', statusCode: 403 };
  }

  const rl = await checkRateLimit(studentId, 'duel_action');
  if (!rl.allowed) {
    return { success: false, error: rl.error };
  }

  const now = new Date().toISOString();

  // 1. Fetch current student's level
  const { data: xpData } = await adminClient
    .from('student_xp_totals')
    .select('total_xp')
    .eq('student_id', studentId)
    .single();

  const myLevel = levelFromXp(xpData?.total_xp || 0).level;

  // 2. Fetch level band configuration from app_settings (default +/- 2 levels)
  const { data: bandSetting } = await adminClient
    .from('app_settings')
    .select('value')
    .eq('key', 'duel_matchmaking_level_band')
    .single();

  const levelBand = typeof bandSetting?.value === 'number' ? bandSetting.value : 2;

  // 3. Check for open duels created by another student within level band
  const { data: openDuels } = await adminClient
    .from('duels')
    .select('id, challenger_id')
    .eq('status', 'open')
    .is('challenged_id', null)
    .neq('challenger_id', studentId)
    .gt('expires_at', now)
    .order('created_at', { ascending: true })
    .limit(20);

  if (openDuels && openDuels.length > 0) {
    const challengerIds = openDuels.map((d) => d.challenger_id);
    const { data: challengerXpRows } = await adminClient
      .from('student_xp_totals')
      .select('student_id, total_xp')
      .in('student_id', challengerIds);

    const levelMap = new Map<string, number>();
    (challengerXpRows || []).forEach((row) => {
      levelMap.set(row.student_id, levelFromXp(row.total_xp || 0).level);
    });

    // Find the first open duel where challenger is within level band
    const matchedDuel = openDuels.find((od) => {
      const challengerLevel = levelMap.get(od.challenger_id) ?? 1;
      return isWithinLevelBand(myLevel, challengerLevel, levelBand);
    });

    if (matchedDuel) {
      const { error: joinErr } = await adminClient
        .from('duels')
        .update({
          challenged_id: studentId,
          status: 'active',
        })
        .eq('id', matchedDuel.id);

      if (!joinErr) {
        return { success: true, duelId: matchedDuel.id, isNew: false };
      }
    }
  }

  // 2. No open match found: Pick 5 approved questions to create a new challenge
  const { data: approvedQuestions, error: qErr } = await adminClient
    .from('questions')
    .select('id')
    .eq('status', 'approved')
    .limit(50);

  if (qErr || !approvedQuestions || approvedQuestions.length < 5) {
    return { success: false, error: 'Not enough approved questions available for duels.' };
  }

  // Randomize 5 questions
  const shuffled = [...approvedQuestions].sort(() => 0.5 - Math.random()).slice(0, 5);

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { data: newDuel, error: duelErr } = await adminClient
    .from('duels')
    .insert({
      challenger_id: studentId,
      status: 'open',
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (duelErr || !newDuel) {
    return { success: false, error: `Failed to create duel: ${duelErr?.message}` };
  }

  // Insert 5 questions
  const duelQuestionRows = shuffled.map((q, idx) => ({
    duel_id: newDuel.id,
    question_id: q.id,
    question_order: idx + 1,
  }));

  await adminClient.from('duel_questions').insert(duelQuestionRows);

  return { success: true, duelId: newDuel.id, isNew: true };
}

/**
 * Server Action: Challenges a specific peer student directly.
 */
export async function challengeDirectStudentAction(targetStudentId: string): Promise<{
  success: boolean;
  duelId?: string;
  error?: string;
  statusCode?: number;
}> {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  const studentId = user?.id;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);

  if (!studentId) return { success: false, error: 'Unauthorized: Student session required' };

  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', studentId)
    .maybeSingle();

  if (!profile || profile.role !== 'student') {
    return { success: false, error: 'Forbidden: Only students can participate in duels.', statusCode: 403 };
  }

  const rl = await checkRateLimit(studentId, 'duel_action');
  if (!rl.allowed) {
    return { success: false, error: rl.error };
  }

  // Block self-challenge
  const challengeCheck = validateDuelChallenge(studentId, targetStudentId);
  if (!challengeCheck.allowed) {
    return { success: false, error: challengeCheck.reason };
  }

  // Pick 5 approved questions
  const { data: approvedQuestions } = await adminClient
    .from('questions')
    .select('id')
    .eq('status', 'approved')
    .limit(50);

  if (!approvedQuestions || approvedQuestions.length < 5) {
    return { success: false, error: 'Not enough approved questions available.' };
  }

  const shuffled = [...approvedQuestions].sort(() => 0.5 - Math.random()).slice(0, 5);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data: newDuel, error: duelErr } = await adminClient
    .from('duels')
    .insert({
      challenger_id: studentId,
      challenged_id: targetStudentId,
      status: 'active',
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (duelErr || !newDuel) {
    return { success: false, error: duelErr?.message || 'Failed to challenge student' };
  }

  const duelQuestionRows = shuffled.map((q, idx) => ({
    duel_id: newDuel.id,
    question_id: q.id,
    question_order: idx + 1,
  }));

  await adminClient.from('duel_questions').insert(duelQuestionRows);

  return { success: true, duelId: newDuel.id };
}

/**
 * Server Action: Get Duel Session & Safe Questions (Strictly hides answers & explanations).
 */
export async function getDuelSessionAction(duelId: string): Promise<{
  success: boolean;
  duel?: any;
  questions?: SafeDuelQuestion[];
  hasSubmitted?: boolean;
  error?: string;
}> {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  let studentId = user?.id;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);

  if (!studentId) return { success: false, error: 'Unauthorized: Student session required' };

  // 1. Fetch duel
  const { data: duel, error: duelErr } = await adminClient
    .from('duels')
    .select('*')
    .eq('id', duelId)
    .single();

  if (duelErr || !duel) {
    return { success: false, error: 'Duel not found' };
  }

  // Check expiration
  const now = new Date();
  if (now > new Date(duel.expires_at) && duel.status !== 'completed') {
    await adminClient.from('duels').update({ status: 'expired' }).eq('id', duelId);
    duel.status = 'expired';
  }

  // 2. Fetch questions
  const { data: duelQuestions, error: dqErr } = await adminClient
    .from('duel_questions')
    .select('question_order, questions(id, question_text, option_a, option_b, option_c, option_d)')
    .eq('duel_id', duelId)
    .order('question_order', { ascending: true });

  if (dqErr || !duelQuestions) {
    return { success: false, error: 'Failed to load duel questions' };
  }

  const rawQuestions = duelQuestions.map((dq: any) => ({
    id: dq.questions?.id,
    question_text: dq.questions?.question_text,
    choice_a: dq.questions?.option_a,
    choice_b: dq.questions?.option_b,
    choice_c: dq.questions?.option_c,
    choice_d: dq.questions?.option_d,
    question_order: dq.question_order,
  }));

  const safeQuestions = sanitizeDuelQuestions(rawQuestions);

  // 3. Check if this student has submitted
  const isChallenger = duel.challenger_id === studentId;
  const hasSubmitted = isChallenger
    ? duel.challenger_submitted_at !== null
    : duel.challenged_submitted_at !== null;

  return {
    success: true,
    duel,
    questions: safeQuestions,
    hasSubmitted,
  };
}

/**
 * Server Action: Submit Duel Answers (Evaluates on server, awards XP when both complete).
 */
export async function submitDuelAnswersAction(input: DuelSubmissionInput): Promise<{
  success: boolean;
  score?: number;
  isCompleted?: boolean;
  isWinner?: boolean;
  isDraw?: boolean;
  error?: string;
  statusCode?: number;
}> {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  const studentId = user?.id;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);

  if (!studentId) return { success: false, error: 'Unauthorized: Student session required' };

  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', studentId)
    .maybeSingle();

  if (!profile || profile.role !== 'student') {
    return { success: false, error: 'Forbidden: Only students can participate in duels.', statusCode: 403 };
  }

  const rl = await checkRateLimit(studentId, 'duel_action');
  if (!rl.allowed) {
    return { success: false, error: rl.error };
  }

  // 1. Verify Duel
  const { data: duel, error: duelErr } = await adminClient
    .from('duels')
    .select('*')
    .eq('id', input.duelId)
    .single();

  if (duelErr || !duel) {
    return { success: false, error: 'Duel not found' };
  }

  // Validate submission rules (participant check, expiration, double-submit block)
  const submissionCheck = validateDuelSubmission(duel, studentId);
  if (!submissionCheck.valid) {
    return { success: false, error: submissionCheck.reason };
  }

  const isChallenger = duel.challenger_id === studentId;

  // 2. Fetch answer keys from server to grade
  const questionIds = input.answers.map((a) => a.questionId);
  const { data: actualQuestions } = await adminClient
    .from('questions')
    .select('id, correct_option')
    .in('id', questionIds);

  const answerKeyMap = new Map<string, string>();
  (actualQuestions || []).forEach((q: any) => answerKeyMap.set(q.id, q.correct_option));

  let score = 0;
  const answerRows = input.answers.map((ans) => {
    const expected = answerKeyMap.get(ans.questionId);
    const correct =
      Boolean(expected) &&
      String(expected).trim().toLowerCase() === String(ans.selectedChoice || '').trim().toLowerCase();
    if (correct) score++;
    return {
      duel_id: input.duelId,
      student_id: studentId,
      question_id: ans.questionId,
      selected_choice: ans.selectedChoice,
      is_correct: correct,
      time_spent_seconds: ans.timeSpentSeconds,
    };
  });

  // 3. Persist answers
  await adminClient.from('duel_answers').insert(answerRows);

  // 4. Update duel submission fields
  const submissionTime = new Date().toISOString();
  const updatePayload = isChallenger
    ? {
        challenger_score: score,
        challenger_time_seconds: input.totalTimeSeconds,
        challenger_submitted_at: submissionTime,
      }
    : {
        challenged_score: score,
        challenged_time_seconds: input.totalTimeSeconds,
        challenged_submitted_at: submissionTime,
      };

  await adminClient.from('duels').update(updatePayload).eq('id', input.duelId);

  // 5. Check if both have submitted to finalize duel & award XP
  const { data: updatedDuel } = await adminClient
    .from('duels')
    .select('*')
    .eq('id', input.duelId)
    .single();

  let isCompleted = false;
  let isWinner = false;
  let isDraw = false;

  if (
    updatedDuel &&
    updatedDuel.challenger_submitted_at &&
    updatedDuel.challenged_submitted_at
  ) {
    isCompleted = true;
    const outcome = determineDuelWinner(
      {
        id: updatedDuel.challenger_id,
        score: updatedDuel.challenger_score,
        timeSeconds: updatedDuel.challenger_time_seconds,
      },
      {
        id: updatedDuel.challenged_id,
        score: updatedDuel.challenged_score,
        timeSeconds: updatedDuel.challenged_time_seconds,
      }
    );

    isDraw = outcome.isDraw;
    isWinner = outcome.winnerId === studentId;

    // Update duel outcome in database
    await adminClient
      .from('duels')
      .update({
        winner_id: outcome.winnerId,
        is_draw: outcome.isDraw,
        status: 'completed',
      })
      .eq('id', input.duelId);

    // Check anti-win-trading per-pair daily cap (default 2 per pair per day in Asia/Kolkata)
    const { data: pairLimitSetting } = await adminClient
      .from('app_settings')
      .select('value')
      .eq('key', 'max_duel_xp_per_pair_daily')
      .single();

    const maxPairDaily = typeof pairLimitSetting?.value === 'number' ? pairLimitSetting.value : 2;

    const todayKolkataStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const istStartOfDay = new Date(`${todayKolkataStr}T00:00:00+05:30`).toISOString();

    const { count: completedPairDuelsToday } = await adminClient
      .from('duels')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed')
      .or(
        `and(challenger_id.eq.${updatedDuel.challenger_id},challenged_id.eq.${updatedDuel.challenged_id}),and(challenger_id.eq.${updatedDuel.challenged_id},challenged_id.eq.${updatedDuel.challenger_id})`
      )
      .gte('created_at', istStartOfDay)
      .neq('id', input.duelId);

    const canAwardPairXp = canEarnPairDuelXp(completedPairDuelsToday ?? 0, maxPairDaily);

    if (canAwardPairXp) {
      // Award XP to Challenger
      await adminClient.rpc('award_xp', {
        p_student_id: updatedDuel.challenger_id,
        p_action_type: outcome.challengerXpAction,
        p_reference_id: `duel:${input.duelId}`,
        p_extra_units: 0,
        p_actor: null,
      });

      // Award XP to Challenged
      await adminClient.rpc('award_xp', {
        p_student_id: updatedDuel.challenged_id,
        p_action_type: outcome.challengedXpAction,
        p_reference_id: `duel:${input.duelId}`,
        p_extra_units: 0,
        p_actor: null,
      });
    }
  }

  return {
    success: true,
    score,
    isCompleted,
    isWinner,
    isDraw,
  };
}

/**
 * Server Action: Get all duels for the current student.
 */
export async function getMyDuelsAction(): Promise<{
  success: boolean;
  duels: DuelSummary[];
  error?: string;
}> {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  let studentId = user?.id;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);

  if (!studentId) return { success: false, duels: [] };

  const { data: duels, error } = await adminClient
    .from('duels')
    .select(`
      id,
      status,
      challenger_id,
      challenged_id,
      challenger_score,
      challenger_time_seconds,
      challenger_submitted_at,
      challenged_score,
      challenged_time_seconds,
      challenged_submitted_at,
      winner_id,
      is_draw,
      expires_at,
      created_at,
      challenger:students!duels_challenger_id_fkey(roll_no, profiles(full_name, is_anonymous)),
      challenged:students!duels_challenged_id_fkey(roll_no, profiles(full_name, is_anonymous))
    `)
    .or(`challenger_id.eq.${studentId},challenged_id.eq.${studentId}`)
    .order('created_at', { ascending: false });

  if (error || !duels) {
    return { success: false, duels: [] };
  }

  let requesterRole: 'student' | 'faculty' | 'admin' = 'student';
  if (user) {
    const { data: prof } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (prof?.role) {
      requesterRole = prof.role as 'student' | 'faculty' | 'admin';
    }
  }

  const { getRankTiers, getRankForLevel } = await import('@/lib/ranks');
  const tiers = await getRankTiers(adminClient);

  // Extract distinct opponent IDs
  const opponentIds = Array.from(
    new Set(
      duels
        .map((d: any) => (d.challenger_id === studentId ? d.challenged_id : d.challenger_id))
        .filter(Boolean)
    )
  );

  const xpMap = new Map<string, number>();
  if (opponentIds.length > 0) {
    const { data: xpRows } = await adminClient
      .from('xp_events')
      .select('student_id, xp_amount')
      .in('student_id', opponentIds)
      .eq('status', 'valid');

    (xpRows || []).forEach((row: any) => {
      xpMap.set(row.student_id, (xpMap.get(row.student_id) || 0) + row.xp_amount);
    });
  }

  const summaries: DuelSummary[] = formatDuelSummaries(duels, studentId, requesterRole).map((summary, idx) => {
    const raw = duels[idx];
    const oppId = raw.challenger_id === studentId ? raw.challenged_id : raw.challenger_id;
    if (oppId) {
      const oppTotalXp = xpMap.get(oppId) || 0;
      const { level } = levelFromXp(oppTotalXp);
      const rankTier = getRankForLevel(level, tiers);
      return {
        ...summary,
        opponentLevel: level,
        opponentRankTier: rankTier,
      };
    }
    return summary;
  });

  return { success: true, duels: summaries };
}
