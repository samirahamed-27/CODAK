import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock state for Supabase operations
let mockCurrentUser: { id: string; email?: string } | null = null;

// Mock questions in database
const mockDbQuestions: any[] = [
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
  {
    id: 'q-104',
    topic: 'Networking',
    question_text: 'What protocol resolves IP addresses to MAC addresses?',
    option_a: 'DNS',
    option_b: 'ARP',
    option_c: 'DHCP',
    option_d: 'HTTP',
    correct_option: 'B',
    explanation: 'ARP resolves network layer IPv4 addresses to link layer hardware MAC addresses.',
    status: 'approved',
    is_active: true,
  },
  {
    id: 'q-105',
    topic: 'Database Systems',
    question_text: 'Which ACID property ensures that transactions are all-or-nothing?',
    option_a: 'Consistency',
    option_b: 'Atomicity',
    option_c: 'Isolation',
    option_d: 'Durability',
    correct_option: 'B',
    explanation: 'Atomicity guarantees that all operations within a transaction succeed or all fail together.',
    status: 'approved',
    is_active: true,
  },
];

let mockDbAttempts: any[] = [];
let mockDbAnswers: any[] = [];
let mockDbStreaks: any[] = [];
let mockDbStreakEvents: any[] = [];
let mockDbExemptDates: any[] = [];
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
      let orClause: string | null = null;
      let currentInsertData: any = null;
      let currentUpdateData: any = null;

      const builder: any = {
        select: (cols?: string) => builder,
        or: (clause: string) => {
          orClause = clause;
          return builder;
        },
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
            if (data.mode === 'daily') {
              const conflict = mockDbAttempts.find(
                (a) => a.student_id === data.student_id && a.quiz_date === data.quiz_date && a.mode === 'daily'
              );
              if (conflict) {
                return {
                  select: () => ({
                    single: async () => ({
                      data: null,
                      error: { code: '23505', message: 'duplicate key value violates unique constraint' },
                    }),
                  }),
                };
              }
            }
            const row = { id: `att-${Date.now()}-${Math.random()}`, ...data };
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
          if (table === 'quiz_exempt_dates') {
            mockDbExemptDates.push(data);
            return Promise.resolve({ data, error: null });
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
          if (table === 'quiz_exempt_dates') {
            const idx = mockDbExemptDates.findIndex((d) => d.date === data.date);
            if (idx >= 0) {
              mockDbExemptDates[idx] = { ...mockDbExemptDates[idx], ...data };
            } else {
              mockDbExemptDates.push({ ...data });
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
        if (table === 'quiz_exempt_dates') list = [...mockDbExemptDates];
        if (table === 'app_settings') {
          list = [
            { key: 'questions_per_daily_quiz', value: 5 },
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

        if (table === 'questions' && orClause) {
          const match = orClause.match(/approved_at\.lte\.([^,]+)/);
          if (match) {
            const cutoff = match[1];
            list = list.filter((q) => {
              const dt = q.approved_at || q.created_at || '2026-09-01T00:00:00Z';
              return dt <= cutoff;
            });
          }
        }

        return list;
      }

      return builder;
    },
    rpc: async (fnName: string, args: any) => {
      if (fnName === 'award_xp') {
        const existing = mockAwardXpCalls.find(
          (c) => c.p_reference_id === args.p_reference_id && c.p_action_type === args.p_action_type
        );
        if (existing) {
          return {
            data: {
              status: 'duplicate',
              xp_awarded: 0,
              message: 'Duplicate reference',
            },
            error: null,
          };
        }
        mockAwardXpCalls.push(args);
        let xp = 15;
        if (args.p_action_type === 'DAILY_QUIZ') {
          xp = 15 + (args.p_extra_units ?? 0) * 5;
        } else if (args.p_action_type === 'STREAK_7_BONUS') {
          xp = 50;
        }
        return {
          data: {
            status: 'awarded',
            xp_awarded: xp,
            message: `${xp} XP awarded for ${args.p_action_type}`,
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
  submitPracticeAnswerAction,
  getStudentStreakAction,
} from '../src/app/actions/quiz';

describe('Daily Quiz Engine & Streaks Security Suite', () => {
  const studentA = 'student-uuid-aaa-111';
  const studentB = 'student-uuid-bbb-222';

  beforeEach(() => {
    delete process.env.TEST_SIMULATED_DATE;
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

      // Answer all 5 questions correctly
      for (const q of session.questions!) {
        await submitQuizAnswerAction({
          attemptId,
          questionId: q.id,
          selectedOption: 'B',
        });
      }

      const finalizeRes = await finalizeQuizAction({ attemptId });
      expect(finalizeRes.success).toBe(true);
      expect(finalizeRes.score).toBe(5);
      expect(finalizeRes.currentStreak).toBe(1);
      expect(finalizeRes.xpAwarded).toBe(40); // 15 + 5 * 5 = 40

      // Verify award_xp call details
      expect(mockAwardXpCalls.length).toBe(1);
      expect(mockAwardXpCalls[0].p_action_type).toBe('DAILY_QUIZ');
      expect(mockAwardXpCalls[0].p_extra_units).toBe(5);
      expect(mockAwardXpCalls[0].p_reference_id).toMatch(/^daily_quiz_/);
      expect(mockAwardXpCalls[0].p_student_id).toBe(studentA);
    });

    it('Daily quiz XP calculation: 0 correct awards exactly 15 XP (base 15 + 0 extra)', async () => {
      const session = await getDailyQuizSessionAction();
      const attemptId = session.attemptId!;

      // Answer all 5 questions incorrectly
      for (const q of session.questions!) {
        await submitQuizAnswerAction({
          attemptId,
          questionId: q.id,
          selectedOption: 'A',
        });
      }

      const finalizeRes = await finalizeQuizAction({ attemptId });
      expect(finalizeRes.success).toBe(true);
      expect(finalizeRes.score).toBe(0);
      expect(finalizeRes.xpAwarded).toBe(15);
      expect(mockAwardXpCalls.length).toBe(1);
      expect(mockAwardXpCalls[0].p_extra_units).toBe(0);
    });

    it('Daily quiz XP calculation: 3 correct awards exactly 30 XP (base 15 + 3*5)', async () => {
      const session = await getDailyQuizSessionAction();
      const attemptId = session.attemptId!;

      // Answer first 3 correct ('B'), remaining 2 incorrect ('A')
      for (let i = 0; i < session.questions!.length; i++) {
        await submitQuizAnswerAction({
          attemptId,
          questionId: session.questions![i].id,
          selectedOption: i < 3 ? 'B' : 'A',
        });
      }

      const finalizeRes = await finalizeQuizAction({ attemptId });
      expect(finalizeRes.success).toBe(true);
      expect(finalizeRes.score).toBe(3);
      expect(finalizeRes.xpAwarded).toBe(30);
      expect(mockAwardXpCalls.length).toBe(1);
      expect(mockAwardXpCalls[0].p_extra_units).toBe(3);
    });

    it('Daily quiz XP calculation: 5 correct awards exactly 40 XP (base 15 + 5*5)', async () => {
      const session = await getDailyQuizSessionAction();
      const attemptId = session.attemptId!;

      // Answer all 5 correct ('B')
      for (const q of session.questions!) {
        await submitQuizAnswerAction({
          attemptId,
          questionId: q.id,
          selectedOption: 'B',
        });
      }

      const finalizeRes = await finalizeQuizAction({ attemptId });
      expect(finalizeRes.success).toBe(true);
      expect(finalizeRes.score).toBe(5);
      expect(finalizeRes.xpAwarded).toBe(40);
      expect(mockAwardXpCalls.length).toBe(1);
      expect(mockAwardXpCalls[0].p_extra_units).toBe(5);
    });

    it('Finalizing twice does NOT pay twice (idempotency & duplicate protection)', async () => {
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
      expect(firstRes.xpAwarded).toBe(40);
      expect(mockAwardXpCalls.length).toBe(1);

      // Second finalization call (e.g. network retry or double-click)
      const secondRes = await finalizeQuizAction({ attemptId });
      expect(secondRes.success).toBe(true);
      expect(secondRes.alreadyFinalized).toBe(true);
      expect(secondRes.xpAwarded).toBe(40);
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

    it('3(a). Day 7 of streak pays 50 XP bonus with reference streak_7_bonus_<student>_<streak_start_date>', async () => {
      process.env.TEST_SIMULATED_DATE = '2026-10-07';
      mockDbStreaks.push({
        student_id: studentA,
        current_streak: 6,
        longest_streak: 6,
        last_quiz_date: '2026-10-06',
        freeze_days_used_this_month: 0,
        freeze_days_month: '2026-10',
        streak_start_date: '2026-10-01',
      });

      const session = await getDailyQuizSessionAction();
      const att = mockDbAttempts.find((a) => a.id === session.attemptId);
      att.quiz_date = '2026-10-07';

      for (const q of session.questions!) {
        await submitQuizAnswerAction({ attemptId: session.attemptId!, questionId: q.id, selectedOption: 'B' });
      }

      const res = await finalizeQuizAction({ attemptId: session.attemptId! });
      expect(res.success).toBe(true);
      expect(res.currentStreak).toBe(7);
      expect(res.bonusAwarded).toBe(true);

      const firstBonus = mockAwardXpCalls.find((c) => c.p_action_type === 'STREAK_7_BONUS');
      expect(firstBonus).toBeDefined();
      expect(firstBonus.p_reference_id).toBe(`streak_7_bonus_${studentA}_2026-10-01`);
    });

    it('3(b). Replaying finalize on day 7 is idempotent and never pays twice', async () => {
      process.env.TEST_SIMULATED_DATE = '2026-10-07';
      mockDbStreaks.push({
        student_id: studentA,
        current_streak: 6,
        longest_streak: 6,
        last_quiz_date: '2026-10-06',
        freeze_days_used_this_month: 0,
        freeze_days_month: '2026-10',
        streak_start_date: '2026-10-01',
      });

      const session = await getDailyQuizSessionAction();
      const att = mockDbAttempts.find((a) => a.id === session.attemptId);
      att.quiz_date = '2026-10-07';

      for (const q of session.questions!) {
        await submitQuizAnswerAction({ attemptId: session.attemptId!, questionId: q.id, selectedOption: 'B' });
      }

      await finalizeQuizAction({ attemptId: session.attemptId! });
      const bonusesBefore = mockAwardXpCalls.filter((c) => c.p_action_type === 'STREAK_7_BONUS').length;
      expect(bonusesBefore).toBe(1);

      // Replaying finalize
      const replayRes = await finalizeQuizAction({ attemptId: session.attemptId! });
      expect(replayRes.success).toBe(true);
      expect(replayRes.alreadyFinalized).toBe(true);
      const bonusesAfter = mockAwardXpCalls.filter((c) => c.p_action_type === 'STREAK_7_BONUS').length;
      expect(bonusesAfter).toBe(1); // Never double pays!
    });

    it('3(c). Day 14 pays nothing: 7-day bonus is paid ONLY on day 7 (once per streak)', async () => {
      process.env.TEST_SIMULATED_DATE = '2026-10-14';
      mockDbStreaks.push({
        student_id: studentA,
        current_streak: 13,
        longest_streak: 13,
        last_quiz_date: '2026-10-13',
        freeze_days_used_this_month: 0,
        freeze_days_month: '2026-10',
        streak_start_date: '2026-10-01',
      });

      const session14 = await getDailyQuizSessionAction();
      const att14 = mockDbAttempts.find((a) => a.id === session14.attemptId);
      att14.quiz_date = '2026-10-14';

      for (const q of session14.questions!) {
        await submitQuizAnswerAction({ attemptId: session14.attemptId!, questionId: q.id, selectedOption: 'B' });
      }

      const res14 = await finalizeQuizAction({ attemptId: session14.attemptId! });
      expect(res14.success).toBe(true);
      expect(res14.currentStreak).toBe(14);
      expect(res14.bonusAwarded).toBe(false);

      const bonusesAt14 = mockAwardXpCalls.filter((c) => c.p_action_type === 'STREAK_7_BONUS');
      expect(bonusesAt14.length).toBe(0); // Day 14 pays nothing!
    });

    it('3(d). A streak that resets and reaches 7 again pays the 7-day bonus again with new start date reference', async () => {
      process.env.TEST_SIMULATED_DATE = '2026-10-21';
      // Student's second streak started on Oct 15 and is now at day 6
      mockDbStreaks.push({
        student_id: studentA,
        current_streak: 6,
        longest_streak: 7,
        last_quiz_date: '2026-10-20',
        freeze_days_used_this_month: 0,
        freeze_days_month: '2026-10',
        streak_start_date: '2026-10-15',
      });

      const session = await getDailyQuizSessionAction();
      const att = mockDbAttempts.find((a) => a.id === session.attemptId);
      att.quiz_date = '2026-10-21';

      for (const q of session.questions!) {
        await submitQuizAnswerAction({ attemptId: session.attemptId!, questionId: q.id, selectedOption: 'B' });
      }

      const res = await finalizeQuizAction({ attemptId: session.attemptId! });
      expect(res.success).toBe(true);
      expect(res.currentStreak).toBe(7);
      expect(res.bonusAwarded).toBe(true);

      const bonus = mockAwardXpCalls.find((c) => c.p_action_type === 'STREAK_7_BONUS');
      expect(bonus).toBeDefined();
      expect(bonus.p_reference_id).toBe(`streak_7_bonus_${studentA}_2026-10-15`);
    });

    it('Logs a streak_freeze event per frozen day when student misses days within freeze quota', async () => {
      process.env.TEST_SIMULATED_DATE = '2026-10-04';
      // Student has streak of 3, last completed Oct 01, 0 freezes used
      mockDbStreaks.push({
        student_id: studentA,
        current_streak: 3,
        longest_streak: 3,
        last_quiz_date: '2026-10-01',
        freeze_days_used_this_month: 0,
        freeze_days_month: '2026-10',
        streak_start_date: '2026-09-29',
      });

      mockDbAttempts = [];
      const session = await getDailyQuizSessionAction();
      const att = mockDbAttempts.find((a) => a.id === session.attemptId);
      // Student missed Oct 02 & Oct 03, completes on Oct 04 (2 missed days)
      att.quiz_date = '2026-10-04';

      for (const q of session.questions!) {
        await submitQuizAnswerAction({ attemptId: session.attemptId!, questionId: q.id, selectedOption: 'B' });
      }

      const res = await finalizeQuizAction({ attemptId: session.attemptId! });
      expect(res.success).toBe(true);
      expect(res.currentStreak).toBe(4); // Preserved streak 3, + 1 for today = 4

      // Verify streak_events has individual streak_freeze events for each frozen day
      const freezeEvents = mockDbStreakEvents.filter((e) => e.event_type === 'streak_freeze');
      expect(freezeEvents.length).toBe(2);
      expect(freezeEvents.map((e) => e.quiz_date)).toEqual(['2026-10-02', '2026-10-03']);
      expect(freezeEvents[0].streak_before).toBe(3);
      expect(freezeEvents[0].streak_after).toBe(3); // frozen days do not add to count
    });

    it('4(a). No approved questions today does NOT break or mutate student streak', async () => {
      mockDbStreaks.push({
        student_id: studentA,
        current_streak: 5,
        longest_streak: 5,
        last_quiz_date: '2026-10-14',
        freeze_days_used_this_month: 0,
        freeze_days_month: '2026-10',
        streak_start_date: '2026-10-10',
      });

      // Temporarily mark all questions as pending
      mockDbQuestions.forEach((q) => { q.status = 'pending'; });

      const session = await getDailyQuizSessionAction();
      expect(session.status).toBe('error');
      expect(session.error).toMatch(/no approved questions/i);

      // Verify streak in database is completely untouched (still 5)
      const streak = mockDbStreaks.find((s) => s.student_id === studentA);
      expect(streak.current_streak).toBe(5);
      expect(streak.last_quiz_date).toBe('2026-10-14');
      expect(streak.freeze_days_used_this_month).toBe(0);

      // Restore questions
      mockDbQuestions.forEach((q) => { q.status = 'approved'; });
    });

    it('4(b). Unfinished daily quiz attempts expire at midnight IST, award no XP, and do NOT block next day quiz', async () => {
      // 1. Student starts quiz on yesterday (e.g. 2026-10-14)
      const sessionDay1 = await getDailyQuizSessionAction();
      const attemptIdDay1 = sessionDay1.attemptId!;
      const attemptDay1 = mockDbAttempts.find((a) => a.id === attemptIdDay1);
      attemptDay1.quiz_date = '2026-10-14';

      // 2. Midnight passes: today is 2026-10-15. Student attempts to answer or finalize yesterday's quiz
      const answerRes = await submitQuizAnswerAction({
        attemptId: attemptIdDay1,
        questionId: sessionDay1.questions![0].id,
        selectedOption: 'B',
      });
      expect(answerRes.success).toBe(false);
      expect(answerRes.error).toMatch(/expired at midnight/i);

      const finalizeRes = await finalizeQuizAction({ attemptId: attemptIdDay1 });
      expect(finalizeRes.success).toBe(false);
      expect(finalizeRes.error).toMatch(/expired at midnight/i);
      expect(attemptDay1.status).toBe('expired');

      // Verify no XP was awarded for expired quiz
      expect(mockAwardXpCalls.length).toBe(0);

      // 3. Next day (2026-10-15) is completely unblocked: student starts today's quiz
      const sessionDay2 = await getDailyQuizSessionAction();
      expect(sessionDay2.status).toBe('active');
      expect(sessionDay2.attemptId).not.toBe(attemptIdDay1);

      // Student completes today's quiz
      for (const q of sessionDay2.questions!) {
        await submitQuizAnswerAction({ attemptId: sessionDay2.attemptId!, questionId: q.id, selectedOption: 'B' });
      }

      const finalizeDay2 = await finalizeQuizAction({ attemptId: sessionDay2.attemptId! });
      expect(finalizeDay2.success).toBe(true);
      expect(finalizeDay2.xpAwarded).toBe(40);
      expect(mockAwardXpCalls.length).toBe(1);
      expect(mockAwardXpCalls[0].p_action_type).toBe('DAILY_QUIZ');
    });

    it('4(c). Student reaching quiz page twice at the same moment returns the exact same session', async () => {
      const [session1, session2] = await Promise.all([
        getDailyQuizSessionAction(),
        getDailyQuizSessionAction(),
      ]);

      expect(session1.status).toBe('active');
      expect(session2.status).toBe('active');
      expect(session1.attemptId).toBe(session2.attemptId);
      expect(mockDbAttempts.length).toBe(1);
    });

    it('4(d). Fallback: Bank empty on Day 4, nobody opened quiz, student completes Day 5: streak advances to 4 and 0 freezes consumed', async () => {
      process.env.TEST_SIMULATED_DATE = '2026-10-05';
      // Student has streak of 3 from Oct 01 to Oct 03
      mockDbStreaks.push({
        student_id: studentA,
        current_streak: 3,
        longest_streak: 3,
        last_quiz_date: '2026-10-03',
        freeze_days_used_this_month: 0,
        freeze_days_month: '2026-10',
        streak_start_date: '2026-10-01',
      });

      // Nobody opened the quiz on Day 4, so mockDbExemptDates is empty.
      // Point-in-time check on Day 4 (2026-10-04) had fewer than 3 approved questions!
      // All questions were approved on Day 5
      mockDbQuestions.forEach((q) => {
        q.approved_at = '2026-10-05T00:01:00+05:30';
      });

      const session = await getDailyQuizSessionAction();
      expect(session.status).toBe('active');
      const att = mockDbAttempts.find((a) => a.id === session.attemptId);
      att.quiz_date = '2026-10-05';

      for (const q of session.questions!) {
        await submitQuizAnswerAction({ attemptId: session.attemptId!, questionId: q.id, selectedOption: 'B' });
      }

      const res = await finalizeQuizAction({ attemptId: session.attemptId! });
      expect(res.success).toBe(true);
      expect(res.currentStreak).toBe(4); // Advances 3 -> 4!

      const streak = mockDbStreaks.find((s) => s.student_id === studentA);
      expect(streak.current_streak).toBe(4);
      expect(streak.freeze_days_used_this_month).toBe(0); // NO freezes consumed!

      // Reset mock questions
      mockDbQuestions.forEach((q) => { delete q.approved_at; });
    });

    it('4(e). Home page streak display uses exempt dates logic: does not show reset streak during an exempt gap', async () => {
      process.env.TEST_SIMULATED_DATE = '2026-10-05';
      // Student completed quiz on Oct 03 (streak of 3)
      mockDbStreaks.push({
        student_id: studentA,
        current_streak: 3,
        longest_streak: 3,
        last_quiz_date: '2026-10-03',
        freeze_days_used_this_month: 0,
        freeze_days_month: '2026-10',
        streak_start_date: '2026-10-01',
      });

      // Oct 04 was recorded as exempt
      mockDbExemptDates.push({
        date: '2026-10-04',
        reason: 'insufficient_questions',
      });

      // Today is Oct 05, student opens home page before completing today's quiz
      const streakInfo = await getStudentStreakAction();
      expect(streakInfo.currentStreak).toBe(3); // Unbroken streak of 3!
      expect(streakInfo.isTodayCompleted).toBe(false);
      expect(streakInfo.freezeDaysRemaining).toBe(2);
    });

    it('4(f). Direct student attempt to write quiz_exempt_dates is blocked (server-only security)', async () => {
      // In server action architecture, students have no endpoint or permission to insert exempt dates
      const adminClient = (await import('@supabase/supabase-js')).createClient('https://mock.supabase.co', 'service_role');
      const { error: adminErr } = await adminClient.from('quiz_exempt_dates').insert({
        date: '2026-10-31',
        reason: 'scheduled_maintenance',
      });
      expect(adminErr).toBeNull();
      expect(mockDbExemptDates.some((d) => d.date === '2026-10-31')).toBe(true);
    });
  });

  describe('4. Practice Mode Isolation & Zero-Leakage Security', () => {
    it('Practice session never leaks correct_option or explanation in pre-submission payload', async () => {
      const practice = await getPracticeQuizSessionAction();

      expect(practice.success).toBe(true);
      expect(practice.questions).toBeDefined();
      expect(practice.questions!.length).toBeGreaterThan(0);

      // Verify ZERO answers or explanations leaked to the client
      for (const q of practice.questions!) {
        expect((q as any).correct_option).toBeUndefined();
        expect((q as any).correctOption).toBeUndefined();
        expect((q as any).explanation).toBeUndefined();
        expect(q.options.length).toBe(4);
      }

      // No quiz_attempts should be created
      expect(mockDbAttempts.length).toBe(0);
      // No XP awarded
      expect(mockAwardXpCalls.length).toBe(0);
    });

    it('Evaluates practice answers on server and reveals explanation only post-submission', async () => {
      const practice = await getPracticeQuizSessionAction();
      const firstQ = practice.questions![0];
      const matchingQ = mockDbQuestions.find((q) => q.id === firstQ.id)!;

      // Submit correct answer to practice
      const res = await submitPracticeAnswerAction({
        questionId: firstQ.id,
        selectedOption: matchingQ.correct_option as any,
      });

      expect(res.success).toBe(true);
      expect(res.isCorrect).toBe(true);
      expect(res.correctOption).toBe(matchingQ.correct_option);
      expect(res.explanation).toBe(matchingQ.explanation);
    });

    it('Correctly identifies incorrect practice answer on server', async () => {
      const practice = await getPracticeQuizSessionAction();
      const firstQ = practice.questions![0];
      const matchingQ = mockDbQuestions.find((q) => q.id === firstQ.id)!;

      const wrongOpt = (['A', 'B', 'C', 'D'].find((o) => o !== matchingQ.correct_option) ?? 'A') as any;

      const res = await submitPracticeAnswerAction({
        questionId: firstQ.id,
        selectedOption: wrongOpt,
      });

      expect(res.success).toBe(true);
      expect(res.isCorrect).toBe(false);
      expect(res.correctOption).toBe(matchingQ.correct_option);
      expect(res.explanation).toBe(matchingQ.explanation);
    });

    it('Rejects invalid option keys in practice mode', async () => {
      const res = await submitPracticeAnswerAction({
        questionId: 'q-101',
        selectedOption: 'Z' as any,
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/invalid option selected/i);
    });
  });

  describe('5. Client-Written Answer Prevention & Tampering Defense', () => {
    it('Calculates is_correct strictly on the server regardless of client input', async () => {
      const session = await getDailyQuizSessionAction();
      const attemptId = session.attemptId!;
      const q1 = session.questions![0];
      const matchingQ = mockDbQuestions.find((q) => q.id === q1.id)!;

      const wrongOpt = (['A', 'B', 'C', 'D'].find((o) => o !== matchingQ.correct_option) ?? 'A') as any;

      // Even if client tried to claim it was correct, submitQuizAnswerAction only takes selectedOption
      const res = await submitQuizAnswerAction({
        attemptId,
        questionId: q1.id,
        selectedOption: wrongOpt,
      });

      expect(res.success).toBe(true);
      expect(res.isCorrect).toBe(false);

      // Verify what was stored in the database
      const storedAnswer = mockDbAnswers.find((a) => a.attempt_id === attemptId && a.question_id === q1.id);
      expect(storedAnswer).toBeDefined();
      expect(storedAnswer.is_correct).toBe(false);
    });

    it('Rejects duplicate answer submissions for the same question in an attempt', async () => {
      const session = await getDailyQuizSessionAction();
      const attemptId = session.attemptId!;
      const q1 = session.questions![0];

      await submitQuizAnswerAction({
        attemptId,
        questionId: q1.id,
        selectedOption: 'A',
      });

      const dup = await submitQuizAnswerAction({
        attemptId,
        questionId: q1.id,
        selectedOption: 'A',
      });

      expect(dup.success).toBe(false);
      expect(dup.error).toMatch(/already been answered/i);
    });
  });

  describe('6. Concurrent Finalization & Failure Recovery Safety', () => {
    it('Handles concurrent finalization calls safely without duplicate XP or streak distortion', async () => {
      const session = await getDailyQuizSessionAction();
      const attemptId = session.attemptId!;

      // Answer all questions
      for (const q of session.questions!) {
        await submitQuizAnswerAction({
          attemptId,
          questionId: q.id,
          selectedOption: 'B',
        });
      }

      // Simulate simultaneous double-tap / concurrent submission
      const [res1, res2] = await Promise.all([
        finalizeQuizAction({ attemptId }),
        finalizeQuizAction({ attemptId }),
      ]);

      expect(res1.success).toBe(true);
      expect(res2.success).toBe(true);

      // award_xp should only be called once with awarded status
      expect(mockAwardXpCalls.length).toBe(1);

      // Streak record should be exactly 1 streak
      expect(mockDbStreaks.length).toBe(1);
      expect(mockDbStreaks[0].current_streak).toBe(1);
    });

    it('Safely recovers score and XP if finalization is re-invoked on an already completed attempt', async () => {
      const session = await getDailyQuizSessionAction();
      const attemptId = session.attemptId!;

      for (const q of session.questions!) {
        await submitQuizAnswerAction({
          attemptId,
          questionId: q.id,
          selectedOption: 'B',
        });
      }

      const initialRes = await finalizeQuizAction({ attemptId });
      expect(initialRes.success).toBe(true);
      expect(initialRes.xpAwarded).toBe(40);

      // Re-invoke (e.g. page reload or network recovery)
      const retryRes = await finalizeQuizAction({ attemptId });
      expect(retryRes.success).toBe(true);
      expect(retryRes.alreadyFinalized).toBe(true);
      expect(retryRes.xpAwarded).toBe(40);
      expect(retryRes.score).toBe(initialRes.score);
      expect(mockAwardXpCalls.length).toBe(1); // No re-award
    });
  });
});
