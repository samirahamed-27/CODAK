import { describe, it, expect, vi } from 'vitest';
import { isBadgeCriteriaMet, evaluateStudentBadges, BadgeEvaluationContext } from '@/lib/badges';

describe('H2: Quest Badges Immediate Evaluation Suite', () => {
  describe('Criteria Matching for QUEST_FIRST', () => {
    it('evaluates QUEST_FIRST to true immediately when completedQuestsCount reaches 1', () => {
      const ctx: BadgeEvaluationContext = {
        completedQuizzesCount: 0,
        currentStreak: 0,
        longestStreak: 0,
        completedQuestsCount: 1,
        recentQuizScores: [],
        hasBrokenStreakHistory: false,
      };

      expect(isBadgeCriteriaMet('QUEST_FIRST', {}, ctx)).toBe(true);
      expect(isBadgeCriteriaMet('quest_first', {}, ctx)).toBe(true);
    });

    it('evaluates QUEST_FIRST to false when completedQuestsCount is 0', () => {
      const ctx: BadgeEvaluationContext = {
        completedQuizzesCount: 3,
        currentStreak: 2,
        longestStreak: 2,
        completedQuestsCount: 0,
        recentQuizScores: [],
        hasBrokenStreakHistory: false,
      };

      expect(isBadgeCriteriaMet('QUEST_FIRST', {}, ctx)).toBe(false);
      expect(isBadgeCriteriaMet('quest_first', {}, ctx)).toBe(false);
    });
  });

  describe('Immediate Award Execution', () => {
    it('awards quest_first immediately and invokes award_xp with reference badge:quest_first', async () => {
      const insertedBadges: any[] = [];
      const rpcCalls: any[] = [];

      const mockAdminClient: any = {
        from: (table: string) => {
          if (table === 'badges') {
            return {
              select: () => ({
                eq: () =>
                  Promise.resolve({
                    data: [
                      {
                        code: 'quest_first',
                        name: 'Adventurer',
                        description: 'Completed your first learning quest',
                        category: 'QUEST',
                        criteria: { type: 'quest_count', threshold: 1 },
                        active: true,
                      },
                    ],
                    error: null,
                  }),
              }),
            };
          }
          if (table === 'student_badges') {
            return {
              select: () => ({
                eq: () => Promise.resolve({ data: [], error: null }),
              }),
              insert: (row: any) => {
                insertedBadges.push(row);
                return Promise.resolve({ error: null });
              },
            };
          }
          if (table === 'quiz_sessions') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    order: () => Promise.resolve({ data: [], error: null }),
                  }),
                }),
              }),
            };
          }
          if (table === 'student_streaks') {
            return {
              select: () => ({
                eq: () => ({
                  single: () => Promise.resolve({ data: { current_streak: 0, longest_streak: 0 }, error: null }),
                }),
              }),
            };
          }
          if (table === 'student_quest_progress') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => Promise.resolve({ count: 1, error: null }),
                }),
              }),
            };
          }
          return {};
        },
        rpc: (fn: string, args: any) => {
          rpcCalls.push({ fn, args });
          return Promise.resolve({ data: { status: 'awarded', xp_awarded: 20 }, error: null });
        },
      };

      const result = await evaluateStudentBadges('test-student-id', mockAdminClient);

      // Verify quest_first is newly earned
      expect(result.newlyEarned).toContain('quest_first');

      // Verify inserted in student_badges table
      expect(insertedBadges).toHaveLength(1);
      expect(insertedBadges[0].student_id).toBe('test-student-id');
      expect(insertedBadges[0].badge_code).toBe('quest_first');

      // Verify award_xp RPC called with deterministic reference
      expect(rpcCalls).toHaveLength(1);
      expect(rpcCalls[0].fn).toBe('award_xp');
      expect(rpcCalls[0].args.p_action_type).toBe('BADGE_EARNED');
      expect(rpcCalls[0].args.p_reference_id).toBe('badge:quest_first');
    });
  });
});
