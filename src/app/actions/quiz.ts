'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getKolkataDate, evaluateStreakCompletion, StudentStreakData, addDaysToDate, daysBetweenDates } from '@/lib/streaks';

export interface QuizOptionItem {
  id: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface ClientQuizQuestion {
  id: string;
  topic: string;
  questionText: string;
  options: QuizOptionItem[];
  isAnswered: boolean;
  selectedOption?: string;
  isCorrect?: boolean;
  correctOption?: string; // Only returned if isAnswered is true!
  explanation?: string;   // Only returned if isAnswered is true!
}

export interface DailyQuizSessionResult {
  status: 'active' | 'completed' | 'error';
  attemptId?: string;
  quizDate: string;
  questions?: ClientQuizQuestion[];
  score?: number;
  totalQuestions?: number;
  xpAwarded?: number;
  streak?: {
    currentStreak: number;
    longestStreak: number;
    freezeDaysRemaining: number;
  };
  error?: string;
}

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createAdminClient(supabaseUrl, serviceRoleKey);
}

/**
 * Fisher-Yates array shuffler
 */
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Get or initialize Today's Daily Quiz for the logged-in student.
 * Guarantees that correct answers are NOT sent to client for unanswered questions.
 */
export async function getDailyQuizSessionAction(): Promise<DailyQuizSessionResult> {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    return { status: 'error', quizDate: '', error: 'Unauthorized: You must be logged in.' };
  }

  const todayDate = getKolkataDate();
  const adminClient = getAdminClient();

  // 1. Check for existing daily attempt on this IST date
  const { data: existingAttempt } = await adminClient
    .from('quiz_attempts')
    .select('*')
    .eq('student_id', user.id)
    .eq('quiz_date', todayDate)
    .eq('mode', 'daily')
    .maybeSingle();

  // Fetch streak info for student
  const { data: streakRow } = await adminClient
    .from('student_streaks')
    .select('*')
    .eq('student_id', user.id)
    .maybeSingle();

  const currentStreak = streakRow?.current_streak ?? 0;
  const longestStreak = streakRow?.longest_streak ?? 0;
  const freezeDaysUsed = streakRow?.freeze_days_used_this_month ?? 0;
  const freezeDaysRemaining = Math.max(0, 2 - freezeDaysUsed);

  // If already completed today
  if (existingAttempt && existingAttempt.status === 'completed') {
    return {
      status: 'completed',
      attemptId: existingAttempt.id,
      quizDate: todayDate,
      score: existingAttempt.score,
      totalQuestions: existingAttempt.total_questions,
      xpAwarded: existingAttempt.xp_awarded,
      streak: { currentStreak, longestStreak, freezeDaysRemaining },
    };
  }

  let attempt = existingAttempt;

  // 2. If no attempt exists for today, initialize a new daily attempt
  if (!attempt) {
    // Read question count from app_settings
    const { data: qCountSetting } = await adminClient
      .from('app_settings')
      .select('value')
      .eq('key', 'questions_per_daily_quiz')
      .maybeSingle();

    const questionsPerQuiz = typeof qCountSetting?.value === 'number' ? qCountSetting.value : 5;

    // Fetch approved questions
    const { data: approvedQuestions, error: qError } = await adminClient
      .from('questions')
      .select('id, topic, question_text, option_a, option_b, option_c, option_d')
      .eq('status', 'approved')
      .eq('is_active', true);

    if (qError || !approvedQuestions || approvedQuestions.length < 3) {
      // Register today as exempt date due to insufficient questions in bank
      await adminClient.from('quiz_exempt_dates').upsert({
        date: todayDate,
        reason: 'insufficient_questions',
      });

      return {
        status: 'error',
        quizDate: todayDate,
        error: 'No approved questions are available for today. Please contact faculty.',
      };
    }

    // Select N random questions and shuffle
    const selectedQuestions = shuffleArray(approvedQuestions).slice(0, Math.min(questionsPerQuiz, approvedQuestions.length));
    const questionIds = selectedQuestions.map((q) => q.id);

    // Generate randomized options order for each question
    const optionsOrder: Record<string, ('A' | 'B' | 'C' | 'D')[]> = {};
    const defaultKeys: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
    for (const q of selectedQuestions) {
      optionsOrder[q.id] = shuffleArray(defaultKeys);
    }

    // Insert new attempt (concurrency safe with unique partial index)
    const { data: newAttempt, error: insertError } = await adminClient
      .from('quiz_attempts')
      .insert({
        student_id: user.id,
        quiz_date: todayDate,
        mode: 'daily',
        question_ids: questionIds,
        options_order: optionsOrder,
        status: 'in_progress',
        total_questions: selectedQuestions.length,
      })
      .select()
      .single();

    if (insertError) {
      // If another request inserted it concurrently, fetch it
      const { data: raceAttempt } = await adminClient
        .from('quiz_attempts')
        .select('*')
        .eq('student_id', user.id)
        .eq('quiz_date', todayDate)
        .eq('mode', 'daily')
        .single();
      attempt = raceAttempt;
    } else {
      attempt = newAttempt;
    }
  }

  if (!attempt) {
    return { status: 'error', quizDate: todayDate, error: 'Failed to create quiz session.' };
  }

  // 3. Fetch answered questions for this attempt
  const { data: existingAnswers } = await adminClient
    .from('quiz_answers')
    .select('question_id, selected_option, is_correct')
    .eq('attempt_id', attempt.id);

  const answersMap = new Map((existingAnswers || []).map((a) => [a.question_id, a]));

  // 4. Fetch the assigned questions
  const { data: questionRecords } = await adminClient
    .from('questions')
    .select('id, topic, question_text, option_a, option_b, option_c, option_d, correct_option, explanation')
    .in('id', attempt.question_ids);

  const qMap = new Map((questionRecords || []).map((q) => [q.id, q]));
  const optionsOrderMap = (attempt.options_order as Record<string, ('A' | 'B' | 'C' | 'D')[]>) || {};

  // Build client question list strictly hiding correct_option and explanation for unanswered items
  const clientQuestions: ClientQuizQuestion[] = [];

  for (const qId of attempt.question_ids) {
    const q = qMap.get(qId);
    if (!q) continue;

    const answer = answersMap.get(qId);
    const isAnswered = Boolean(answer);

    // Apply stored option order
    const order = optionsOrderMap[qId] || ['A', 'B', 'C', 'D'];
    const options: QuizOptionItem[] = order.map((key) => {
      const field = `option_${key.toLowerCase()}` as keyof typeof q;
      return {
        id: key,
        text: q[field] as string,
      };
    });

    if (isAnswered && answer) {
      // Safe to reveal answer and explanation because student has already committed their response!
      clientQuestions.push({
        id: q.id,
        topic: q.topic,
        questionText: q.question_text,
        options,
        isAnswered: true,
        selectedOption: answer.selected_option,
        isCorrect: answer.is_correct,
        correctOption: q.correct_option,
        explanation: q.explanation,
      });
    } else {
      // STRICT INFORMATION HIDING: correct_option and explanation are completely omitted!
      clientQuestions.push({
        id: q.id,
        topic: q.topic,
        questionText: q.question_text,
        options,
        isAnswered: false,
      });
    }
  }

  return {
    status: 'active',
    attemptId: attempt.id,
    quizDate: todayDate,
    questions: clientQuestions,
    score: attempt.score,
    totalQuestions: attempt.total_questions,
    streak: { currentStreak, longestStreak, freezeDaysRemaining },
  };
}

/**
 * Submit an answer for an active attempt question.
 * Verifies ownership, saves answer, and returns correctness + explanation.
 */
export async function submitQuizAnswerAction(input: {
  attemptId: string;
  questionId: string;
  selectedOption: 'A' | 'B' | 'C' | 'D';
}) {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized: You must be logged in.' };
  }

  if (!['A', 'B', 'C', 'D'].includes(input.selectedOption)) {
    return { success: false, error: 'Invalid option selected.' };
  }

  const adminClient = getAdminClient();

  // 1. Verify attempt ownership & status
  const { data: attempt, error: attemptError } = await adminClient
    .from('quiz_attempts')
    .select('*')
    .eq('id', input.attemptId)
    .single();

  if (attemptError || !attempt) {
    return { success: false, error: 'Quiz session not found.' };
  }

  if (attempt.student_id !== user.id) {
    return { success: false, error: 'Forbidden: You do not own this quiz session.' };
  }

  if (attempt.status !== 'in_progress') {
    return { success: false, error: 'Quiz is already completed or inactive.' };
  }

  // Daily attempts expire at midnight (Asia/Kolkata)
  if (attempt.mode === 'daily') {
    const todayDate = getKolkataDate();
    if (attempt.quiz_date < todayDate) {
      await adminClient
        .from('quiz_attempts')
        .update({ status: 'expired' })
        .eq('id', attempt.id);
      return {
        success: false,
        error: 'This daily quiz session expired at midnight (Asia/Kolkata) and can no longer be answered.',
      };
    }
  }

  if (!attempt.question_ids.includes(input.questionId)) {
    return { success: false, error: 'Question does not belong to this quiz attempt.' };
  }

  // 2. Check if already answered (prevent answer changing)
  const { data: existingAnswer } = await adminClient
    .from('quiz_answers')
    .select('id')
    .eq('attempt_id', input.attemptId)
    .eq('question_id', input.questionId)
    .maybeSingle();

  if (existingAnswer) {
    return { success: false, error: 'Question has already been answered. Answers cannot be changed.' };
  }

  // 3. Lookup question for verification
  const { data: question, error: qError } = await adminClient
    .from('questions')
    .select('correct_option, explanation')
    .eq('id', input.questionId)
    .single();

  if (qError || !question) {
    return { success: false, error: 'Question record not found.' };
  }

  const isCorrect = input.selectedOption === question.correct_option;

  // 4. Save answer to quiz_answers
  const { error: answerError } = await adminClient.from('quiz_answers').insert({
    attempt_id: input.attemptId,
    question_id: input.questionId,
    selected_option: input.selectedOption,
    is_correct: isCorrect,
  });

  if (answerError) {
    return { success: false, error: `Failed to record answer: ${answerError.message}` };
  }

  return {
    success: true,
    isCorrect,
    correctOption: question.correct_option,
    explanation: question.explanation,
  };
}

/**
 * Resolves all exempt dates falling in the gap between startDate and endDate.
 * Order of evaluation:
 * 1. Dates explicitly marked in quiz_exempt_dates.
 * 2. Fallback: dates where fewer than 3 approved questions existed on that date.
 */
export async function resolveExemptDatesInRange(
  adminClient: any,
  startDate: string | null,
  endDate: string
): Promise<string[]> {
  if (!startDate) return [];
  const diffDays = daysBetweenDates(startDate, endDate);
  if (diffDays <= 1) return [];

  const gapDates: string[] = [];
  for (let i = 1; i < diffDays; i++) {
    gapDates.push(addDaysToDate(startDate, i));
  }

  // 1. Fetch explicitly recorded exempt dates
  const { data: explicitRows } = await adminClient
    .from('quiz_exempt_dates')
    .select('date')
    .in('date', gapDates);

  const exemptSet = new Set<string>((explicitRows || []).map((r: any) => r.date));

  // 2. Fallback check for dates without an explicit exempt row:
  // Check if fewer than 3 approved questions existed on that date
  for (const date of gapDates) {
    if (exemptSet.has(date)) continue;

    const endOfDayIso = `${date}T23:59:59.999+05:30`;
    const { data: approvedOnDate } = await adminClient
      .from('questions')
      .select('id, approved_at, created_at')
      .eq('status', 'approved')
      .eq('is_active', true)
      .or(`approved_at.lte.${endOfDayIso},and(approved_at.is.null,created_at.lte.${endOfDayIso})`);

    const count = approvedOnDate?.length || 0;
    if (count < 3) {
      exemptSet.add(date);
      // Cache in quiz_exempt_dates via service role
      await adminClient.from('quiz_exempt_dates').upsert({
        date,
        reason: 'insufficient_questions',
      });
    }
  }

  return Array.from(exemptSet);
}

/**
 * Finalize Quiz Attempt:
 * Verifies all questions answered, calculates final score, awards XP via award_xp,
 * and updates student streaks (including freeze day handling and 7-day bonus).
 */
export async function finalizeQuizAction(input: { attemptId: string }) {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized: You must be logged in.' };
  }

  const adminClient = getAdminClient();

  // 1. Fetch attempt
  const { data: attempt, error: attemptError } = await adminClient
    .from('quiz_attempts')
    .select('*')
    .eq('id', input.attemptId)
    .single();

  if (attemptError || !attempt) {
    return { success: false, error: 'Quiz session not found.' };
  }

  if (attempt.student_id !== user.id) {
    return { success: false, error: 'Forbidden: You do not own this quiz session.' };
  }

  // Idempotency: If already completed, return existing results safely
  if (attempt.status === 'completed') {
    const { data: streakRow } = await adminClient
      .from('student_streaks')
      .select('*')
      .eq('student_id', user.id)
      .maybeSingle();

    return {
      success: true,
      alreadyFinalized: true,
      score: attempt.score,
      totalQuestions: attempt.total_questions,
      xpAwarded: attempt.xp_awarded,
      currentStreak: streakRow?.current_streak ?? 0,
      longestStreak: streakRow?.longest_streak ?? 0,
    };
  }

  // Daily attempts expire at midnight (Asia/Kolkata)
  if (attempt.mode === 'daily') {
    const todayDate = getKolkataDate();
    if (attempt.quiz_date < todayDate) {
      if (attempt.status !== 'expired') {
        await adminClient
          .from('quiz_attempts')
          .update({ status: 'expired' })
          .eq('id', attempt.id);
      }
      return {
        success: false,
        error: 'This daily quiz session expired at midnight (Asia/Kolkata) and cannot be completed.',
      };
    }
  }

  if (attempt.status !== 'in_progress') {
    return {
      success: false,
      error: 'Quiz session is inactive or expired.',
    };
  }

  // 3. Fetch all recorded answers
  const { data: answers, error: answersError } = await adminClient
    .from('quiz_answers')
    .select('is_correct')
    .eq('attempt_id', input.attemptId);

  if (answersError) {
    return { success: false, error: 'Failed to retrieve submitted answers.' };
  }

  if ((answers || []).length < attempt.total_questions) {
    return {
      success: false,
      error: `Please answer all ${attempt.total_questions} questions before submitting.`,
    };
  }

  // 4. Compute score
  const score = (answers || []).filter((a) => a.is_correct).length;

  // 5. Award Daily Quiz XP via existing award_xp procedure
  // Formula: base_xp (15) + extra_xp (5) * extra_units (score)
  // E.g., 0 correct = 15 XP, 3 correct = 30 XP, 5 correct = 40 XP
  const quizRef = `daily_quiz_${attempt.quiz_date}_${user.id}`;
  const { data: xpRes, error: xpError } = await adminClient.rpc('award_xp', {
    p_student_id: user.id,
    p_action_type: 'DAILY_QUIZ',
    p_reference_id: quizRef,
    p_extra_units: score,
  });

  if (xpError) {
    console.error('award_xp error during daily quiz finalization:', xpError.message);
  }

  let xpAwarded = (xpRes as any)?.xp_awarded ?? 0;
  if ((xpRes as any)?.status === 'duplicate' && attempt.xp_awarded > 0) {
    xpAwarded = attempt.xp_awarded;
  } else if ((xpRes as any)?.status === 'duplicate' && xpAwarded === 0) {
    const { data: pastEvent } = await adminClient
      .from('xp_events')
      .select('xp_amount')
      .eq('reference_id', quizRef)
      .eq('voided', false)
      .maybeSingle();
    if (pastEvent) {
      xpAwarded = pastEvent.xp_amount;
    }
  }

  // 6. Update attempt status
  await adminClient
    .from('quiz_attempts')
    .update({
      status: 'completed',
      score,
      xp_awarded: xpAwarded,
      completed_at: new Date().toISOString(),
    })
    .eq('id', input.attemptId);

  // 6. Evaluate and update streaks
  const { data: currentStreakRow } = await adminClient
    .from('student_streaks')
    .select('*')
    .eq('student_id', user.id)
    .maybeSingle();

  // Read max freezes setting
  const { data: freezeSetting } = await adminClient
    .from('app_settings')
    .select('value')
    .eq('key', 'max_freeze_days_per_month')
    .maybeSingle();
  const maxFreezes = typeof freezeSetting?.value === 'number' ? freezeSetting.value : 2;

  const streakData: StudentStreakData = {
    current_streak: currentStreakRow?.current_streak ?? 0,
    longest_streak: currentStreakRow?.longest_streak ?? 0,
    last_quiz_date: currentStreakRow?.last_quiz_date ?? null,
    freeze_days_used_this_month: currentStreakRow?.freeze_days_used_this_month ?? 0,
    freeze_days_month: currentStreakRow?.freeze_days_month ?? getKolkataDate().substring(0, 7),
    streak_start_date: currentStreakRow?.streak_start_date ?? null,
  };

  const exemptDates = await resolveExemptDatesInRange(adminClient, streakData.last_quiz_date, attempt.quiz_date);
  const streakEval = evaluateStreakCompletion(streakData, attempt.quiz_date, maxFreezes, exemptDates);

  // Upsert into student_streaks
  await adminClient.from('student_streaks').upsert({
    student_id: user.id,
    current_streak: streakEval.current_streak,
    longest_streak: streakEval.longest_streak,
    last_quiz_date: streakEval.last_quiz_date,
    freeze_days_used_this_month: streakEval.freeze_days_used_this_month,
    freeze_days_month: streakEval.freeze_days_month,
    streak_start_date: streakEval.streak_start_date,
    updated_at: new Date().toISOString(),
  });

  // Record streak audit events
  if (streakEval.event_type === 'streak_freeze') {
    // Log a streak_freeze event per frozen day
    for (const fDate of streakEval.frozen_dates) {
      await adminClient.from('streak_events').insert({
        student_id: user.id,
        event_type: 'streak_freeze',
        quiz_date: fDate,
        streak_before: streakData.current_streak,
        streak_after: streakData.current_streak, // frozen days do not add to count
        notes: `Streak freeze applied for missed day ${fDate}.`,
      });
    }

    // Also record today's quiz completion event extending the streak
    await adminClient.from('streak_events').insert({
      student_id: user.id,
      event_type: 'streak_increment',
      quiz_date: attempt.quiz_date,
      streak_before: streakData.current_streak,
      streak_after: streakEval.current_streak,
      notes: streakEval.notes,
    });
  } else if (streakEval.event_type !== 'none') {
    await adminClient.from('streak_events').insert({
      student_id: user.id,
      event_type: streakEval.event_type,
      quiz_date: attempt.quiz_date,
      streak_before: streakData.current_streak,
      streak_after: streakEval.current_streak,
      notes: streakEval.notes,
    });
  }

  // 7. Check 7-Day Streak Bonus Milestone
  // Pay ONLY at day 7 of a streak (once per streak). Reference = streak_7_bonus_<student>_<streak_start_date>
  let bonusAwarded = false;
  if (streakEval.eligible_for_7_day_bonus) {
    const bonusRef = `streak_7_bonus_${user.id}_${streakEval.streak_start_date}`;
    const { data: bonusRes } = await adminClient.rpc('award_xp', {
      p_student_id: user.id,
      p_action_type: 'STREAK_7_BONUS',
      p_reference_id: bonusRef,
      p_extra_units: 0,
    });

    if ((bonusRes as any)?.status === 'awarded') {
      bonusAwarded = true;
      await adminClient.from('streak_events').insert({
        student_id: user.id,
        event_type: 'milestone_bonus',
        quiz_date: attempt.quiz_date,
        streak_before: streakEval.current_streak,
        streak_after: streakEval.current_streak,
        notes: `Awarded 7-day milestone bonus of 50 XP for streak started ${streakEval.streak_start_date}.`,
      });
    }
  }

  // 8. Evaluate eligible badges after quiz finalization
  try {
    const { evaluateStudentBadges } = await import('@/lib/badges');
    await evaluateStudentBadges(user.id, adminClient);
  } catch (badgeErr) {
    console.error('Badge evaluation error after quiz finalization:', badgeErr);
  }

  return {
    success: true,
    alreadyFinalized: false,
    score,
    totalQuestions: attempt.total_questions,
    xpAwarded,
    bonusAwarded,
    currentStreak: streakEval.current_streak,
    longestStreak: streakEval.longest_streak,
    streakEventType: streakEval.event_type,
    notes: streakEval.notes,
  };
}

/**
 * Practice Mode: Fetch 5 random approved questions for practice.
 * Strictly hides correct answers and explanations until submission.
 */
export async function getPracticeQuizSessionAction() {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized: You must be logged in.', questions: [] };
  }

  const adminClient = getAdminClient();
  const { data: approvedQuestions, error } = await adminClient
    .from('questions')
    .select('id, topic, question_text, option_a, option_b, option_c, option_d')
    .eq('status', 'approved')
    .eq('is_active', true);

  if (error || !approvedQuestions || approvedQuestions.length === 0) {
    return { success: false, error: 'No approved questions available for practice.', questions: [] };
  }

  // Shuffle and pick 5
  const selected = shuffleArray(approvedQuestions).slice(0, 5);
  const defaultKeys: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];

  const questions = selected.map((q) => {
    const order = shuffleArray(defaultKeys);
    const options: QuizOptionItem[] = order.map((key) => ({
      id: key,
      text: q[`option_${key.toLowerCase()}` as keyof typeof q] as string,
    }));

    return {
      id: q.id,
      topic: q.topic,
      questionText: q.question_text,
      options,
    };
  });

  return { success: true, questions };
}

/**
 * Submit an answer for a Practice question.
 * Verifies choice on server and reveals explanation only after submission.
 */
export async function submitPracticeAnswerAction(input: {
  questionId: string;
  selectedOption: 'A' | 'B' | 'C' | 'D';
}) {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized: You must be logged in.' };
  }

  if (!['A', 'B', 'C', 'D'].includes(input.selectedOption)) {
    return { success: false, error: 'Invalid option selected.' };
  }

  const adminClient = getAdminClient();
  const { data: question, error } = await adminClient
    .from('questions')
    .select('correct_option, explanation')
    .eq('id', input.questionId)
    .single();

  if (error || !question) {
    return { success: false, error: 'Question not found.' };
  }

  const isCorrect = input.selectedOption === question.correct_option;

  return {
    success: true,
    isCorrect,
    correctOption: question.correct_option,
    explanation: question.explanation,
  };
}

/**
 * Retrieve current streak status for a student.
 */
export async function getStudentStreakAction() {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  const todayDate = getKolkataDate();

  if (!user) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      freezeDaysRemaining: 2,
      lastQuizDate: null,
      isTodayCompleted: false,
      todayDate,
      maxDailyQuizXp: 40,
    };
  }

  const adminClient = getAdminClient();
  const { data: streakRow } = await adminClient
    .from('student_streaks')
    .select('*')
    .eq('student_id', user.id)
    .maybeSingle();

  const currentMonth = todayDate.substring(0, 7);
  let freezeUsed = streakRow?.freeze_days_used_this_month ?? 0;
  if (streakRow && streakRow.freeze_days_month !== currentMonth) {
    freezeUsed = 0;
  }

  const isTodayCompleted = streakRow?.last_quiz_date === todayDate;

  // Streak preservation on student dashboard:
  // If student hasn't completed today, evaluate whether gap dates are exempt
  let displayStreak = streakRow?.current_streak ?? 0;
  if (streakRow?.last_quiz_date && !isTodayCompleted) {
    const diff = daysBetweenDates(streakRow.last_quiz_date, todayDate);
    if (diff > 1) {
      const exemptDates = await resolveExemptDatesInRange(adminClient, streakRow.last_quiz_date, todayDate);
      const gapDates: string[] = [];
      for (let i = 1; i < diff; i++) {
        gapDates.push(addDaysToDate(streakRow.last_quiz_date, i));
      }
      const unexcusedMissed = gapDates.filter((d) => !exemptDates.includes(d));
      const freezesRemaining = Math.max(0, 2 - freezeUsed);
      if (unexcusedMissed.length > freezesRemaining) {
        displayStreak = 0;
      }
    }
  }

  // Read max daily quiz XP from xp_rules and app_settings
  const { data: quizRule } = await adminClient
    .from('xp_rules')
    .select('base_xp, extra_xp')
    .eq('action_type', 'DAILY_QUIZ')
    .maybeSingle();

  const { data: settingRow } = await adminClient
    .from('app_settings')
    .select('value')
    .eq('key', 'questions_per_daily_quiz')
    .maybeSingle();

  const numQuestions = typeof settingRow?.value === 'number' ? settingRow.value : 5;
  const baseXP = quizRule?.base_xp ?? 15;
  const extraXP = quizRule?.extra_xp ?? 5;
  const maxDailyQuizXp = baseXP + (extraXP * numQuestions);

  return {
    currentStreak: displayStreak,
    longestStreak: streakRow?.longest_streak ?? 0,
    freezeDaysRemaining: Math.max(0, 2 - freezeUsed),
    lastQuizDate: streakRow?.last_quiz_date ?? null,
    isTodayCompleted,
    todayDate,
    maxDailyQuizXp,
  };
}
