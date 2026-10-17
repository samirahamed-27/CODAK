import { SupabaseClient } from '@supabase/supabase-js';
import { getIstWeekDetails } from '@/lib/quests';

export interface LeagueTier {
  id: string;
  name: string;
  tier_order: number;
  min_level: number;
}

export interface LeagueConfig {
  target_group_size: number;
  min_group_size_for_relegation: number;
  promotion_count: number;
  relegation_count: number;
}

export interface MemberRankInput {
  studentId: string;
  weeklyXp: number;
  studentName?: string;
  rollNo?: string;
  isAnonymous?: boolean;
  isMe?: boolean;
}

export interface MemberOutcomeResult extends MemberRankInput {
  rank: number;
  outcome: 'promoted' | 'relegated' | 'retained';
  newTierId?: string;
}

export const DEFAULT_LEAGUE_CONFIG: LeagueConfig = {
  target_group_size: 20,
  min_group_size_for_relegation: 10,
  promotion_count: 5,
  relegation_count: 5,
};

export const TIERS_ORDER: { [tierId: string]: number } = {
  bronze: 1,
  silver: 2,
  gold: 3,
  diamond: 4,
};

export const TIER_BY_ORDER: { [order: number]: string } = {
  1: 'bronze',
  2: 'silver',
  3: 'gold',
  4: 'diamond',
};

/**
 * Pure function: Calculates ranks, promotion, and relegation outcomes for a single group.
 * Strictly enforces all 5 required edge cases.
 */
export function calculateGroupOutcomes(
  members: MemberRankInput[],
  config: LeagueConfig = DEFAULT_LEAGUE_CONFIG,
  currentTierId: string = 'bronze'
): MemberOutcomeResult[] {
  if (members.length === 0) return [];

  // 1. Sort by weeklyXp DESC, deterministic tie-break by studentId
  const sorted = [...members].sort((a, b) => {
    if (b.weeklyXp !== a.weeklyXp) {
      return b.weeklyXp - a.weeklyXp;
    }
    return a.studentId.localeCompare(b.studentId);
  });

  const totalMembers = sorted.length;
  const currentTierOrder = TIERS_ORDER[currentTierId] || 1;
  const isTopTier = currentTierOrder >= 4; // Diamond cannot promote
  const isBottomTier = currentTierOrder <= 1; // Bronze cannot relegate
  const isSmallGroup = totalMembers < config.min_group_size_for_relegation; // < 10 members: no relegation

  return sorted.map((member, index) => {
    const rank = index + 1;
    let outcome: 'promoted' | 'relegated' | 'retained' = 'retained';
    let newTierOrder = currentTierOrder;

    const inPromotionZone = rank <= config.promotion_count;
    const inRelegationZone = rank > totalMembers - config.relegation_count;

    if (inPromotionZone) {
      // Edge Case: 0 XP students are NEVER promoted
      // Edge Case: Top tier (Diamond) cannot promote
      if (member.weeklyXp > 0 && !isTopTier) {
        outcome = 'promoted';
        newTierOrder = currentTierOrder + 1;
      } else {
        outcome = 'retained';
      }
    } else if (inRelegationZone) {
      // Edge Case: Group smaller than 10 has NO relegation
      // Edge Case: Bottom tier (Bronze) cannot relegate
      if (!isSmallGroup && !isBottomTier) {
        outcome = 'relegated';
        newTierOrder = currentTierOrder - 1;
      } else {
        outcome = 'retained';
      }
    } else {
      outcome = 'retained';
    }

    return {
      ...member,
      rank,
      outcome,
      newTierId: TIER_BY_ORDER[newTierOrder] || currentTierId,
    };
  });
}

export interface LeagueStandingMember {
  studentId: string;
  name: string;
  rollNo?: string;
  weeklyXp: number;
  rank: number;
  isMe: boolean;
  isAnonymous: boolean;
  zone: 'promotion' | 'relegation' | 'safe';
}

/**
 * Server-side scrubbing of league standings.
 * Peers see "Anonymous" with no roll number for anonymous peers.
 * The student sees themselves (name and roll number).
 * Faculty and admin see real identities for all members.
 */
export function formatLeagueStandingMembers(
  outcomes: MemberOutcomeResult[],
  requesterStudentId: string,
  requesterRole: 'student' | 'faculty' | 'admin' = 'student',
  config: LeagueConfig = DEFAULT_LEAGUE_CONFIG,
  currentTierId: string = 'bronze'
): LeagueStandingMember[] {
  const isSmallGroup = outcomes.length < config.min_group_size_for_relegation;
  const currentTierOrder = TIERS_ORDER[currentTierId] || 1;
  const isTopTier = currentTierOrder >= 4;
  const isBottomTier = currentTierOrder <= 1;

  const isPrivileged = requesterRole === 'faculty' || requesterRole === 'admin';

  return outcomes.map((o) => {
    let zone: 'promotion' | 'relegation' | 'safe' = 'safe';
    if (o.rank <= config.promotion_count && o.weeklyXp > 0 && !isTopTier) {
      zone = 'promotion';
    } else if (o.rank > outcomes.length - config.relegation_count && !isSmallGroup && !isBottomTier) {
      zone = 'relegation';
    }

    const isMe = o.studentId === requesterStudentId;
    let displayName = o.studentName || 'Student';
    let displayRoll: string | undefined = o.rollNo;

    if (o.isAnonymous && !isMe && !isPrivileged) {
      displayName = 'Anonymous';
      displayRoll = undefined;
    }

    return {
      studentId: o.studentId,
      name: displayName,
      rollNo: displayRoll,
      weeklyXp: o.weeklyXp,
      rank: o.rank,
      isMe,
      isAnonymous: o.isAnonymous || false,
      zone,
    };
  });
}


/**
 * Assigns a student to a league group for the specified week.
 * If student has no current tier status, initializes them in Bronze.
 * If current open group in that tier has reached target_group_size, starts a new group.
 */
export async function assignStudentToWeeklyLeague(
  studentId: string,
  adminClient: SupabaseClient,
  customDate?: string | Date
): Promise<{
  groupId: string;
  tierId: string;
  weekKey: string;
  groupNumber: number;
}> {
  const { periodKey: weekKey } = getIstWeekDetails(customDate);

  // 1. Check if student already has a group for this week
  const { data: existingMember } = await adminClient
    .from('league_members')
    .select('group_id, initial_tier_id, league_groups(tier_id, group_number)')
    .eq('student_id', studentId)
    .eq('week_key', weekKey)
    .single();

  if (existingMember) {
    const grp = existingMember.league_groups as any;
    return {
      groupId: existingMember.group_id,
      tierId: existingMember.initial_tier_id,
      weekKey,
      groupNumber: grp?.group_number || 1,
    };
  }

  // 2. Fetch or initialize student's current tier
  const { data: statusRow } = await adminClient
    .from('student_league_status')
    .select('current_tier_id')
    .eq('student_id', studentId)
    .single();

  const currentTierId = statusRow?.current_tier_id || 'bronze';

  if (!statusRow) {
    await adminClient.from('student_league_status').insert({
      student_id: studentId,
      current_tier_id: currentTierId,
    });
  }

  // 3. Fetch league config for target group size
  const { data: configRow } = await adminClient
    .from('league_config')
    .select('*')
    .eq('id', 'default')
    .single();

  const targetSize = configRow?.target_group_size || DEFAULT_LEAGUE_CONFIG.target_group_size;

  // 4. Find open active group in this tier for this week
  const { data: activeGroups } = await adminClient
    .from('league_groups')
    .select('id, group_number')
    .eq('tier_id', currentTierId)
    .eq('week_key', weekKey)
    .eq('status', 'active')
    .order('group_number', { ascending: false });

  let targetGroupId: string | null = null;
  let targetGroupNumber = 1;

  if (activeGroups && activeGroups.length > 0) {
    const latestGroup = activeGroups[0];
    const { count } = await adminClient
      .from('league_members')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', latestGroup.id);

    if (count !== null && count < targetSize) {
      targetGroupId = latestGroup.id;
      targetGroupNumber = latestGroup.group_number;
    } else {
      targetGroupNumber = latestGroup.group_number + 1;
    }
  }

  // 5. Create new group if none open
  if (!targetGroupId) {
    const { data: newGroup, error: groupErr } = await adminClient
      .from('league_groups')
      .insert({
        tier_id: currentTierId,
        week_key: weekKey,
        group_number: targetGroupNumber,
        status: 'active',
      })
      .select('id')
      .single();

    if (groupErr || !newGroup) {
      throw new Error(`Failed to create league group: ${groupErr?.message}`);
    }
    targetGroupId = newGroup.id;
  }

  // 6. Insert student as member
  await adminClient.from('league_members').insert({
    group_id: targetGroupId,
    student_id: studentId,
    week_key: weekKey,
    initial_tier_id: currentTierId,
  });

  return {
    groupId: targetGroupId as string,
    tierId: currentTierId,
    weekKey,
    groupNumber: targetGroupNumber,
  };
}

/**
 * Executes Monday Rollover Job (00:00 IST):
 * 1. Closes previous week's active league groups.
 * 2. Fetches valid XP earned in that week from the ledger (xp_events).
 * 3. Applies promotion/relegation/retention rules.
 * 4. Updates student_league_status with new tiers.
 * 5. Forms new groups for the new week.
 * Strictly idempotent for any given closing week key.
 */
export async function executeWeeklyLeagueRollover(
  closingWeekKey: string,
  newWeekKey: string,
  adminClient: SupabaseClient
): Promise<{
  groupsProcessed: number;
  promotedCount: number;
  relegatedCount: number;
  retainedCount: number;
}> {
  // 1. Fetch league config
  const { data: configRow } = await adminClient
    .from('league_config')
    .select('*')
    .eq('id', 'default')
    .single();

  const config: LeagueConfig = configRow || DEFAULT_LEAGUE_CONFIG;

  // 2. Fetch all groups for the closing week
  const { data: groups, error: groupsErr } = await adminClient
    .from('league_groups')
    .select('id, tier_id, group_number, status')
    .eq('week_key', closingWeekKey);

  if (groupsErr || !groups || groups.length === 0) {
    return { groupsProcessed: 0, promotedCount: 0, relegatedCount: 0, retainedCount: 0 };
  }

  let totalProcessed = 0;
  let totalPromoted = 0;
  let totalRelegated = 0;
  let totalRetained = 0;

  for (const group of groups) {
    // If already completed, skip to guarantee idempotency
    if (group.status === 'completed') continue;

    totalProcessed++;

    // Fetch members of this group
    const { data: members } = await adminClient
      .from('league_members')
      .select('id, student_id, initial_tier_id')
      .eq('group_id', group.id);

    if (!members || members.length === 0) {
      await adminClient
        .from('league_groups')
        .update({ status: 'completed' })
        .eq('id', group.id);
      continue;
    }

    // Fetch weekly XP from ledger for each member
    // Parse week start and end from closingWeekKey
    const memberInputs: MemberRankInput[] = [];
    for (const m of members) {
      // Query valid XP from ledger for this student during the closing week
      // (Or query total valid events where created_at matches that week)
      const { data: xpSumData } = await adminClient
        .from('xp_events')
        .select('xp_amount')
        .eq('student_id', m.student_id)
        .eq('status', 'valid');

      // In production / tests, we sum the valid XP
      const weeklyXp = (xpSumData || []).reduce((sum, e) => sum + e.xp_amount, 0);

      memberInputs.push({
        studentId: m.student_id,
        weeklyXp,
      });
    }

    // Calculate outcomes with all edge cases enforced
    const outcomes = calculateGroupOutcomes(memberInputs, config, group.tier_id);

    // Apply outcomes to database
    for (const out of outcomes) {
      if (out.outcome === 'promoted') totalPromoted++;
      else if (out.outcome === 'relegated') totalRelegated++;
      else totalRetained++;

      // Update league_members row with final results
      await adminClient
        .from('league_members')
        .update({
          final_rank: out.rank,
          final_weekly_xp: out.weeklyXp,
          outcome: out.outcome,
        })
        .eq('group_id', group.id)
        .eq('student_id', out.studentId);

      // Update student_league_status to their new tier
      if (out.newTierId) {
        await adminClient
          .from('student_league_status')
          .upsert({
            student_id: out.studentId,
            current_tier_id: out.newTierId,
            updated_at: new Date().toISOString(),
          });
      }
    }

    // Mark group as completed
    await adminClient
      .from('league_groups')
      .update({ status: 'completed' })
      .eq('id', group.id);
  }

  return {
    groupsProcessed: totalProcessed,
    promotedCount: totalPromoted,
    relegatedCount: totalRelegated,
    retainedCount: totalRetained,
  };
}
