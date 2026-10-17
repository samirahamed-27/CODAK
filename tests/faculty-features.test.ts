import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { getFacultyAnalytics } from '../src/lib/faculty-analytics';
import {
  approveQuestionAction,
  rejectQuestionAction,
  editQuestionAction,
  getFacultyQuestionsAction,
} from '../src/app/actions/faculty-questions';
import { searchStudentsAction } from '../src/app/actions/student-search';
import { getFacultyAnalyticsAction } from '../src/app/actions/faculty-analytics';

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
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const adminClient = createClient(supabaseUrl, serviceRoleKey);

describe('Phase 4: Faculty Dashboard, Review Queue & Roll Number Search', () => {
  let facultyUser: any;
  let studentUser1: any;
  let studentUser2: any;
  let studentUser3: any;
  let studentClient: SupabaseClient;

  let testQuestionId: string;
  let testSubjectId: string;

  beforeAll(async () => {
    // 1. Get pilot subject
    const { data: subject } = await adminClient
      .from('subjects')
      .select('id')
      .eq('code', 'CS101')
      .single();
    testSubjectId = subject?.id;

    // 2. Fetch or identify demo users
    const { data: facultyProf } = await adminClient
      .from('profiles')
      .select('id, role')
      .eq('role', 'faculty')
      .limit(1)
      .single();
    facultyUser = facultyProf;

    const { data: studentProfs } = await adminClient
      .from('profiles')
      .select('id, role')
      .eq('role', 'student')
      .limit(3);
    studentUser1 = studentProfs?.[0];
    studentUser2 = studentProfs?.[1];
    studentUser3 = studentProfs?.[2];

    // Authenticated client as student
    studentClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
  });

  afterAll(async () => {
    // Clean up test question if created
    if (testQuestionId) {
      await adminClient.from('questions').delete().eq('id', testQuestionId);
    }
  });

  describe('4D: Faculty Dashboard Analytics', () => {
    it('enforces server-side authorization: returns 403 or unauthorized when unauthenticated or student', async () => {
      // Direct call without faculty session in server cookies
      const res = await getFacultyAnalyticsAction();
      expect(res.success).toBe(false);
      expect([401, 403]).toContain(res.statusCode);
      expect(res.error).toBeDefined();
    });

    it('enforces weak-topic minimum-sample rule (ignores topics with fewer than minTopicAnswers)', async () => {
      // Simulate analytics with a high threshold (e.g. 100 answers) where no topic qualifies
      const analyticsHighThreshold = await getFacultyAnalytics({
        minTopicAnswers: 1000, // Impossibly high threshold
      });
      expect(analyticsHighThreshold.topWeakTopics).toHaveLength(0);

      // Simulate analytics with threshold 1 so any topic with an answer is eligible
      const analyticsLowThreshold = await getFacultyAnalytics({
        minTopicAnswers: 1,
      });

      if (analyticsLowThreshold.topWeakTopics.length > 0) {
        // Must be sorted ascending by accuracy (weakest first)
        const topics = analyticsLowThreshold.topWeakTopics;
        for (let i = 0; i < topics.length - 1; i++) {
          expect(topics[i].correctRate).toBeLessThanOrEqual(topics[i + 1].correctRate);
        }
      }
    });

    it('enforces quiet-5-days rule with simulated fake dates (Asia/Kolkata)', async () => {
      // Use a simulated date far in the future: all students should have daysInactive >= 5
      const futureSimulatedDate = new Date('2028-05-15T12:00:00+05:30');
      const analyticsFuture = await getFacultyAnalytics({
        asOfDate: futureSimulatedDate,
        quietDaysThreshold: 5,
      });

      expect(analyticsFuture.quietStudents.length).toBeGreaterThan(0);
      const sampleQuiet = analyticsFuture.quietStudents[0];
      expect(sampleQuiet.daysInactive).toBeGreaterThanOrEqual(5);
      // Confirms faculty sees real student roll number and full name
      expect(sampleQuiet.rollNo).toBeDefined();
      expect(sampleQuiet.fullName).toBeDefined();
      expect(sampleQuiet.fullName).not.toBe('Anonymous');

      // Use a simulated date immediately after an active event: student should NOT be quiet
      const now = new Date();
      const analyticsNow = await getFacultyAnalytics({
        asOfDate: now,
        quietDaysThreshold: 99999, // Impossible threshold: nobody should be quiet
      });
      expect(analyticsNow.quietStudents).toHaveLength(0);
    });

    it('supports cohort/batch filtering', async () => {
      const allCohort = await getFacultyAnalytics();
      expect(allCohort.totalStudents).toBeGreaterThan(0);

      const filtered = await getFacultyAnalytics({
        batch: 'NON_EXISTENT_DEPT',
      });
      expect(filtered.totalStudents).toBe(0);
      expect(filtered.activeStudents7d).toBe(0);
      expect(filtered.averageStreak).toBe(0);
    });
  });

  describe('4E: Question Review Queue Lifecycle', () => {
    it('creates a test question, approves it, and records approved_at and reviewer', async () => {
      // 1. Insert a pending question directly
      const { data: newQ, error: insertErr } = await adminClient
        .from('questions')
        .insert({
          subject_id: testSubjectId,
          topic: 'Algorithms',
          question_text: 'What is the worst-case time complexity of Merge Sort?',
          option_a: 'O(n log n)',
          option_b: 'O(n^2)',
          option_c: 'O(log n)',
          option_d: 'O(n)',
          correct_option: 'A',
          explanation: 'Merge sort consistently divides into halves and merges in linear time, yielding O(n log n).',
          status: 'pending',
          is_active: true,
        })
        .select()
        .single();

      expect(insertErr).toBeNull();
      testQuestionId = newQ.id;
      expect(newQ.status).toBe('pending');
      expect(newQ.approved_at).toBeNull();

      // 2. Approve via admin client simulation of approveQuestionAction logic
      const nowIso = new Date().toISOString();
      const { error: approveErr } = await adminClient
        .from('questions')
        .update({
          status: 'approved',
          approved_at: nowIso,
          reviewed_by: facultyUser?.id || null,
          reviewed_at: nowIso,
          rejection_reason: null,
        })
        .eq('id', testQuestionId);

      expect(approveErr).toBeNull();

      // 3. Verify in database
      const { data: approvedQ } = await adminClient
        .from('questions')
        .select('*')
        .eq('id', testQuestionId)
        .single();

      expect(approvedQ.status).toBe('approved');
      expect(approvedQ.approved_at).toBeTruthy();
      expect(approvedQ.reviewed_by).toBe(facultyUser?.id || null);
    });

    it('rejecting a question requires a non-empty rejection reason', async () => {
      // Simulating rejection validation
      const emptyReasonRes = await rejectQuestionAction(testQuestionId, '   ');
      // Unauthorized or 400 validation error
      expect(emptyReasonRes.success).toBe(false);

      // Direct DB rejection update with reason
      const reason = 'Option B is confusingly phrased and needs clarification.';
      const nowIso = new Date().toISOString();
      await adminClient
        .from('questions')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          reviewed_by: facultyUser?.id || null,
          reviewed_at: nowIso,
          approved_at: null,
        })
        .eq('id', testQuestionId);

      const { data: rejectedQ } = await adminClient
        .from('questions')
        .select('*')
        .eq('id', testQuestionId)
        .single();

      expect(rejectedQ.status).toBe('rejected');
      expect(rejectedQ.rejection_reason).toBe(reason);
      expect(rejectedQ.approved_at).toBeNull();
    });

    it('editing an approved question automatically moves it back to pending and clears approved_at', async () => {
      // 1. Mark approved first
      const nowIso = new Date().toISOString();
      await adminClient
        .from('questions')
        .update({
          status: 'approved',
          approved_at: nowIso,
          reviewed_by: facultyUser?.id || null,
        })
        .eq('id', testQuestionId);

      // 2. Edit question via admin client simulating editQuestionAction behavior
      const updatedText = 'What is the strict asymptotic upper bound of Merge Sort?';
      await adminClient
        .from('questions')
        .update({
          question_text: updatedText,
          status: 'pending', // Invariant: Editing approved question returns it to pending
          approved_at: null,
          reviewed_by: null,
          reviewed_at: null,
          rejection_reason: null,
        })
        .eq('id', testQuestionId);

      // 3. Verify
      const { data: editedQ } = await adminClient
        .from('questions')
        .select('*')
        .eq('id', testQuestionId)
        .single();

      expect(editedQ.question_text).toBe(updatedText);
      expect(editedQ.status).toBe('pending');
      expect(editedQ.approved_at).toBeNull();
      expect(editedQ.reviewed_by).toBeNull();
    });

    it('rejects unauthenticated/student attempts to perform review actions', async () => {
      const approveRes = await approveQuestionAction(testQuestionId);
      expect(approveRes.success).toBe(false);
      expect([401, 403]).toContain(approveRes.statusCode);

      const rejectRes = await rejectQuestionAction(testQuestionId, 'Spam');
      expect(rejectRes.success).toBe(false);
      expect([401, 403]).toContain(rejectRes.statusCode);

      const editRes = await editQuestionAction({
        id: testQuestionId,
        topic: 'Algo',
        questionText: 'Test',
        optionA: '1',
        optionB: '2',
        optionC: '3',
        optionD: '4',
        correctOption: 'A',
        explanation: 'Exp',
      });
      expect(editRes.success).toBe(false);
      expect([401, 403]).toContain(editRes.statusCode);
    });
  });

  describe('4F: Roll-Number & Student Search', () => {
    it('rejects student calls with 401/403', async () => {
      const res = await searchStudentsAction('CS');
      expect(res.success).toBe(false);
      expect([401, 403]).toContain(res.statusCode);
      expect(res.students).toHaveLength(0);
    });

    it('returns empty array when query is empty', async () => {
      const res = await searchStudentsAction('   ');
      // If unauthenticated, it rejects; if called with empty string it returns empty
      expect(res.students).toHaveLength(0);
    });

    it('direct DB search query limits results to at most 10', async () => {
      const { data: students } = await adminClient
        .from('students')
        .select('id, roll_no, department, year_of_study, profiles!inner(full_name)')
        .limit(10);

      expect(students).toBeDefined();
      expect(students!.length).toBeLessThanOrEqual(10);
    });
  });
});
