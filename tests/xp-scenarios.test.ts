import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { levelFromXp } from '../src/lib/levels';

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

const isDevProject =
  Boolean(supabaseUrl && serviceRoleKey) &&
  (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || supabaseUrl.includes('supabase.co'));

describe.runIf(isDevProject)('10 Scripted Student Scenarios - Exact Ledger Integrity', () => {
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const createdUserIds: string[] = [];

  async function createTestStudent(name: string) {
    const testEmail = `scenario-${Date.now()}-${Math.floor(Math.random() * 10000)}@dev.local`;
    const { data, error } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: {
        full_name: name,
        roll_no: `SCENARIO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        department: 'Scenario Testing',
      },
    });

    if (error || !data.user) {
      throw new Error(`Failed to create scenario user: ${error?.message}`);
    }
    createdUserIds.push(data.user.id);
    return data.user.id;
  }

  afterAll(async () => {
    // Clean up all created scenario users and their events
    for (const id of createdUserIds) {
      await adminClient.from('xp_events').delete().eq('student_id', id);
      await adminClient.from('students').delete().eq('id', id);
      await adminClient.from('profiles').delete().eq('id', id);
      await adminClient.auth.admin.deleteUser(id);
    }
  });

  async function verifyLedgerMatchesTotal(studentId: string) {
    // 1. Fetch all events for the student
    const { data: events, error: eventsError } = await adminClient
      .from('xp_events')
      .select('xp_amount, status')
      .eq('student_id', studentId);

    expect(eventsError).toBeNull();

    // 2. Sum valid events in TypeScript
    const validEventsSum = (events || [])
      .filter((e) => e.status === 'valid')
      .reduce((sum, e) => sum + e.xp_amount, 0);

    // 3. Query get_student_xp RPC
    const { data: rpcTotal, error: rpcError } = await adminClient.rpc('get_student_xp', {
      p_student_id: studentId,
    });
    expect(rpcError).toBeNull();

    // 4. Query student_xp_totals view
    const { data: viewData, error: viewError } = await adminClient
      .from('student_xp_totals')
      .select('total_xp')
      .eq('student_id', studentId)
      .maybeSingle();

    expect(viewError).toBeNull();
    const viewTotal = viewData ? Number(viewData.total_xp) : 0;

    // Both must match the valid ledger sum EXACTLY
    expect(rpcTotal).toBe(validEventsSum);
    expect(viewTotal).toBe(validEventsSum);

    return validEventsSum;
  }

  it('Student 1: Brand new student has 0 XP and level 1', async () => {
    const studentId = await createTestStudent('Scenario Student 1 - Newbie');
    const total = await verifyLedgerMatchesTotal(studentId);
    expect(total).toBe(0);
    const lvl = levelFromXp(total);
    expect(lvl.level).toBe(1);
  });

  it('Student 2: Attendance only awards 10 XP', async () => {
    const studentId = await createTestStudent('Scenario Student 2 - Daily Attender');
    await adminClient.rpc('award_xp', {
      p_student_id: studentId,
      p_action_type: 'ATTENDANCE',
      p_reference_id: `att_${studentId}_1`,
      p_extra_units: 0,
    });

    const total = await verifyLedgerMatchesTotal(studentId);
    expect(total).toBe(10);
    expect(levelFromXp(total).level).toBe(1);
  });

  it('Student 3: Perfect daily quiz + attendance awards 25 XP', async () => {
    const studentId = await createTestStudent('Scenario Student 3 - Quizzer');
    await adminClient.rpc('award_xp', {
      p_student_id: studentId,
      p_action_type: 'ATTENDANCE',
      p_reference_id: `att_${studentId}_1`,
      p_extra_units: 0,
    });
    await adminClient.rpc('award_xp', {
      p_student_id: studentId,
      p_action_type: 'DAILY_QUIZ',
      p_reference_id: `quiz_${studentId}_1`,
      p_extra_units: 0,
    });

    const total = await verifyLedgerMatchesTotal(studentId);
    expect(total).toBe(25); // 10 + 15
    expect(levelFromXp(total).level).toBe(1);
  });

  it('Student 4: Quiz with extra units + attendance', async () => {
    const studentId = await createTestStudent('Scenario Student 4 - Quiz Master');
    await adminClient.rpc('award_xp', {
      p_student_id: studentId,
      p_action_type: 'ATTENDANCE',
      p_reference_id: `att_${studentId}_1`,
      p_extra_units: 0,
    });
    // DAILY_QUIZ: 15 base + 5 * 3 extra = 30
    await adminClient.rpc('award_xp', {
      p_student_id: studentId,
      p_action_type: 'DAILY_QUIZ',
      p_reference_id: `quiz_${studentId}_extra`,
      p_extra_units: 3,
    });

    const total = await verifyLedgerMatchesTotal(studentId);
    expect(total).toBe(40); // 10 + 30
    expect(levelFromXp(total).level).toBe(1);
  });

  it('Student 5: Peer helper reaches daily cap (3 helpers = 45 XP)', async () => {
    const studentId = await createTestStudent('Scenario Student 5 - Helper');
    for (let i = 1; i <= 3; i++) {
      await adminClient.rpc('award_xp', {
        p_student_id: studentId,
        p_action_type: 'PEER_HELP',
        p_reference_id: `peer_help_${studentId}_${i}`,
        p_extra_units: 0,
      });
    }

    const total = await verifyLedgerMatchesTotal(studentId);
    expect(total).toBe(45); // 3 * 15 (base_xp for PEER_HELP is 15)
    expect(levelFromXp(total).level).toBe(1);
  });

  it('Student 6: Hackathon participant + 2 peer helps (70 XP)', async () => {
    const studentId = await createTestStudent('Scenario Student 6 - Hackathoner');
    await adminClient.rpc('award_xp', {
      p_student_id: studentId,
      p_action_type: 'HACKATHON_PARTICIPATION',
      p_reference_id: `hackathon_${studentId}`,
      p_extra_units: 0,
    });
    await adminClient.rpc('award_xp', {
      p_student_id: studentId,
      p_action_type: 'PEER_HELP',
      p_reference_id: `peer_help_${studentId}_1`,
      p_extra_units: 0,
    });
    await adminClient.rpc('award_xp', {
      p_student_id: studentId,
      p_action_type: 'PEER_HELP',
      p_reference_id: `peer_help_${studentId}_2`,
      p_extra_units: 0,
    });

    const total = await verifyLedgerMatchesTotal(studentId);
    expect(total).toBe(70); // 40 + 15 + 15
    expect(levelFromXp(total).level).toBe(1);
  });

  it('Student 7: Crosses Level 2 threshold (110 XP -> Level 2)', async () => {
    const studentId = await createTestStudent('Scenario Student 7 - Level 2 Achiever');
    // Attendance (10) + Hackathon (40) + 3 Peer Helps (45) + Quiz (15) = 110 XP
    await adminClient.rpc('award_xp', {
      p_student_id: studentId,
      p_action_type: 'ATTENDANCE',
      p_reference_id: `att_${studentId}`,
      p_extra_units: 0,
    });
    await adminClient.rpc('award_xp', {
      p_student_id: studentId,
      p_action_type: 'HACKATHON_PARTICIPATION',
      p_reference_id: `hack_${studentId}`,
      p_extra_units: 0,
    });
    for (let i = 1; i <= 3; i++) {
      await adminClient.rpc('award_xp', {
        p_student_id: studentId,
        p_action_type: 'PEER_HELP',
        p_reference_id: `peer_${studentId}_${i}`,
        p_extra_units: 0,
      });
    }
    await adminClient.rpc('award_xp', {
      p_student_id: studentId,
      p_action_type: 'DAILY_QUIZ',
      p_reference_id: `quiz_${studentId}`,
      p_extra_units: 0,
    });

    const total = await verifyLedgerMatchesTotal(studentId);
    expect(total).toBe(110);
    const lvl = levelFromXp(total);
    expect(lvl.level).toBe(2);
    expect(lvl.xpIntoLevel).toBe(10);
  });

  it('Student 8: Student with voided event (voided XP strictly excluded from total)', async () => {
    const studentId = await createTestStudent('Scenario Student 8 - Voided Action');
    const { data: ev1 } = await adminClient.rpc('award_xp', {
      p_student_id: studentId,
      p_action_type: 'ATTENDANCE',
      p_reference_id: `att_${studentId}`,
      p_extra_units: 0,
    });
    const { data: ev2 } = await adminClient.rpc('award_xp', {
      p_student_id: studentId,
      p_action_type: 'HACKATHON_PARTICIPATION',
      p_reference_id: `hack_${studentId}`,
      p_extra_units: 0,
    });

    // Void the hackathon award
    const ev2Id = (ev2 as any).event_id;
    await adminClient.rpc('void_xp', {
      p_event_id: ev2Id,
      p_reason: 'Mistaken award by faculty',
    });

    const total = await verifyLedgerMatchesTotal(studentId);
    expect(total).toBe(10); // Only attendance (10) remains valid
    expect(levelFromXp(total).level).toBe(1);
  });

  it('Student 9: High performer crossing Level 3 (270 XP -> Level 3)', async () => {
    const studentId = await createTestStudent('Scenario Student 9 - High Achiever');
    // Level 3 threshold is 250 XP
    // 6 hackathons * 40 = 240 XP
    for (let i = 1; i <= 6; i++) {
      await adminClient.rpc('award_xp', {
        p_student_id: studentId,
        p_action_type: 'HACKATHON_PARTICIPATION',
        p_reference_id: `hack_${studentId}_${i}`,
        p_extra_units: 0,
      });
    }
    // 2 peer helps = 30 XP -> Total = 270 XP
    for (let i = 1; i <= 2; i++) {
      await adminClient.rpc('award_xp', {
        p_student_id: studentId,
        p_action_type: 'PEER_HELP',
        p_reference_id: `peer_${studentId}_${i}`,
        p_extra_units: 0,
      });
    }

    const total = await verifyLedgerMatchesTotal(studentId);
    expect(total).toBe(270);
    const lvl = levelFromXp(total);
    expect(lvl.level).toBe(3);
    expect(lvl.xpIntoLevel).toBe(20);
  });

  it('Student 10: Complex mixed history with duplicates, voids, and extra units', async () => {
    const studentId = await createTestStudent('Scenario Student 10 - Complex History');

    // 1. Attendance: +10
    await adminClient.rpc('award_xp', {
      p_student_id: studentId,
      p_action_type: 'ATTENDANCE',
      p_reference_id: `att_${studentId}`,
      p_extra_units: 0,
    });

    // 2. Duplicate attendance attempt: should be ignored (+0)
    await adminClient.rpc('award_xp', {
      p_student_id: studentId,
      p_action_type: 'ATTENDANCE',
      p_reference_id: `att_${studentId}`,
      p_extra_units: 0,
    });

    // 3. Quiz with 2 extra units: 15 + 10 = +25
    await adminClient.rpc('award_xp', {
      p_student_id: studentId,
      p_action_type: 'DAILY_QUIZ',
      p_reference_id: `quiz_${studentId}`,
      p_extra_units: 2,
    });

    // 4. Peer help: +20
    const { data: peerRes } = await adminClient.rpc('award_xp', {
      p_student_id: studentId,
      p_action_type: 'PEER_HELP',
      p_reference_id: `peer_${studentId}_1`,
      p_extra_units: 0,
    });

    // 5. Hackathon: +40
    await adminClient.rpc('award_xp', {
      p_student_id: studentId,
      p_action_type: 'HACKATHON_PARTICIPATION',
      p_reference_id: `hack_${studentId}`,
      p_extra_units: 0,
    });

    // 6. Void the peer help (-20)
    await adminClient.rpc('void_xp', {
      p_event_id: (peerRes as any).event_id,
      p_reason: 'Student reported wrong peer helper',
    });

    // Expected valid sum: 10 (att) + 25 (quiz) + 40 (hack) = 75 XP
    const total = await verifyLedgerMatchesTotal(studentId);
    expect(total).toBe(75);
    expect(levelFromXp(total).level).toBe(1);
  });
});
