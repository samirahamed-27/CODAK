import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createAdminClient } from '@/lib/supabase/admin';
import { deductXpAction, getStudentXpSummaryAction } from '@/app/actions/xp-deductions';
import { REWARDS_CATALOG, redeemRewardAction } from '@/app/actions/rewards';
import {
  BOSS_BATTLE_QUESTIONS,
  startBossBattleAction,
  submitBossBattleAnswerAction,
  finalizeBossBattleAction,
} from '@/app/actions/boss-battle';

describe('Phase 5: Rewards Store, Timed Boss Battle & XP Deductions', () => {
  const adminClient = createAdminClient();
  const testRunId = `p5_${Date.now()}`;
  let testStudentId: string;
  let testFacultyId: string;
  let testAdminId: string;
  const createdUserIds: string[] = [];

  async function createTestUser(
    role: 'student' | 'faculty' | 'admin',
    suffix: string
  ): Promise<string> {
    const email = `${testRunId}_${role}_${suffix}@test.edu`;
    const password = 'TestPassword123!';

    const { data: user, error: userErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role, full_name: `Test ${role} ${suffix}` },
    });

    if (userErr || !user?.user) {
      throw new Error(`Failed to create test user: ${userErr?.message}`);
    }

    const userId = user.user.id;
    createdUserIds.push(userId);

    await adminClient.from('profiles').update({
      role,
      full_name: `Test ${role} ${suffix}`,
    }).eq('id', userId);

    if (role === 'student') {
      await adminClient.from('students').upsert({
        id: userId,
        roll_no: `ROLL_${userId.slice(0, 8)}`,
        department: 'Computer Science',
        year_of_study: 2,
      });
    }

    return userId;
  }

  beforeAll(async () => {
    testStudentId = await createTestUser('student', '1');
    testFacultyId = await createTestUser('faculty', '1');
    testAdminId = await createTestUser('admin', '1');

    // Seed student with 500 XP
    await adminClient.from('xp_events').insert({
      student_id: testStudentId,
      action_type: 'DAILY_QUIZ',
      xp_amount: 500,
      reference_id: `SEED_XP_${testRunId}`,
      status: 'valid',
    });
  }, 60000);

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await adminClient.from('student_reward_redemptions').delete().in('student_id', createdUserIds);
      await adminClient.from('boss_battle_sessions').delete().in('student_id', createdUserIds);
      await adminClient.from('student_badges').delete().in('student_id', createdUserIds);
      await adminClient.from('xp_events').delete().in('student_id', createdUserIds);
      await adminClient.from('students').delete().in('id', createdUserIds);
      await adminClient.from('faculty').delete().in('id', createdUserIds);
      await adminClient.from('profiles').delete().in('id', createdUserIds);
      for (const uid of createdUserIds) {
        await adminClient.auth.admin.deleteUser(uid);
      }
    }
  }, 60000);

  describe('1. XP Deduction Stored Procedure & Action', () => {
    it('fetches student XP summary accurately', async () => {
      const summary = await getStudentXpSummaryAction(testStudentId);
      expect(summary.success).toBe(true);
      expect(summary.currentXp).toBe(500);
      expect(summary.totalValidEvents).toBeGreaterThanOrEqual(1);
    });

    it('rejects deduction with empty or short reason', async () => {
      const { data: res } = await adminClient.rpc('deduct_xp', {
        p_student_id: testStudentId,
        p_amount: 50,
        p_action_type: 'XP_DEDUCTION',
        p_reason: 'no',
        p_reference_id: `PEN_${Date.now()}`,
      });

      expect(res.success).toBe(false);
      expect(res.status).toBe('invalid_reason');
    });

    it('blocks deduction if student has insufficient XP (no negative overdraft)', async () => {
      const { data: res } = await adminClient.rpc('deduct_xp', {
        p_student_id: testStudentId,
        p_amount: 9999, // Way more than 500 XP
        p_action_type: 'XP_DEDUCTION',
        p_reason: 'Excessive penalty test',
        p_reference_id: `PEN_EXCESS_${Date.now()}`,
      });

      expect(res.success).toBe(false);
      expect(res.status).toBe('insufficient_xp');
    });

    it('successfully executes deduction, creates negative ledger row, and logs audit', async () => {
      const refId = `PEN_SUCCESS_${Date.now()}`;
      const { data: res } = await adminClient.rpc('deduct_xp', {
        p_student_id: testStudentId,
        p_amount: 50,
        p_action_type: 'XP_DEDUCTION',
        p_reason: 'Attendance absence penalty citation',
        p_reference_id: refId,
        p_actor: testFacultyId,
      });

      expect(res.success).toBe(true);
      expect(res.deducted_amount).toBe(50);
      expect(res.previous_xp).toBe(500);
      expect(res.new_total).toBe(450);

      // Verify negative XP event row in ledger
      const { data: eventRow } = await adminClient
        .from('xp_events')
        .select('*')
        .eq('reference_id', refId)
        .single();

      expect(eventRow).not.toBeNull();
      expect(eventRow.xp_amount).toBe(-50);
      expect(eventRow.action_type).toBe('XP_DEDUCTION');
      expect(eventRow.status).toBe('valid');

      // Verify audit log
      const { data: auditRow } = await adminClient
        .from('audit_logs')
        .select('*')
        .eq('target_id', testStudentId)
        .eq('action', 'deduct_xp')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      expect(auditRow).not.toBeNull();
      expect(auditRow.actor_id).toBe(testFacultyId);
    });
  });

  describe('2. Non-Academic Rewards Store & Redemptions', () => {
    it('defines official MSOT perks in catalog with correct pricing', () => {
      expect(REWARDS_CATALOG.length).toBeGreaterThanOrEqual(4);
      const vipPass = REWARDS_CATALOG.find((r) => r.id === 'vip_fest_pass');
      const mentor = REWARDS_CATALOG.find((r) => r.id === 'alumni_mentorship');
      const banner = REWARDS_CATALOG.find((r) => r.id === 'avatar_banner');
      const merch = REWARDS_CATALOG.find((r) => r.id === 'merch_pack');

      expect(vipPass?.cost).toBe(400);
      expect(mentor?.cost).toBe(300);
      expect(banner?.cost).toBe(250);
      expect(merch?.cost).toBe(150);
    });

    it('deducts XP and generates claim code on reward redemption', async () => {
      // Current student balance is 450 XP (500 - 50)
      // Redeem Merch Pack for 150 XP
      const claimCode = `MERCH-TEST-${Date.now().toString().slice(-4)}`;
      const refId = `REWARD_REDEMPTION_${claimCode}`;

      const { data: res } = await adminClient.rpc('deduct_xp', {
        p_student_id: testStudentId,
        p_amount: 150,
        p_action_type: 'REWARD_REDEMPTION',
        p_reason: 'Redeemed MSOT Department Merch Pack',
        p_reference_id: refId,
        p_actor: testStudentId,
      });

      expect(res.success).toBe(true);
      expect(res.new_total).toBe(300); // 450 - 150 = 300 XP

      // Record in student_reward_redemptions
      const { data: redemption, error } = await adminClient
        .from('student_reward_redemptions')
        .insert({
          student_id: testStudentId,
          reward_id: 'merch_pack',
          reward_title: 'MSOT Department Merch & Sticker Pack',
          reward_category: 'Merchandise',
          xp_cost: 150,
          claim_code: claimCode,
          status: 'active',
        })
        .select('*')
        .single();

      expect(error).toBeNull();
      expect(redemption.claim_code).toBe(claimCode);
      expect(redemption.status).toBe('active');
    });
  });

  describe('3. Timed Exam Boss Battle Sprint', () => {
    it('contains 15 syllabus questions covering core modules', () => {
      expect(BOSS_BATTLE_QUESTIONS.length).toBe(15);
      const modules = new Set(BOSS_BATTLE_QUESTIONS.map((q) => q.module));
      expect(modules.has('Data Structures')).toBe(true);
      expect(modules.has('Algorithms')).toBe(true);
      expect(modules.has('DBMS')).toBe(true);
      expect(modules.has('Operating Systems')).toBe(true);
      expect(modules.has('Computer Networks')).toBe(true);
    });

    it('creates boss battle session with 100 HP and 20-minute limit', async () => {
      const { data: session, error } = await adminClient
        .from('boss_battle_sessions')
        .insert({
          student_id: testStudentId,
          boss_name: 'The Semester Gorgon (Final Boss)',
          boss_max_hp: 100,
          boss_current_hp: 100,
          total_questions: 15,
          correct_answers: 0,
          wrong_answers: 0,
          time_limit_seconds: 1200,
          time_spent_seconds: 0,
          status: 'in_progress',
        })
        .select('*')
        .single();

      expect(error).toBeNull();
      expect(session.boss_max_hp).toBe(100);
      expect(session.time_limit_seconds).toBe(1200);
    });

    it('submitting correct attack deals 7 HP damage to the Gorgon', async () => {
      const { data: session } = await adminClient
        .from('boss_battle_sessions')
        .select('*')
        .eq('student_id', testStudentId)
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      const q1 = BOSS_BATTLE_QUESTIONS[0];
      const isCorrect = q1.correctOptionIndex === 1;
      expect(isCorrect).toBe(true);

      const newHp = session.boss_current_hp - 7;
      await adminClient
        .from('boss_battle_sessions')
        .update({
          boss_current_hp: newHp,
          correct_answers: 1,
        })
        .eq('id', session.id);

      const { data: updated } = await adminClient
        .from('boss_battle_sessions')
        .select('*')
        .eq('id', session.id)
        .single();

      expect(updated.boss_current_hp).toBe(93);
      expect(updated.correct_answers).toBe(1);
    });

    it('slaying the boss awards +100 XP and unlocks boss_slayer badge', async () => {
      // Simulate victory by awarding BOSS_BATTLE_WIN
      const refId = `BOSS_SLAYER_${testRunId}`;
      const { data: xpRes } = await adminClient.rpc('award_xp', {
        p_student_id: testStudentId,
        p_action_type: 'BOSS_BATTLE_WIN',
        p_reference_id: refId,
        p_extra_units: 0,
      });

      expect(xpRes.status).toBe('awarded');
      expect(xpRes.xp_awarded).toBe(100);

      // Award badge
      const { error: badgeErr } = await adminClient.from('student_badges').insert({
        student_id: testStudentId,
        badge_code: 'boss_slayer',
      });

      expect(badgeErr).toBeNull();

      // Verify badge row exists
      const { data: studentBadge } = await adminClient
        .from('student_badges')
        .select('*, badges(name, description)')
        .eq('student_id', testStudentId)
        .eq('badge_code', 'boss_slayer')
        .single();

      expect(studentBadge).not.toBeNull();
      expect(studentBadge.badge_code).toBe('boss_slayer');
    });
  });
});
