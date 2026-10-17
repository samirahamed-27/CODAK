import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createAdminClient } from '@/lib/supabase/admin';
import { runSpikeDetection } from '@/lib/anti-gaming/spike-detection';

try {
  process.loadEnvFile?.('.env.local');
} catch {}

describe('4C: Spike Detection Engine', () => {
  const adminClient = createAdminClient();
  const ts = Date.now();
  const testDate = '2026-10-18';
  const createdUserIds: string[] = [];

  async function createTestStudent(name: string) {
    const { data: u, error } = await adminClient.auth.admin.createUser({
      email: `audit_spike_${name}_${ts}@test.edu`,
      password: 'Password123!',
      email_confirm: true,
      user_metadata: { full_name: `Audit Spike ${name}`, roll_no: `SPK-${name}-${ts}`, department: 'CSE' },
    });
    if (error || !u.user) throw error || new Error('Failed to create student');
    createdUserIds.push(u.user.id);
    return u.user.id;
  }

  afterAll(async () => {
    for (const uid of createdUserIds) {
      try { await adminClient.from('flags').delete().eq('student_id', uid); } catch {}
      try { await adminClient.from('xp_events').delete().eq('student_id', uid); } catch {}
      try { await adminClient.from('students').delete().eq('id', uid); } catch {}
      try { await adminClient.from('profiles').delete().eq('id', uid); } catch {}
      try { await adminClient.auth.admin.deleteUser(uid); } catch {}
    }
  });

  it('1. Flags student when today > 3x baseline average AND today >= min XP (200) AND >= 5 baseline active days', async () => {
    const sId = await createTestStudent('flagged');

    // Seed 5 prior active days (e.g. Oct 10 to Oct 14) with 50 XP each -> baseline average = 50 XP
    for (let day = 10; day <= 14; day++) {
      const priorDate = `2026-10-${day.toString().padStart(2, '0')}T12:00:00.000+05:30`;
      await adminClient.from('xp_events').insert({
        student_id: sId,
        action_type: 'DAILY_QUIZ',
        xp_amount: 50,
        reference_id: `spike_baseline_${sId}_${day}`,
        created_at: priorDate,
        status: 'valid',
      });
    }

    // On testDate (Oct 18), earn 300 XP (300 >= 200 min XP, and 300 / 50 = 6.0x > 3.0x)
    await adminClient.from('xp_events').insert([
      {
        student_id: sId,
        action_type: 'HACKATHON_PARTICIPATION',
        xp_amount: 200,
        reference_id: `spike_today_1_${sId}`,
        created_at: `${testDate}T10:00:00.000+05:30`,
        status: 'valid',
      },
      {
        student_id: sId,
        action_type: 'ASSIGNMENT_ON_TIME',
        xp_amount: 100,
        reference_id: `spike_today_2_${sId}`,
        created_at: `${testDate}T14:00:00.000+05:30`,
        status: 'valid',
      },
    ]);

    // Run spike detection for testDate
    const res = await runSpikeDetection({ targetDate: testDate, studentId: sId });
    expect(res.flaggedCount).toBe(1);

    // Verify flag row in database
    const { data: flag } = await adminClient
      .from('flags')
      .select('*')
      .eq('student_id', sId)
      .eq('kind', 'spike')
      .single();

    expect(flag).toBeDefined();
    expect(flag!.severity).toBe('high'); // ratio 6.0 >= 5.0
    expect(flag!.status).toBe('open');
    expect(flag!.evidence.today_xp).toBe(300);
    expect(flag!.evidence.baseline_avg).toBe(50);
    expect(flag!.evidence.ratio).toBe(6);
    expect(flag!.evidence.baseline_active_days).toBe(5);
    expect(flag!.evidence.today_by_action_type.HACKATHON_PARTICIPATION).toBe(200);
    expect(flag!.evidence.today_by_action_type.ASSIGNMENT_ON_TIME).toBe(100);
    expect(flag!.evidence.event_ids.length).toBe(2);

    // Verify detection NEVER auto-voids: both today events remain valid
    const { data: validEvents } = await adminClient
      .from('xp_events')
      .select('status')
      .eq('student_id', sId)
      .eq('status', 'valid');
    expect(validEvents!.length).toBe(7); // 5 prior + 2 today
  });

  it('2. Does NOT flag at exactly 3x or below', async () => {
    const sId = await createTestStudent('exact_3x');

    // Seed 5 prior active days with 100 XP each -> baseline average = 100 XP
    for (let day = 10; day <= 14; day++) {
      const priorDate = `2026-10-${day.toString().padStart(2, '0')}T12:00:00.000+05:30`;
      await adminClient.from('xp_events').insert({
        student_id: sId,
        action_type: 'DAILY_QUIZ',
        xp_amount: 100,
        reference_id: `spike_exact_base_${sId}_${day}`,
        created_at: priorDate,
        status: 'valid',
      });
    }

    // On testDate, earn exactly 300 XP (300 / 100 = 3.0x -> not strictly > 3.0x)
    await adminClient.from('xp_events').insert({
      student_id: sId,
      action_type: 'HACKATHON_PARTICIPATION',
      xp_amount: 300,
      reference_id: `spike_exact_today_${sId}`,
      created_at: `${testDate}T11:00:00.000+05:30`,
      status: 'valid',
    });

    const res = await runSpikeDetection({ targetDate: testDate, studentId: sId });
    expect(res.flaggedCount).toBe(0);

    const { data: flags } = await adminClient
      .from('flags')
      .select('id')
      .eq('student_id', sId)
      .eq('kind', 'spike');
    expect(flags).toHaveLength(0);
  });

  it('3. Does NOT flag without at least 5 baseline active days', async () => {
    const sId = await createTestStudent('no_baseline');

    // Only 3 prior active days with 40 XP each
    for (let day = 12; day <= 14; day++) {
      const priorDate = `2026-10-${day.toString().padStart(2, '0')}T12:00:00.000+05:30`;
      await adminClient.from('xp_events').insert({
        student_id: sId,
        action_type: 'DAILY_QUIZ',
        xp_amount: 40,
        reference_id: `spike_few_base_${sId}_${day}`,
        created_at: priorDate,
        status: 'valid',
      });
    }

    // On testDate, earn 300 XP (7.5x average, but only 3 baseline active days)
    await adminClient.from('xp_events').insert({
      student_id: sId,
      action_type: 'HACKATHON_PARTICIPATION',
      xp_amount: 300,
      reference_id: `spike_few_today_${sId}`,
      created_at: `${testDate}T12:00:00.000+05:30`,
      status: 'valid',
    });

    const res = await runSpikeDetection({ targetDate: testDate, studentId: sId });
    expect(res.flaggedCount).toBe(0);

    const { data: flags } = await adminClient
      .from('flags')
      .select('id')
      .eq('student_id', sId)
      .eq('kind', 'spike');
    expect(flags).toHaveLength(0);
  });

  it('4. Does NOT flag when today XP is below the minimum threshold (200 XP)', async () => {
    const sId = await createTestStudent('low_today_xp');

    // 5 prior days averaging 15 XP
    for (let day = 10; day <= 14; day++) {
      const priorDate = `2026-10-${day.toString().padStart(2, '0')}T12:00:00.000+05:30`;
      await adminClient.from('xp_events').insert({
        student_id: sId,
        action_type: 'ATTENDANCE',
        xp_amount: 15,
        reference_id: `spike_low_base_${sId}_${day}`,
        created_at: priorDate,
        status: 'valid',
      });
    }

    // On testDate, earn 90 XP (6x average of 15, but 90 < 200 min XP)
    await adminClient.from('xp_events').insert({
      student_id: sId,
      action_type: 'DAILY_QUIZ',
      xp_amount: 90,
      reference_id: `spike_low_today_${sId}`,
      created_at: `${testDate}T12:00:00.000+05:30`,
      status: 'valid',
    });

    const res = await runSpikeDetection({ targetDate: testDate, studentId: sId });
    expect(res.flaggedCount).toBe(0);
  });

  it('5. Rerun creates no duplicate flag (idempotent)', async () => {
    // Re-run for the flagged student from test 1
    const flaggedId = createdUserIds[0];
    const res = await runSpikeDetection({ targetDate: testDate, studentId: flaggedId });

    // Insertion is ignored by unique key conflict
    expect(res.flaggedCount).toBe(0);

    const { data: flags } = await adminClient
      .from('flags')
      .select('id')
      .eq('student_id', flaggedId)
      .eq('kind', 'spike');
    expect(flags).toHaveLength(1); // Still exactly 1 flag
  });
});
