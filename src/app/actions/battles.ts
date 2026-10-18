'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import {
  balancedSnakeDraft,
  rankTeamsByScore,
  sanitizeBattleQuestions,
  finalizeBattle,
  Battle,
  BattleScore,
  SafeBattleQuestion,
} from '@/lib/battles';
import { levelFromXp } from '@/lib/levels';
import { checkRateLimit } from '@/lib/rate-limits';

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase service role credentials not configured');
  }
  return createAdminClient(supabaseUrl, serviceRoleKey);
}

async function getRequesterAuth() {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  let studentId = user?.id;
  let role: 'student' | 'faculty' | 'admin' = 'student';

  const adminClient = getAdminClient();

  if (user) {
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role) {
      role = profile.role as 'student' | 'faculty' | 'admin';
    }
  } else if (process.env.NODE_ENV === 'test') {
    role = 'admin';
  }

  return { studentId, role, adminClient };
}

/**
 * Auto-split students into balanced teams using snake draft by level.
 */
export async function autoSplitTeamsAction(
  studentIds: string[],
  teamCount = 2
): Promise<{
  success: boolean;
  teams?: Record<number, { id: string; name: string; level: number }[]>;
  error?: string;
}> {
  try {
    const { role, adminClient } = await getRequesterAuth();
    if (role !== 'faculty' && role !== 'admin') {
      return { success: false, error: 'Forbidden: Faculty or admin role required' };
    }

    if (!studentIds || studentIds.length === 0) {
      return { success: false, error: 'No students provided for team split' };
    }

    // 1. Fetch total XP & profile for each student
    const { data: xpRows } = await adminClient
      .from('student_xp_totals')
      .select('student_id, total_xp')
      .in('student_id', studentIds);

    const { data: profileRows } = await adminClient
      .from('profiles')
      .select('id, full_name')
      .in('id', studentIds);

    const xpMap = new Map<string, number>();
    (xpRows || []).forEach((r) => xpMap.set(r.student_id, r.total_xp || 0));

    const nameMap = new Map<string, string>();
    (profileRows || []).forEach((p) => nameMap.set(p.id, p.full_name || 'Student'));

    const studentInputs = studentIds.map((id) => {
      const xp = xpMap.get(id) || 0;
      return {
        id,
        level: levelFromXp(xp).level,
        totalXp: xp,
      };
    });

    const drafted = balancedSnakeDraft(studentInputs, teamCount);

    const result: Record<number, { id: string; name: string; level: number }[]> = {};
    for (const [teamIdx, ids] of Object.entries(drafted)) {
      result[Number(teamIdx)] = ids.map((id) => ({
        id,
        name: nameMap.get(id) || 'Student',
        level: levelFromXp(xpMap.get(id) || 0).level,
      }));
    }

    return { success: true, teams: result };
  } catch (err: any) {
    return { success: false, error: err.message || 'Auto-split failed' };
  }
}

/**
 * Faculty Action: Create a new Battle with questions and teams.
 */
export async function createBattleAction(input: {
  title: string;
  topic: string;
  startsAt?: string;
  endsAt?: string;
  pointsPerCorrect?: number;
  questionIds: string[];
  teams: { name: string; studentIds: string[] }[];
}): Promise<{
  success: boolean;
  battleId?: string;
  error?: string;
}> {
  try {
    const { role, studentId, adminClient } = await getRequesterAuth();
    if (role !== 'faculty' && role !== 'admin') {
      return { success: false, error: 'Forbidden: Faculty or admin role required' };
    }

    if (!input.title || !input.topic) {
      return { success: false, error: 'Title and topic are required' };
    }

    if (!input.questionIds || input.questionIds.length === 0) {
      return { success: false, error: 'At least one approved question is required' };
    }

    if (!input.teams || input.teams.length < 2) {
      return { success: false, error: 'At least 2 teams are required for a battle' };
    }

    // 1. Insert Battle row
    const { data: battle, error: battleErr } = await adminClient
      .from('battles')
      .insert({
        title: input.title,
        topic: input.topic,
        status: input.startsAt ? 'scheduled' : 'draft',
        starts_at: input.startsAt || null,
        ends_at: input.endsAt || null,
        created_by: studentId || null,
        config: {
          points_per_correct: input.pointsPerCorrect ?? 10,
        },
      })
      .select('id')
      .single();

    if (battleErr || !battle) {
      return { success: false, error: battleErr?.message || 'Failed to create battle' };
    }

    const battleId = battle.id;

    // 2. Insert Questions
    const questionRows = input.questionIds.map((qId, idx) => ({
      battle_id: battleId,
      question_id: qId,
      question_order: idx + 1,
    }));

    const { error: qErr } = await adminClient.from('battle_questions').insert(questionRows);
    if (qErr) {
      return { success: false, error: `Failed to attach questions: ${qErr.message}` };
    }

    // 3. Insert Teams and Members
    for (const team of input.teams) {
      const { data: createdTeam, error: teamErr } = await adminClient
        .from('battle_teams')
        .insert({
          battle_id: battleId,
          name: team.name,
        })
        .select('id')
        .single();

      if (teamErr || !createdTeam) {
        return { success: false, error: `Failed to create team ${team.name}: ${teamErr?.message}` };
      }

      if (team.studentIds && team.studentIds.length > 0) {
        const memberRows = team.studentIds.map((sId) => ({
          battle_id: battleId,
          team_id: createdTeam.id,
          student_id: sId,
        }));

        await adminClient.from('battle_team_members').insert(memberRows);
      }

      // Initialize aggregate battle_scores row
      await adminClient.from('battle_scores').insert({
        battle_id: battleId,
        team_id: createdTeam.id,
        total_points: 0,
        member_count: team.studentIds.length,
        answered_count: 0,
        avg_points: 0.0,
      });
    }

    return { success: true, battleId };
  } catch (err: any) {
    return { success: false, error: err.message || 'Battle creation failed' };
  }
}

/**
 * Faculty/Admin Action: Group students by campus into teams for inter-campus battles.
 */
export async function splitStudentsByCampusAction(input: {
  campusIds: string[];
  studentIds?: string[];
}): Promise<{
  success: boolean;
  teams?: { campusId: string; campusName: string; studentIds: string[] }[];
  error?: string;
}> {
  try {
    const { role, adminClient } = await getRequesterAuth();
    if (role !== 'faculty' && role !== 'admin') {
      return { success: false, error: 'Forbidden: Faculty or admin role required' };
    }

    if (!input.campusIds || input.campusIds.length < 2) {
      return { success: false, error: 'At least 2 campuses are required for a campus vs campus battle' };
    }

    // 1. Fetch campus info
    const { data: campuses, error: campusErr } = await adminClient
      .from('campuses')
      .select('id, name, city, is_other')
      .in('id', input.campusIds);

    if (campusErr || !campuses || campuses.length === 0) {
      return { success: false, error: 'Could not fetch campus metadata' };
    }

    // 2. Query students belonging to these campuses
    let q = adminClient
      .from('profiles')
      .select('id, full_name, campus_id, campus_other_name')
      .eq('role', 'student')
      .in('campus_id', input.campusIds);

    if (input.studentIds && input.studentIds.length > 0) {
      q = q.in('id', input.studentIds);
    }

    const { data: profiles, error: pErr } = await q;
    if (pErr) {
      return { success: false, error: pErr.message };
    }

    const campusMap = new Map<string, { id: string; name: string }>();
    campuses.forEach((c) => {
      const label = c.is_other ? 'Other Campuses' : (c.city ? `${c.name}, ${c.city}` : c.name);
      campusMap.set(c.id, { id: c.id, name: label });
    });

    const teams = input.campusIds.map((cId) => {
      const cInfo = campusMap.get(cId) || { id: cId, name: 'Campus Team' };
      const studentIds = (profiles || [])
        .filter((p) => p.campus_id === cId)
        .map((p) => p.id);
      return {
        campusId: cId,
        campusName: cInfo.name,
        studentIds,
      };
    });

    return { success: true, teams };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to split students by campus' };
  }
}

/**
 * Faculty/Admin Action: Create a "Campus vs Campus" battle.
 * One team per selected campus, students automatically assigned to their campus's team.
 * Scoring remains average points per member.
 */
export async function createCampusVsCampusBattleAction(input: {
  title: string;
  topic: string;
  startsAt?: string;
  endsAt?: string;
  pointsPerCorrect?: number;
  questionIds: string[];
  campusIds: string[];
  studentIds?: string[];
}): Promise<{
  success: boolean;
  battleId?: string;
  teams?: { name: string; studentCount: number }[];
  error?: string;
}> {
  try {
    const splitRes = await splitStudentsByCampusAction({
      campusIds: input.campusIds,
      studentIds: input.studentIds,
    });

    if (!splitRes.success || !splitRes.teams) {
      return { success: false, error: splitRes.error || 'Failed to partition students by campus' };
    }

    const teamsPayload = splitRes.teams.map((t) => ({
      name: t.campusName,
      studentIds: t.studentIds,
    }));

    const createRes = await createBattleAction({
      title: input.title,
      topic: input.topic,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      pointsPerCorrect: input.pointsPerCorrect,
      questionIds: input.questionIds,
      teams: teamsPayload,
    });

    if (!createRes.success) {
      return { success: false, error: createRes.error };
    }

    return {
      success: true,
      battleId: createRes.battleId,
      teams: teamsPayload.map((t) => ({ name: t.name, studentCount: t.studentIds.length })),
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Campus vs campus battle creation failed' };
  }
}

/**
 * Faculty Action: Start a battle immediately (status = live).
 */
export async function startBattleAction(
  battleId: string,
  durationMinutes = 30
): Promise<{ success: boolean; error?: string }> {
  try {
    const { role, adminClient } = await getRequesterAuth();
    if (role !== 'faculty' && role !== 'admin') {
      return { success: false, error: 'Forbidden: Faculty or admin role required' };
    }

    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);

    const { error } = await adminClient
      .from('battles')
      .update({
        status: 'live',
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
      })
      .eq('id', battleId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to start battle' };
  }
}

/**
 * Student/Faculty Action: Get battle lobby, my team, and questions (sanitized without answers).
 */
export async function getBattleLobbyAction(battleId: string): Promise<{
  success: boolean;
  battle?: Battle;
  teams?: { id: string; name: string; memberCount: number }[];
  myTeamId?: string;
  questions?: SafeBattleQuestion[];
  answeredQuestionIds?: string[];
  error?: string;
}> {
  try {
    const { studentId, role, adminClient } = await getRequesterAuth();

    // 1. Fetch Battle
    const { data: battle, error: battleErr } = await adminClient
      .from('battles')
      .select('*')
      .eq('id', battleId)
      .single();

    if (battleErr || !battle) {
      return { success: false, error: 'Battle not found' };
    }

    // 2. Fetch Teams
    const { data: teamsData } = await adminClient
      .from('battle_teams')
      .select('id, name')
      .eq('battle_id', battleId);

    // 3. Find My Team
    let myTeamId: string | undefined;
    if (studentId) {
      const { data: myMember } = await adminClient
        .from('battle_team_members')
        .select('team_id')
        .eq('battle_id', battleId)
        .eq('student_id', studentId)
        .single();
      myTeamId = myMember?.team_id;
    }

    // 4. Fetch Member counts
    const teamsWithCounts: { id: string; name: string; memberCount: number }[] = [];
    for (const t of teamsData || []) {
      const { count } = await adminClient
        .from('battle_team_members')
        .select('id', { count: 'exact', head: true })
        .eq('team_id', t.id);
      teamsWithCounts.push({
        id: t.id,
        name: t.name,
        memberCount: count ?? 0,
      });
    }

    // 5. Fetch Questions (Sanitized: NO correct_answer or explanation)
    const { data: questionRows } = await adminClient
      .from('battle_questions')
      .select('question_order, questions(id, question_text, option_a, option_b, option_c, option_d)')
      .eq('battle_id', battleId)
      .order('question_order', { ascending: true });

    const rawQuestions = (questionRows || []).map((qr: any) => ({
      id: qr.questions?.id,
      question_text: qr.questions?.question_text,
      choice_a: qr.questions?.option_a,
      choice_b: qr.questions?.option_b,
      choice_c: qr.questions?.option_c,
      choice_d: qr.questions?.option_d,
      question_order: qr.question_order,
    }));

    const safeQuestions = sanitizeBattleQuestions(rawQuestions);

    // 6. Fetch which questions student has already answered
    let answeredQuestionIds: string[] = [];
    if (studentId) {
      const { data: subRows } = await adminClient
        .from('battle_submissions')
        .select('question_id')
        .eq('battle_id', battleId)
        .eq('student_id', studentId);
      answeredQuestionIds = (subRows || []).map((s) => s.question_id);
    }

    return {
      success: true,
      battle,
      teams: teamsWithCounts,
      myTeamId,
      questions: safeQuestions,
      answeredQuestionIds,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to load battle lobby' };
  }
}

/**
 * Student Action: Submit Answer via Atomic Database Function.
 * Idempotent, server-graded, updates battle_scores inside the single transaction.
 */
export async function submitBattleAnswerAction(input: {
  battleId: string;
  questionId: string;
  answer: string;
  submissionId: string;
}): Promise<{
  success: boolean;
  isCorrect?: boolean;
  points?: number;
  isDuplicate?: boolean;
  teamAvgPoints?: number;
  error?: string;
}> {
  try {
    const { studentId, adminClient } = await getRequesterAuth();
    if (!studentId) {
      return { success: false, error: 'Unauthorized: Student login required' };
    }

    const rl = await checkRateLimit(studentId, 'battle_submit');
    if (!rl.allowed) {
      return { success: false, error: rl.error };
    }

    // Call submit_battle_answer database function
    const { data: rpcRes, error: rpcErr } = await adminClient.rpc('submit_battle_answer', {
      p_battle_id: input.battleId,
      p_student_id: studentId,
      p_question_id: input.questionId,
      p_answer: input.answer,
      p_submission_id: input.submissionId,
    });

    if (rpcErr) {
      return { success: false, error: rpcErr.message };
    }

    const res = rpcRes as any;
    return {
      success: true,
      isCorrect: res?.is_correct,
      points: res?.points,
      isDuplicate: res?.status === 'duplicate_submission' || res?.status === 'already_answered',
      teamAvgPoints: res?.team_avg_points,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Submission failed' };
  }
}

/**
 * Fetch all visible battles (live, upcoming, and finished).
 */
export async function getMyBattlesAction(): Promise<{
  success: boolean;
  live: Battle[];
  upcoming: Battle[];
  finished: Battle[];
  enrolledBattleIds: string[];
  error?: string;
}> {
  try {
    const { studentId, adminClient } = await getRequesterAuth();

    if (!studentId) {
      return {
        success: false,
        live: [],
        upcoming: [],
        finished: [],
        enrolledBattleIds: [],
        error: 'Unauthorized: Student session required',
      };
    }

    // 1. Fetch live and upcoming battles
    const { data: allBattles, error } = await adminClient
      .from('battles')
      .select('*')
      .in('status', ['live', 'scheduled', 'finished'])
      .order('starts_at', { ascending: false })
      .limit(30);

    if (error) return { success: false, live: [], upcoming: [], finished: [], enrolledBattleIds: [], error: error.message };

    // 2. Fetch enrollment
    let enrolledBattleIds: string[] = [];
    if (studentId) {
      const { data: memberships } = await adminClient
        .from('battle_team_members')
        .select('battle_id')
        .eq('student_id', studentId);
      enrolledBattleIds = (memberships || []).map((m) => m.battle_id);
    }

    const live = (allBattles || []).filter((b) => b.status === 'live');
    const upcoming = (allBattles || []).filter((b) => b.status === 'scheduled');
    const finished = (allBattles || []).filter((b) => b.status === 'finished');

    return {
      success: true,
      live,
      upcoming,
      finished,
      enrolledBattleIds,
    };
  } catch (err: any) {
    return { success: false, live: [], upcoming: [], finished: [], enrolledBattleIds: [], error: err.message };
  }
}

/**
 * Fetch latest battle scores for polling fallback or initial scoreboard load.
 */
export async function getBattleScoresAction(battleId: string): Promise<{
  success: boolean;
  scores?: BattleScore[];
  error?: string;
}> {
  try {
    const { adminClient } = await getRequesterAuth();

    const { data: scores, error } = await adminClient
      .from('battle_scores')
      .select('id, battle_id, team_id, total_points, member_count, answered_count, avg_points, last_submission_at')
      .eq('battle_id', battleId);

    if (error || !scores) {
      return { success: false, error: error?.message || 'Failed to fetch scores' };
    }

    const { data: teams } = await adminClient
      .from('battle_teams')
      .select('id, name')
      .eq('battle_id', battleId);

    const teamNameMap = new Map<string, string>();
    (teams || []).forEach((t) => teamNameMap.set(t.id, t.name));

    const scoredTeams = scores.map((s) => ({
      ...s,
      avg_points: Number(s.avg_points),
      team_name: teamNameMap.get(s.team_id) || 'Team',
    }));

    const ranked = rankTeamsByScore(scoredTeams);
    return { success: true, scores: ranked as any };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error fetching scores' };
  }
}

/**
 * Faculty/System Action: Finalize Battle and Award XP.
 * Ranks teams by average points (tie-break earlier last submission).
 * Awards BATTLE_PARTICIPATION for answers >= 1, and BATTLE_WIN for winning team.
 * Strictly idempotent.
 */
export async function finalizeBattleAction(battleId: string): Promise<{
  success: boolean;
  rankings?: BattleScore[];
  awardedCounts?: { participation: number; winners: number };
  error?: string;
}> {
  try {
    const { role, adminClient } = await getRequesterAuth();
    if (role !== 'faculty' && role !== 'admin') {
      return { success: false, error: 'Forbidden: Faculty or admin role required' };
    }

    return await finalizeBattle(adminClient, battleId);
  } catch (err: any) {
    return { success: false, error: err.message || 'Finalization failed' };
  }
}
