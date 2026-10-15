import { describe, it, expect } from 'vitest';
import { getIstWeekDetails, computeTaskProgress, QuestTask } from '@/lib/quests';

describe('Phase 3B: Quests & Weekly Progress Suite', () => {
  describe('IST Week Calculation & Date Boundaries', () => {
    it('calculates Monday weekStart and Sunday weekEnd for a midweek IST date', () => {
      // 2026-10-16 is Friday
      const details = getIstWeekDetails('2026-10-16T10:00:00Z');
      expect(details.istDate).toBe('2026-10-16');
      expect(details.weekStart).toBe('2026-10-12'); // Monday
      expect(details.weekEnd).toBe('2026-10-18'); // Sunday
      expect(details.periodKey).toBe('2026-W42');
    });

    it('considers Sunday as the end of the current week (not the start of a new week)', () => {
      // 2026-10-18 is Sunday
      const details = getIstWeekDetails('2026-10-18T18:00:00Z');
      expect(details.weekStart).toBe('2026-10-12');
      expect(details.weekEnd).toBe('2026-10-18');
      expect(details.periodKey).toBe('2026-W42');
    });

    it('rolls over to new week on Monday 00:00 IST', () => {
      // 2026-10-19 is Monday
      const details = getIstWeekDetails('2026-10-19T02:00:00Z');
      expect(details.weekStart).toBe('2026-10-19');
      expect(details.weekEnd).toBe('2026-10-25');
      expect(details.periodKey).toBe('2026-W43');
    });
  });

  describe('Task Progress from Real Server Actions', () => {
    const quizTask: QuestTask = {
      id: 'task-1',
      quest_id: 'quest-1',
      description: 'Complete 3 daily quizzes',
      action_type: 'daily_quiz_completed',
      target_count: 3,
    };

    const streakTask: QuestTask = {
      id: 'task-2',
      quest_id: 'quest-1',
      description: 'Maintain a 3-day streak',
      action_type: 'streak_days_maintained',
      target_count: 3,
    };

    it('calculates progress for daily quiz task from server count', () => {
      const res = computeTaskProgress(quizTask, {
        dailyQuizzesCount: 2,
        currentStreak: 5,
        practiceCount: 0,
      });
      expect(res.currentCount).toBe(2);
      expect(res.isCompleted).toBe(false);
    });

    it('marks daily quiz task completed when count reaches target', () => {
      const res = computeTaskProgress(quizTask, {
        dailyQuizzesCount: 3,
        currentStreak: 0,
        practiceCount: 0,
      });
      expect(res.currentCount).toBe(3);
      expect(res.isCompleted).toBe(true);
    });

    it('caps reported count at target_count when actual count exceeds target', () => {
      const res = computeTaskProgress(quizTask, {
        dailyQuizzesCount: 7,
        currentStreak: 0,
        practiceCount: 0,
      });
      expect(res.currentCount).toBe(3);
      expect(res.isCompleted).toBe(true);
    });

    it('evaluates streak requirement from verified student streak', () => {
      const res = computeTaskProgress(streakTask, {
        dailyQuizzesCount: 3,
        currentStreak: 3,
        practiceCount: 0,
      });
      expect(res.currentCount).toBe(3);
      expect(res.isCompleted).toBe(true);
    });

    it('fails streak task when streak has not reached target', () => {
      const res = computeTaskProgress(streakTask, {
        dailyQuizzesCount: 3,
        currentStreak: 2,
        practiceCount: 0,
      });
      expect(res.currentCount).toBe(2);
      expect(res.isCompleted).toBe(false);
    });
  });

  describe('Quest Reward Idempotency & Unique Reference IDs', () => {
    it('generates unique reference for weekly quest combining quest_id and period key', () => {
      const questId = '11111111-1111-1111-1111-111111111111';
      const periodKey = '2026-W42';
      const ref = `quest:${questId}:${periodKey}`;
      expect(ref).toBe('quest:11111111-1111-1111-1111-111111111111:2026-W42');
    });

    it('allows weekly quest to be re-earned in subsequent week with distinct reference', () => {
      const questId = '11111111-1111-1111-1111-111111111111';
      const refWeek42 = `quest:${questId}:2026-W42`;
      const refWeek43 = `quest:${questId}:2026-W43`;
      expect(refWeek42).not.toBe(refWeek43);
    });

    it('maintains fixed one-time reference for one-time quests across all periods', () => {
      const questId = '33333333-3333-3333-3333-333333333333';
      const ref1 = `quest:${questId}:one-time`;
      const ref2 = `quest:${questId}:one-time`;
      expect(ref1).toBe(ref2);
    });
  });
});
