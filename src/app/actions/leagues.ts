'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import {
  assignStudentToWeeklyLeague,
  calculateGroupOutcomes,
  DEFAULT_LEAGUE_CONFIG,
  LeagueConfig,
  TIERS_ORDER,
  formatLeagueStandingMembers,
  LeagueStandingMember,
} from '@/lib/leagues';
import { getIstWeekDetails } from '@/lib/quests';

export type { LeagueStandingMember };

export interface StudentLeagueData {
  tierId: string;
  tierName: string;
  groupNumber: number;
  weekKey: string;
  daysRemaining: number;
  hoursRemaining: number;
  myRank: number;
  myWeeklyXp: number;
  totalMembers: number;
  standings: LeagueStandingMember[];
  config: LeagueConfig;
}

export async function getStudentLeagueAction(customDate?: string): Promise<{
  success: boolean;
  data?: StudentLeagueData;
  error?: string;
}> {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  let studentId = user?.id;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    return { success: false, error: 'Server configuration error' };
  }

  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);

  // Fallback to demo student if not logged in and demo mode is active
  if (!studentId && process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    const { data: demoStudent } = await adminClient
      .from('students')
      .select('id')
      .limit(1)
      .single();
    studentId = demoStudent?.id;
  }

  if (!studentId) {
    return { success: false, error: 'Student not found' };
  }

  const { weekStart, weekEnd, periodKey: weekKey } = getIstWeekDetails(customDate);

  // 1. Assign student to weekly league group if not yet assigned
  const assignment = await assignStudentToWeeklyLeague(studentId, adminClient, customDate);

  // 2. Fetch all members in this group
  const { data: groupMembers, error: membersErr } = await adminClient
    .from('league_members')
    .select('student_id, initial_tier_id, students(roll_no, profiles(full_name, is_anonymous))')
    .eq('group_id', assignment.groupId);

  if (membersErr || !groupMembers) {
    return { success: false, error: 'Failed to fetch league members' };
  }

  // 3. Fetch league config
  const { data: configRow } = await adminClient
    .from('league_config')
    .select('*')
    .eq('id', 'default')
    .single();

  const config: LeagueConfig = configRow || DEFAULT_LEAGUE_CONFIG;

  // 4. Calculate weekly XP from ledger for each member
  const memberInputs = await Promise.all(
    groupMembers.map(async (m) => {
      const sId = m.student_id;
      const { data: events } = await adminClient
        .from('xp_events')
        .select('xp_amount, created_at')
        .eq('student_id', sId)
        .eq('status', 'valid');

      // Filter events created during this week in IST
      const weeklyEvents = (events || []).filter((e) => {
        const d = getIstWeekDetails(e.created_at).periodKey;
        return d === weekKey;
      });

      const weeklyXp = weeklyEvents.reduce((sum, e) => sum + e.xp_amount, 0);

      const studentProfile = (m.students as any)?.profiles;
      const isAnon = studentProfile?.is_anonymous || false;
      const isMe = sId === studentId;

      // Server-enforced anonymization: peer students never see name or roll no if is_anonymous
      let displayName = studentProfile?.full_name || 'Student';
      let displayRoll = (m.students as any)?.roll_no || '';

      if (isAnon && !isMe) {
        displayName = 'Anonymous';
        displayRoll = '';
      }

      return {
        studentId: sId,
        weeklyXp,
        studentName: displayName,
        rollNo: isMe ? displayRoll : undefined,
        isAnonymous: isAnon,
        isMe,
      };
    })
  );

  // 5. Compute ranked outcomes
  const outcomes = calculateGroupOutcomes(memberInputs, config, assignment.tierId);

  // 6. Format standings with server-side anonymization
  let requesterRole: 'student' | 'faculty' | 'admin' = 'student';
  if (user) {
    const { data: prof } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (prof?.role) {
      requesterRole = prof.role as 'student' | 'faculty' | 'admin';
    }
  }

  const standings: LeagueStandingMember[] = formatLeagueStandingMembers(
    outcomes,
    studentId,
    requesterRole,
    config,
    assignment.tierId
  );

  const meStanding = standings.find((s) => s.isMe) || { rank: 1, weeklyXp: 0 };

  // Calculate days & hours until Sunday 23:59:59 IST (next Monday 00:00 IST)
  const now = customDate ? new Date(customDate) : new Date();
  const nextMonday = new Date(`${weekEnd}T23:59:59.999+05:30`);
  const diffMs = Math.max(0, nextMonday.getTime() - now.getTime());
  const daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  const tierNames: { [k: string]: string } = {
    bronze: 'Bronze League',
    silver: 'Silver League',
    gold: 'Gold League',
    diamond: 'Diamond League',
  };

  return {
    success: true,
    data: {
      tierId: assignment.tierId,
      tierName: tierNames[assignment.tierId] || 'Bronze League',
      groupNumber: assignment.groupNumber,
      weekKey,
      daysRemaining,
      hoursRemaining,
      myRank: meStanding.rank,
      myWeeklyXp: meStanding.weeklyXp,
      totalMembers: standings.length,
      standings,
      config,
    },
  };
}
