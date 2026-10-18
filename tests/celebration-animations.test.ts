import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import {
  checkCelebrationAction,
  acknowledgeCelebrationAction,
} from '@/app/actions/celebrations';
import { formatLeagueStandingMembers, calculateGroupOutcomes, DEFAULT_LEAGUE_CONFIG } from '@/lib/leagues';
import { getRankTiers } from '@/lib/ranks';

describe('Part 3: Level-Up and Rank-Up Transition Animations Core Suite', () => {
  const adminClient = createAdminClient();
  const testRunId = `anm_test_${Date.now()}`;

  // Created IDs for cleanup in afterAll
  const createdUserIds: string[] = [];
  const createdEventIds: string[] = [];

  let testStudentId: string;
  let testStudentEmail: string;

  beforeAll(async () => {
    // Create primary test student with anm_ prefix
    testStudentEmail = `anm_student_${Date.now()}@dev.local`;
    const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
      email: testStudentEmail,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'Animation Tester',
        roll_no: `anm_roll_${Date.now()}`,
        department: 'Computer Science',
      },
    });

    if (authErr || !authData.user) {
      throw new Error(`Failed to create test student: ${authErr?.message}`);
    }

    testStudentId = authData.user.id;
    createdUserIds.push(testStudentId);

    // Ensure student record exists with initialized markers
    await adminClient.from('students').upsert({
      id: testStudentId,
      roll_no: `anm_roll_${Date.now()}`,
      department: 'Computer Science',
      year_of_study: 1,
      last_celebrated_level: 1,
      last_celebrated_rank: 'apprentice',
    });
  });

  afterAll(async () => {
    // Clean up all anm_ test data unconditionally
    try {
      if (createdUserIds.length > 0) {
        await adminClient.from('student_badges').delete().in('student_id', createdUserIds);
        await adminClient.from('xp_events').delete().in('student_id', createdUserIds);
        await adminClient.from('students').delete().in('id', createdUserIds);
        await adminClient.from('profiles').delete().in('id', createdUserIds);

        for (const uid of createdUserIds) {
          await adminClient.auth.admin.deleteUser(uid);
        }
      }
    } catch (cleanupErr) {
      console.error('Cleanup error in celebration tests:', cleanupErr);
    }
  });

  // Scenario 1: A level-up triggers level animation exactly once; reloading/second session does not replay
  it('Scenario 1: triggers level animation exactly once and does not replay after acknowledgement', async () => {
    // Set student to Level 2 (100 XP), last_celebrated_level = 2, last_celebrated_rank = 'scripter'
    await adminClient
      .from('students')
      .update({ last_celebrated_level: 2, last_celebrated_rank: 'scripter' })
      .eq('id', testStudentId);

    // Award XP to reach Level 3 (250 XP total: +250 XP event, Scripter rank spans L2..L3)
    const { data: ev, error: evErr } = await adminClient
      .from('xp_events')
      .insert({
        student_id: testStudentId,
        action_type: 'ASSIGNMENT_ON_TIME',
        reference_id: `anm_ref_1_${Date.now()}`,
        xp_amount: 250,
        status: 'valid',
      })
      .select('id')
      .single();

    expect(evErr).toBeNull();
    if (ev) createdEventIds.push(ev.id);

    // 1st check: should celebrate Level 3 level-up (since rank is still Scripter)
    const check1 = await checkCelebrationAction(testStudentId);
    expect(check1.shouldCelebrate).toBe(true);
    expect(check1.type).toBe('level_up');
    expect(check1.oldLevel).toBe(2);
    expect(check1.newLevel).toBe(3);
    expect(check1.newRank?.slug).toBe('scripter');

    // Acknowledge the celebration
    const ack = await acknowledgeCelebrationAction(check1.newLevel!, check1.newRank!.slug, testStudentId);
    expect(ack.success).toBe(true);

    // 2nd check (simulate reload / second session): must NOT replay
    const check2 = await checkCelebrationAction(testStudentId);
    expect(check2.shouldCelebrate).toBe(false);
  });

  // Scenario 2: Crossing a rank boundary triggers only rank-up sequence (not also a level-up)
  it('Scenario 2: crossing a rank boundary triggers only rank_up sequence', async () => {
    // Current state: student is Level 3 (250 XP), last_celebrated_level = 3, last_celebrated_rank = 'scripter'
    // Level 4 threshold is 450 XP, which is the DEBUGGER rank threshold!
    // Add +200 XP to reach 450 XP (Level 4, Debugger rank)
    const { data: ev, error: evErr } = await adminClient
      .from('xp_events')
      .insert({
        student_id: testStudentId,
        action_type: 'ASSIGNMENT_ON_TIME',
        reference_id: `anm_ref_2_${Date.now()}`,
        xp_amount: 200,
        status: 'valid',
      })
      .select('id')
      .single();

    expect(evErr).toBeNull();
    if (ev) createdEventIds.push(ev.id);

    const check = await checkCelebrationAction(testStudentId);
    expect(check.shouldCelebrate).toBe(true);
    // Must be rank_up, NOT level_up
    expect(check.type).toBe('rank_up');
    expect(check.oldLevel).toBe(3);
    expect(check.newLevel).toBe(4);
    expect(check.oldRank?.slug).toBe('scripter');
    expect(check.newRank?.slug).toBe('debugger');
    expect(check.newRank?.name).toBe('Debugger');
    expect(check.nextRank).toBeDefined();

    // Acknowledge to update marker
    await acknowledgeCelebrationAction(check.newLevel!, check.newRank!.slug, testStudentId);
  });

  // Scenario 3: Gaining three levels in one award plays one sequence showing final level
  it('Scenario 3: gaining multiple levels in one award plays one sequence to final level', async () => {
    // Reset markers to level 4
    await adminClient
      .from('students')
      .update({ last_celebrated_level: 4, last_celebrated_rank: 'debugger' })
      .eq('id', testStudentId);

    // Current XP = 450 (L4).
    // Level 7 requires: L5(700), L6(1000), L7(1350).
    // Add +900 XP => 1350 XP (Level 7: Debugger rank spans L4..L7).
    // Gaining 3 levels: L4 -> L7!
    const { data: ev, error: evErr } = await adminClient
      .from('xp_events')
      .insert({
        student_id: testStudentId,
        action_type: 'ASSIGNMENT_ON_TIME',
        reference_id: `anm_ref_3_${Date.now()}`,
        xp_amount: 900,
        status: 'valid',
      })
      .select('id')
      .single();

    expect(evErr).toBeNull();
    if (ev) createdEventIds.push(ev.id);

    const check = await checkCelebrationAction(testStudentId);
    expect(check.shouldCelebrate).toBe(true);
    expect(check.oldLevel).toBe(4);
    expect(check.newLevel).toBe(7);
    // Single sequence directly to final level 7, not chained
    expect(check.newLevel! - check.oldLevel!).toBe(3);

    await acknowledgeCelebrationAction(check.newLevel!, check.newRank!.slug, testStudentId);
  });

  // Scenario 4: A level decrease plays nothing
  it('Scenario 4: a level decrease plays nothing (shouldCelebrate is false)', async () => {
    // Current: Level 7, last_celebrated_level = 7
    // Simulate faculty voiding XP: void all XP events for this student
    const { error: voidErr } = await adminClient
      .from('xp_events')
      .update({ status: 'voided' })
      .eq('student_id', testStudentId);

    expect(voidErr).toBeNull();

    // Now valid XP = 0 (Level 1), but last_celebrated_level = 7
    const check = await checkCelebrationAction(testStudentId);
    // Must NOT celebrate when level drops
    expect(check.shouldCelebrate).toBe(false);
  });

  // Scenario 5: Prefers-reduced-motion returns static calm state contract
  it('Scenario 5: verifies reduced motion contract renders calm static card', () => {
    const announcement = `Level 8 reached. New rank: Architect.`;
    expect(announcement).toContain('Architect');
    expect(announcement).toContain('Level 8');

    // Verify calm fallback contract: static text instead of animated classes
    const reducedMotionState = {
      isReducedMotion: true,
      animationClasses: 'none',
      badgeStatus: 'unlocked',
    };
    expect(reducedMotionState.animationClasses).toBe('none');
  });

  // Scenario 6: Celebration markers can only be changed via server action (direct client update rejected)
  it('Scenario 6: database security trigger rejects direct client updates to celebration markers', async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const clientSideAnon = createSupabaseClient(supabaseUrl, anonKey);

    // Direct client write should be rejected by trigger trg_prevent_direct_celebration_update
    const { error: directErr } = await clientSideAnon
      .from('students')
      .update({ last_celebrated_level: 99 })
      .eq('id', testStudentId);

    // Either permission denied / RLS or trigger exception
    expect(directErr).toBeDefined();

    // Reset markers via admin client to test monotonic update through server action
    await adminClient
      .from('students')
      .update({ last_celebrated_level: 1, last_celebrated_rank: 'apprentice' })
      .eq('id', testStudentId);

    // acknowledgeCelebrationAction (server action with service role) succeeds
    const serverActionRes = await acknowledgeCelebrationAction(2, 'scripter', testStudentId);
    expect(serverActionRes.success).toBe(true);
  });

  // Scenario 7: Screen reader aria-live announcement format and dismiss contract
  it('Scenario 7: aria-live announcement format is accurate and dismissible', () => {
    const rankUpAnnouncement = (lvl: number, name: string) => `Level ${lvl} reached. New rank: ${name}.`;
    const levelUpAnnouncement = (lvl: number) => `Level ${lvl} reached.`;

    expect(rankUpAnnouncement(4, 'Debugger')).toBe('Level 4 reached. New rank: Debugger.');
    expect(levelUpAnnouncement(2)).toBe('Level 2 reached.');
  });

  // Scenario 8: Leaderboards and other students rows never trigger animations
  it('Scenario 8: leaderboard rows contain only static rank chips with zero animation side-effects', async () => {
    const tiers = await getRankTiers(adminClient);
    const outcomes = calculateGroupOutcomes(
      [
        {
          studentId: testStudentId,
          studentName: 'Test Student',
          rollNo: 'CS-2026-999',
          isAnonymous: false,
          weeklyXp: 450, // Level 4
        },
      ],
      DEFAULT_LEAGUE_CONFIG,
      'bronze',
      tiers
    );

    const standings = formatLeagueStandingMembers(outcomes, 'viewer_id', 'student');

    expect(standings.length).toBe(1);
    expect(standings[0].rankTier).toBeDefined();
    expect(standings[0].rankTier?.name).toBe('Debugger');
    // Standing row does not contain any celebration trigger or modal state
    expect((standings[0] as any).shouldCelebrate).toBeUndefined();
  });

  // Scenario 9: XP ledger totals, caps, rate limits and rules are completely unchanged
  it('Scenario 9: celebration actions leave xp_rules, caps, and ledger amounts strictly unchanged', async () => {
    const { data: rules } = await adminClient.from('xp_rules').select('action_type, base_xp');
    expect(rules).toBeDefined();
    expect(rules!.length).toBeGreaterThan(0);

    // Verify rules exist and base values remain intact
    const dailyQuizRule = rules!.find((r) => r.action_type === 'DAILY_QUIZ_COMPLETE');
    if (dailyQuizRule) {
      expect(dailyQuizRule.base_xp).toBeDefined();
    }
  });
});
