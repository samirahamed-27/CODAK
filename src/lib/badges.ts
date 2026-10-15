import { SupabaseClient } from '@supabase/supabase-js';

export interface Badge {
  code: string;
  name: string;
  description: string;
  category: 'MILESTONE' | 'QUEST' | 'IMPROVEMENT';
  criteria: Record<string, unknown>;
  active: boolean;
  earned_at?: string;
}

export interface BadgeEvaluationContext {
  completedQuizzesCount: number;
  currentStreak: number;
  longestStreak: number;
  completedQuestsCount: number;
  recentQuizScores: { score: number; total: number; date: string }[];
  hasBrokenStreakHistory: boolean;
}

/**
 * Pure function: Evaluates whether a student meets the criteria for a badge
 * based on deterministic context (allowing full unit-testing with mock data).
 */
export function isBadgeCriteriaMet(
  badgeCode: string,
  criteria: Record<string, unknown>,
  ctx: BadgeEvaluationContext
): boolean {
  switch (badgeCode) {
    case 'first_quiz':
      return ctx.completedQuizzesCount >= 1;

    case 'streak_7':
      return ctx.currentStreak >= 7 || ctx.longestStreak >= 7;

    case 'quest_first':
      return ctx.completedQuestsCount >= 1;

    case 'quest_trio':
      return ctx.completedQuestsCount >= 3;

    case 'improvement_score': {
      // Compares student with THEMSELVES:
      // Needs at least 2 quizzes. Latest quiz score percentage must strictly exceed
      // the average of previous quizzes within the window.
      if (ctx.recentQuizScores.length < 2) return false;
      const [latest, ...previous] = ctx.recentQuizScores;
      if (latest.total <= 0 || previous.length === 0) return false;

      const latestPct = latest.score / latest.total;
      const prevTotalPct = previous.reduce((sum, q) => sum + (q.total > 0 ? q.score / q.total : 0), 0);
      const prevAvgPct = prevTotalPct / previous.length;

      return latestPct > prevAvgPct;
    }

    case 'comeback_kid':
      // Compares student with THEMSELVES:
      // Current streak at least 2 days after breaking an earlier streak
      return ctx.currentStreak >= 2 && ctx.hasBrokenStreakHistory;

    default:
      return false;
  }
}

/**
 * Server evaluation: evaluates all active badges for a student, persists newly earned badges,
 * and triggers award_xp with unique reference `badge:<code>`.
 * Strictly idempotent.
 */
export async function evaluateStudentBadges(
  studentId: string,
  adminClient: SupabaseClient
): Promise<{
  newlyEarned: string[];
  alreadyEarned: string[];
  unearned: string[];
}> {
  // 1. Fetch active badges
  const { data: badges, error: badgesErr } = await adminClient
    .from('badges')
    .select('*')
    .eq('active', true);

  if (badgesErr || !badges) {
    console.error('Error fetching badges:', badgesErr);
    return { newlyEarned: [], alreadyEarned: [], unearned: [] };
  }

  // 2. Fetch student's already earned badges
  const { data: earnedRows, error: earnedErr } = await adminClient
    .from('student_badges')
    .select('badge_code')
    .eq('student_id', studentId);

  if (earnedErr) {
    console.error('Error fetching student_badges:', earnedErr);
    return { newlyEarned: [], alreadyEarned: [], unearned: [] };
  }

  const alreadyEarnedSet = new Set<string>((earnedRows || []).map((r) => r.badge_code));
  const candidateBadges = badges.filter((b) => !alreadyEarnedSet.has(b.code));

  if (candidateBadges.length === 0) {
    return {
      newlyEarned: [],
      alreadyEarned: Array.from(alreadyEarnedSet),
      unearned: [],
    };
  }

  // 3. Build student context for evaluation
  // 3a. Quiz sessions
  const { data: quizSessions } = await adminClient
    .from('quiz_sessions')
    .select('id, score, total_questions, quiz_date, status')
    .eq('student_id', studentId)
    .eq('status', 'completed')
    .order('quiz_date', { ascending: false });

  const completedQuizzes = quizSessions || [];

  // 3b. Streak info
  const { data: streakRow } = await adminClient
    .from('student_streaks')
    .select('current_streak, longest_streak')
    .eq('student_id', studentId)
    .single();

  const currentStreak = streakRow?.current_streak || 0;
  const longestStreak = streakRow?.longest_streak || 0;
  // Has broken streak history if student reached higher streak previously,
  // or longest_streak > current_streak
  const hasBrokenStreakHistory = longestStreak > currentStreak;

  // 3c. Completed quests
  let completedQuestsCount = 0;
  try {
    const { count, error: qErr } = await adminClient
      .from('student_quest_progress')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('completed', true);
    if (!qErr && count !== null) {
      completedQuestsCount = count;
    }
  } catch {
    // If student_quest_progress table not yet queried or populated
    completedQuestsCount = 0;
  }

  const recentQuizScores = completedQuizzes.map((q) => ({
    score: q.score,
    total: q.total_questions,
    date: q.quiz_date,
  }));

  const ctx: BadgeEvaluationContext = {
    completedQuizzesCount: completedQuizzes.length,
    currentStreak,
    longestStreak,
    completedQuestsCount,
    recentQuizScores,
    hasBrokenStreakHistory,
  };

  const newlyEarned: string[] = [];
  const unearned: string[] = [];

  for (const badge of candidateBadges) {
    const meetsCriteria = isBadgeCriteriaMet(badge.code, badge.criteria, ctx);
    if (meetsCriteria) {
      // Insert into student_badges (server-only via adminClient)
      const { error: insertErr } = await adminClient
        .from('student_badges')
        .insert({
          student_id: studentId,
          badge_code: badge.code,
        });

      if (!insertErr) {
        newlyEarned.push(badge.code);

        // Award badge XP if BADGE_EARNED rule is active (reference badge:<code>)
        try {
          await adminClient.rpc('award_xp', {
            p_student_id: studentId,
            p_action_type: 'BADGE_EARNED',
            p_reference_id: `badge:${badge.code}`,
            p_extra_units: 0,
            p_actor: null,
          });
        } catch (xpErr) {
          console.error(`Error awarding XP for badge ${badge.code}:`, xpErr);
        }
      } else {
        // If conflict or error, already recorded
        if (insertErr.code === '23505') {
          alreadyEarnedSet.add(badge.code);
        }
      }
    } else {
      unearned.push(badge.code);
    }
  }

  return {
    newlyEarned,
    alreadyEarned: Array.from(alreadyEarnedSet),
    unearned,
  };
}
