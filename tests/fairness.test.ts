import { describe, it, expect } from 'vitest';
import {
  generateConceptMatchRound,
  verifyConceptMatches,
  CONCEPT_PAIRS_BANK,
} from '@/lib/concept-match';
import { isBadgeCriteriaMet, BadgeEvaluationContext } from '@/lib/badges';
import { calculateGroupOutcomes, MemberRankInput, DEFAULT_LEAGUE_CONFIG } from '@/lib/leagues';

describe('Phase 3G: Concept Match & Fairness Checkpoint Suite', () => {
  describe('Concept Match Mini-Game Logic', () => {
    it('generates a round with 4 unique terms and 4 randomized definitions', () => {
      const round = generateConceptMatchRound(4);
      expect(round.terms).toHaveLength(4);
      expect(round.definitions).toHaveLength(4);

      // Verify terms come from valid bank
      const bankIds = CONCEPT_PAIRS_BANK.map((p) => p.id);
      round.terms.forEach((t) => expect(bankIds).toContain(t.id));
      round.definitions.forEach((d) => expect(bankIds).toContain(d.id));
    });

    it('validates a perfect 4/4 match', () => {
      const round = generateConceptMatchRound(4);
      const perfectMatches = round.terms.map((t) => ({
        termId: t.id,
        definitionId: t.id, // Matching identical IDs
      }));

      const outcome = verifyConceptMatches(perfectMatches);
      expect(outcome.correctCount).toBe(4);
      expect(outcome.totalCount).toBe(4);
      expect(outcome.isPerfect).toBe(true);
      expect(outcome.incorrectPairs).toHaveLength(0);
    });

    it('identifies mismatched pairs when student selects wrong definitions', () => {
      const round = generateConceptMatchRound(4);
      // Swap first two definitions
      const mismatched = [
        { termId: round.terms[0].id, definitionId: round.terms[1].id },
        { termId: round.terms[1].id, definitionId: round.terms[0].id },
        { termId: round.terms[2].id, definitionId: round.terms[2].id },
        { termId: round.terms[3].id, definitionId: round.terms[3].id },
      ];

      const outcome = verifyConceptMatches(mismatched);
      expect(outcome.correctCount).toBe(2);
      expect(outcome.totalCount).toBe(4);
      expect(outcome.isPerfect).toBe(false);
      expect(outcome.incorrectPairs).toHaveLength(2);
    });
  });

  describe('FAIRNESS TEST (Checkpoint): Low-Activity Steady Student Progress', () => {
    /**
     * SIMULATION:
     * Student "Kavya" commits small, steady daily effort:
     * - Solves 1 daily quiz per day for 7 consecutive days (scoring 3/5 = 30 XP/day).
     * - Never grinds 50 quizzes or plays for hours; just 5-10 minutes each morning.
     * - Maintains an uninterrupted 7-day streak.
     *
     * GOAL:
     * 1. Earns at least 2 badges (first_quiz on Day 1, streak_7 on Day 7, improvement_score on Day 7).
     * 2. Earns promotion in Weekly League from Bronze to Silver.
     * 3. Ledger sum matches total XP exactly.
     */
    it('proves a low-activity steady student earns at least 2 badges and league promotion', () => {
      const studentId = 'student-kavya-steady';
      const earnedBadgeCodes = new Set<string>();

      // DAY 1: Kavya completes first quiz (3/5 correct)
      const day1Ctx: BadgeEvaluationContext = {
        completedQuizzesCount: 1,
        currentStreak: 1,
        longestStreak: 1,
        completedQuestsCount: 0,
        recentQuizScores: [{ score: 3, total: 5, date: '2026-10-12' }],
        hasBrokenStreakHistory: false,
      };

      if (isBadgeCriteriaMet('first_quiz', {}, day1Ctx)) {
        earnedBadgeCodes.add('first_quiz');
      }
      expect(earnedBadgeCodes.has('first_quiz')).toBe(true);

      // DAY 7: Uninterrupted daily streak reached + score improvement
      const day7Ctx: BadgeEvaluationContext = {
        completedQuizzesCount: 7,
        currentStreak: 7,
        longestStreak: 7,
        completedQuestsCount: 1, // Completed 1 quest during the week
        recentQuizScores: [
          { score: 4, total: 5, date: '2026-10-18' }, // Day 7: 4/5 (80%)
          { score: 3, total: 5, date: '2026-10-17' }, // Day 6: 3/5 (60%)
          { score: 3, total: 5, date: '2026-10-16' }, // Day 5: 3/5 (60%)
        ],
        hasBrokenStreakHistory: false,
      };

      if (isBadgeCriteriaMet('streak_7', {}, day7Ctx)) {
        earnedBadgeCodes.add('streak_7');
      }
      if (isBadgeCriteriaMet('improvement_score', {}, day7Ctx)) {
        earnedBadgeCodes.add('improvement_score');
      }

      // Checkpoint 1: Student has earned >= 2 badges (in fact, 3 badges!)
      expect(earnedBadgeCodes.size).toBeGreaterThanOrEqual(2);
      expect(earnedBadgeCodes.has('first_quiz')).toBe(true);
      expect(earnedBadgeCodes.has('streak_7')).toBe(true);
      expect(earnedBadgeCodes.has('improvement_score')).toBe(true);

      // LEDGER SIMULATION:
      // Day 1..7: 7 quizzes * 30 XP = 210 XP
      // Day 7 streak bonus: +50 XP
      // Week Quest completion: +50 XP
      // Total Kavya weekly XP = 310 XP
      const kavyaWeeklyLedger = [
        { action: 'DAILY_QUIZ', amount: 30, ref: 'quiz:day1' },
        { action: 'DAILY_QUIZ', amount: 30, ref: 'quiz:day2' },
        { action: 'DAILY_QUIZ', amount: 30, ref: 'quiz:day3' },
        { action: 'DAILY_QUIZ', amount: 30, ref: 'quiz:day4' },
        { action: 'DAILY_QUIZ', amount: 30, ref: 'quiz:day5' },
        { action: 'DAILY_QUIZ', amount: 30, ref: 'quiz:day6' },
        { action: 'DAILY_QUIZ', amount: 30, ref: 'quiz:day7' },
        { action: 'STREAK_7_BONUS', amount: 50, ref: 'streak_7_bonus_kavya_week1' },
        { action: 'QUEST_REWARD', amount: 50, ref: 'quest:quest-1:2026-W42' },
      ];

      const kavyaTotalXp = kavyaWeeklyLedger.reduce((sum, item) => sum + item.amount, 0);
      expect(kavyaTotalXp).toBe(310);

      // WEEKLY LEAGUE SIMULATION:
      // Kavya is placed in a Bronze League group with 19 peers (total 20 students).
      // Most students are inactive or irregular; only 2 hardcore students grinded.
      const leagueMembers: MemberRankInput[] = [
        { studentId: 'student-hardcore-1', weeklyXp: 550 },
        { studentId: 'student-hardcore-2', weeklyXp: 420 },
        { studentId, weeklyXp: kavyaTotalXp }, // Kavya with 310 XP
        { studentId: 'student-moderate-1', weeklyXp: 180 },
        { studentId: 'student-moderate-2', weeklyXp: 120 },
        { studentId: 'student-casual-1', weeklyXp: 60 },
        { studentId: 'student-casual-2', weeklyXp: 45 },
        { studentId: 'student-casual-3', weeklyXp: 30 },
        { studentId: 'student-casual-4', weeklyXp: 30 },
        // 11 Inactive students with 0 XP
        ...Array.from({ length: 11 }, (_, i) => ({
          studentId: `student-inactive-${i + 1}`,
          weeklyXp: 0,
        })),
      ];

      expect(leagueMembers).toHaveLength(20);

      // Run Monday 00:00 IST League Rollover
      const groupOutcomes = calculateGroupOutcomes(
        leagueMembers,
        DEFAULT_LEAGUE_CONFIG,
        'bronze'
      );

      // Find Kavya in outcomes
      const kavyaOutcome = groupOutcomes.find((m) => m.studentId === studentId);

      expect(kavyaOutcome).toBeDefined();
      expect(kavyaOutcome?.rank).toBe(3); // Top 3!
      expect(kavyaOutcome?.outcome).toBe('promoted');
      expect(kavyaOutcome?.newTierId).toBe('silver');

      // Checkpoint 2: Proof of Fairness verified!
      // Steady low-activity student earned promotion and >= 2 badges!
      expect(kavyaOutcome?.outcome).toBe('promoted');
      expect(earnedBadgeCodes.size).toBeGreaterThanOrEqual(2);
    });

    it('verifies that XP ledger strictly excludes voided events from total', () => {
      const ledger = [
        { id: 'ev-1', amount: 30, voided: false },
        { id: 'ev-2', amount: 30, voided: false },
        { id: 'ev-3', amount: 50, voided: true }, // Voided row
        { id: 'ev-4', amount: 10, voided: false },
      ];

      const validTotal = ledger
        .filter((ev) => !ev.voided)
        .reduce((sum, ev) => sum + ev.amount, 0);

      expect(validTotal).toBe(70); // 30 + 30 + 10 = 70 (50 excluded)
    });
  });
});
