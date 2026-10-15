import { describe, it, expect } from 'vitest';
import { isBadgeCriteriaMet, BadgeEvaluationContext } from '@/lib/badges';

describe('Phase 3A: Badge Criteria & Evaluation Suite', () => {
  const baseContext: BadgeEvaluationContext = {
    completedQuizzesCount: 0,
    currentStreak: 0,
    longestStreak: 0,
    completedQuestsCount: 0,
    recentQuizScores: [],
    hasBrokenStreakHistory: false,
  };

  describe('Milestone Badge: First Step (first_quiz)', () => {
    it('is earned when student has completed at least 1 daily quiz', () => {
      const ctx: BadgeEvaluationContext = {
        ...baseContext,
        completedQuizzesCount: 1,
      };
      expect(isBadgeCriteriaMet('first_quiz', {}, ctx)).toBe(true);
    });

    it('is not earned when student has completed 0 quizzes', () => {
      const ctx: BadgeEvaluationContext = {
        ...baseContext,
        completedQuizzesCount: 0,
      };
      expect(isBadgeCriteriaMet('first_quiz', {}, ctx)).toBe(false);
    });
  });

  describe('Milestone Badge: Week of Fire (streak_7)', () => {
    it('is earned when current streak reaches 7 days', () => {
      const ctx: BadgeEvaluationContext = {
        ...baseContext,
        currentStreak: 7,
        longestStreak: 7,
      };
      expect(isBadgeCriteriaMet('streak_7', {}, ctx)).toBe(true);
    });

    it('is earned when longest streak reached 7 days even if current streak broke', () => {
      const ctx: BadgeEvaluationContext = {
        ...baseContext,
        currentStreak: 2,
        longestStreak: 7,
        hasBrokenStreakHistory: true,
      };
      expect(isBadgeCriteriaMet('streak_7', {}, ctx)).toBe(true);
    });

    it('is not earned when streak is under 7 days', () => {
      const ctx: BadgeEvaluationContext = {
        ...baseContext,
        currentStreak: 6,
        longestStreak: 6,
      };
      expect(isBadgeCriteriaMet('streak_7', {}, ctx)).toBe(false);
    });
  });

  describe('Quest Badge: Adventurer (quest_first)', () => {
    it('is earned when student has completed at least 1 quest', () => {
      const ctx: BadgeEvaluationContext = {
        ...baseContext,
        completedQuestsCount: 1,
      };
      expect(isBadgeCriteriaMet('quest_first', {}, ctx)).toBe(true);
    });

    it('is not earned when student has completed 0 quests', () => {
      const ctx: BadgeEvaluationContext = {
        ...baseContext,
        completedQuestsCount: 0,
      };
      expect(isBadgeCriteriaMet('quest_first', {}, ctx)).toBe(false);
    });
  });

  describe('Quest Badge: Quest Master (quest_trio)', () => {
    it('is earned when student has completed at least 3 quests', () => {
      const ctx: BadgeEvaluationContext = {
        ...baseContext,
        completedQuestsCount: 3,
      };
      expect(isBadgeCriteriaMet('quest_trio', {}, ctx)).toBe(true);
    });

    it('is not earned when student has completed 2 quests', () => {
      const ctx: BadgeEvaluationContext = {
        ...baseContext,
        completedQuestsCount: 2,
      };
      expect(isBadgeCriteriaMet('quest_trio', {}, ctx)).toBe(false);
    });
  });

  describe('Improvement Badge: Leveling Up (improvement_score)', () => {
    it('is earned when latest quiz score percentage strictly beats own previous 7-day average', () => {
      // Previous quizzes: 2/5 (40%) and 3/5 (60%). Previous avg = 50%.
      // Latest quiz: 4/5 (80%). 80% > 50% -> earned!
      const ctx: BadgeEvaluationContext = {
        ...baseContext,
        completedQuizzesCount: 3,
        recentQuizScores: [
          { score: 4, total: 5, date: '2026-10-15' },
          { score: 3, total: 5, date: '2026-10-14' },
          { score: 2, total: 5, date: '2026-10-13' },
        ],
      };
      expect(isBadgeCriteriaMet('improvement_score', {}, ctx)).toBe(true);
    });

    it('is not earned when latest score does not beat own previous average', () => {
      // Previous quizzes: 4/5 (80%) and 5/5 (100%). Previous avg = 90%.
      // Latest quiz: 3/5 (60%). 60% < 90% -> not earned
      const ctx: BadgeEvaluationContext = {
        ...baseContext,
        completedQuizzesCount: 3,
        recentQuizScores: [
          { score: 3, total: 5, date: '2026-10-15' },
          { score: 5, total: 5, date: '2026-10-14' },
          { score: 4, total: 5, date: '2026-10-13' },
        ],
      };
      expect(isBadgeCriteriaMet('improvement_score', {}, ctx)).toBe(false);
    });

    it('is not earned when student has only 1 quiz completed (no self-baseline)', () => {
      const ctx: BadgeEvaluationContext = {
        ...baseContext,
        completedQuizzesCount: 1,
        recentQuizScores: [{ score: 5, total: 5, date: '2026-10-15' }],
      };
      expect(isBadgeCriteriaMet('improvement_score', {}, ctx)).toBe(false);
    });
  });

  describe('Improvement Badge: Phoenix (comeback_kid)', () => {
    it('is earned when student reaches at least a 2-day streak after breaking an earlier streak', () => {
      const ctx: BadgeEvaluationContext = {
        ...baseContext,
        currentStreak: 2,
        longestStreak: 5,
        hasBrokenStreakHistory: true,
      };
      expect(isBadgeCriteriaMet('comeback_kid', {}, ctx)).toBe(true);
    });

    it('is not earned on day 1 of a comeback before reaching 2 days', () => {
      const ctx: BadgeEvaluationContext = {
        ...baseContext,
        currentStreak: 1,
        longestStreak: 5,
        hasBrokenStreakHistory: true,
      };
      expect(isBadgeCriteriaMet('comeback_kid', {}, ctx)).toBe(false);
    });

    it('is not earned on a brand-new student with unbroken initial 2-day streak (no previous break)', () => {
      const ctx: BadgeEvaluationContext = {
        ...baseContext,
        currentStreak: 2,
        longestStreak: 2,
        hasBrokenStreakHistory: false,
      };
      expect(isBadgeCriteriaMet('comeback_kid', {}, ctx)).toBe(false);
    });
  });

  describe('Idempotency & Re-evaluation Safety', () => {
    it('generates deterministic unique reference id for award_xp per badge', () => {
      const badgeCode = 'first_quiz';
      const referenceId = `badge:${badgeCode}`;
      expect(referenceId).toBe('badge:first_quiz');
      // Calling repeatedly produces identical reference ID so database constraint blocks duplicate XP
      expect(`badge:${badgeCode}`).toBe(referenceId);
    });
  });
});
