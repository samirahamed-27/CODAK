import { SupabaseClient } from '@supabase/supabase-js';

export interface QuestTask {
  id: string;
  quest_id: string;
  description: string;
  action_type: string;
  target_count: number;
  current_count?: number;
  is_completed?: boolean;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  period: 'weekly' | 'one-time';
  reward_xp: number;
  active: boolean;
  tasks?: QuestTask[];
  is_completed?: boolean;
  reward_claimed?: boolean;
  period_key?: string;
  progress_percent?: number;
}

/**
 * Calculates IST Week Range (Monday 00:00:00 IST to Sunday 23:59:59 IST).
 * Week starts Monday. Supports fake dates for testing.
 */
export function getIstWeekDetails(dateInput?: string | Date): {
  istDate: string;
  weekStart: string;
  weekEnd: string;
  periodKey: string;
} {
  const d = dateInput ? new Date(dateInput) : new Date();

  // Convert to Asia/Kolkata date string parts
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const istDate = formatter.format(d); // YYYY-MM-DD

  const [yearStr, monthStr, dayStr] = istDate.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  // UTC noon on that date avoids boundary shifts
  const istMidnight = new Date(Date.UTC(year, month, day, 12, 0, 0));
  const dayOfWeek = istMidnight.getUTCDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  const daysSinceMonday = (dayOfWeek + 6) % 7;

  const mondayDate = new Date(istMidnight);
  mondayDate.setUTCDate(mondayDate.getUTCDate() - daysSinceMonday);

  const sundayDate = new Date(mondayDate);
  sundayDate.setUTCDate(sundayDate.getUTCDate() + 6);

  const weekStart = mondayDate.toISOString().split('T')[0];
  const weekEnd = sundayDate.toISOString().split('T')[0];

  // ISO 8601 week number
  const tempDate = new Date(Date.UTC(mondayDate.getUTCFullYear(), mondayDate.getUTCMonth(), mondayDate.getUTCDate()));
  tempDate.setUTCDate(tempDate.getUTCDate() + 3); // Thursday of week determines year
  const firstThursday = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 4));
  const weekNumber = 1 + Math.round(((tempDate.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);

  const periodKey = `${tempDate.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;

  return { istDate, weekStart, weekEnd, periodKey };
}

/**
 * Pure function: Evaluates task progress from real server counts
 */
export function computeTaskProgress(
  task: QuestTask,
  actionCounts: {
    dailyQuizzesCount: number;
    currentStreak: number;
    practiceCount: number;
  }
): { currentCount: number; isCompleted: boolean } {
  let currentCount = 0;
  switch (task.action_type) {
    case 'daily_quiz_completed':
      currentCount = actionCounts.dailyQuizzesCount;
      break;
    case 'streak_days_maintained':
      currentCount = actionCounts.currentStreak;
      break;
    case 'practice_completed':
      currentCount = actionCounts.practiceCount;
      break;
    default:
      currentCount = 0;
  }

  const isCompleted = currentCount >= task.target_count;
  return { currentCount: Math.min(currentCount, task.target_count), isCompleted };
}

/**
 * Server evaluation: computes real progress for all quests, updates progress rows,
 * and pays reward_xp once per period via award_xp.
 */
export async function evaluateStudentQuests(
  studentId: string,
  adminClient: SupabaseClient,
  customDate?: string | Date
): Promise<{
  quests: Quest[];
  newlyCompleted: string[];
  rewardsPaid: number;
}> {
  const { weekStart, weekEnd, periodKey: weeklyPeriodKey } = getIstWeekDetails(customDate);

  // 1. Fetch active quests with their tasks
  const { data: questsData, error: questsErr } = await adminClient
    .from('quests')
    .select('*, quest_tasks(*)')
    .eq('active', true);

  if (questsErr || !questsData) {
    console.error('Error fetching quests:', questsErr);
    return { quests: [], newlyCompleted: [], rewardsPaid: 0 };
  }

  // 2. Fetch student's real action records on the server
  // 2a. Completed daily quizzes in the weekly window
  const { data: weeklyQuizzes } = await adminClient
    .from('quiz_sessions')
    .select('id, quiz_date')
    .eq('student_id', studentId)
    .eq('status', 'completed')
    .gte('quiz_date', weekStart)
    .lte('quiz_date', weekEnd);

  // 2b. All-time completed daily quizzes (for one-time quests)
  const { count: allTimeQuizzesCount } = await adminClient
    .from('quiz_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .eq('status', 'completed');

  // 2c. Student streak
  const { data: streakRow } = await adminClient
    .from('student_streaks')
    .select('current_streak, longest_streak')
    .eq('student_id', studentId)
    .single();

  const currentStreak = streakRow?.current_streak || 0;
  const longestStreak = streakRow?.longest_streak || 0;
  const bestStreak = Math.max(currentStreak, longestStreak);

  // 2d. Practice completed count
  let practiceCount = 0;
  try {
    const { count } = await adminClient
      .from('practice_logs')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', studentId);
    practiceCount = count || 0;
  } catch {
    practiceCount = 0;
  }

  // 3. Fetch existing progress rows for student
  const { data: progressRows } = await adminClient
    .from('student_quest_progress')
    .select('*')
    .eq('student_id', studentId);

  const progressMap = new Map<string, any>();
  (progressRows || []).forEach((row) => {
    progressMap.set(`${row.quest_id}:${row.period_key}`, row);
  });

  const evaluatedQuests: Quest[] = [];
  const newlyCompleted: string[] = [];
  let rewardsPaid = 0;

  for (const q of questsData) {
    const periodKey = q.period === 'weekly' ? weeklyPeriodKey : 'one-time';
    const progressKey = `${q.id}:${periodKey}`;
    const existingProgress = progressMap.get(progressKey);

    const tasks: QuestTask[] = q.quest_tasks || [];
    let completedTasksCount = 0;

    const evaluatedTasks: QuestTask[] = tasks.map((t) => {
      const isWeekly = q.period === 'weekly';
      const actionCounts = {
        dailyQuizzesCount: isWeekly ? (weeklyQuizzes?.length || 0) : (allTimeQuizzesCount || 0),
        currentStreak: bestStreak,
        practiceCount,
      };
      const { currentCount, isCompleted } = computeTaskProgress(t, actionCounts);
      if (isCompleted) completedTasksCount++;
      return {
        ...t,
        current_count: currentCount,
        is_completed: isCompleted,
      };
    });

    const isAllTasksCompleted = tasks.length > 0 && completedTasksCount === tasks.length;
    const isCompleted = existingProgress?.completed || isAllTasksCompleted;
    let rewardClaimed = existingProgress?.reward_claimed || false;

    // Progress percentage
    const progressPercent = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0;

    // If newly completed or completed and reward not yet paid
    if (isCompleted && !rewardClaimed) {
      // 1. Award XP via award_xp using reference quest:<id>:<period>
      const refId = `quest:${q.id}:${periodKey}`;
      try {
        const { data: xpRes } = await adminClient.rpc('award_xp', {
          p_student_id: studentId,
          p_action_type: 'QUEST_REWARD',
          p_reference_id: refId,
          p_extra_units: q.reward_xp, // extra_units gives exact reward amount
          p_actor: null,
        });

        if ((xpRes as any)?.status === 'awarded' || (xpRes as any)?.status === 'duplicate') {
          rewardClaimed = true;
          rewardsPaid += q.reward_xp;
        }
      } catch (e) {
        console.error(`Error awarding quest XP for quest ${q.id}:`, e);
      }

      // 2. Persist in student_quest_progress
      const nowIso = new Date().toISOString();
      await adminClient.from('student_quest_progress').upsert(
        {
          student_id: studentId,
          quest_id: q.id,
          period_key: periodKey,
          completed: true,
          completed_at: existingProgress?.completed_at || nowIso,
          reward_claimed: rewardClaimed,
          reward_claimed_at: rewardClaimed ? nowIso : null,
        },
        { onConflict: 'student_id,quest_id,period_key' }
      );

      newlyCompleted.push(q.id);

      // Trigger badge evaluation (may unlock quest_first or quest_trio)
      try {
        const { evaluateStudentBadges } = await import('@/lib/badges');
        await evaluateStudentBadges(studentId, adminClient);
      } catch (bErr) {
        console.error('Badge evaluation trigger error from quest:', bErr);
      }
    } else if (!existingProgress && isAllTasksCompleted) {
      // Mark completed
      await adminClient.from('student_quest_progress').upsert(
        {
          student_id: studentId,
          quest_id: q.id,
          period_key: periodKey,
          completed: true,
          completed_at: new Date().toISOString(),
          reward_claimed: rewardClaimed,
        },
        { onConflict: 'student_id,quest_id,period_key' }
      );
    }

    evaluatedQuests.push({
      id: q.id,
      title: q.title,
      description: q.description,
      period: q.period,
      reward_xp: q.reward_xp,
      active: q.active,
      tasks: evaluatedTasks,
      is_completed: isCompleted,
      reward_claimed: rewardClaimed,
      period_key: periodKey,
      progress_percent: progressPercent,
    });
  }

  return {
    quests: evaluatedQuests,
    newlyCompleted,
    rewardsPaid,
  };
}
