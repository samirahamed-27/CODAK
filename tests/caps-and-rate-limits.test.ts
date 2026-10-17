import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/rate-limits';

try {
  process.loadEnvFile?.('.env.local');
} catch {}

describe('4A: Daily XP Ceilings and Sensitive Action Rate Limits', () => {
  const adminClient = createAdminClient();
  const ts = Date.now();

  let studentId: string;
  let facultyId: string;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    // 1. Create a test student
    const { data: uStudent, error: errS } = await adminClient.auth.admin.createUser({
      email: `audit_cap_student_${ts}@test.edu`,
      password: 'Password123!',
      email_confirm: true,
      user_metadata: { full_name: 'Audit Cap Student', roll_no: `AUDIT-CAP-${ts}`, department: 'CSE' },
    });
    if (errS || !uStudent.user) throw errS || new Error('Failed to create student');
    studentId = uStudent.user.id;
    createdUserIds.push(studentId);

    // 2. Create a test faculty
    const { data: uFac, error: errF } = await adminClient.auth.admin.createUser({
      email: `audit_cap_fac_${ts}@test.edu`,
      password: 'Password123!',
      email_confirm: true,
      user_metadata: { full_name: 'Audit Cap Faculty', role: 'faculty', department: 'CSE' },
    });
    if (errF || !uFac.user) throw errF || new Error('Failed to create faculty');
    facultyId = uFac.user.id;
    createdUserIds.push(facultyId);

    // Update profile role to faculty
    await adminClient.from('profiles').update({ role: 'faculty' }).eq('id', facultyId);
  });

  afterAll(async () => {
    // Clean up test data
    for (const uid of createdUserIds) {
      try { await adminClient.from('action_rate_limits').delete().eq('student_id', uid); } catch {}
      try { await adminClient.from('flags').delete().eq('student_id', uid); } catch {}
      try { await adminClient.from('audit_logs').delete().eq('actor_id', uid); } catch {}
      try { await adminClient.from('xp_events').delete().eq('student_id', uid); } catch {}
      try { await adminClient.from('students').delete().eq('id', uid); } catch {}
      try { await adminClient.from('profiles').delete().eq('id', uid); } catch {}
      try { await adminClient.auth.admin.deleteUser(uid); } catch {}
    }
  });

  it('1. Blocks awards when overall daily XP ceiling (1000 XP) is hit, writes nothing to ledger', async () => {
    // Seed 980 XP today for student via xp_events (with custom reference to avoid conflict)
    const { error: seedErr } = await adminClient.from('xp_events').insert({
      student_id: studentId,
      action_type: 'ASSIGNMENT_ON_TIME',
      xp_amount: 980,
      reference_id: `audit_cap_seed_${ts}`,
      status: 'valid',
    });
    expect(seedErr).toBeNull();

    // Call award_xp for an action that pays 40 XP (e.g. HACKATHON_PARTICIPATION)
    // 980 + 40 = 1020 > 1000 ceiling
    const { data: res, error: rpcErr } = await adminClient.rpc('award_xp', {
      p_student_id: studentId,
      p_action_type: 'HACKATHON_PARTICIPATION',
      p_reference_id: `audit_hack_${ts}`,
    });

    expect(rpcErr).toBeNull();
    const r = res as any;
    expect(r.status).toBe('limit_reached');
    expect(r.reason).toBe('daily_xp_ceiling');
    expect(r.xp_awarded).toBe(0);
    expect(r.event_id).toBeNull();

    // Verify NOTHING was written to xp_events for this reference
    const { data: rows } = await adminClient
      .from('xp_events')
      .select('id')
      .eq('reference_id', `audit_hack_${ts}`);
    expect(rows).toHaveLength(0);
  });

  it('2. Enforces daily game XP ceiling (350 XP) specifically for game activities', async () => {
    // Clean prior events for this subtest
    await adminClient.from('xp_events').delete().eq('student_id', studentId);

    // Seed 340 game XP (e.g. BATTLE_WIN / DUEL_WIN)
    await adminClient.from('xp_events').insert({
      student_id: studentId,
      action_type: 'DUEL_WIN',
      xp_amount: 340,
      reference_id: `audit_game_seed_${ts}`,
      status: 'valid',
    });

    // Attempt to earn DUEL_WIN (25 XP) -> 340 + 25 = 365 > 350
    const { data: res, error: rpcErr } = await adminClient.rpc('award_xp', {
      p_student_id: studentId,
      p_action_type: 'DUEL_WIN',
      p_reference_id: `audit_duel_win_${ts}`,
    });

    expect(rpcErr).toBeNull();
    const r = res as any;
    expect(r.status).toBe('limit_reached');
    expect(r.reason).toBe('daily_game_xp_ceiling');
    expect(r.xp_awarded).toBe(0);

    // However, a learning action (e.g. ATTENDANCE, 10 XP) is still permitted under learning ceiling
    const { data: learnRes } = await adminClient.rpc('award_xp', {
      p_student_id: studentId,
      p_action_type: 'ATTENDANCE',
      p_reference_id: `audit_attendance_${ts}`,
    });
    const lr = learnRes as any;
    expect(lr.status).toBe('awarded');
    expect(lr.xp_awarded).toBe(10);
  });

  it('3. Manual faculty award is exempt from ceilings but recorded with the awarding faculty', async () => {
    // Student already has >= 350 XP. Award a manual faculty award (PEER_HELP with p_actor = facultyId)
    const { data: res, error: rpcErr } = await adminClient.rpc('award_xp', {
      p_student_id: studentId,
      p_action_type: 'PEER_HELP',
      p_reference_id: `audit_fac_award_${ts}`,
      p_extra_units: 0,
      p_actor: facultyId,
    });

    expect(rpcErr).toBeNull();
    const r = res as any;
    expect(r.status).toBe('awarded');
    expect(r.xp_awarded).toBe(15);
    expect(r.event_id).toBeDefined();

    // Verify row in ledger records awarded_by = facultyId
    const { data: event } = await adminClient
      .from('xp_events')
      .select('awarded_by, action_type, xp_amount')
      .eq('id', r.event_id)
      .single();

    expect(event!.awarded_by).toBe(facultyId);
  });

  it('4. Rate limits sensitive actions to requests-per-minute and creates low-severity flag on excess', async () => {
    const actionName = 'quiz_answer';
    const maxPerMinute = 3;

    // Clear prior rate limit entries for student
    await adminClient.from('action_rate_limits').delete().eq('student_id', studentId);
    await adminClient.from('flags').delete().eq('student_id', studentId);

    // Requests 1, 2, 3 must be allowed
    const r1 = await checkRateLimit(studentId, actionName, maxPerMinute);
    const r2 = await checkRateLimit(studentId, actionName, maxPerMinute);
    const r3 = await checkRateLimit(studentId, actionName, maxPerMinute);

    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(true);

    // Request 4 exceeds limit (3 allowed per minute)
    const r4 = await checkRateLimit(studentId, actionName, maxPerMinute);
    expect(r4.allowed).toBe(false);
    expect(r4.statusCode).toBe(429);
    expect(r4.error).toMatch(/too many requests/i);

    // Verify low-severity flag was created in public.flags
    const { data: flags } = await adminClient
      .from('flags')
      .select('*')
      .eq('student_id', studentId)
      .eq('kind', 'rate_limit');

    expect(flags).toBeDefined();
    expect(flags!.length).toBe(1);
    expect(flags![0].severity).toBe('low');
    expect(flags![0].status).toBe('open');
    expect(flags![0].evidence.action_name).toBe(actionName);

    // Request 5: must still be blocked, but must NOT create a duplicate flag (max 1 per hour)
    const r5 = await checkRateLimit(studentId, actionName, maxPerMinute);
    expect(r5.allowed).toBe(false);

    const { data: flagsAfter } = await adminClient
      .from('flags')
      .select('id')
      .eq('student_id', studentId)
      .eq('kind', 'rate_limit');
    expect(flagsAfter!.length).toBe(1);
  });
});
