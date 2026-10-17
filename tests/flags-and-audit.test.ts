import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@supabase/supabase-js';
import { writeAuditLog } from '@/lib/audit-logs';
import { updateXpRuleAction } from '@/app/actions/rules';
import { approveQuestionAction } from '@/app/actions/faculty-questions';

try {
  process.loadEnvFile?.('.env.local');
} catch {}

describe('4B: Flags and Audit Log Integrity', () => {
  const adminClient = createAdminClient();
  const ts = Date.now();

  let studentId: string;
  let facultyId: string;
  let studentJwt: string;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    // 1. Create a test student
    const { data: uStudent, error: errS } = await adminClient.auth.admin.createUser({
      email: `audit_flags_s_${ts}@test.edu`,
      password: 'Password123!',
      email_confirm: true,
      user_metadata: { full_name: 'Audit Flags Student', roll_no: `FLAGS-S-${ts}`, department: 'CSE' },
    });
    if (errS || !uStudent.user) throw errS || new Error('Failed to create student');
    studentId = uStudent.user.id;
    createdUserIds.push(studentId);

    // 2. Sign in as student to get a real student JWT
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: signinRes } = await anonClient.auth.signInWithPassword({
      email: `audit_flags_s_${ts}@test.edu`,
      password: 'Password123!',
    });
    studentJwt = signinRes.session?.access_token || '';

    // 3. Create a test faculty
    const { data: uFac, error: errF } = await adminClient.auth.admin.createUser({
      email: `audit_flags_f_${ts}@test.edu`,
      password: 'Password123!',
      email_confirm: true,
      user_metadata: { full_name: 'Audit Flags Faculty', role: 'faculty', department: 'CSE' },
    });
    if (errF || !uFac.user) throw errF || new Error('Failed to create faculty');
    facultyId = uFac.user.id;
    createdUserIds.push(facultyId);

    await adminClient.from('profiles').update({ role: 'faculty' }).eq('id', facultyId);
  });

  afterAll(async () => {
    for (const uid of createdUserIds) {
      try { await adminClient.from('flags').delete().eq('student_id', uid); } catch {}
      try { await adminClient.from('audit_logs').delete().eq('actor_id', uid); } catch {}
      try { await adminClient.from('xp_events').delete().eq('student_id', uid); } catch {}
      try { await adminClient.from('students').delete().eq('id', uid); } catch {}
      try { await adminClient.from('profiles').delete().eq('id', uid); } catch {}
      try { await adminClient.auth.admin.deleteUser(uid); } catch {}
    }
  });

  it('1. Proves audit_logs is strictly append-only (UPDATE and DELETE are rejected)', async () => {
    // Insert an audit log
    const { data: log, error: insErr } = await adminClient
      .from('audit_logs')
      .insert({
        actor_id: facultyId,
        action: 'test_action',
        target_type: 'test',
        target_id: '123',
        reason: 'Testing append-only enforcement',
      })
      .select('id')
      .single();

    expect(insErr).toBeNull();
    expect(log).toBeDefined();

    // Direct client UPDATE must fail (even for non-service role)
    const clientWithStudent = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${studentJwt}` } } }
    );

    const { error: updErr } = await clientWithStudent
      .from('audit_logs')
      .update({ reason: 'tampered reason' })
      .eq('id', log!.id);

    // Blocked by RLS or trigger
    expect(updErr).not.toBeNull();

    // Direct DELETE by student must fail
    const { error: delErr } = await clientWithStudent
      .from('audit_logs')
      .delete()
      .eq('id', log!.id);
    expect(delErr).not.toBeNull();
  });

  it('2. Students CANNOT read flags or audit_logs (RLS isolation)', async () => {
    // Insert a flag for the student
    await adminClient.from('flags').insert({
      kind: 'spike',
      severity: 'high',
      student_id: studentId,
      window_start: new Date(Date.now() - 86400000).toISOString(),
      window_end: new Date().toISOString(),
      evidence: { ratio: 4.2 },
      status: 'open',
    });

    const studentClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${studentJwt}` } } }
    );

    // Student queries flags -> returns 0 rows (RLS blocks read)
    const { data: flags, error: flagErr } = await studentClient
      .from('flags')
      .select('*');

    expect(flagErr).toBeNull();
    expect(flags).toHaveLength(0);

    // Student queries audit_logs -> returns 0 rows
    const { data: logs, error: logErr } = await studentClient
      .from('audit_logs')
      .select('*');

    expect(logErr).toBeNull();
    expect(logs).toHaveLength(0);
  });

  it('3. Prevents duplicate flags with identical window and student', async () => {
    const winStart = new Date('2026-10-17T00:00:00Z').toISOString();
    const winEnd = new Date('2026-10-17T23:59:59Z').toISOString();

    // First flag
    const { error: e1 } = await adminClient.from('flags').insert({
      kind: 'spike',
      severity: 'medium',
      student_id: studentId,
      window_start: winStart,
      window_end: winEnd,
      evidence: { xp: 500 },
      status: 'open',
    });
    expect(e1).toBeNull();

    // Second identical flag must be rejected by unique constraint
    const { error: e2 } = await adminClient.from('flags').insert({
      kind: 'spike',
      severity: 'medium',
      student_id: studentId,
      window_start: winStart,
      window_end: winEnd,
      evidence: { xp: 500 },
      status: 'open',
    });
    expect(e2).not.toBeNull();
    expect(e2!.message).toMatch(/duplicate key|unique/i);
  });

  it('4. Voiding an XP event writes a row to audit_logs and is harmless if voided twice', async () => {
    // Create an event for the student
    const { data: ev } = await adminClient
      .from('xp_events')
      .insert({
        student_id: studentId,
        action_type: 'ASSIGNMENT_ON_TIME',
        xp_amount: 20,
        reference_id: `audit_void_test_${ts}`,
        status: 'valid',
      })
      .select('id')
      .single();

    // Void with reason
    const { data: voidRes, error: vErr } = await adminClient.rpc('void_xp', {
      p_event_id: ev!.id,
      p_reason: 'Voided due to plagiarism',
      p_actor: facultyId,
    });

    expect(vErr).toBeNull();
    const vr = voidRes as any;
    expect(vr.status).toBe('voided');

    // Verify audit_logs row was created
    const { data: auditRow } = await adminClient
      .from('audit_logs')
      .select('*')
      .eq('target_id', ev!.id)
      .eq('action', 'void_xp')
      .single();

    expect(auditRow).toBeDefined();
    expect(auditRow!.reason).toBe('Voided due to plagiarism');
    expect(auditRow!.actor_id).toBe(facultyId);

    // Voiding second time must be harmless (returns already_voided, doesn't throw)
    const { data: voidRes2, error: vErr2 } = await adminClient.rpc('void_xp', {
      p_event_id: ev!.id,
      p_reason: 'Second void attempt',
      p_actor: facultyId,
    });

    expect(vErr2).toBeNull();
    const vr2 = voidRes2 as any;
    expect(vr2.status).toBe('already_voided');
  });
});
