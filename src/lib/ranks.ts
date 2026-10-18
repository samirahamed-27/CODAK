import { SupabaseClient } from '@supabase/supabase-js';
import { RankTier } from '@/types/database';
import { levelFromXp, BASE_LEVEL_THRESHOLDS, XP_PER_LEVEL_AFTER_BASE } from '@/lib/levels';

/**
 * In-memory cache for rank tiers to eliminate N+1 queries.
 */
let cachedRankTiers: RankTier[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

/**
 * Calculates the exact cumulative XP required to achieve a given level.
 */
export function xpThresholdForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level <= BASE_LEVEL_THRESHOLDS.length) {
    return BASE_LEVEL_THRESHOLDS[level - 1];
  }
  const baseCeiling = BASE_LEVEL_THRESHOLDS[BASE_LEVEL_THRESHOLDS.length - 1]; // 1000 at L6
  const extraLevels = level - BASE_LEVEL_THRESHOLDS.length;
  return baseCeiling + extraLevels * XP_PER_LEVEL_AFTER_BASE;
}

export interface RankProgress {
  currentRank: RankTier;
  nextRank: RankTier | null;
  level: number;
  totalXp: number;
  levelsToNextRank: number;
  xpToNextRank: number;
  rankProgressPercent: number;
  maxRankProgressPercent: number;
  maxRank: RankTier;
}

/**
 * Fetches all rank tiers from the database ordered by sort_order and min_level.
 * Uses in-memory caching to eliminate N+1 queries on leaderboards.
 */
export async function getRankTiers(
  client?: SupabaseClient,
  forceRefresh = false
): Promise<RankTier[]> {
  const now = Date.now();
  if (!forceRefresh && cachedRankTiers && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedRankTiers;
  }

  if (!client) {
    return cachedRankTiers || getDefaultRankTiers();
  }

  const { data, error } = await client
    .from('rank_tiers')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('min_level', { ascending: true });

  if (error || !data || data.length === 0) {
    console.error('Error fetching rank tiers, using fallbacks:', error);
    return getDefaultRankTiers();
  }

  cachedRankTiers = data as RankTier[];
  cacheTimestamp = now;
  return cachedRankTiers;
}

/**
 * Invalidate in-memory rank tiers cache (e.g. for tests).
 */
export function invalidateRankTiersCache(): void {
  cachedRankTiers = null;
  cacheTimestamp = 0;
}

/**
 * Default fallback tiers matching migration 020.
 */
export function getDefaultRankTiers(): RankTier[] {
  return [
    {
      id: 'default-apprentice',
      slug: 'apprentice',
      name: 'Apprentice',
      min_level: 1,
      color: '#94A3B8',
      icon_key: 'terminal',
      description: 'Learning the fundamental syntax, problem solving and campus orientation',
      sort_order: 10,
    },
    {
      id: 'default-scripter',
      slug: 'scripter',
      name: 'Scripter',
      min_level: 2,
      color: '#38BDF8',
      icon_key: 'code',
      description: 'Writing functional scripts, daily quizzes and basic algorithmic solutions',
      sort_order: 20,
    },
    {
      id: 'default-debugger',
      slug: 'debugger',
      name: 'Debugger',
      min_level: 4,
      color: '#34D399',
      icon_key: 'bug',
      description: 'Squashing edge cases, mastering core data structures and consistent streaks',
      sort_order: 30,
    },
    {
      id: 'default-architect',
      slug: 'architect',
      name: 'Architect',
      min_level: 8,
      color: '#818CF8',
      icon_key: 'cpu',
      description: 'Designing modular systems, competitive duels and multi-file algorithms',
      sort_order: 40,
    },
    {
      id: 'default-strategist',
      slug: 'strategist',
      name: 'Strategist',
      min_level: 12,
      color: '#F59E0B',
      icon_key: 'shield',
      description: 'Commanding team battles, high streak stability and campus problem solving',
      sort_order: 50,
    },
    {
      id: 'default-innovator',
      slug: 'innovator',
      name: 'Innovator',
      min_level: 15,
      color: '#EC4899',
      icon_key: 'zap',
      description: 'High-velocity breakthroughs and leading inter-campus leaderboard contention',
      sort_order: 60,
    },
    {
      id: 'default-grandmaster',
      slug: 'grandmaster',
      name: 'Grandmaster',
      min_level: 18,
      color: '#A855F7',
      icon_key: 'crown',
      description: 'Campus champion, academic luminary and highest competitive mastery',
      sort_order: 70,
    },
  ];
}

/**
 * Pure function: Determines the rank tier for a given student level.
 * Selects the tier with the highest min_level <= level.
 */
export function getRankForLevel(level: number, tiers: RankTier[] = getDefaultRankTiers()): RankTier {
  const sorted = [...tiers].sort((a, b) => b.min_level - a.min_level);
  for (const tier of sorted) {
    if (level >= tier.min_level) {
      return tier;
    }
  }
  return sorted[sorted.length - 1] || getDefaultRankTiers()[0];
}

/**
 * Pure function: Calculates comprehensive rank progression, next rank targets,
 * and percentage completion both toward the next rank and toward the maximum rank.
 */
export function calculateRankProgress(
  totalXp: number,
  tiers: RankTier[] = getDefaultRankTiers()
): RankProgress {
  const safeXp = Math.max(0, Math.floor(totalXp));
  const { level } = levelFromXp(safeXp);
  const sortedAsc = [...tiers].sort((a, b) => a.min_level - b.min_level);

  const currentRank = getRankForLevel(level, sortedAsc);
  const maxRank = sortedAsc[sortedAsc.length - 1];

  // Find next rank
  const currentIndex = sortedAsc.findIndex((t) => t.slug === currentRank.slug);
  const nextRank = currentIndex >= 0 && currentIndex < sortedAsc.length - 1
    ? sortedAsc[currentIndex + 1]
    : null;

  const maxRankMinXp = xpThresholdForLevel(maxRank.min_level);
  const maxRankProgressPercent = maxRankMinXp > 0
    ? Math.min(100, Math.max(0, Math.round((safeXp / maxRankMinXp) * 100)))
    : 100;

  if (!nextRank) {
    return {
      currentRank,
      nextRank: null,
      level,
      totalXp: safeXp,
      levelsToNextRank: 0,
      xpToNextRank: 0,
      rankProgressPercent: 100,
      maxRankProgressPercent: 100,
      maxRank,
    };
  }

  const curRankMinXp = xpThresholdForLevel(currentRank.min_level);
  const nextRankMinXp = xpThresholdForLevel(nextRank.min_level);
  const xpNeeded = Math.max(0, nextRankMinXp - safeXp);
  const xpSpan = Math.max(1, nextRankMinXp - curRankMinXp);
  const xpEarnedInRank = Math.max(0, safeXp - curRankMinXp);

  const rankProgressPercent = Math.min(100, Math.max(0, Math.round((xpEarnedInRank / xpSpan) * 100)));
  const levelsToNextRank = Math.max(0, nextRank.min_level - level);

  return {
    currentRank,
    nextRank,
    level,
    totalXp: safeXp,
    levelsToNextRank,
    xpToNextRank: xpNeeded,
    rankProgressPercent,
    maxRankProgressPercent,
    maxRank,
  };
}

/**
 * Server action / helper: Idempotently evaluates and records rank badges for a student.
 * Guarantees zero XP awarded (no feedback loop).
 */
export async function syncStudentRankBadges(
  studentId: string,
  level: number,
  clientOrTiers: SupabaseClient | RankTier[],
  client?: SupabaseClient
): Promise<{ newlyEarned: string[]; awardedBadges: string[] } & string[]> {
  if (!studentId || level < 1) {
    const empty: any = [];
    empty.newlyEarned = [];
    empty.awardedBadges = [];
    return empty;
  }

  let adminClient: SupabaseClient;
  let tiers: RankTier[];

  if (Array.isArray(clientOrTiers)) {
    tiers = clientOrTiers;
    adminClient = client!;
  } else {
    adminClient = clientOrTiers;
    tiers = await getRankTiers(adminClient);
  }

  // Determine eligible rank badge codes
  const eligibleCodes: string[] = [];
  for (const tier of tiers) {
    if (level >= tier.min_level) {
      eligibleCodes.push(`rank_${tier.slug}`);
    }
  }

  if (eligibleCodes.length === 0) {
    const empty: any = [];
    empty.newlyEarned = [];
    empty.awardedBadges = [];
    return empty;
  }

  // Fetch already earned badges
  const { data: earned, error: earnedErr } = await adminClient
    .from('student_badges')
    .select('badge_code')
    .eq('student_id', studentId)
    .in('badge_code', eligibleCodes);

  if (earnedErr) {
    console.error('Error fetching student rank badges:', earnedErr);
    const empty: any = [];
    empty.newlyEarned = [];
    empty.awardedBadges = [];
    return empty;
  }

  const alreadyEarnedSet = new Set((earned || []).map((b) => b.badge_code));
  const toInsert = eligibleCodes.filter((code) => !alreadyEarnedSet.has(code));

  if (toInsert.length === 0) {
    const empty: any = [];
    empty.newlyEarned = [];
    empty.awardedBadges = [];
    return empty;
  }

  const rows = toInsert.map((code) => ({
    student_id: studentId,
    badge_code: code,
  }));

  const { error: insertErr } = await adminClient
    .from('student_badges')
    .insert(rows);

  if (insertErr) {
    // If conflict, ignore (idempotent)
    if (insertErr.code !== '23505') {
      console.error('Error awarding rank badges:', insertErr);
    }
    const empty: any = [];
    empty.newlyEarned = [];
    empty.awardedBadges = [];
    return empty;
  }

  const result: any = [...toInsert];
  result.newlyEarned = toInsert;
  result.awardedBadges = toInsert;
  return result;
}
