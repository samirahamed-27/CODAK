export interface Battle {
  id: string;
  title: string;
  topic: string;
  status: 'draft' | 'scheduled' | 'live' | 'finished';
  starts_at?: string | null;
  ends_at?: string | null;
  created_by?: string | null;
  config: {
    points_per_correct?: number;
    auto_split?: boolean;
    duration_minutes?: number;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

export interface BattleTeam {
  id: string;
  battle_id: string;
  name: string;
  created_at: string;
  member_count?: number;
}

export interface BattleScore {
  id: string;
  battle_id: string;
  team_id: string;
  team_name?: string;
  total_points: number;
  member_count: number;
  answered_count: number;
  avg_points: number;
  last_submission_at?: string | null;
  rank?: number;
}

export interface SafeBattleQuestion {
  id: string;
  question_text: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  question_order: number;
}

/**
 * Pure function: Balanced Snake Draft by Skill / Level
 * Sorts students descending by level and alternates direction across teams.
 * e.g., 3 teams:
 *   Round 0: Team 0, Team 1, Team 2
 *   Round 1: Team 2, Team 1, Team 0
 *   Round 2: Team 0, Team 1, Team 2
 * This guarantees evenly balanced average skill between teams.
 */
export function balancedSnakeDraft(
  students: { id: string; level: number; totalXp?: number }[],
  teamCount: number
): Record<number, string[]> {
  if (teamCount <= 0) return {};
  const teams: Record<number, string[]> = {};
  for (let i = 0; i < teamCount; i++) {
    teams[i] = [];
  }

  // Sort students descending by level, secondary by totalXp
  const sorted = [...students].sort((a, b) => {
    if (b.level !== a.level) return b.level - a.level;
    return (b.totalXp ?? 0) - (a.totalXp ?? 0);
  });

  let currentTeam = 0;
  let direction = 1; // 1 = forward, -1 = reverse

  for (const student of sorted) {
    teams[currentTeam].push(student.id);

    if (direction === 1) {
      if (currentTeam === teamCount - 1) {
        direction = -1; // Reverse snake direction
      } else {
        currentTeam++;
      }
    } else {
      if (currentTeam === 0) {
        direction = 1; // Forward snake direction
      } else {
        currentTeam--;
      }
    }
  }

  return teams;
}

/**
 * Pure function: Rank teams by average points per member.
 * Tie-break rule: Earlier time of last submission wins.
 */
export function rankTeamsByScore<T extends { avg_points: number; last_submission_at?: string | null }>(
  scores: T[]
): (T & { rank: number })[] {
  const sorted = [...scores].sort((a, b) => {
    // 1. Primary: average points descending
    if (b.avg_points !== a.avg_points) {
      return b.avg_points - a.avg_points;
    }

    // 2. Secondary tie-break: earlier last_submission_at wins
    if (a.last_submission_at && b.last_submission_at) {
      const timeA = new Date(a.last_submission_at).getTime();
      const timeB = new Date(b.last_submission_at).getTime();
      return timeA - timeB;
    }

    // Team with submissions wins over team with none
    if (a.last_submission_at && !b.last_submission_at) return -1;
    if (!a.last_submission_at && b.last_submission_at) return 1;

    return 0;
  });

  return sorted.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}

/**
 * Strips correct answers and explanations so they never leak to client before submit.
 */
export function sanitizeBattleQuestions(
  rawQuestions: {
    id: string;
    question_text: string;
    choice_a: string;
    choice_b: string;
    choice_c: string;
    choice_d: string;
    question_order?: number;
    correct_answer?: string;
    explanation?: string;
  }[]
): SafeBattleQuestion[] {
  return rawQuestions.map((q, idx) => ({
    id: q.id,
    question_text: q.question_text,
    choice_a: q.choice_a,
    choice_b: q.choice_b,
    choice_c: q.choice_c,
    choice_d: q.choice_d,
    question_order: q.question_order ?? idx + 1,
  }));
}

/**
 * Core battle finalization and XP payout logic.
 * Ranks teams by average points (tie-break earlier last submission).
 * Awards BATTLE_PARTICIPATION for answers >= 1, and BATTLE_WIN for winning team.
 * Strictly idempotent.
 */
export async function finalizeBattle(
  adminClient: any,
  battleId: string
): Promise<{
  success: boolean;
  rankings?: BattleScore[];
  awardedCounts?: { participation: number; winners: number };
  error?: string;
}> {
  try {
    // 1. Mark battle as finished
    await adminClient
      .from('battles')
      .update({ status: 'finished' })
      .eq('id', battleId);

    // 2. Fetch battle_scores
    const { data: scores, error: scoresErr } = await adminClient
      .from('battle_scores')
      .select('id, battle_id, team_id, total_points, member_count, answered_count, avg_points, last_submission_at')
      .eq('battle_id', battleId);

    if (scoresErr || !scores || scores.length === 0) {
      return { success: false, error: 'No scores found for battle' };
    }

    // Attach team names
    const { data: teams } = await adminClient
      .from('battle_teams')
      .select('id, name')
      .eq('battle_id', battleId);

    const teamNameMap = new Map<string, string>();
    (teams || []).forEach((t: any) => teamNameMap.set(t.id, t.name));

    const scoredTeams: BattleScore[] = scores.map((s: any) => ({
      ...s,
      avg_points: Number(s.avg_points),
      team_name: teamNameMap.get(s.team_id) || 'Team',
    }));

    // 3. Rank teams by average points with tie-break
    const ranked = rankTeamsByScore<BattleScore>(scoredTeams);
    const winningTeam = ranked[0];

    // 4. Fetch students who answered at least 1 question in this battle
    const { data: participants } = await adminClient
      .from('battle_submissions')
      .select('student_id')
      .eq('battle_id', battleId);

    const distinctParticipantIds = Array.from(
      new Set((participants || []).map((p: any) => p.student_id as string))
    );

    let participationCount = 0;
    let winnerCount = 0;

    // 5. Award BATTLE_PARTICIPATION through award_xp
    for (const studentId of distinctParticipantIds) {
      const { data: res } = await adminClient.rpc('award_xp', {
        p_student_id: studentId,
        p_action_type: 'BATTLE_PARTICIPATION',
        p_reference_id: `battle:${battleId}:${studentId}:participation`,
        p_extra_units: 0,
        p_actor: null,
      });

      if ((res as any)?.status === 'awarded') {
        participationCount++;
      }
    }

    // 6. Award BATTLE_WIN to all winning team members
    if (winningTeam) {
      const { data: winningMembers } = await adminClient
        .from('battle_team_members')
        .select('student_id')
        .eq('team_id', winningTeam.team_id);

      for (const m of winningMembers || []) {
        const { data: res } = await adminClient.rpc('award_xp', {
          p_student_id: m.student_id,
          p_action_type: 'BATTLE_WIN',
          p_reference_id: `battle:${battleId}:${m.student_id}:win`,
          p_extra_units: 0,
          p_actor: null,
        });

        if ((res as any)?.status === 'awarded') {
          winnerCount++;
        }
      }
    }

    return {
      success: true,
      rankings: ranked as any,
      awardedCounts: {
        participation: participationCount,
        winners: winnerCount,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Finalization failed' };
  }
}
