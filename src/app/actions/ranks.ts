'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import {
  getRankTiers,
  calculateRankProgress,
  syncStudentRankBadges,
  RankProgress,
} from '@/lib/ranks';
import { RankTier } from '@/types/database';

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase environment variables missing');
  }
  return createAdminClient(supabaseUrl, serviceRoleKey);
}

export interface RankProgressResponse {
  success: boolean;
  progress?: RankProgress;
  allTiers?: RankTier[];
  newlyEarnedBadges?: string[];
  error?: string;
}

/**
 * Server Action: Fetches rank progress for the authenticated student,
 * computes current & next rank, and idempotently awards newly attained rank badges.
 */
export async function getMyRankProgressAction(targetStudentId?: string): Promise<RankProgressResponse> {
  try {
    const supabaseServer = await createServerClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user && !targetStudentId) {
      return { success: false, error: 'Unauthorized' };
    }

    const studentId = targetStudentId || user!.id;
    const adminClient = getAdminClient();

    // 1. Fetch tiers
    const allTiers = await getRankTiers(adminClient);

    // 2. Fetch student's valid total XP from ledger
    const { data: xpSum, error: xpErr } = await adminClient
      .from('xp_events')
      .select('xp_amount')
      .eq('student_id', studentId)
      .eq('status', 'valid');

    if (xpErr) {
      console.error('Error fetching student XP for rank calculation:', xpErr);
    }

    const totalXp = (xpSum || []).reduce((sum, e) => sum + (e.xp_amount || 0), 0);

    // 3. Calculate rank progress
    const progress = calculateRankProgress(totalXp, allTiers);

    // 4. Idempotently sync rank badges
    let newlyEarnedBadges: string[] = [];
    try {
      newlyEarnedBadges = await syncStudentRankBadges(studentId, progress.level, allTiers, adminClient);
    } catch (badgeErr) {
      console.error('Error syncing student rank badges:', badgeErr);
    }

    return {
      success: true,
      progress,
      allTiers,
      newlyEarnedBadges,
    };
  } catch (err: any) {
    console.error('getMyRankProgressAction error:', err);
    return { success: false, error: err.message || 'Internal server error' };
  }
}

/**
 * Server Action: Fetches all configured rank tiers.
 */
export async function getRankTiersAction(): Promise<{
  success: boolean;
  tiers: RankTier[];
  error?: string;
}> {
  try {
    const adminClient = getAdminClient();
    const tiers = await getRankTiers(adminClient);
    return { success: true, tiers };
  } catch (err: any) {
    console.error('getRankTiersAction error:', err);
    return { success: false, tiers: [], error: err.message || 'Internal server error' };
  }
}
