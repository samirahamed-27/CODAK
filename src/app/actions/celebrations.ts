'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient, SupabaseClient } from '@supabase/supabase-js';
import { levelFromXp } from '@/lib/levels';
import { getRankTiers, getRankForLevel, calculateRankProgress } from '@/lib/ranks';
import { RankTier } from '@/types/database';

export interface CelebrationCheckResult {
  shouldCelebrate: boolean;
  type?: 'level_up' | 'rank_up';
  oldLevel?: number;
  newLevel?: number;
  oldRank?: RankTier;
  newRank?: RankTier;
  levelsToNextRank?: number;
  xpToNextRank?: number;
  nextRank?: RankTier | null;
  error?: string;
}

function getAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createAdminClient(supabaseUrl, serviceRoleKey);
}

/**
 * Server Action: Checks if the student has reached a new level or rank
 * that has not yet been celebrated on their account.
 * Reflects the SERVER's result (derived strictly from valid ledger XP).
 */
export async function checkCelebrationAction(targetStudentId?: string): Promise<CelebrationCheckResult> {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  const studentId = targetStudentId || user?.id;
  if (!studentId) {
    return { shouldCelebrate: false, error: 'Unauthorized: Student session required' };
  }

  const adminClient = getAdminClient();

  // 1. Fetch current student celebration markers
  const { data: student, error: studentErr } = await adminClient
    .from('students')
    .select('id, last_celebrated_level, last_celebrated_rank')
    .eq('id', studentId)
    .single();

  if (studentErr || !student) {
    return { shouldCelebrate: false, error: 'Student record not found' };
  }

  // 2. Fetch current valid XP sum directly from the immutable ledger
  const { data: xpRows, error: xpErr } = await adminClient
    .from('xp_events')
    .select('xp_amount')
    .eq('student_id', studentId)
    .eq('status', 'valid');

  if (xpErr) {
    return { shouldCelebrate: false, error: xpErr.message };
  }

  const totalValidXp = (xpRows || []).reduce((acc, curr) => acc + curr.xp_amount, 0);
  const { level: currentLevel } = levelFromXp(totalValidXp);
  const tiers = await getRankTiers(adminClient);
  const currentRank = getRankForLevel(currentLevel, tiers);

  const lastLevel = student.last_celebrated_level || 1;
  const lastRankSlug = student.last_celebrated_rank || 'apprentice';

  // Rule: No celebration when level goes DOWN (e.g. after faculty voids XP) or stays the same
  if (currentLevel <= lastLevel) {
    return { shouldCelebrate: false };
  }

  // Level has advanced! Determine if this is a rank-up or level-up.
  const oldRank = tiers.find((t) => t.slug === lastRankSlug) || tiers[0];
  const isRankUp = currentRank.slug !== lastRankSlug;

  const progress = calculateRankProgress(totalValidXp, tiers);

  return {
    shouldCelebrate: true,
    // Rule: "If a level-up and a rank-up happen together, show only the rank-up sequence."
    type: isRankUp ? 'rank_up' : 'level_up',
    oldLevel: lastLevel,
    newLevel: currentLevel,
    oldRank,
    newRank: currentRank,
    levelsToNextRank: progress.levelsToNextRank,
    xpToNextRank: progress.xpToNextRank,
    nextRank: progress.nextRank,
  };
}

/**
 * Server Action: Acknowledges that a celebration has played and updates
 * the server-side marker so it is never replayed.
 * Direct client updates to this column are blocked by database security trigger.
 */
export async function acknowledgeCelebrationAction(
  newCelebratedLevel: number,
  newCelebratedRankSlug: string,
  targetStudentId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  const studentId = targetStudentId || user?.id;
  if (!studentId) {
    return { success: false, error: 'Unauthorized: Student session required' };
  }

  if (newCelebratedLevel < 1) {
    return { success: false, error: 'Invalid celebrated level' };
  }

  const adminClient = getAdminClient();

  // Load student to ensure strictly monotonic progression
  const { data: student, error: fetchErr } = await adminClient
    .from('students')
    .select('last_celebrated_level')
    .eq('id', studentId)
    .single();

  if (fetchErr || !student) {
    return { success: false, error: 'Student not found' };
  }

  if (newCelebratedLevel < (student.last_celebrated_level || 1)) {
    return { success: false, error: 'Cannot regress celebrated level' };
  }

  // Update celebration marker using service_role via adminClient
  const { error: updateErr } = await adminClient
    .from('students')
    .update({
      last_celebrated_level: newCelebratedLevel,
      last_celebrated_rank: newCelebratedRankSlug,
    })
    .eq('id', studentId);

  if (updateErr) {
    console.error('Error updating celebration marker:', updateErr);
    return { success: false, error: updateErr.message };
  }

  return { success: true };
}
