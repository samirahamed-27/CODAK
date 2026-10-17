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
        let val = match[2] || '';
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        process.env[match[1]] = val;
      }
    }
  }
}
loadEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const isDevProject = Boolean(
  supabaseUrl &&
    serviceRoleKey &&
    !supabaseUrl.includes('your-project-id') &&
    !supabaseUrl.includes('placeholder')
);

describe.runIf(isDevProject)('L8: Replay Test for Every XP-Paying Action', () => {
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  let studentId: string;
  const testRefPrefix = `audit_l8_${Date.now()}`;

  beforeAll(async () => {
    // Create isolated test student with audit_ prefix
    const testEmail = `audit_l8_${Date.now()}_${Math.floor(Math.random() * 10000)}@dev.local`;
    const { data, error } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'Audit Replay Student',
        roll_no: `AUDIT-L8-${Date.now()}`,
        department: 'Audit Department',
      },
    });

    if (error || !data.user) {
      throw new Error(`Failed to create audit student: ${error?.message}`);
    }
    studentId = data.user.id;
  });

  afterAll(async () => {
    if (studentId) {
      // Purge audit test student and all related events
      await adminClient.from('league_members').delete().eq('student_id', studentId);
      await adminClient.from('student_league_status').delete().eq('student_id', studentId);
      await adminClient.from('xp_events').delete().eq('student_id', studentId);
      await adminClient.from('students').delete().eq('id', studentId);
      await adminClient.from('profiles').delete().eq('id', studentId);
      await adminClient.auth.admin.deleteUser(studentId);
    }
  });

  async function testActionReplay(actionType: string, refKey: string, extraUnits = 0) {
    const referenceId = `${testRefPrefix}:${refKey}`;

    // Run 1: First award
    const { data: run1, error: err1 } = await adminClient.rpc('award_xp', {
      p_student_id: studentId,
      p_action_type: actionType,
      p_reference_id: referenceId,
      p_extra_units: extraUnits,
      p_actor: null,
    });

    expect(err1).toBeNull();
    expect(run1.status).toBe('awarded');
    expect(run1.xp_awarded).toBeGreaterThan(0);
    const initialAward = run1.xp_awarded;
    const initialTotal = run1.new_total;

    // Run 2: Replay identical award
    const { data: run2, error: err2 } = await adminClient.rpc('award_xp', {
      p_student_id: studentId,
      p_action_type: actionType,
      p_reference_id: referenceId,
      p_extra_units: extraUnits,
      p_actor: null,
    });

    expect(err2).toBeNull();
    expect(['duplicate', 'limit_reached']).toContain(run2.status);
    expect(run2.xp_awarded).toBe(0);
    expect(run2.new_total).toBe(initialTotal);

    return { initialAward, run2Status: run2.status };
  }

  it('1. Daily Quiz replay pays nothing', async () => {
    const res = await testActionReplay('DAILY_QUIZ', 'daily_quiz_attempt_1', 2);
    expect(['duplicate', 'limit_reached']).toContain(res.run2Status);
  });

  it('2. Streak Bonus replay pays nothing', async () => {
    const res = await testActionReplay('STREAK_7_BONUS', 'streak_bonus_7_w1');
    expect(res.run2Status).toBe('duplicate');
  });

  it('3. Quest Reward replay pays nothing', async () => {
    const res = await testActionReplay('QUEST_REWARD', 'quest_101_w1', 5);
    expect(res.run2Status).toBe('duplicate');
  });

  it('4. Badge Earned replay pays nothing', async () => {
    const res = await testActionReplay('BADGE_EARNED', 'badge_first_quiz');
    expect(res.run2Status).toBe('duplicate');
  });

  it('5. Duel Win replay pays nothing', async () => {
    const res = await testActionReplay('DUEL_WIN', 'duel_match_100_win');
    expect(res.run2Status).toBe('duplicate');
  });

  it('6. Duel Participation replay pays nothing', async () => {
    const res = await testActionReplay('DUEL_PARTICIPATION', 'duel_match_100_part');
    expect(res.run2Status).toBe('duplicate');
  });

  it('7. Concept Match replay pays nothing', async () => {
    const res = await testActionReplay('CONCEPT_MATCH', 'concept_match_round_55');
    expect(res.run2Status).toBe('duplicate');
  });

  it('8. League Rollover execution replay pays nothing and changes nothing', async () => {
    const { executeWeeklyLeagueRollover } = await import('@/lib/leagues');
    const weekKey = `2099-W${Math.floor(20 + Math.random() * 60)}`;
    const nextWeekKey = `2099-W99`;

    // Create an active test group
    const { data: group } = await adminClient
      .from('league_groups')
      .insert({
        tier_id: 'bronze',
        week_key: weekKey,
        group_number: 888,
        status: 'active',
      })
      .select('id')
      .single();

    expect(group?.id).toBeDefined();

    await adminClient.from('league_members').insert({
      group_id: group!.id,
      student_id: studentId,
      week_key: weekKey,
      initial_tier_id: 'bronze',
    });

    // Run 1: processes the group
    const run1 = await executeWeeklyLeagueRollover(weekKey, nextWeekKey, adminClient);
    expect(run1.groupsProcessed).toBe(1);

    // Run 2: idempotent replay for identical week
    const run2 = await executeWeeklyLeagueRollover(weekKey, nextWeekKey, adminClient);
    expect(run2.groupsProcessed).toBe(0);

    // Cleanup league group
    await adminClient.from('league_members').delete().eq('group_id', group!.id);
    await adminClient.from('league_groups').delete().eq('id', group!.id);
  });

  it('9. Battle Participation replay pays nothing', async () => {
    const res = await testActionReplay('BATTLE_PARTICIPATION', 'battle_42_part');
    expect(res.run2Status).toBe('duplicate');
  });

  it('10. Battle Win replay pays nothing', async () => {
    const res = await testActionReplay('BATTLE_WIN', 'battle_42_win');
    expect(res.run2Status).toBe('duplicate');
  });

  it('11. Manual Faculty Award replay pays nothing', async () => {
    const res = await testActionReplay('ATTENDANCE', 'manual_lecture_2026_10_18');
    expect(res.run2Status).toBe('duplicate');
  });
});
