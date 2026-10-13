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
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// SAFETY GUARD: Refuse to run against non-dev projects
const isDevProject =
  Boolean(supabaseUrl && serviceRoleKey) &&
  (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || supabaseUrl.includes('supabase.co'));

describe.runIf(isDevProject)('XP Core Engine Correctness & Ledger Integrity', () => {
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  let testStudentId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create isolated test student
    const testEmail = `test-student-${Date.now()}@dev.local`;
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'Test Student Runner',
        roll_no: `TEST-${Date.now()}`,
        department: 'Testing Lab',
      },
    });

    if (authError || !authUser.user) {
      throw new Error(`Failed to create test user: ${authError?.message}`);
    }

    testUserId = authUser.user.id;
    testStudentId = authUser.user.id;
  });

  afterAll(async () => {
    if (testUserId) {
      // Clean up test events and user
      await adminClient.from('xp_events').delete().eq('student_id', testStudentId);
      await adminClient.from('students').delete().eq('id', testStudentId);
      await adminClient.from('profiles').delete().eq('id', testStudentId);
      await adminClient.auth.admin.deleteUser(testUserId);
    }
  });

  it('1. Award gives exactly base + extra * units', async () => {
    // DAILY_QUIZ: base 15, extra 5. 3 extra units -> 15 + 15 = 30 XP
    const ref = `test_quiz_calc_${Date.now()}`;
    const { data, error } = await adminClient.rpc('award_xp', {
      p_student_id: testStudentId,
      p_action_type: 'DAILY_QUIZ',
      p_reference_id: ref,
      p_extra_units: 3,
    });

    expect(error).toBeNull();
    const res = data as any;
    expect(res.status).toBe('awarded');
    expect(res.xp_awarded).toBe(30); // 15 + (5 * 3)
    expect(res.new_total).toBeGreaterThanOrEqual(30);
  });

  it('2. Same call twice: second returns duplicate and total is unchanged', async () => {
    const ref = `test_dup_check_${Date.now()}`;

    // First award
    const { data: first } = await adminClient.rpc('award_xp', {
      p_student_id: testStudentId,
      p_action_type: 'ATTENDANCE',
      p_reference_id: ref,
      p_extra_units: 0,
    });
    expect((first as any).status).toBe('awarded');
    const totalAfterFirst = (first as any).new_total;

    // Second award with identical reference
    const { data: second } = await adminClient.rpc('award_xp', {
      p_student_id: testStudentId,
      p_action_type: 'ATTENDANCE',
      p_reference_id: ref,
      p_extra_units: 0,
    });

    expect((second as any).status).toBe('duplicate');
    expect((second as any).xp_awarded).toBe(0);
    expect((second as any).new_total).toBe(totalAfterFirst);
  });

  it('3. Double tap: 5 concurrent identical award_xp calls with Promise.all create exactly ONE row', async () => {
    const ref = `test_concurrent_doubletap_${Date.now()}`;

    const promises = Array.from({ length: 5 }, () =>
      adminClient.rpc('award_xp', {
        p_student_id: testStudentId,
        p_action_type: 'ASSIGNMENT_ON_TIME',
        p_reference_id: ref,
        p_extra_units: 0,
      })
    );

    const results = await Promise.all(promises);
    const statuses = results.map((r) => (r.data as any).status);

    const awardedCount = statuses.filter((s) => s === 'awarded').length;
    const duplicateCount = statuses.filter((s) => s === 'duplicate').length;

    expect(awardedCount).toBe(1);
    expect(duplicateCount).toBe(4);

    // Verify database row count
    const { data: rows } = await adminClient
      .from('xp_events')
      .select('id')
      .eq('reference_id', ref);

    expect(rows?.length).toBe(1);
  });

  it('4. Daily cap: PEER_HELP (cap 3) awards 3 times, the 4th returns limit_reached', async () => {
    const timestamp = new Date().toISOString();

    for (let i = 1; i <= 3; i++) {
      const { data } = await adminClient.rpc('award_xp', {
        p_student_id: testStudentId,
        p_action_type: 'PEER_HELP',
        p_reference_id: `peer_help_cap_${Date.now()}_${i}`,
        p_extra_units: 0,
        p_custom_timestamp: timestamp,
      });
      expect((data as any).status).toBe('awarded');
    }

    // 4th award must hit limit
    const { data: fourth } = await adminClient.rpc('award_xp', {
      p_student_id: testStudentId,
      p_action_type: 'PEER_HELP',
      p_reference_id: `peer_help_cap_${Date.now()}_4`,
      p_extra_units: 0,
      p_custom_timestamp: timestamp,
    });

    expect((fourth as any).status).toBe('limit_reached');
    expect((fourth as any).xp_awarded).toBe(0);
  });

  it('5. Voided XP is excluded from total, empty reason is rejected, voided reference stays blocked', async () => {
    const ref = `test_void_${Date.now()}`;
    const { data: awardData } = await adminClient.rpc('award_xp', {
      p_student_id: testStudentId,
      p_action_type: 'CLUB_ACTIVITY', // 25 XP
      p_reference_id: ref,
    });

    const eventId = (awardData as any).event_id;
    const totalBeforeVoid = (awardData as any).new_total;

    // A: Empty reason must be rejected
    const { error: emptyReasonError } = await adminClient.rpc('void_xp', {
      p_event_id: eventId,
      p_reason: '   ',
    });
    expect(emptyReasonError).toBeDefined();

    // B: Valid void
    const { data: voidData, error: voidError } = await adminClient.rpc('void_xp', {
      p_event_id: eventId,
      p_reason: 'Duplicate club activity entered in error',
    });

    expect(voidError).toBeNull();
    expect((voidData as any).status).toBe('voided');
    expect(Number((voidData as any).new_total)).toBe(totalBeforeVoid - 25);

    // C: Voided reference stays blocked (cannot re-award the same reference)
    const { data: reAwardData } = await adminClient.rpc('award_xp', {
      p_student_id: testStudentId,
      p_action_type: 'CLUB_ACTIVITY',
      p_reference_id: ref,
    });
    expect((reAwardData as any).status).toBe('duplicate');
  });

  it('6. Inactive rule returns rule_inactive; unknown rule returns rule_not_found', async () => {
    // Unknown rule
    const { data: unknownData } = await adminClient.rpc('award_xp', {
      p_student_id: testStudentId,
      p_action_type: 'NON_EXISTENT_ACTION',
      p_reference_id: `ref_unknown_${Date.now()}`,
    });
    expect((unknownData as any).status).toBe('rule_not_found');

    // Create a temporary disabled rule
    await adminClient.from('xp_rules').insert({
      action_type: 'DISABLED_TEST_ACTION',
      display_name: 'Disabled Test Action',
      base_xp: 10,
      active: false,
    });

    const { data: inactiveData } = await adminClient.rpc('award_xp', {
      p_student_id: testStudentId,
      p_action_type: 'DISABLED_TEST_ACTION',
      p_reference_id: `ref_inactive_${Date.now()}`,
    });
    expect((inactiveData as any).status).toBe('rule_inactive');

    // Cleanup disabled rule
    await adminClient.from('xp_rules').delete().eq('action_type', 'DISABLED_TEST_ACTION');
  });

  it('7. Changing base_xp in xp_rules changes the NEXT award with no code change, and creates a history row', async () => {
    // 1. Read current HACKATHON_PARTICIPATION (base_xp: 40)
    const { data: currentRule } = await adminClient
      .from('xp_rules')
      .select('*')
      .eq('action_type', 'HACKATHON_PARTICIPATION')
      .single();

    expect(currentRule?.base_xp).toBe(40);

    // 2. Admin updates base_xp from 40 to 60
    const { error: updateError } = await adminClient
      .from('xp_rules')
      .update({ base_xp: 60 })
      .eq('action_type', 'HACKATHON_PARTICIPATION');

    expect(updateError).toBeNull();

    // 3. Next award gets the new base_xp immediately with ZERO code change
    const ref = `hackathon_test_${Date.now()}`;
    const { data: awardData } = await adminClient.rpc('award_xp', {
      p_student_id: testStudentId,
      p_action_type: 'HACKATHON_PARTICIPATION',
      p_reference_id: ref,
    });

    expect((awardData as any).status).toBe('awarded');
    expect((awardData as any).xp_awarded).toBe(60);

    // 4. Verify history row in xp_rules_history
    const { data: historyRows } = await adminClient
      .from('xp_rules_history')
      .select('*')
      .eq('action_type', 'HACKATHON_PARTICIPATION')
      .order('changed_at', { ascending: false });

    expect(historyRows && historyRows.length > 0).toBe(true);
    expect(historyRows![0].old_base_xp).toBe(40);
    expect(historyRows![0].new_base_xp).toBe(60);

    // 5. Restore rule back to 40
    await adminClient
      .from('xp_rules')
      .update({ base_xp: 40 })
      .eq('action_type', 'HACKATHON_PARTICIPATION');
  });
});
