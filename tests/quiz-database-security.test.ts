import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  }
}

loadEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const isDevProject =
  Boolean(supabaseUrl && anonKey && serviceRoleKey) &&
  (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || supabaseUrl.includes('supabase.co'));

describe.runIf(isDevProject)('Supabase RLS & Direct Client Access Regression Suite', () => {
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  let studentClient: ReturnType<typeof createClient>;
  let studentId: string;
  let studentEmail: string;
  let testSubjectId: string;
  let testQuestionId: string;
  let testAttemptId: string;

  beforeAll(async () => {
    // 1. Create a student user in Supabase Auth
    studentEmail = `rls-test-student-${Date.now()}@dev.local`;
    const { data: userRes, error: userErr } = await adminClient.auth.admin.createUser({
      email: studentEmail,
      password: 'TestStudentPassword123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'RLS Test Student',
        roll_no: `RLS-${Date.now()}`,
        department: 'CS',
      },
    });

    if (userErr || !userRes.user) {
      throw new Error(`Failed to create test student: ${userErr?.message}`);
    }
    studentId = userRes.user.id;

    // 2. Sign in as student using anon client
    studentClient = createClient(supabaseUrl, anonKey);
    const { error: signInErr } = await studentClient.auth.signInWithPassword({
      email: studentEmail,
      password: 'TestStudentPassword123!',
    });
    if (signInErr) throw new Error(`Student sign-in failed: ${signInErr.message}`);

    // 3. Find or create a test question via admin
    const { data: subj } = await adminClient.from('subjects').select('id').eq('code', 'CS101').single();
    testSubjectId = subj?.id;

    const { data: q } = await adminClient
      .from('questions')
      .select('id')
      .eq('subject_id', testSubjectId)
      .limit(1)
      .single();
    testQuestionId = q?.id;

    // 4. Create an active attempt for the student via admin
    const { data: attempt } = await adminClient
      .from('quiz_attempts')
      .insert({
        student_id: studentId,
        quiz_date: '2026-10-16',
        mode: 'daily',
        question_ids: [testQuestionId],
        status: 'in_progress',
        score: 0,
        total_questions: 1,
      })
      .select('id')
      .single();

    testAttemptId = attempt?.id;
  });

  afterAll(async () => {
    if (testAttemptId) {
      await adminClient.from('quiz_answers').delete().eq('attempt_id', testAttemptId);
      await adminClient.from('quiz_attempts').delete().eq('id', testAttemptId);
    }
    if (studentId) {
      await adminClient.from('student_streaks').delete().eq('student_id', studentId);
      await adminClient.from('streak_events').delete().eq('student_id', studentId);
      await adminClient.from('students').delete().eq('id', studentId);
      await adminClient.from('profiles').delete().eq('id', studentId);
      await adminClient.auth.admin.deleteUser(studentId);
    }
  });

  describe('1. Direct Question Access Protection (Information Hiding Regression)', () => {
    it('Blocks direct student query to the questions table (returns 0 rows)', async () => {
      // Student uses the browser Supabase client to inspect questions table
      const { data, error } = await studentClient
        .from('questions')
        .select('id, question_text, correct_option, explanation');

      // RLS policy permits SELECT only to faculty and admin.
      // For students, Postgres returns an empty array (zero rows leaked).
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it('Blocks direct student lookup of a specific question ID', async () => {
      const { data, error } = await studentClient
        .from('questions')
        .select('correct_option, explanation')
        .eq('id', testQuestionId);

      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });
  });

  describe('2. Direct Answer Writing Prevention (Client Forgery Defense)', () => {
    it('Rejects direct student INSERT into quiz_answers with forged is_correct=true', async () => {
      const { data, error } = await (studentClient as any)
        .from('quiz_answers')
        .insert({
          attempt_id: testAttemptId,
          question_id: testQuestionId,
          selected_option: 'A',
          is_correct: true, // Malicious forged value
        });

      // Postgres RLS denies INSERT for student role
      expect(error).toBeDefined();
      expect(error?.code).toBe('42501'); // insufficient_privilege / RLS violation
      expect(data).toBeNull();
    });

    it('Rejects direct student UPDATE on quiz_answers', async () => {
      // First insert a legitimate answer row via admin with is_correct = false
      const { data: legitimateAns } = await adminClient
        .from('quiz_answers')
        .insert({
          attempt_id: testAttemptId,
          question_id: testQuestionId,
          selected_option: 'A',
          is_correct: false,
        })
        .select('id')
        .single();

      // Student attempts to directly flip is_correct to true
      const { error } = await (studentClient as any)
        .from('quiz_answers')
        .update({ is_correct: true })
        .eq('id', legitimateAns?.id);

      // Verify answer was NOT modified
      const { data: verified } = await adminClient
        .from('quiz_answers')
        .select('is_correct')
        .eq('id', legitimateAns?.id)
        .single();

      expect(verified?.is_correct).toBe(false);
    });
  });

  describe('3. Direct Streak Tampering Prevention', () => {
    it('Rejects direct student UPDATE on student_streaks table', async () => {
      // Insert initial streak row via admin
      await adminClient.from('student_streaks').upsert({
        student_id: studentId,
        current_streak: 1,
        longest_streak: 1,
        last_quiz_date: '2026-10-15',
        freeze_days_used_this_month: 0,
        freeze_days_month: '2026-10',
      });

      // Malicious student attempts to forge a 99-day streak
      const { error } = await (studentClient as any)
        .from('student_streaks')
        .update({ current_streak: 99, longest_streak: 99 })
        .eq('student_id', studentId);

      // Verify streak was NOT modified
      const { data: streak } = await adminClient
        .from('student_streaks')
        .select('current_streak')
        .eq('student_id', studentId)
        .single();

      expect(streak?.current_streak).toBe(1);
    });
  });
});
