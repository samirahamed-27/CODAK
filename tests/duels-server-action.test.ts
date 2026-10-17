import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        process.env[key] = val;
      }
    }
  }
}

loadEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const isLiveConfigured = Boolean(
  supabaseUrl &&
    serviceRoleKey &&
    !supabaseUrl.includes('placeholder')
);

// Mock current logged-in user for server action
let mockCurrentUser: { id: string; email?: string } | null = null;

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: mockCurrentUser },
        error: null,
      }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { role: 'student' } }),
        }),
      }),
    }),
  })),
}));

describe.runIf(isLiveConfigured)('Phase 3E Audit: Duels Server Action & Schema Alignment Suite', () => {
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  let student1Id: string;
  let student2Id: string;
  let testDuelId: string;
  let question1Id: string;
  let question2Id: string;
  let testSubjectId: string;

  beforeAll(async () => {
    // 1. Get a subject
    const { data: subject } = await adminClient
      .from('subjects')
      .select('id')
      .limit(1)
      .single();
    testSubjectId = subject!.id;

    // 2. Create 2 test students with prefix audit_
    const ts = Date.now();
    const { data: u1 } = await adminClient.auth.admin.createUser({
      email: `audit_duel_s1_${ts}@test.edu`,
      password: 'Password123!',
      email_confirm: true,
      user_metadata: { full_name: 'Audit Dueler 1', roll_no: `AUDIT-D1-${ts}`, department: 'CSE' },
    });
    student1Id = u1.user!.id;

    const { data: u2 } = await adminClient.auth.admin.createUser({
      email: `audit_duel_s2_${ts}@test.edu`,
      password: 'Password123!',
      email_confirm: true,
      user_metadata: { full_name: 'Audit Dueler 2', roll_no: `AUDIT-D2-${ts}`, department: 'CSE' },
    });
    student2Id = u2.user!.id;

    // 3. Create 2 test questions with known correct options
    const { data: q1 } = await adminClient
      .from('questions')
      .insert({
        subject_id: testSubjectId,
        topic: 'Data Structures',
        question_text: `audit_duel_q1_${ts}: What data structure uses FIFO?`,
        option_a: 'Queue',
        option_b: 'Stack',
        option_c: 'Tree',
        option_d: 'Graph',
        correct_option: 'A',
        explanation: 'Queue follows First In First Out.',
        status: 'approved',
        is_active: true,
      })
      .select('id')
      .single();
    question1Id = q1!.id;

    const { data: q2 } = await adminClient
      .from('questions')
      .insert({
        subject_id: testSubjectId,
        topic: 'Algorithms',
        question_text: `audit_duel_q2_${ts}: What is binary search complexity?`,
        option_a: 'O(n)',
        option_b: 'O(log n)',
        option_c: 'O(1)',
        option_d: 'O(n^2)',
        correct_option: 'B',
        explanation: 'Binary search halves search space in O(log n).',
        status: 'approved',
        is_active: true,
      })
      .select('id')
      .single();
    question2Id = q2!.id;

    // 4. Create test duel
    const { data: duel } = await adminClient
      .from('duels')
      .insert({
        challenger_id: student1Id,
        challenged_id: student2Id,
        status: 'active',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      })
      .select('id')
      .single();
    testDuelId = duel!.id;

    // 5. Link questions to duel
    await adminClient.from('duel_questions').insert([
      { duel_id: testDuelId, question_id: question1Id, question_order: 1 },
      { duel_id: testDuelId, question_id: question2Id, question_order: 2 },
    ]);
  });

  afterAll(async () => {
    // Clean up test duel and questions
    if (testDuelId) {
      await adminClient.from('duel_answers').delete().eq('duel_id', testDuelId);
      await adminClient.from('duel_questions').delete().eq('duel_id', testDuelId);
      await adminClient.from('duels').delete().eq('id', testDuelId);
    }
    if (question1Id) await adminClient.from('questions').delete().eq('id', question1Id);
    if (question2Id) await adminClient.from('questions').delete().eq('id', question2Id);

    // Clean up test users
    for (const sId of [student1Id, student2Id]) {
      if (sId) {
        await adminClient.from('xp_events').delete().eq('student_id', sId);
        await adminClient.from('students').delete().eq('id', sId);
        await adminClient.from('profiles').delete().eq('id', sId);
        await adminClient.auth.admin.deleteUser(sId);
      }
    }
  });

  it('1. Loads duel questions with options properly mapped and answer keys strictly stripped', async () => {
    const { getDuelSessionAction } = await import('@/app/actions/duels');
    mockCurrentUser = { id: student1Id };

    const res = await getDuelSessionAction(testDuelId);
    expect(res.success).toBe(true);
    expect(res.questions).toBeDefined();
    expect(res.questions!.length).toBe(2);

    const q1 = res.questions!.find((q) => q.id === question1Id)!;
    expect(q1).toBeDefined();
    expect(q1.choice_a).toBe('Queue');
    expect(q1.choice_b).toBe('Stack');
    expect(q1.choice_c).toBe('Tree');
    expect(q1.choice_d).toBe('Graph');

    // Strict privacy checks: correct_option, correct_answer, explanation MUST be undefined
    expect((q1 as any).correct_option).toBeUndefined();
    expect((q1 as any).correct_answer).toBeUndefined();
    expect((q1 as any).explanation).toBeUndefined();
  });

  it('2. Evaluates submitted answers against questions.correct_option case-insensitively and updates duel score', async () => {
    const { submitDuelAnswersAction } = await import('@/app/actions/duels');
    mockCurrentUser = { id: student1Id };

    const submitRes = await submitDuelAnswersAction({
      duelId: testDuelId,
      answers: [
        { questionId: question1Id, selectedChoice: 'a', timeSpentSeconds: 5 }, // lowercase 'a', matches 'A'
        { questionId: question2Id, selectedChoice: 'B', timeSpentSeconds: 7 }, // uppercase 'B', matches 'B'
      ],
      totalTimeSeconds: 12,
    });

    expect(submitRes.success).toBe(true);
    expect(submitRes.score).toBe(2);

    // Verify duel row in database
    const { data: updatedDuel } = await adminClient
      .from('duels')
      .select('challenger_score, challenger_time_seconds, challenger_submitted_at')
      .eq('id', testDuelId)
      .single();

    expect(updatedDuel!.challenger_score).toBe(2);
    expect(updatedDuel!.challenger_time_seconds).toBe(12);
    expect(updatedDuel!.challenger_submitted_at).not.toBeNull();
  });

  it('3. Rejects duplicate submission from the same student (idempotent)', async () => {
    const { submitDuelAnswersAction } = await import('@/app/actions/duels');
    mockCurrentUser = { id: student1Id };

    const duplicateRes = await submitDuelAnswersAction({
      duelId: testDuelId,
      answers: [
        { questionId: question1Id, selectedChoice: 'a', timeSpentSeconds: 5 },
      ],
      totalTimeSeconds: 5,
    });

    expect(duplicateRes.success).toBe(false);
    expect(duplicateRes.error).toMatch(/already.*submitted/i);
  });

  it('4. Completes duel and awards XP when both participants submit', async () => {
    const { submitDuelAnswersAction } = await import('@/app/actions/duels');
    mockCurrentUser = { id: student2Id };

    // Student 2 gets 1 correct ('a' for Q1, but 'C' for Q2)
    const submitRes = await submitDuelAnswersAction({
      duelId: testDuelId,
      answers: [
        { questionId: question1Id, selectedChoice: 'A', timeSpentSeconds: 10 }, // Correct
        { questionId: question2Id, selectedChoice: 'C', timeSpentSeconds: 10 }, // Wrong
      ],
      totalTimeSeconds: 20,
    });

    expect(submitRes.success).toBe(true);
    expect(submitRes.score).toBe(1);

    // Check duel completed status
    const { data: finalDuel } = await adminClient
      .from('duels')
      .select('status, winner_id, challenger_score, challenged_score')
      .eq('id', testDuelId)
      .single();

    expect(finalDuel!.status).toBe('completed');
    expect(finalDuel!.winner_id).toBe(student1Id); // Student 1 had score 2 vs score 1
  });

  it('5. Verifies winner (DUEL_WIN) and loser (DUEL_LOSS) XP awards in xp_events ledger', async () => {
    const { data: winEvents } = await adminClient
      .from('xp_events')
      .select('student_id, action_type, xp_amount, status')
      .eq('student_id', student1Id)
      .eq('reference_id', `duel:${testDuelId}`);

    expect(winEvents).toBeDefined();
    expect(winEvents!.length).toBe(1);
    expect(winEvents![0].action_type).toBe('DUEL_WIN');
    expect(winEvents![0].xp_amount).toBeGreaterThan(0);
    expect(winEvents![0].status).toBe('valid');

    const { data: lossEvents } = await adminClient
      .from('xp_events')
      .select('student_id, action_type, xp_amount, status')
      .eq('student_id', student2Id)
      .eq('reference_id', `duel:${testDuelId}`);

    expect(lossEvents).toBeDefined();
    expect(lossEvents!.length).toBe(1);
    expect(lossEvents![0].action_type).toBe('DUEL_PARTICIPATION');
    expect(lossEvents![0].status).toBe('valid');
  });

  it('6. Rejects self-duel challenge via challengeDirectStudentAction', async () => {
    const { challengeDirectStudentAction } = await import('@/app/actions/duels');
    mockCurrentUser = { id: student1Id };

    const selfDuelRes = await challengeDirectStudentAction(student1Id);
    expect(selfDuelRes.success).toBe(false);
    expect(selfDuelRes.error).toMatch(/cannot challenge yourself/i);
  });

  it('7. Rejects submission to an expired duel', async () => {
    const { submitDuelAnswersAction } = await import('@/app/actions/duels');
    
    // Create an expired duel
    const { data: expiredDuel } = await adminClient
      .from('duels')
      .insert({
        challenger_id: student1Id,
        challenged_id: student2Id,
        status: 'active',
        expires_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      })
      .select('id')
      .single();

    mockCurrentUser = { id: student1Id };
    const submitRes = await submitDuelAnswersAction({
      duelId: expiredDuel!.id,
      answers: [{ questionId: question1Id, selectedChoice: 'A', timeSpentSeconds: 5 }],
      totalTimeSeconds: 5,
    });

    expect(submitRes.success).toBe(false);
    expect(submitRes.error).toMatch(/expired/i);

    // Cleanup expired duel
    await adminClient.from('duels').delete().eq('id', expiredDuel!.id);
  });

  it('8. Tests create/auto-match flow where both players get the EXACT SAME questions without leaked keys', async () => {
    const { createOrJoinAutoMatchAction, getDuelSessionAction } = await import('@/app/actions/duels');

    // Ensure database has no lingering open duels so matchmaking is deterministic
    await adminClient.from('duels').delete().eq('status', 'open');

    // Player 1 creates / finds duel (creates open duel since none open)
    mockCurrentUser = { id: student1Id };
    const p1Res = await createOrJoinAutoMatchAction();
    expect(p1Res.success).toBe(true);
    expect(p1Res.duelId).toBeDefined();
    const matchmakingDuelId = p1Res.duelId!;

    // Player 2 calls createOrJoinAutoMatchAction -> auto-matches into the open duel
    mockCurrentUser = { id: student2Id };
    const p2Res = await createOrJoinAutoMatchAction();
    expect(p2Res.success).toBe(true);
    expect(p2Res.duelId).toBe(matchmakingDuelId);
    expect(p2Res.isNew).toBe(false);

    // Both players fetch questions for the matched duel
    mockCurrentUser = { id: student1Id };
    const p1Session = await getDuelSessionAction(matchmakingDuelId);
    mockCurrentUser = { id: student2Id };
    const p2Session = await getDuelSessionAction(matchmakingDuelId);

    expect(p1Session.success).toBe(true);
    expect(p2Session.success).toBe(true);
    expect(p1Session.questions?.length).toBe(p2Session.questions?.length);

    // Verify both receive identical question IDs in identical order
    const p1QIds = p1Session.questions!.map((q) => q.id);
    const p2QIds = p2Session.questions!.map((q) => q.id);
    expect(p1QIds).toEqual(p2QIds);

    // Verify neither player has answer keys or explanations leaked
    for (const q of [...p1Session.questions!, ...p2Session.questions!]) {
      expect((q as any).correct_option).toBeUndefined();
      expect((q as any).correct_answer).toBeUndefined();
      expect((q as any).explanation).toBeUndefined();
    }

    // Cleanup matchmaking duel
    await adminClient.from('duel_answers').delete().eq('duel_id', matchmakingDuelId);
    await adminClient.from('duel_questions').delete().eq('duel_id', matchmakingDuelId);
    await adminClient.from('duels').delete().eq('id', matchmakingDuelId);
  });

  it('9. Enforces level band matchmaking: does not auto-match students beyond level band', async () => {
    const { createOrJoinAutoMatchAction } = await import('@/app/actions/duels');
    const ts = Date.now();

    // Ensure database has no lingering open duels
    await adminClient.from('duels').delete().eq('status', 'open');

    // Create a high-level student (e.g. 5000 XP -> Level 10+)
    const { data: highUser } = await adminClient.auth.admin.createUser({
      email: `audit_high_level_${ts}@test.edu`,
      password: 'Password123!',
      email_confirm: true,
      user_metadata: { full_name: 'Audit Grandmaster', roll_no: `AUDIT-GM-${ts}`, department: 'CSE' },
    });
    const highStudentId = highUser.user!.id;

    let highDuelId: string | undefined;
    let s1DuelId: string | undefined;

    try {
      // Seed high XP for high-level student via xp_events (student_xp_totals is a view over xp_events)
      const { error: xpErr } = await adminClient.from('xp_events').insert({
        student_id: highStudentId,
        action_type: 'ASSIGNMENT_ON_TIME',
        xp_amount: 5000,
        reference_id: `audit_level_test_${ts}`,
        status: 'valid',
      });
      expect(xpErr).toBeNull();

      // High student creates open duel
      mockCurrentUser = { id: highStudentId };
      const highDuelRes = await createOrJoinAutoMatchAction();
      expect(highDuelRes.success).toBe(true);
      highDuelId = highDuelRes.duelId;

      // Student 1 (Level 1) calls createOrJoinAutoMatchAction -> must NOT match with High Level (Level 10+)
      mockCurrentUser = { id: student1Id };
      const s1DuelRes = await createOrJoinAutoMatchAction();
      expect(s1DuelRes.success).toBe(true);
      s1DuelId = s1DuelRes.duelId;
      // Student 1 must get a DIFFERENT duel ID (new open duel created, not matched with high level)
      expect(s1DuelRes.duelId).not.toBe(highDuelId);
    } finally {
      // Guaranteed Cleanup
      if (highDuelId) {
        await adminClient.from('duel_questions').delete().eq('duel_id', highDuelId);
        await adminClient.from('duels').delete().eq('id', highDuelId);
      }
      if (s1DuelId) {
        await adminClient.from('duel_questions').delete().eq('duel_id', s1DuelId);
        await adminClient.from('duels').delete().eq('id', s1DuelId);
      }
      await adminClient.from('xp_events').delete().eq('student_id', highStudentId);
      await adminClient.from('students').delete().eq('id', highStudentId);
      await adminClient.from('profiles').delete().eq('id', highStudentId);
      await adminClient.auth.admin.deleteUser(highStudentId);
    }
  });
});

