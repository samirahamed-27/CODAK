import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock state for Supabase operations
let mockCurrentUser: { id: string; email?: string } | null = null;

// Mock questions in database
const mockDbQuestions = [
  {
    id: 'q-101',
    topic: 'Time Complexity',
    question_text: 'What is the worst-case time complexity of binary search?',
    option_a: 'O(1)',
    option_b: 'O(log n)',
    option_c: 'O(n)',
    option_d: 'O(n^2)',
    correct_option: 'B',
    explanation: 'Binary search halves the search space at each step, yielding O(log n).',
    status: 'approved',
    is_active: true,
  },
  {
    id: 'q-102',
    topic: 'Data Structures',
    question_text: 'Which data structure operates on a Last-In, First-Out (LIFO) basis?',
    option_a: 'Queue',
    option_b: 'Stack',
    option_c: 'Linked List',
    option_d: 'Binary Tree',
    correct_option: 'B',
    explanation: 'A Stack follows the LIFO principle.',
    status: 'approved',
    is_active: true,
  },
  {
    id: 'q-103',
    topic: 'Operating Systems',
    question_text: 'What is thrashing in an operating system?',
    option_a: 'High CPU utilization with high throughput',
    option_b: 'Excessive paging where the OS spends more time swapping than executing',
    option_c: 'Terminating a crashed process safely',
    option_d: 'Compacting physical memory to avoid external fragmentation',
    correct_option: 'B',
    explanation: 'Thrashing occurs when memory is overcommitted and the OS pages constantly.',
    status: 'approved',
    is_active: true,
  },
];

let mockDbAttempts: any[] = [];
let mockDbAnswers: any[] = [];
let mockDbStreaks: any[] = [];
let mockDbStreakEvents: any[] = [];
let mockAwardXpCalls: any[] = [];

// Mock @/lib/supabase/server
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: mockCurrentUser },
        error: mockCurrentUser ? null : { message: 'Not authenticated' },
      }),
    },
  })),
}));

// Mock @supabase/supabase-js createClient
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockImplementation(() => ({
    from: (table: string) => {
      let filters: { field: string; op: string; val: any }[] = [];
      let currentInsertData: any = null;
      let currentUpdateData: any = null;

      const builder: any = {
        select: (cols?: string) => builder,
        eq: (field: string, val: any) => {
          filters.push({ field, op: 'eq', val });
          return builder;
        },
        in: (field: string, val: any[]) => {
          filters.push({ field, op: 'in', val });
          return builder;
        },
        maybeSingle: async () => {
          const rows = getFilteredRows();
          return { data: rows[0] || null, error: null };
        },
        single: async () => {
          const rows = getFilteredRows();
          if (rows.length === 0) {
            return { data: null, error: { message: 'Row not found' } };
          }
          return { data: rows[0], error: null };
        },
        insert: (data: any) => {
          currentInsertData = data;
          if (table === 'quiz_attempts') {
            const row = { id: `att-${Date.now()}`, ...data };
            mockDbAttempts.push(row);
            return {
              select: () => ({
                single: async () => ({ data: row, error: null }),
              }),
            };
          }
          if (table === 'quiz_answers') {
            const row = { id: `ans-${Date.now()}`, ...data };
            mockDbAnswers.push(row);
            return Promise.resolve({ data: row, error: null });
          }
          if (table === 'streak_events') {
            const row = { id: `se-${Date.now()}`, ...data };
            mockDbStreakEvents.push(row);
            return Promise.resolve({ data: row, error: null });
          }
          return Promise.resolve({ data: data, error: null });
        },
        update: (data: any) => {
          currentUpdateData = data;
          return {
            eq: (field: string, val: any) => {
              filters.push({ field, op: 'eq', val });
              if (table === 'quiz_attempts') {
                const row = mockDbAttempts.find((a) => a[field] === val);
                if (row) Object.assign(row, currentUpdateData);
              }
              return Promise.resolve({ data: null, error: null });
            },
          };
        },
        upsert: async (data: any) => {
          if (table === 'student_streaks') {
            const idx = mockDbStreaks.findIndex((s) => s.student_id === data.student_id);
            if (idx >= 0) {
              mockDbStreaks[idx] = { ...mockDbStreaks[idx], ...data };
            } else {
              mockDbStreaks.push({ ...data });
            }
          }
          return { data, error: null };
        },
        then: (resolve: any) => {
          const rows = getFilteredRows();
          return Promise.resolve({ data: rows, error: null }).then(resolve);
        },
      };

      function getFilteredRows() {
        let list: any[] = [];
        if (table === 'questions') list = [...mockDbQuestions];
        if (table === 'quiz_attempts') list = [...mockDbAttempts];
        if (table === 'quiz_answers') list = [...mockDbAnswers];
        if (table === 'student_streaks') list = [...mockDbStreaks];
        if (table === 'app_settings') {
          list = [
            { key: 'questions_per_daily_quiz', value: 3 },
            { key: 'max_freeze_days_per_month', value: 2 },
          ];
        }

        for (const f of filters) {
          if (f.op === 'eq') {
            list = list.filter((r) => r[f.field] === f.val);
          } else if (f.op === 'in') {
            list = list.filter((r) => Array.isArray(f.val) && f.val.includes(r[f.field]));
          }
        }
        return list;
      }

      return builder;
    },
    rpc: async (fnName: string, args: any) => {
      if (fnName === 'award_xp') {
        mockAwardXpCalls.push(args);
        return {
          data: {
            status: 'awarded',
            xp_awarded: 15,
            message: '15 XP awarded for DAILY_QUIZ',
          },
          error: null,
        };
      }
      return { data: null, error: null };
    },
  })),
}));

import {
  getDailyQuizSessionAction,
  submitQuizAnswerAction,
  finalizeQuizAction,
  getPracticeQuizSessionAction,
} from '../src/app/actions/quiz';

describe('Daily Quiz Engine & Streaks Security Suite', () => {
  const studentA = 'student-uuid-aaa-111';
  const studentB = 'student-uuid-bbb-222';

  beforeEach(() => {
    mockCurrentUser = { id: studentA, email: 'studenta@dev.local' };
    mockDbAttempts = [];
    mockDbAnswers = [];
    mockDbStreaks = [];
    mockDbStreakEvents = [];
    mockAwardXpCalls = [];
  });

  describe('1. Information Hiding Security', () => {
    it('Never leaks correct_option or explanation in unanswered quiz session', async () => {
      const session = await getDailyQuizSessionAction();

      expect(session.status).toBe('active');
      expect(session.questions).toBeDefined();
      expect(session.questions!.length).toBeGreaterThan(0);

      // Verify each question does NOT have correctOption or explanation exposed
      for (const q of session.questions!) {
        expect(q.isAnswered).toBe(false);
        expect((q as any).correct_option).toBeUndefined();
        expect((q as any).correctOption).toBeUndefined();
        expect((q as any).explanation).toBeUndefined();
        // Options and question text must be present
        expect(q.questionText).toBeTruthy();
        expect(q.options.length).toBe(4);
      }
    });

    it('Rejects unauthenticated student requests to daily quiz', async () => {
      mockCurrentUser = null;
      const session = await getDailyQuizSessionAction();

      expect(session.status).toBe('error');
      expect(session.error).toMatch(/unauthorized/i);
    });
  });

  describe('2. Server-Side Answer Validation & Anti-Cheating', () => {
    it('Reveals explanation and correctness only after submitting answer', async () => {
      const session = await getDailyQuizSessionAction();
      const attemptId = session.attemptId!;
      const q1 = session.questions![0];
      const matchingQ = mockDbQuestions.find((q) => q.id === q1.id)!;

      // Submit an answer
      const submitRes = await submitQuizAnswerAction({
        attemptId,
        questionId: q1.id,
        selectedOption: matchingQ.correct_option as any,
      });

      expect(submitRes.success).toBe(true);
      expect(submitRes.isCorrect).toBe(true);
      expect(submitRes.correctOption).toBe(matchingQ.correct_option);
      expect(submitRes.explanation).toBe(matchingQ.explanation);
    });

    it('Rejects submitting an answer for a question not in the attempt', async () => {
      const session = await getDailyQuizSessionAction();
      const attemptId = session.attemptId!;

      const res = await submitQuizAnswerAction({
        attemptId,
        questionId: 'unknown-question-xyz',
        selectedOption: 'A',
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/does not belong to this quiz attempt/i);
    });

    it('Rejects answers submitted by student B on student A attempt (Cross-student tampering)', async () => {
      const session = await getDailyQuizSessionAction();
      const attemptId = session.attemptId!;
      const q1 = session.questions![0];

      // Student B tries to tamper with Student A attempt
      mockCurrentUser = { id: studentB, email: 'attacker@dev.local' };

      const res = await submitQuizAnswerAction({
        attemptId,
        questionId: q1.id,
        selectedOption: 'A',
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/forbidden: you do not own this quiz session/i);
    });

    it('Prevents changing an answer once submitted (immutability)', async () => {
      const session = await getDailyQuizSessionAction();
      const attemptId = session.attemptId!;
      const q1 = session.questions![0];

      // First answer
      await submitQuizAnswerAction({
        attemptId,
        questionId: q1.id,
        selectedOption: 'B',
      });

      // Second attempt to change answer
      const secondAttempt = await submitQuizAnswerAction({
        attemptId,
        questionId: q1.id,
        selectedOption: 'A',
      });

      expect(secondAttempt.success).toBe(false);
      expect(secondAttempt.error).toMatch(/cannot be changed/i);
    });

    it('Rejects invalid option keys outside A, B, C, D', async () => {
      const session = await getDailyQuizSessionAction();
      const attemptId = session.attemptId!;
      const q1 = session.questions![0];

      const res = await submitQuizAnswerAction({
        attemptId,
        questionId: q1.id,
        selectedOption: 'E' as any,
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/invalid option selected/i);
    });
  });

  describe('3. Finalization, XP Ledger & Idempotency', () => {
    it('Rejects finalization before all questions are answered', async () => {
      const session = await getDailyQuizSessionAction();
      const attemptId = session.attemptId!;

      // Answer only 1 of 3 questions
      await submitQuizAnswerAction({
        attemptId,
        questionId: session.questions![0].id,
        selectedOption: 'A',
      });

      const finalizeRes = await finalizeQuizAction({ attemptId });
      expect(finalizeRes.success).toBe(false);
      expect(finalizeRes.error).toMatch(/please answer all/i);
    });

    it('Awards XP via award_xp and updates streak upon completing all questions', async () => {
      const session = await getDailyQuizSessionAction();
      const attemptId = session.attemptId!;

      // Answer all 3 questions
      for (const q of session.questions!) {
        await submitQuizAnswerAction({
          attemptId,
          questionId: q.id,
          selectedOption: 'B',
        });
      }

      const finalizeRes = await finalizeQuizAction({ attemptId });
      expect(finalizeRes.success).toBe(true);
      expect(finalizeRes.score).toBeDefined();
      expect(finalizeRes.currentStreak).toBe(1);
      expect(finalizeRes.xpAwarded).toBe(15);

      // Verify award_xp call details
      expect(mockAwardXpCalls.length).toBe(1);
      expect(mockAwardXpCalls[0].p_action_type).toBe('DAILY_QUIZ');
      expect(mockAwardXpCalls[0].p_extra_units).toBe(0);
      expect(mockAwardXpCalls[0].p_reference_id).toMatch(/^daily_quiz_/);
      expect(mockAwardXpCalls[0].p_student_id).toBe(studentA);
    });

    it('Is strictly idempotent on multiple finalization calls', async () => {
      const session = await getDailyQuizSessionAction();
      const attemptId = session.attemptId!;

      for (const q of session.questions!) {
        await submitQuizAnswerAction({
          attemptId,
          questionId: q.id,
          selectedOption: 'B',
        });
      }

      // First finalization
      const firstRes = await finalizeQuizAction({ attemptId });
      expect(firstRes.success).toBe(true);
      expect(firstRes.alreadyFinalized).toBe(false);
      expect(mockAwardXpCalls.length).toBe(1);

      // Second finalization call (e.g. network retry or double-click)
      const secondRes = await finalizeQuizAction({ attemptId });
      expect(secondRes.success).toBe(true);
      expect(secondRes.alreadyFinalized).toBe(true);
      // award_xp must NOT be called again
      expect(mockAwardXpCalls.length).toBe(1);
    });

    it('Prevents Student B from finalizing Student A quiz attempt', async () => {
      const session = await getDailyQuizSessionAction();
      const attemptId = session.attemptId!;

      mockCurrentUser = { id: studentB };
      const res = await finalizeQuizAction({ attemptId });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/forbidden: you do not own this quiz session/i);
    });
  });

  describe('4. Practice Mode Isolation', () => {
    it('Practice mode generates questions without daily attempt record or streak change', async () => {
      const practice = await getPracticeQuizSessionAction();

      expect(practice.success).toBe(true);
      expect(practice.questions).toBeDefined();
      expect(practice.questions!.length).toBeGreaterThan(0);

      // No quiz_attempts should be created
      expect(mockDbAttempts.length).toBe(0);
      // No XP awarded
      expect(mockAwardXpCalls.length).toBe(0);
      // Practice mode supplies explanation for study
      expect(practice.questions![0].explanation).toBeTruthy();
    });
  });
});
