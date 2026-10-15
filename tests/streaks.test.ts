import { describe, it, expect } from 'vitest';
import {
  evaluateStreakCompletion,
  daysBetweenDates,
  getKolkataDate,
  getKolkataMonth,
  StudentStreakData,
} from '../src/lib/streaks';

describe('Streak & Freeze Days Calculation Engine', () => {
  describe('Calendar Date & Timezone Utilities', () => {
    it('calculates days between two ISO date strings accurately', () => {
      expect(daysBetweenDates('2026-10-01', '2026-10-02')).toBe(1);
      expect(daysBetweenDates('2026-10-01', '2026-10-05')).toBe(4);
      expect(daysBetweenDates('2026-10-31', '2026-11-01')).toBe(1);
    });

    it('extracts calendar month (YYYY-MM)', () => {
      expect(getKolkataMonth('2026-10-15')).toBe('2026-10');
      expect(getKolkataMonth('2026-11-01')).toBe('2026-11');
    });

    it('converts UTC midnight to Indian Standard Time correctly (UTC 18:30 is next day 00:00 IST)', () => {
      // 2026-10-15 18:30 UTC = 2026-10-16 00:00 IST (+5:30)
      const dateJustAfterMidnightIST = new Date('2026-10-15T18:35:00Z');
      expect(getKolkataDate(dateJustAfterMidnightIST)).toBe('2026-10-16');

      // 2026-10-15 18:25 UTC = 2026-10-15 23:55 IST
      const dateJustBeforeMidnightIST = new Date('2026-10-15T18:25:00Z');
      expect(getKolkataDate(dateJustBeforeMidnightIST)).toBe('2026-10-15');
    });
  });

  describe('Streak Progression & Freeze Rules', () => {
    it('1. Starts streak at 1 on first ever completed quiz', () => {
      const initial: StudentStreakData = {
        current_streak: 0,
        longest_streak: 0,
        last_quiz_date: null,
        freeze_days_used_this_month: 0,
        freeze_days_month: '2026-10',
      };

      const res = evaluateStreakCompletion(initial, '2026-10-01');
      expect(res.current_streak).toBe(1);
      expect(res.longest_streak).toBe(1);
      expect(res.last_quiz_date).toBe('2026-10-01');
      expect(res.event_type).toBe('streak_increment');
      expect(res.freezes_consumed).toBe(0);
      expect(res.eligible_for_7_day_bonus).toBe(false);
    });

    it('2. Extends streak on consecutive days', () => {
      const day1: StudentStreakData = {
        current_streak: 1,
        longest_streak: 1,
        last_quiz_date: '2026-10-01',
        freeze_days_used_this_month: 0,
        freeze_days_month: '2026-10',
      };

      const res = evaluateStreakCompletion(day1, '2026-10-02');
      expect(res.current_streak).toBe(2);
      expect(res.longest_streak).toBe(2);
      expect(res.last_quiz_date).toBe('2026-10-02');
      expect(res.event_type).toBe('streak_increment');
      expect(res.freezes_consumed).toBe(0);
    });

    it('3. Triggers 7-day bonus eligibility on 7th consecutive day', () => {
      const day6: StudentStreakData = {
        current_streak: 6,
        longest_streak: 6,
        last_quiz_date: '2026-10-06',
        freeze_days_used_this_month: 0,
        freeze_days_month: '2026-10',
      };

      const res = evaluateStreakCompletion(day6, '2026-10-07');
      expect(res.current_streak).toBe(7);
      expect(res.eligible_for_7_day_bonus).toBe(true);
      expect(res.bonus_milestone).toBe(7);
    });

    it('4. Uses 1 freeze day to cover 1 missed day with 2 freezes available', () => {
      const day1: StudentStreakData = {
        current_streak: 3,
        longest_streak: 3,
        last_quiz_date: '2026-10-01',
        freeze_days_used_this_month: 0,
        freeze_days_month: '2026-10',
      };

      // Student skips Oct 02, completes on Oct 03 (1 missed day)
      const res = evaluateStreakCompletion(day1, '2026-10-03');
      expect(res.current_streak).toBe(4); // Preserved streak 3, + 1 for today = 4
      expect(res.freeze_days_used_this_month).toBe(1);
      expect(res.freezes_consumed).toBe(1);
      expect(res.frozen_dates).toEqual(['2026-10-02']);
      expect(res.event_type).toBe('streak_freeze');
    });

    it('5. Uses 2 freeze days to cover 2 missed days with 2 freezes available', () => {
      const day1: StudentStreakData = {
        current_streak: 5,
        longest_streak: 5,
        last_quiz_date: '2026-10-01',
        freeze_days_used_this_month: 0,
        freeze_days_month: '2026-10',
      };

      // Student skips Oct 02 & Oct 03, completes on Oct 04 (2 missed days)
      const res = evaluateStreakCompletion(day1, '2026-10-04');
      expect(res.current_streak).toBe(6); // Preserved streak 5, + 1 for today = 6 (frozen days do not add to count)
      expect(res.freeze_days_used_this_month).toBe(2);
      expect(res.freezes_consumed).toBe(2);
      expect(res.frozen_dates).toEqual(['2026-10-02', '2026-10-03']);
      expect(res.event_type).toBe('streak_freeze');
    });

    it('6. 3 missed days with 2 freezes resets streak to 1 and consumes NO freezes', () => {
      const current: StudentStreakData = {
        current_streak: 5,
        longest_streak: 5,
        last_quiz_date: '2026-10-01',
        freeze_days_used_this_month: 0, // 2 freezes available
        freeze_days_month: '2026-10',
      };

      // Student misses 3 days (Oct 02, Oct 03, Oct 04) and completes Oct 05
      const res = evaluateStreakCompletion(current, '2026-10-05');
      expect(res.current_streak).toBe(1); // Streak resets to 1
      expect(res.longest_streak).toBe(5); // Longest preserved
      expect(res.freeze_days_used_this_month).toBe(0); // NO freezes consumed!
      expect(res.freezes_consumed).toBe(0);
      expect(res.frozen_dates).toEqual([]);
      expect(res.event_type).toBe('streak_reset');
    });

    it('7. Gap across a month boundary: evaluates freeze availability in each month separately', () => {
      // Scenario A: Last quiz Oct 30. Completes Nov 02. Missed Oct 31 (Oct) and Nov 01 (Nov).
      // Both months have 2 freezes available.
      const current: StudentStreakData = {
        current_streak: 4,
        longest_streak: 4,
        last_quiz_date: '2026-10-30',
        freeze_days_used_this_month: 0,
        freeze_days_month: '2026-10',
      };

      const resCovered = evaluateStreakCompletion(current, '2026-11-02');
      expect(resCovered.current_streak).toBe(5); // 4 + 1 for Nov 02
      expect(resCovered.freeze_days_month).toBe('2026-11');
      expect(resCovered.freeze_days_used_this_month).toBe(1); // 1 used from November quota (for Nov 01)
      expect(resCovered.freezes_consumed).toBe(2); // Oct 31 + Nov 01
      expect(resCovered.frozen_dates).toEqual(['2026-10-31', '2026-11-01']);
      expect(resCovered.event_type).toBe('streak_freeze');

      // Scenario B: October had ALREADY used 2 freezes earlier in October.
      // Gap crosses boundary: Oct 31 needs 1 freeze, but October has 0 left!
      const currentExhaustedOct: StudentStreakData = {
        current_streak: 4,
        longest_streak: 4,
        last_quiz_date: '2026-10-30',
        freeze_days_used_this_month: 2, // October exhausted!
        freeze_days_month: '2026-10',
      };

      const resFailed = evaluateStreakCompletion(currentExhaustedOct, '2026-11-02');
      expect(resFailed.current_streak).toBe(1); // Cannot cover Oct 31 -> Resets!
      expect(resFailed.freeze_days_month).toBe('2026-11');
      expect(resFailed.freeze_days_used_this_month).toBe(0); // Consumes NONE in November!
      expect(resFailed.freezes_consumed).toBe(0);
      expect(resFailed.frozen_dates).toEqual([]);
      expect(resFailed.event_type).toBe('streak_reset');
    });

    it('8. Freezes already used earlier in the month: resets and consumes none if gap exceeds remainder', () => {
      const current: StudentStreakData = {
        current_streak: 8,
        longest_streak: 8,
        last_quiz_date: '2026-10-10',
        freeze_days_used_this_month: 1, // 1 used earlier, only 1 left
        freeze_days_month: '2026-10',
      };

      // Misses 2 days (Oct 11, Oct 12), completes Oct 13
      const res = evaluateStreakCompletion(current, '2026-10-13');
      expect(res.current_streak).toBe(1); // Resets to 1
      expect(res.freeze_days_used_this_month).toBe(1); // Remains 1, NO new freeze consumed!
      expect(res.freezes_consumed).toBe(0);
      expect(res.frozen_dates).toEqual([]);
      expect(res.event_type).toBe('streak_reset');
    });

    it('9. Idempotency: re-evaluating the same date returns event_type none and does not mutate streak', () => {
      const current: StudentStreakData = {
        current_streak: 5,
        longest_streak: 5,
        last_quiz_date: '2026-10-15',
        freeze_days_used_this_month: 1,
        freeze_days_month: '2026-10',
      };

      const res = evaluateStreakCompletion(current, '2026-10-15');
      expect(res.current_streak).toBe(5);
      expect(res.event_type).toBe('none');
      expect(res.freezes_consumed).toBe(0);
      expect(res.notes).toContain('already counted');
    });

    it('10. Streak reset and reaching 7 again generates a new streak_start_date for repeat bonus eligibility', () => {
      // 1. Initial streak reaches 7 days (Oct 01 to Oct 07)
      let streak: StudentStreakData = {
        current_streak: 6,
        longest_streak: 6,
        last_quiz_date: '2026-10-06',
        freeze_days_used_this_month: 0,
        freeze_days_month: '2026-10',
        streak_start_date: '2026-10-01',
      };

      const resFirst7 = evaluateStreakCompletion(streak, '2026-10-07');
      expect(resFirst7.current_streak).toBe(7);
      expect(resFirst7.eligible_for_7_day_bonus).toBe(true);
      expect(resFirst7.streak_start_date).toBe('2026-10-01');

      // 2. Student misses 5 days (Oct 08 through Oct 12), exceeding available freezes -> resets on Oct 13
      streak = {
        current_streak: resFirst7.current_streak,
        longest_streak: resFirst7.longest_streak,
        last_quiz_date: resFirst7.last_quiz_date,
        freeze_days_used_this_month: 2, // Freezes exhausted
        freeze_days_month: '2026-10',
        streak_start_date: resFirst7.streak_start_date,
      };

      const resReset = evaluateStreakCompletion(streak, '2026-10-13');
      expect(resReset.current_streak).toBe(1);
      expect(resReset.event_type).toBe('streak_reset');
      expect(resReset.streak_start_date).toBe('2026-10-13'); // New start date!

      // 3. Student builds new streak consecutively for 6 more days to reach 7 again on Oct 19
      streak = {
        current_streak: 6,
        longest_streak: 7,
        last_quiz_date: '2026-10-18',
        freeze_days_used_this_month: 2,
        freeze_days_month: '2026-10',
        streak_start_date: '2026-10-13',
      };

      const resSecond7 = evaluateStreakCompletion(streak, '2026-10-19');
      expect(resSecond7.current_streak).toBe(7);
      expect(resSecond7.eligible_for_7_day_bonus).toBe(true);
      expect(resSecond7.streak_start_date).toBe('2026-10-13'); // Distinct start date!

      // Ledger references are distinct:
      const ref1 = `streak_7_bonus_student_${resFirst7.streak_start_date}`;
      const ref2 = `streak_7_bonus_student_${resSecond7.streak_start_date}`;
      expect(ref1).not.toBe(ref2);
      expect(ref1).toBe('streak_7_bonus_student_2026-10-01');
      expect(ref2).toBe('streak_7_bonus_student_2026-10-13');
    });

    it('11. Day 14 pays nothing: 7-day bonus is paid ONLY on day 7 (once per streak)', () => {
      const day13: StudentStreakData = {
        current_streak: 13,
        longest_streak: 13,
        last_quiz_date: '2026-10-13',
        freeze_days_used_this_month: 0,
        freeze_days_month: '2026-10',
        streak_start_date: '2026-10-01',
      };

      const res14 = evaluateStreakCompletion(day13, '2026-10-14');
      expect(res14.current_streak).toBe(14);
      // Must NOT be eligible for 7-day bonus on day 14
      expect(res14.eligible_for_7_day_bonus).toBe(false);
      expect(res14.bonus_milestone).toBeNull();
    });

    it('12. Streak of 3, bank empty on day 4 (exempt date), student completes day 5: streak becomes 4 and no freeze is used', () => {
      const day3: StudentStreakData = {
        current_streak: 3,
        longest_streak: 3,
        last_quiz_date: '2026-10-03',
        freeze_days_used_this_month: 0,
        freeze_days_month: '2026-10',
        streak_start_date: '2026-10-01',
      };

      // Day 4 is exempt (no approved questions in bank)
      const exemptDates = ['2026-10-04'];
      const res = evaluateStreakCompletion(day3, '2026-10-05', 2, exemptDates);

      expect(res.current_streak).toBe(4); // 3 + 1 = 4
      expect(res.longest_streak).toBe(4);
      expect(res.last_quiz_date).toBe('2026-10-05');
      expect(res.freeze_days_used_this_month).toBe(0); // NO freeze consumed!
      expect(res.freezes_consumed).toBe(0);
      expect(res.frozen_dates).toEqual([]);
      expect(res.event_type).toBe('streak_increment');
      expect(res.streak_start_date).toBe('2026-10-01');
    });

    it('13. Order of evaluation: remove exempt dates first, then apply freezes to remaining missed days', () => {
      const day3: StudentStreakData = {
        current_streak: 3,
        longest_streak: 3,
        last_quiz_date: '2026-10-03',
        freeze_days_used_this_month: 0,
        freeze_days_month: '2026-10',
        streak_start_date: '2026-10-01',
      };

      // Gap is Oct 04 and Oct 05.
      // Oct 04 is exempt; Oct 05 is a normal missed day.
      // Completes on Oct 06.
      const exemptDates = ['2026-10-04'];
      const res = evaluateStreakCompletion(day3, '2026-10-06', 2, exemptDates);

      expect(res.current_streak).toBe(4); // 3 + 1 for today = 4
      expect(res.freezes_consumed).toBe(1); // 1 freeze consumed for Oct 05 only
      expect(res.freeze_days_used_this_month).toBe(1);
      expect(res.frozen_dates).toEqual(['2026-10-05']);
      expect(res.event_type).toBe('streak_freeze');
    });
  });
});
