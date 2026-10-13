import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
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

describe.runIf(isDevProject)('XP Security & Tamper Resistance Suite', () => {
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const anonClient = createClient(supabaseUrl, anonKey);

  let studentAId: string;
  let studentAEmail: string;
  let studentAClient: ReturnType<typeof createClient>;

  let studentBId: string;
  let studentBEmail: string;

  beforeAll(async () => {
    // 1. Create Student A
    studentAEmail = `student-a-${Date.now()}@dev.local`;
    const { data: userA, error: errA } = await adminClient.auth.admin.createUser({
      email: studentAEmail,
      password: 'StudentPassword123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'Student Alice Security',
        roll_no: `SEC-A-${Date.now()}`,
        department: 'CyberSec',
      },
    });
    if (errA || !userA.user) throw new Error(`Failed to create student A: ${errA?.message}`);
    studentAId = userA.user.id;

    // Sign in as Student A using anon client
    studentAClient = createClient(supabaseUrl, anonKey);
    const { error: signInErrA } = await studentAClient.auth.signInWithPassword({
      email: studentAEmail,
      password: 'StudentPassword123!',
    });
    if (signInErrA) throw new Error(`Failed to sign in student A: ${signInErrA.message}`);

    // 2. Create Student B
    studentBEmail = `student-b-${Date.now()}@dev.local`;
    const { data: userB, error: errB } = await adminClient.auth.admin.createUser({
      email: studentBEmail,
      password: 'StudentPassword123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'Student Bob Security',
        roll_no: `SEC-B-${Date.now()}`,
        department: 'CyberSec',
      },
    });
    if (errB || !userB.user) throw new Error(`Failed to create student B: ${errB?.message}`);
    studentBId = userB.user.id;

    // Award XP to Student B via admin
    await adminClient.rpc('award_xp', {
      p_student_id: studentBId,
      p_action_type: 'HACKATHON_PARTICIPATION',
      p_reference_id: `bob_hack_${Date.now()}`,
      p_extra_units: 0,
    });
  });

  afterAll(async () => {
    // Cleanup Student A
    if (studentAId) {
      await adminClient.from('xp_events').delete().eq('student_id', studentAId);
      await adminClient.from('students').delete().eq('id', studentAId);
      await adminClient.from('profiles').delete().eq('id', studentAId);
      await adminClient.auth.admin.deleteUser(studentAId);
    }
    // Cleanup Student B
    if (studentBId) {
      await adminClient.from('xp_events').delete().eq('student_id', studentBId);
      await adminClient.from('students').delete().eq('id', studentBId);
      await adminClient.from('profiles').delete().eq('id', studentBId);
      await adminClient.auth.admin.deleteUser(studentBId);
    }
  });

  describe('1. Function Execution Revocation (award_xp & void_xp)', () => {
    it('Authenticated student calling award_xp directly is denied permission (42501)', async () => {
      const { data, error } = await (studentAClient as any).rpc('award_xp', {
        p_student_id: studentAId,
        p_action_type: 'ATTENDANCE',
        p_reference_id: `hacked_att_${Date.now()}`,
        p_extra_units: 0,
      });

      expect(error).toBeDefined();
      // Postgres error 42501: permission denied for function award_xp
      expect(error?.code).toBe('42501');
      expect(data).toBeNull();
    });

    it('Authenticated student calling void_xp directly is denied permission (42501)', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';
      const { data, error } = await (studentAClient as any).rpc('void_xp', {
        p_event_id: fakeUuid,
        p_reason: 'Malicious void attempt',
      });

      expect(error).toBeDefined();
      expect(error?.code).toBe('42501');
      expect(data).toBeNull();
    });

    it('Anonymous user calling award_xp directly is denied permission (42501)', async () => {
      const { data, error } = await (anonClient as any).rpc('award_xp', {
        p_student_id: studentAId,
        p_action_type: 'ATTENDANCE',
        p_reference_id: `anon_att_${Date.now()}`,
        p_extra_units: 0,
      });

      expect(error).toBeDefined();
      expect(error?.code).toBe('42501');
      expect(data).toBeNull();
    });
  });

  describe('2. Direct Table RLS Restrictions', () => {
    it('Student cannot directly insert into xp_events', async () => {
      const { data, error } = await (studentAClient as any).from('xp_events').insert({
        student_id: studentAId,
        action_type: 'ATTENDANCE',
        xp_amount: 5000,
        reference_id: `forged_event_${Date.now()}`,
        status: 'valid',
      });

      expect(error).toBeDefined();
      // RLS violation or permission denied
      expect(error?.message).toMatch(/violates row-level security|permission denied/i);
    });

    it('Student cannot update xp_rules', async () => {
      const { data, error } = await (studentAClient as any)
        .from('xp_rules')
        .update({ base_xp: 9999 })
        .eq('action_type', 'ATTENDANCE')
        .select();

      // Either returns an error or 0 rows modified due to RLS
      if (error) {
        expect(error.message).toBeDefined();
      } else {
        expect(data).toEqual([]);
      }

      // Verify ATTENDANCE rule was NOT modified in the database
      const { data: actualRule } = await adminClient
        .from('xp_rules')
        .select('base_xp')
        .eq('action_type', 'ATTENDANCE')
        .single();
      expect(actualRule?.base_xp).toBe(10);
    });

    it('Immutable action_type: even admin cannot update action_type in xp_rules', async () => {
      const { error } = await adminClient
        .from('xp_rules')
        .update({ action_type: 'TAMPERED_ACTION_TYPE' })
        .eq('action_type', 'ATTENDANCE');

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/action_type is immutable/i);
    });

    it('Student cannot read xp_rules_history', async () => {
      const { data, error } = await studentAClient.from('xp_rules_history').select('*');

      // Admin-only RLS policy returns empty array or error
      if (error) {
        expect(error.message).toBeDefined();
      } else {
        expect(data).toEqual([]);
      }
    });
  });

  describe('3. Cross-Student Privacy & Data Isolation', () => {
    it('Student A cannot read Student B events from xp_events', async () => {
      const { data, error } = await studentAClient
        .from('xp_events')
        .select('*')
        .eq('student_id', studentBId);

      expect(error).toBeNull();
      // Must be empty because RLS filters only Student A's own events
      expect(data).toEqual([]);
    });

    it('Student A cannot read Student B total from student_xp_totals view', async () => {
      // student_xp_totals has WITH (security_invoker = true)
      // When Student A queries for Student B's total, RLS on underlying xp_events applies to caller
      const { data, error } = await studentAClient
        .from('student_xp_totals')
        .select('*')
        .eq('student_id', studentBId);

      expect(error).toBeNull();
      // Should return 0 rows for Student B
      expect(data).toEqual([]);
    });
  });
});

