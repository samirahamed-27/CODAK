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
  streak_start_date?: string | null; // YYYY-MM-DD
}

export interface StreakEvaluationResult {
  current_streak: number;
  longest_streak: number;
  last_quiz_date: string;
  freeze_days_used_this_month: number;
  freeze_days_month: string;
  streak_start_date: string;
  event_type: 'streak_increment' | 'streak_freeze' | 'streak_reset' | 'none';
  freezes_consumed: number;
  frozen_dates: string[];
  notes: string;
  eligible_for_7_day_bonus: boolean;
  bonus_milestone: number | null; // e.g. 7
}

/**
 * Adds or subtracts days from a YYYY-MM-DD date string.
 */
export function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * Returns the current date in Asia/Kolkata formatted as YYYY-MM-DD.
 */
export function getKolkataDate(date: Date = new Date()): string {
  if (process.env.TEST_SIMULATED_DATE) {
    return process.env.TEST_SIMULATED_DATE;
  }
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
      streak_start_date: streak.streak_start_date || quizDate,
      event_type: 'none',
      freezes_consumed: 0,
      frozen_dates: [],
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
      streak_start_date: quizDate,
      event_type: 'streak_increment',
      freezes_consumed: 0,
      frozen_dates: [],
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
      streak_start_date: streak.streak_start_date || streak.last_quiz_date,
      event_type: 'none',
      freezes_consumed: 0,
      frozen_dates: [],
      notes: 'Historical quiz date cannot override newer streak date.',
      eligible_for_7_day_bonus: false,
      bonus_milestone: null,
    };
  }

  // 5. Case: Exactly consecutive day (e.g. yesterday -> today)
  if (diffDays === 1) {
    const newStreak = streak.current_streak + 1;
    const isBonusMilestone = newStreak === 7;
    const startDate = streak.streak_start_date || addDaysToDate(quizDate, -(newStreak - 1));

    return {
      current_streak: newStreak,
      longest_streak: Math.max(newStreak, streak.longest_streak),
      last_quiz_date: quizDate,
      freeze_days_used_this_month: freezeUsedThisMonth,
      freeze_days_month: currentMonth,
      streak_start_date: startDate,
      event_type: 'streak_increment',
      freezes_consumed: 0,
      frozen_dates: [],
      notes: `Consecutive daily quiz completed. Streak extended to ${newStreak}.`,
      eligible_for_7_day_bonus: isBonusMilestone,
      bonus_milestone: isBonusMilestone ? 7 : null,
    };
  }

  // 6. Case: Gap of 1 or more missed days (diffDays >= 2)
  const missedDates: string[] = [];
  for (let i = 1; i < diffDays; i++) {
    missedDates.push(addDaysToDate(streak.last_quiz_date, i));
  }

  // Group missed days by calendar month (Asia/Kolkata)
  const missedByMonth: Record<string, string[]> = {};
  for (const d of missedDates) {
    const m = getKolkataMonth(d);
    if (!missedByMonth[m]) missedByMonth[m] = [];
    missedByMonth[m].push(d);
  }

  // Check if every month has enough freezes available
  let canCoverAll = true;
  for (const m of Object.keys(missedByMonth)) {
    const needed = missedByMonth[m].length;
    const used = streak.freeze_days_month === m ? streak.freeze_days_used_this_month : 0;
    const available = Math.max(0, maxFreezeDaysPerMonth - used);
    if (needed > available) {
      canCoverAll = false;
      break;
    }
  }

  if (canCoverAll) {
    // All missed days are covered by freezes!
    const newStreak = streak.current_streak + 1; // Frozen days do NOT add to count; +1 for today only
    const isBonusMilestone = newStreak === 7;
    const startDate = streak.streak_start_date || addDaysToDate(quizDate, -(newStreak - 1));

    // Update freeze_days_used_this_month for today's month
    const usedPriorThisMonth = streak.freeze_days_month === currentMonth ? streak.freeze_days_used_this_month : 0;
    const consumedInCurrentMonth = missedByMonth[currentMonth]?.length || 0;
    const newFreezeUsed = usedPriorThisMonth + consumedInCurrentMonth;

    return {
      current_streak: newStreak,
      longest_streak: Math.max(newStreak, streak.longest_streak),
      last_quiz_date: quizDate,
      freeze_days_used_this_month: newFreezeUsed,
      freeze_days_month: currentMonth,
      streak_start_date: startDate,
      event_type: 'streak_freeze',
      freezes_consumed: missedDates.length,
      frozen_dates: missedDates,
      notes: `Streak preserved using ${missedDates.length} freeze day(s). Streak extended to ${newStreak}.`,
      eligible_for_7_day_bonus: isBonusMilestone,
      bonus_milestone: isBonusMilestone ? 7 : null,
    };
  } else {
    // Insufficient freezes in at least one month -> Streak resets to 1 and NO freezes are consumed
    const usedThisMonth = streak.freeze_days_month === currentMonth ? streak.freeze_days_used_this_month : 0;

    return {
      current_streak: 1,
      longest_streak: streak.longest_streak,
      last_quiz_date: quizDate,
      freeze_days_used_this_month: usedThisMonth, // NO freezes consumed!
      freeze_days_month: currentMonth,
      streak_start_date: quizDate,
      event_type: 'streak_reset',
      freezes_consumed: 0,
      frozen_dates: [],
      notes: `Missed ${missedDates.length} day(s) but insufficient freezes available. Streak reset to 1 without consuming freezes.`,
      eligible_for_7_day_bonus: false,
      bonus_milestone: null,
    };
  }
}
