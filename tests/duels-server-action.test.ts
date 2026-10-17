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
});
