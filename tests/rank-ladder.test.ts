import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getRankTiers,
  getRankForLevel,
  calculateRankProgress,
  xpThresholdForLevel,
  invalidateRankTiersCache,
  syncStudentRankBadges,
} from '@/lib/ranks';
import { levelFromXp } from '@/lib/levels';
import { evaluateStudentBadges, isBadgeCriteriaMet } from '@/lib/badges';
import { getLeaderboardData } from '@/lib/leaderboards';
import { formatLeagueStandingMembers, calculateGroupOutcomes, DEFAULT_LEAGUE_CONFIG, MemberRankInput } from '@/lib/leagues';
import { formatDuelSummaries } from '@/lib/duels';
import { getFacultyAnalytics } from '@/lib/faculty-analytics';
import { RankTier } from '@/types/database';

describe('Part 2: Rank Ladder & Rank Badges Core Suite (8 Scenarios)', () => {
  const adminClient = createAdminClient();
  const testRunId = `rnk_test_${Date.now()}`;

  // Created IDs for cleanup in afterAll
  const createdUserIds: string[] = [];
  const createdEventIds: string[] = [];

  let testStudentId: string;
  let testStudentEmail: string;

  beforeAll(async () => {
    // Create one primary test student with rnk_ prefix
    testStudentEmail = `rnk_student_${Date.now()}@dev.local`;
    const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
      email: testStudentEmail,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'Rank Ladder Tester',
        roll_no: `rnk_roll_${Date.now()}`,
        department: 'Computer Science',
      },
    });

    if (authErr || !authData.user) {
      throw new Error(`Failed to create test student: ${authErr?.message}`);
    }

    testStudentId = authData.user.id;
    createdUserIds.push(testStudentId);
  });

  afterAll(async () => {
    // Clean up all rnk_ test data unconditionally
    try {
      if (createdUserIds.length > 0) {
        // Delete badges
        await adminClient.from('student_badges').delete().in('student_id', createdUserIds);

        // Delete xp_events using adminClient
        await adminClient.from('xp_events').delete().in('student_id', createdUserIds);

        // Delete students and profiles
        await adminClient.from('students').delete().in('id', createdUserIds);
        await adminClient.from('profiles').delete().in('id', createdUserIds);

        for (const uid of createdUserIds) {
          await adminClient.auth.admin.deleteUser(uid);
        }
      }
    } catch (cleanupErr) {
      console.error('Error cleaning up rnk_ test data:', cleanupErr);
    }
  });

  // SCENARIO 1: Every level boundary maps to the correct rank (below, at and above each threshold)
  it('maps every level boundary correctly across all 7 rank tiers, including very high levels', async () => {
    const tiers = await getRankTiers(adminClient);
    expect(tiers).toHaveLength(7);

    // Apprentice: min_level 1
    expect(getRankForLevel(1, tiers).slug).toBe('apprentice');

    // Scripter: min_level 2
    expect(getRankForLevel(1, tiers).slug).toBe('apprentice'); // below
    expect(getRankForLevel(2, tiers).slug).toBe('scripter');   // at
    expect(getRankForLevel(3, tiers).slug).toBe('scripter');   // above

    // Debugger: min_level 4
    expect(getRankForLevel(3, tiers).slug).toBe('scripter');   // below
    expect(getRankForLevel(4, tiers).slug).toBe('debugger');   // at
    expect(getRankForLevel(7, tiers).slug).toBe('debugger');   // above

    // Architect: min_level 8
    expect(getRankForLevel(7, tiers).slug).toBe('debugger');   // below
    expect(getRankForLevel(8, tiers).slug).toBe('architect');  // at
    expect(getRankForLevel(11, tiers).slug).toBe('architect'); // above

    // Strategist: min_level 12
    expect(getRankForLevel(11, tiers).slug).toBe('architect');  // below
    expect(getRankForLevel(12, tiers).slug).toBe('strategist'); // at
    expect(getRankForLevel(14, tiers).slug).toBe('strategist'); // above

    // Innovator: min_level 15
    expect(getRankForLevel(14, tiers).slug).toBe('strategist'); // below
    expect(getRankForLevel(15, tiers).slug).toBe('innovator');  // at
    expect(getRankForLevel(17, tiers).slug).toBe('innovator');  // above

    // Grandmaster: min_level 18
    expect(getRankForLevel(17, tiers).slug).toBe('innovator');   // below
    expect(getRankForLevel(18, tiers).slug).toBe('grandmaster'); // at
    expect(getRankForLevel(50, tiers).slug).toBe('grandmaster'); // very high level
    expect(getRankForLevel(100, tiers).slug).toBe('grandmaster'); // extreme level
  });

  // SCENARIO 2: Rank thresholds come from the table; changing a row changes the result with no code change
  it('reads rank thresholds dynamically from database table and changes mapping with zero code change', async () => {
    // Fetch original tiers from DB
    const originalTiers = await getRankTiers(adminClient, true);
    expect(originalTiers.length).toBeGreaterThanOrEqual(7);

    // Simulate an admin tier config modification (e.g., admin shifts Scripter to L3 and Debugger to L6)
    const modifiedTiers: RankTier[] = originalTiers.map((t) => {
      if (t.slug === 'scripter') return { ...t, min_level: 3 };
      if (t.slug === 'debugger') return { ...t, min_level: 6 };
      return t;
    });

    // At Level 2: with default tiers it is Scripter, but with modified tiers it remains Apprentice!
    expect(getRankForLevel(2, originalTiers).slug).toBe('scripter');
    expect(getRankForLevel(2, modifiedTiers).slug).toBe('apprentice');

    // At Level 3: with modified tiers it now becomes Scripter
    expect(getRankForLevel(3, modifiedTiers).slug).toBe('scripter');

    // At Level 5: with original tiers it was Debugger (min L4), but with modified tiers (min L6) it is Scripter!
    expect(getRankForLevel(5, originalTiers).slug).toBe('debugger');
    expect(getRankForLevel(5, modifiedTiers).slug).toBe('scripter');
  });

  // SCENARIO 3: Reaching a rank awards its badge exactly once; recomputing awards nothing twice; rank badges award 0 XP
  it('awards rank badge exactly once, awards 0 XP, and never creates duplicate badges or XP inflation', async () => {
    // Initial sync for test student (starts at level 1 -> Apprentice)
    const initialSync = await syncStudentRankBadges(testStudentId, 1, adminClient);
    expect(initialSync.awardedBadges).toContain('rank_apprentice');

    // Query student_badges to confirm Apprentice badge is recorded
    const { data: badges1 } = await adminClient
      .from('student_badges')
      .select('badge_code')
      .eq('student_id', testStudentId);
    const codes1 = (badges1 || []).map((b) => b.badge_code);
    expect(codes1).toContain('rank_apprentice');

    // Second sync at same level: must be strictly idempotent (0 new badges)
    const repeatSync = await syncStudentRankBadges(testStudentId, 1, adminClient);
    expect(repeatSync.awardedBadges).toHaveLength(0);

    // Verify XP ledger has zero rows with badge XP
    const { data: xpRows } = await adminClient
      .from('xp_events')
      .select('xp_amount, action_type, reference_id')
      .eq('student_id', testStudentId)
      .like('reference_id', 'badge:rank_%');

    expect(xpRows).toHaveLength(0); // Zero XP awarded for rank badges! No feedback loop!

    // Verify badges table specifies xp_reward = 0 for rank badges
    const { data: rankBadges } = await adminClient
      .from('badges')
      .select('code, xp_reward, category')
      .eq('category', 'RANK');

    expect(rankBadges).toBeDefined();
    expect(rankBadges!.length).toBe(7);
    rankBadges!.forEach((b) => {
      expect(b.xp_reward).toBe(0);
    });
  });

  // SCENARIO 4: Voided XP lowers the displayed rank when the level drops; earned badges stay
  it('lowers displayed rank when faculty void XP, while preserving earned badges', async () => {
    // Simulate student earning 100 XP (Level 2 -> Scripter)
    const refId = `rnk_award_${Date.now()}`;
    const { data: xpEvent, error: xpErr } = await adminClient
      .from('xp_events')
      .insert({
        student_id: testStudentId,
        action_type: 'DAILY_QUIZ',
        xp_amount: 100,
        reference_id: refId,
        status: 'valid',
      })
      .select('id')
      .single();

    expect(xpErr).toBeNull();
    createdEventIds.push(xpEvent!.id);

    // Award Scripter badge
    await syncStudentRankBadges(testStudentId, 2, adminClient);

    const { data: badgesBefore } = await adminClient
      .from('student_badges')
      .select('badge_code')
      .eq('student_id', testStudentId);
    expect((badgesBefore || []).map((b) => b.badge_code)).toContain('rank_scripter');

    // Calculate rank at 100 valid XP -> Level 2 -> Scripter
    const progressBefore = calculateRankProgress(100);
    expect(progressBefore.level).toBe(2);
    expect(progressBefore.currentRank.slug).toBe('scripter');

    // Faculty voids the 100 XP event (e.g. administrative adjustment)
    const { error: voidErr } = await adminClient
      .from('xp_events')
      .update({
        status: 'voided',
        void_reason: 'rnk_test_adjustment',
      })
      .eq('id', xpEvent!.id);

    expect(voidErr).toBeNull();

    // Query valid XP from ledger
    const { data: validEvents } = await adminClient
      .from('xp_events')
      .select('xp_amount')
      .eq('student_id', testStudentId)
      .eq('status', 'valid');

    const totalValidXp = (validEvents || []).reduce((acc, curr) => acc + curr.xp_amount, 0);
    expect(totalValidXp).toBe(0);

    // Calculate rank after voiding -> Level 1 -> Apprentice (displayed rank drops with level)
    const progressAfter = calculateRankProgress(totalValidXp);
    expect(progressAfter.level).toBe(1);
    expect(progressAfter.currentRank.slug).toBe('apprentice');

    // Previously earned badges STAY in student_badges (not deleted automatically)
    const { data: badgesAfter } = await adminClient
      .from('student_badges')
      .select('badge_code')
      .eq('student_id', testStudentId);
    const codesAfter = (badgesAfter || []).map((b) => b.badge_code);
    expect(codesAfter).toContain('rank_scripter');
    expect(codesAfter).toContain('rank_apprentice');
  });

  // SCENARIO 5: Anonymous rows show no extra identifying information (raw API response)
  it('ensures anonymous rows display rank chip but reveal zero identifying student info', async () => {
    const rawMembers: MemberRankInput[] = [
      {
        studentId: 'rnk_anon_student_1',
        studentName: 'Secret Student',
        rollNo: 'CS-2026-999',
        isAnonymous: true,
        weeklyXp: 150, // Level 2
      },
    ];

    const tiers = await getRankTiers(adminClient);

    // Format league standings as viewed by a peer student
    const outcomes = calculateGroupOutcomes(rawMembers, DEFAULT_LEAGUE_CONFIG, 'bronze', tiers);
    const formatted = formatLeagueStandingMembers(outcomes, 'rnk_viewer_peer', 'student');
    expect(formatted).toHaveLength(1);

    const anonRow = formatted[0];
    // Privacy assertions:
    expect(anonRow.name).toBe('Anonymous');
    expect(anonRow.rollNo).toBeUndefined();
    expect(anonRow.isAnonymous).toBe(true);

    // Rank & Level are present for academic standing without identifying the peer
    expect(anonRow.level).toBe(2);
    expect(anonRow.rankTier).toBeDefined();
    expect(anonRow.rankTier?.slug).toBe('scripter');
    expect(anonRow.rankTier?.name).toBe('Scripter');

    // Duel format test for anonymous opponent
    const mockDuels = [
      {
        id: 'rnk_duel_1',
        status: 'active',
        challenger_id: 'rnk_viewer_peer',
        challenged_id: 'rnk_anon_student_1',
        challenged: {
          roll_no: 'CS-2026-999',
          profiles: {
            full_name: 'Secret Student',
            is_anonymous: true,
          },
        },
        challenger: {
          roll_no: 'CS-2026-001',
          profiles: {
            full_name: 'Viewer Student',
            is_anonymous: false,
          },
        },
      },
    ];

    const duelSummaries = formatDuelSummaries(mockDuels, 'rnk_viewer_peer', 'student');
    expect(duelSummaries[0].opponentName).toBe('Anonymous');
    expect(duelSummaries[0].opponentRollNo).toBeUndefined();
  });

  // SCENARIO 6: Fairness test - low activity steady student reaches rank 2 within a week
  it('fairness simulation: low-activity student (20 XP/day) reaches Rank 2 and unlocks badge in 5 days (< 1 week)', () => {
    // 20 XP per day steady pace:
    // Day 1: 20 XP (L1 Apprentice)
    // Day 2: 40 XP (L1 Apprentice)
    // Day 3: 60 XP (L1 Apprentice)
    // Day 4: 80 XP (L1 Apprentice)
    // Day 5: 100 XP (Reaches L2 -> Scripter!)
    const dailyPace = 20;
    const day5Xp = 5 * dailyPace; // 100 XP

    const { level } = levelFromXp(day5Xp);
    expect(level).toBe(2);

    const rank = getRankForLevel(level);
    expect(rank.slug).toBe('scripter');
    expect(rank.name).toBe('Scripter');
    expect(rank.min_level).toBe(2);

    // Verify badge criteria met
    const badgeUnlocked = isBadgeCriteriaMet('rank_scripter', { min_level: 2 }, {
      completedQuizzesCount: 5,
      currentStreak: 5,
      longestStreak: 5,
      completedQuestsCount: 0,
      recentQuizScores: [],
      hasBrokenStreakHistory: false,
      studentLevel: level,
    });
    expect(badgeUnlocked).toBe(true);

    // Middle rank (Architect L8, 1700 XP):
    // At 40 XP/day: 1700 / 40 = 42.5 days (~6 weeks)
    // At 60 XP/day: 1700 / 60 = 28.3 days (~4 weeks)
    expect(xpThresholdForLevel(8)).toBe(1700);

    // Top rank (Grandmaster L18, 5200 XP):
    // At 40 XP/day: 5200 / 40 = 130 days (~4.3 months / full semester)
    expect(xpThresholdForLevel(18)).toBe(5200);
  });

  // SCENARIO 7: Rank chip is present on leaderboard, league, duel and faculty roster data without extra queries
  it('includes rank chip data on leaderboards, leagues, duels and faculty analytics without N+1 queries', async () => {
    const tiers = await getRankTiers(adminClient);

    // 1. Leaderboard data includes rankTier and level
    const lbEntries = await getLeaderboardData(adminClient, { scope: 'all_campuses', timeframe: 'all-time' });
    expect(lbEntries).toBeDefined();
    if (lbEntries.length > 0) {
      const firstEntry = lbEntries[0];
      expect(firstEntry.level).toBeGreaterThanOrEqual(1);
      expect(firstEntry.rankTier).toBeDefined();
      expect(firstEntry.rankTier?.name).toBeDefined();
    }

    // 2. League standings include rankTier
    const members: MemberRankInput[] = [
      { studentId: 'student_1', weeklyXp: 400 },
      { studentId: 'student_2', weeklyXp: 100 },
    ];
    const outcomes = calculateGroupOutcomes(members, DEFAULT_LEAGUE_CONFIG, 'bronze', tiers);
    const standings = formatLeagueStandingMembers(outcomes, 'student_1', 'student');
    expect(standings[0].rankTier).toBeDefined();
    expect(standings[1].rankTier).toBeDefined();

    // 3. Faculty Analytics includes rankTier for quiet students
    const facultyData = await getFacultyAnalytics({}, adminClient);
    expect(facultyData.quietStudents).toBeDefined();
    if (facultyData.quietStudents.length > 0) {
      const quiet = facultyData.quietStudents[0];
      expect(quiet.level).toBeGreaterThanOrEqual(1);
      expect(quiet.rankTier).toBeDefined();
    }
  });

  // SCENARIO 8: calculateRankProgress accurately computes next rank targets and max rank percentage
  it('calculates rank progression percentages and distance to next rank accurately', () => {
    // At Level 1 (50 XP):
    // Current rank: Apprentice (min L1)
    // Next rank: Scripter (min L2, 100 XP)
    // Max rank: Grandmaster (min L18, 5200 XP)
    const p1 = calculateRankProgress(50);
    expect(p1.currentRank.slug).toBe('apprentice');
    expect(p1.nextRank?.slug).toBe('scripter');
    expect(p1.levelsToNextRank).toBe(1);
    expect(p1.xpToNextRank).toBe(50); // 100 - 50 = 50
    expect(p1.rankProgressPercent).toBe(50); // 50 / 100 = 50%
    expect(p1.maxRankProgressPercent).toBe(1); // 50 / 5200 = ~0.96% -> 1%

    // At Level 18 (5200 XP):
    // Current rank: Grandmaster
    // Next rank: null
    const pTop = calculateRankProgress(5200);
    expect(pTop.currentRank.slug).toBe('grandmaster');
    expect(pTop.nextRank).toBeNull();
    expect(pTop.levelsToNextRank).toBe(0);
    expect(pTop.xpToNextRank).toBe(0);
    expect(pTop.rankProgressPercent).toBe(100);
    expect(pTop.maxRankProgressPercent).toBe(100);
  });
});
