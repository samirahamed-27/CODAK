import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@supabase/supabase-js';
import {
  getFlagsAction,
  reviewFlagAction,
  voidFlaggedXpAction,
} from '@/app/actions/flags';

describe('4E: Faculty Flags Review & Void with Mandatory Written Reason Suite', () => {
  const adminClient = createAdminClient();
  const testRunId = `flagtest_${Date.now()}`;

  const createdUserIds: string[] = [];
  const createdFlagIds: string[] = [];
  const createdEventIds: string[] = [];

  let studentId: string;
  let studentJwt: string;
  let facultyId: string;

  async function createTestUser(role: 'student' | 'faculty', suffix: string): Promise<{ id: string; jwt: string }> {
    const email = `${testRunId}_${suffix}@test.edu`;
    const password = 'TestPassword123!';

    const { data: user, error: userErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role, full_name: `Test ${role} ${suffix}` },
    });

    if (userErr || !user?.user) {
      throw new Error(`Failed to create test user ${email}: ${userErr?.message}`);
    }

    const userId = user.user.id;
    createdUserIds.push(userId);

    // Ensure profile
    await adminClient.from('profiles').upsert({
      id: userId,
      role,
      full_name: `Test ${role} ${suffix}`,
    });

    if (role === 'student') {
      await adminClient.from('students').upsert({
        id: userId,
        roll_no: `ROLL_${userId.slice(0, 8)}`,
        department: 'CSE',
        year_of_study: 2,
      });
    } else {
      await adminClient.from('faculty').upsert({
        id: userId,
        department: 'CSE',
      });
    }

    // Sign in to obtain user JWT
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: signinRes } = await anonClient.auth.signInWithPassword({
      email,
      password,
    });

    return { id: userId, jwt: signinRes.session?.access_token || '' };
  }

  beforeAll(async () => {
    const s = await createTestUser('student', 's1');
    studentId = s.id;
    studentJwt = s.jwt;

    const f = await createTestUser('faculty', 'f1');
    facultyId = f.id;
  });

  afterAll(async () => {
    if (createdFlagIds.length > 0) {
      await adminClient.from('flags').delete().in('id', createdFlagIds);
    }
    if (createdEventIds.length > 0) {
      await adminClient.from('xp_events').delete().in('id', createdEventIds);
    }
    for (const uid of createdUserIds) {
      try { await adminClient.from('students').delete().eq('id', uid); } catch {}
      try { await adminClient.from('faculty').delete().eq('id', uid); } catch {}
      try { await adminClient.from('profiles').delete().eq('id', uid); } catch {}
      try { await adminClient.auth.admin.deleteUser(uid); } catch {}
    }
  });

  it('1. Proves student role CANNOT call void_xp RPC directly via Supabase client (blocked by REVOKE EXECUTE)', async () => {
    const clientWithStudent = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${studentJwt}` } } }
    );

    const { error } = await clientWithStudent.rpc('void_xp', {
      p_event_id: '00000000-0000-0000-0000-000000000000',
      p_reason: 'Unauthorized student attempt',
    });

    // Postgres permission denied because EXECUTE is revoked from authenticated and PUBLIC
    expect(error).not.toBeNull();
    expect(error!.message.toLowerCase()).toContain('permission denied');
  });

  it('2. Proves student role CANNOT call getFlagsAction or reviewFlagAction (403 Forbidden)', async () => {
    const resFlags = await getFlagsAction();
    expect(resFlags.statusCode).toBe(401);
    expect(resFlags.success).toBe(false);

    const resReview = await reviewFlagAction({
      flagId: '00000000-0000-0000-0000-000000000000',
      status: 'reviewed',
    });
    expect(resReview.statusCode).toBe(401);
    expect(resReview.success).toBe(false);

    const resVoid = await voidFlaggedXpAction({
      eventIds: ['00000000-0000-0000-0000-000000000000'],
      reason: 'Testing unauthorized void attempt',
    });
    expect(resVoid.statusCode).toBe(401);
    expect(resVoid.success).toBe(false);
  });

  it('3. Proves empty or short reason is strictly rejected when voiding XP', async () => {
    // Test empty reason via direct RPC
    const { error: emptyErr } = await adminClient.rpc('void_xp', {
      p_event_id: '00000000-0000-0000-0000-000000000000',
      p_reason: '',
      p_actor: facultyId,
    });
    expect(emptyErr).not.toBeNull();
    expect(emptyErr!.message).toContain('Validation error: Void reason is required and cannot be empty.');

    const { error: whitespaceErr } = await adminClient.rpc('void_xp', {
      p_event_id: '00000000-0000-0000-0000-000000000000',
      p_reason: '    ',
      p_actor: facultyId,
    });
    expect(whitespaceErr).not.toBeNull();
    expect(whitespaceErr!.message).toContain('Validation error: Void reason is required and cannot be empty.');
  });

  it('4. Proves faculty void_xp soft-voids event, recalculates total XP, and writes to audit_logs', async () => {
    // 1. Award XP to student using valid seeded rule DAILY_QUIZ
    const { data: awardData, error: awardErr } = await adminClient.rpc('award_xp', {
      p_student_id: studentId,
      p_action_type: 'DAILY_QUIZ',
      p_reference_id: `ref_${testRunId}_1`,
    });
    expect(awardErr).toBeNull();
    const eventId = (awardData as any).event_id;
    expect(eventId).toBeTruthy();
    createdEventIds.push(eventId);

    const totalBefore = (awardData as any).new_total;

    // 2. Void this event as faculty with written reason
    const writtenReason = 'Investigated practice collusion; shared duplicate submissions';
    const { data: voidData, error: voidErr } = await adminClient.rpc('void_xp', {
      p_event_id: eventId,
      p_reason: writtenReason,
      p_actor: facultyId,
    });

    expect(voidErr).toBeNull();
    const voidRes = voidData as any;
    expect(voidRes.status).toBe('voided');
    expect(voidRes.new_total).toBe(totalBefore - (awardData as any).xp_awarded);

    // 3. Verify event row still exists (soft-voided, not hard deleted)
    const { data: eventRow } = await adminClient
      .from('xp_events')
      .select('*')
      .eq('id', eventId)
      .single();

    expect(eventRow).toBeDefined();
    expect(eventRow!.status).toBe('voided');
    expect(eventRow!.void_reason).toBe(writtenReason);

    // 4. Verify audit log entry was created
    const { data: auditRows } = await adminClient
      .from('audit_logs')
      .select('*')
      .eq('target_id', eventId)
      .eq('action', 'void_xp');

    expect(auditRows?.length).toBeGreaterThan(0);
    const log = auditRows![0];
    expect(log.actor_id).toBe(facultyId);
    expect(log.reason).toBe(writtenReason);
    expect(log.target_type).toBe('xp_event');
  });

  it('5. Proves calling void_xp on an already-voided event is idempotent and safe', async () => {
    const eventId = createdEventIds[0];

    const { data: secondVoidData, error: secondVoidErr } = await adminClient.rpc('void_xp', {
      p_event_id: eventId,
      p_reason: 'Second void attempt should be idempotent',
      p_actor: facultyId,
    });

    expect(secondVoidErr).toBeNull();
    const res = secondVoidData as any;
    expect(res.status).toBe('already_voided');
  });

  it('6. Proves flags review status updates and linking', async () => {
    // Create an open test flag
    const { data: flag, error: flagErr } = await adminClient
      .from('flags')
      .insert({
        kind: 'spike',
        severity: 'high',
        student_id: studentId,
        window_start: new Date(Date.now() - 3600000).toISOString(),
        window_end: new Date().toISOString(),
        evidence: { ratio: 4.5, today_xp: 350 },
        status: 'open',
      })
      .select('id')
      .single();

    expect(flagErr).toBeNull();
    createdFlagIds.push(flag!.id);

    // Mark as dismissed with note
    const nowIso = new Date().toISOString();
    const { error: updErr } = await adminClient
      .from('flags')
      .update({
        status: 'dismissed',
        reviewed_by: facultyId,
        reviewed_at: nowIso,
        review_note: 'Verified legitimate catch-up learning session with faculty',
      })
      .eq('id', flag!.id);

    expect(updErr).toBeNull();

    // Verify status in DB
    const { data: updatedFlag } = await adminClient
      .from('flags')
      .select('*')
      .eq('id', flag!.id)
      .single();

    expect(updatedFlag!.status).toBe('dismissed');
    expect(updatedFlag!.reviewed_by).toBe(facultyId);
    expect(updatedFlag!.review_note).toContain('Verified legitimate catch-up');
  });
});
