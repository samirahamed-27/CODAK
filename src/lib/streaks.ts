/**
 * Streak & Freeze Days Calculation Engine
 *
 * Golden Rule: Strictly uses Asia/Kolkata calendar dates (YYYY-MM-DD)
 * for all date comparisons, midnight cut-offs, and monthly quota resets.
 */

export interface StudentStreakData {
  current_streak: number;
  longest_streak: number;
  last_quiz_date: string | null; // YYYY-MM-DD
  freeze_days_used_this_month: number;
  freeze_days_month: string; // YYYY-MM
}

export interface StreakEvaluationResult {
  current_streak: number;
  longest_streak: number;
  last_quiz_date: string;
  freeze_days_used_this_month: number;
  freeze_days_month: string;
  event_type: 'streak_increment' | 'streak_freeze' | 'streak_reset' | 'none';
  freezes_consumed: number;
  notes: string;
  eligible_for_7_day_bonus: boolean;
  bonus_milestone: number | null; // e.g. 7, 14, 21...
}

/**
 * Returns the current date in Asia/Kolkata formatted as YYYY-MM-DD.
 */
export function getKolkataDate(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date); // 'YYYY-MM-DD'
}

/**
 * Returns the YYYY-MM calendar month for an ISO date string in Asia/Kolkata.
 */
export function getKolkataMonth(dateStr: string): string {
  return dateStr.substring(0, 7);
}

/**
 * Calculates calendar day difference between two YYYY-MM-DD dates (d2 - d1).
 */
export function daysBetweenDates(d1: string, d2: string): number {
  const date1 = new Date(`${d1}T00:00:00Z`);
  const date2 = new Date(`${d2}T00:00:00Z`);
  const diffTime = date2.getTime() - date1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Pure function to evaluate streak progress upon quiz completion on a given quizDate.
 *
 * @param streak The student's current streak record
 * @param quizDate The date the quiz was completed (YYYY-MM-DD)
 * @param maxFreezeDaysPerMonth Maximum freeze days allowed per calendar month (default 2 from DB)
 */
export function evaluateStreakCompletion(
  streak: StudentStreakData,
  quizDate: string,
  maxFreezeDaysPerMonth: number = 2
): StreakEvaluationResult {
  const currentMonth = getKolkataMonth(quizDate);

  // 1. Handle Monthly Freeze Counter Reset
  let freezeUsedThisMonth = streak.freeze_days_used_this_month;
  if (streak.freeze_days_month !== currentMonth) {
    freezeUsedThisMonth = 0;
  }

  // 2. Case: Same-day quiz (reprocessing or duplicate)
  if (streak.last_quiz_date === quizDate) {
    return {
      current_streak: streak.current_streak,
      longest_streak: streak.longest_streak,
      last_quiz_date: quizDate,
      freeze_days_used_this_month: freezeUsedThisMonth,
      freeze_days_month: currentMonth,
      event_type: 'none',
      freezes_consumed: 0,
      notes: 'Quiz already counted for this date.',
      eligible_for_7_day_bonus: false,
      bonus_milestone: null,
    };
  }

  // 3. Case: First quiz ever
  if (!streak.last_quiz_date) {
    return {
      current_streak: 1,
      longest_streak: Math.max(1, streak.longest_streak),
      last_quiz_date: quizDate,
      freeze_days_used_this_month: freezeUsedThisMonth,
      freeze_days_month: currentMonth,
      event_type: 'streak_increment',
      freezes_consumed: 0,
      notes: 'Initial daily quiz completed. Streak started.',
      eligible_for_7_day_bonus: false,
      bonus_milestone: null,
    };
  }

  // 4. Calculate day difference
  const diffDays = daysBetweenDates(streak.last_quiz_date, quizDate);

  // Safety check: quizDate must be in the future relative to last_quiz_date
  if (diffDays <= 0) {
    return {
      current_streak: streak.current_streak,
      longest_streak: streak.longest_streak,
      last_quiz_date: streak.last_quiz_date,
      freeze_days_used_this_month: freezeUsedThisMonth,
      freeze_days_month: currentMonth,
      event_type: 'none',
      freezes_consumed: 0,
      notes: 'Historical quiz date cannot override newer streak date.',
      eligible_for_7_day_bonus: false,
      bonus_milestone: null,
    };
  }

  // 5. Case: Exactly consecutive day (e.g. yesterday -> today)
  if (diffDays === 1) {
    const newStreak = streak.current_streak + 1;
    const isBonusMilestone = newStreak > 0 && newStreak % 7 === 0;

    return {
      current_streak: newStreak,
      longest_streak: Math.max(newStreak, streak.longest_streak),
      last_quiz_date: quizDate,
      freeze_days_used_this_month: freezeUsedThisMonth,
      freeze_days_month: currentMonth,
      event_type: 'streak_increment',
      freezes_consumed: 0,
      notes: `Consecutive daily quiz completed. Streak extended to ${newStreak}.`,
      eligible_for_7_day_bonus: isBonusMilestone,
      bonus_milestone: isBonusMilestone ? newStreak : null,
    };
  }

  // 6. Case: Gap of 1 or more missed days (diffDays >= 2)
  const missedDays = diffDays - 1;
  const availableFreezes = Math.max(0, maxFreezeDaysPerMonth - freezeUsedThisMonth);

  if (missedDays <= availableFreezes) {
    // Freeze days cover the gap!
    const newFreezeUsed = freezeUsedThisMonth + missedDays;
    const newStreak = streak.current_streak + 1; // Preserved across freeze, then incremented by today
    const isBonusMilestone = newStreak > 0 && newStreak % 7 === 0;

    return {
      current_streak: newStreak,
      longest_streak: Math.max(newStreak, streak.longest_streak),
      last_quiz_date: quizDate,
      freeze_days_used_this_month: newFreezeUsed,
      freeze_days_month: currentMonth,
      event_type: 'streak_freeze',
      freezes_consumed: missedDays,
      notes: `Streak preserved using ${missedDays} freeze day(s). Streak extended to ${newStreak}.`,
      eligible_for_7_day_bonus: isBonusMilestone,
      bonus_milestone: isBonusMilestone ? newStreak : null,
    };
  } else {
    // Missed days exceed available freezes -> Streak resets
    return {
      current_streak: 1,
      longest_streak: streak.longest_streak,
      last_quiz_date: quizDate,
      freeze_days_used_this_month: freezeUsedThisMonth,
      freeze_days_month: currentMonth,
      event_type: 'streak_reset',
      freezes_consumed: 0,
      notes: `Missed ${missedDays} day(s) but only had ${availableFreezes} freeze(s) left. Streak reset to 1.`,
      eligible_for_7_day_bonus: false,
      bonus_milestone: null,
    };
  }
}
