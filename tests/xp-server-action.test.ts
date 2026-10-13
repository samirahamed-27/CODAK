import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

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

// Mock next/headers
let mockCurrentUser: { id: string; email?: string } | null = null;

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(async () => {
    return {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockCurrentUser },
          error: null,
        }),
      },
      from: (table: string) => ({
        select: (cols: string) => ({
          eq: (field: string, val: string) => ({
            single: async () => {
              if (table === 'profiles' && mockCurrentUser) {
                // Query real profile role using admin client to ensure realistic DB role check
                const adminClient = createClient(
                  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
                  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
                );
                const { data } = await adminClient
                  .from('profiles')
                  .select('role')
                  .eq('id', val)
                  .single();
                return { data, error: null };
              }
              return { data: null, error: null };
            },
          }),
        }),
      }),
    };
  }),
}));

import { awardXpAction } from '../src/app/actions/xp';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const isDevProject =
  Boolean(supabaseUrl && serviceRoleKey) &&
  (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || supabaseUrl.includes('supabase.co'));

describe.runIf(isDevProject)('Server Action: awardXpAction Security & Input Validation', () => {
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  let testFacultyId: string;
  let testStudentId: string;

  beforeAll(async () => {
    // 1. Create a Faculty user
    const facultyEmail = `test-faculty-${Date.now()}@dev.local`;
    const { data: facUser, error: facErr } = await adminClient.auth.admin.createUser({
      email: facultyEmail,
      password: 'FacultyPassword123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'Professor Test',
        role: 'faculty',
        department: 'Computer Science',
      },
    });
    if (facErr || !facUser.user) throw new Error(`Failed to create faculty: ${facErr?.message}`);
    testFacultyId = facUser.user.id;
    // Ensure profile role is explicitly 'faculty'
    await adminClient.from('profiles').update({ role: 'faculty' }).eq('id', testFacultyId);

    // 2. Create a Student user
    const studentEmail = `test-student-${Date.now()}@dev.local`;
    const { data: stuUser, error: stuErr } = await adminClient.auth.admin.createUser({
      email: studentEmail,
      password: 'StudentPassword123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'Student Recipient',
        role: 'student',
        roll_no: `SR-${Date.now()}`,
        department: 'Computer Science',
      },
    });
    if (stuErr || !stuUser.user) throw new Error(`Failed to create student: ${stuErr?.message}`);
    testStudentId = stuUser.user.id;
    await adminClient.from('profiles').update({ role: 'student' }).eq('id', testStudentId);
  });

  afterAll(async () => {
    if (testFacultyId) {
      await adminClient.from('profiles').delete().eq('id', testFacultyId);
      await adminClient.auth.admin.deleteUser(testFacultyId);
    }
    if (testStudentId) {
      await adminClient.from('xp_events').delete().eq('student_id', testStudentId);
      await adminClient.from('students').delete().eq('id', testStudentId);
      await adminClient.from('profiles').delete().eq('id', testStudentId);
      await adminClient.auth.admin.deleteUser(testStudentId);
    }
  });

  it('1. Rejects unauthenticated calls with 401', async () => {
    mockCurrentUser = null;
    const res = await awardXpAction({
      studentId: testStudentId,
      actionType: 'HACKATHON_PARTICIPATION',
      referenceId: 'ref_unauth',
    });

    expect(res.success).toBe(false);
    expect(res.statusCode).toBe(401);
    expect(res.error).toMatch(/unauthorized/i);
  });

  it('2. Rejects student callers with 403', async () => {
    mockCurrentUser = { id: testStudentId };
    const res = await awardXpAction({
      studentId: testStudentId,
      actionType: 'HACKATHON_PARTICIPATION',
      referenceId: 'ref_student_caller',
    });

    expect(res.success).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.error).toMatch(/only faculty and administrators/i);
  });

  it('3. Rejects negative extra_units with 400', async () => {
    mockCurrentUser = { id: testFacultyId };
    const res = await awardXpAction({
      studentId: testStudentId,
      actionType: 'HACKATHON_PARTICIPATION',
      referenceId: 'ref_neg_units',
      extraUnits: -1,
    });

    expect(res.success).toBe(false);
    expect(res.statusCode).toBe(400);
    expect(res.error).toMatch(/Extra units must be an integer between 0 and 50/i);
  });

  it('4. Rejects extra_units > 50 with 400', async () => {
    mockCurrentUser = { id: testFacultyId };
    const res = await awardXpAction({
      studentId: testStudentId,
      actionType: 'HACKATHON_PARTICIPATION',
      referenceId: 'ref_excess_units',
      extraUnits: 51,
    });

    expect(res.success).toBe(false);
    expect(res.statusCode).toBe(400);
    expect(res.error).toMatch(/Extra units must be an integer between 0 and 50/i);
  });

  it('5. Rejects fractional extra_units with 400', async () => {
    mockCurrentUser = { id: testFacultyId };
    const res = await awardXpAction({
      studentId: testStudentId,
      actionType: 'HACKATHON_PARTICIPATION',
      referenceId: 'ref_float_units',
      extraUnits: 3.5,
    });

    expect(res.success).toBe(false);
    expect(res.statusCode).toBe(400);
    expect(res.error).toMatch(/Extra units must be an integer between 0 and 50/i);
  });

  it('6. Rejects empty reference with 400', async () => {
    mockCurrentUser = { id: testFacultyId };
    const res = await awardXpAction({
      studentId: testStudentId,
      actionType: 'HACKATHON_PARTICIPATION',
      referenceId: '   ',
    });

    expect(res.success).toBe(false);
    expect(res.statusCode).toBe(400);
    expect(res.error).toMatch(/Reference ID must be between 1 and 100 characters/i);
  });

  it('7. Rejects excessively long reference (>100 chars) with 400', async () => {
    mockCurrentUser = { id: testFacultyId };
    const res = await awardXpAction({
      studentId: testStudentId,
      actionType: 'HACKATHON_PARTICIPATION',
      referenceId: 'x'.repeat(101),
    });

    expect(res.success).toBe(false);
    expect(res.statusCode).toBe(400);
    expect(res.error).toMatch(/Reference ID must be between 1 and 100 characters/i);
  });

  it('8. Rejects non-existent student with 404', async () => {
    mockCurrentUser = { id: testFacultyId };
    const fakeStudentId = '00000000-0000-0000-0000-000000000000';
    const res = await awardXpAction({
      studentId: fakeStudentId,
      actionType: 'HACKATHON_PARTICIPATION',
      referenceId: 'ref_ghost_student',
    });

    expect(res.success).toBe(false);
    expect(res.statusCode).toBe(404);
    expect(res.status).toBe('student_not_found');
  });

  it('9. Rejects unknown rule with 404', async () => {
    mockCurrentUser = { id: testFacultyId };
    const res = await awardXpAction({
      studentId: testStudentId,
      actionType: 'NON_EXISTENT_RULE_XYZ',
      referenceId: 'ref_ghost_rule',
    });

    expect(res.success).toBe(false);
    expect(res.statusCode).toBe(404);
    expect(res.status).toBe('rule_not_found');
  });

  it('10. Successfully awards XP when valid faculty calls with valid input', async () => {
    mockCurrentUser = { id: testFacultyId };
    const res = await awardXpAction({
      studentId: testStudentId,
      actionType: 'HACKATHON_PARTICIPATION',
      referenceId: `action_valid_award_${Date.now()}`,
      extraUnits: 0,
    });

    expect(res.success).toBe(true);
    expect(res.status).toBe('awarded');
    expect(res.xpAwarded).toBe(40);
    expect(res.newTotal).toBeGreaterThanOrEqual(40);
  });
});
