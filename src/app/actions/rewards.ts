'use server';

import crypto from 'crypto';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensureStudentRecord } from '@/lib/auth/ensure-student';

export interface RewardPerk {
  id: string;
  title: string;
  cost: number;
  icon: string;
  category: string;
  tag: string;
  description: string;
  perks: string[];
}

export interface StudentRedemptionRecord {
  id: string;
  rewardId: string;
  rewardTitle: string;
  rewardCategory: string;
  xpCost: number;
  claimCode: string;
  status: 'active' | 'claimed' | 'expired' | 'refunded';
  redeemedAt: string;
  claimedAt?: string | null;
  notes?: string | null;
}

export const REWARDS_CATALOG: RewardPerk[] = [
  {
    id: 'vip_fest_pass',
    title: 'Campus Tech Fest VIP Access Pass',
    cost: 400,
    icon: '🎟️',
    category: 'Fest & Cultural',
    tag: 'Most Popular',
    description:
      'Priority front-row seating, backstage artist lounge pass, and free priority entry to all fest hackathons.',
    perks: [
      'Front-row seating at college annual cultural fest',
      'Hackathon fast-track entry & VIP mentor desk',
      'Backstage artist & guest speaker meet pass',
    ],
  },
  {
    id: 'alumni_mentorship',
    title: '1-on-1 Alumni Tech Mentor Session',
    cost: 300,
    icon: '🤝',
    category: 'Career & Mentorship',
    tag: 'Career Booster',
    description:
      '45-minute private career advice, resume review, and interview prep with a FAANG/Tier-1 alumni.',
    perks: [
      '45-minute 1-on-1 video call with engineering alumni',
      'ATS resume deep-dive & project portfolio review',
      'DSA & system design roadmap tailored to your target company',
    ],
  },
  {
    id: 'avatar_banner',
    title: 'Grandmaster Profile Avatar Banner',
    cost: 250,
    icon: '🛡️',
    category: 'Profile Customization',
    tag: 'Digital Cosmetic',
    description:
      'Unlocks the animated golden aura border and Grandmaster crest on public campus leaderboards.',
    perks: [
      'Golden animated avatar aura on your profile card',
      'Special Grandmaster crest badge on campus standings',
      'Permanent digital cosmetic asset for your student handle',
    ],
  },
  {
    id: 'merch_pack',
    title: 'MSOT Department Merch & Sticker Pack',
    cost: 150,
    icon: '👕',
    category: 'Merchandise',
    tag: 'Physical Merch',
    description:
      'Exclusive department hoodie voucher, holographic laptop stickers, and custom metal keychain.',
    perks: [
      'Official campus engineering department hoodie voucher',
      'Set of 10 waterproof holographic dev stickers',
      'CODAK metal enamel emblem keychain',
    ],
  },
];

/**
 * Fetches the rewards catalog, the calling student's current XP balance,
 * and their previous redemptions history.
 */
export async function getRewardsCatalogAction(): Promise<{
  success: boolean;
  rewards: RewardPerk[];
  currentBalance: number;
  redemptions: StudentRedemptionRecord[];
  error?: string;
}> {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    return {
      success: false,
      rewards: REWARDS_CATALOG,
      currentBalance: 0,
      redemptions: [],
      error: 'Please sign in to view your balance and redeem rewards.',
    };
  }

  const adminClient = createAdminClient();
  await ensureStudentRecord(adminClient, user);

  // Compute student XP balance
  const { data: xpRows } = await adminClient
    .from('xp_events')
    .select('xp_amount, status')
    .eq('student_id', user.id);

  let currentBalance = 0;
  for (const row of xpRows || []) {
    if (row.status === 'valid') {
      currentBalance += row.xp_amount;
    }
  }

  // Fetch student redemptions
  const { data: redemptionsData } = await adminClient
    .from('student_reward_redemptions')
    .select('*')
    .eq('student_id', user.id)
    .order('redeemed_at', { ascending: false });

  const redemptions: StudentRedemptionRecord[] = (redemptionsData || []).map((r) => ({
    id: r.id,
    rewardId: r.reward_id,
    rewardTitle: r.reward_title,
    rewardCategory: r.reward_category,
    xpCost: r.xp_cost,
    claimCode: r.claim_code,
    status: r.status,
    redeemedAt: r.redeemed_at,
    claimedAt: r.claimed_at,
    notes: r.notes,
  }));

  return {
    success: true,
    rewards: REWARDS_CATALOG,
    currentBalance: Math.max(0, currentBalance),
    redemptions,
  };
}

/**
 * Redeems a perk from the Rewards Store:
 * 1. Validates perk exists and student has sufficient XP balance.
 * 2. Generates an exclusive collision-resistant claim code.
 * 3. Atomically calls deduct_xp stored procedure to insert negative XP ledger row.
 * 4. Records the redemption in student_reward_redemptions.
 */
export async function redeemRewardAction(rewardId: string): Promise<{
  success: boolean;
  claimCode?: string;
  newBalance?: number;
  reward?: RewardPerk;
  redemption?: StudentRedemptionRecord;
  error?: string;
}> {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized: Please log in to redeem rewards.' };
  }

  const reward = REWARDS_CATALOG.find((r) => r.id === rewardId);
  if (!reward) {
    return { success: false, error: 'Reward perk not found in catalog.' };
  }

  const adminClient = createAdminClient();
  await ensureStudentRecord(adminClient, user);

  // Generate readable unique claim code (e.g., VIP-7F2A-8B1C)
  const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
  const prefix = reward.id.slice(0, 3).toUpperCase();
  const claimCode = `${prefix}-${randomHex.slice(0, 4)}-${randomHex.slice(4, 8)}`;
  const refId = `REWARD_REDEMPTION_${claimCode}`;

  try {
    // 1. Deduct XP via database stored procedure
    const { data: rpcRes, error: rpcErr } = await adminClient.rpc('deduct_xp', {
      p_student_id: user.id,
      p_amount: reward.cost,
      p_action_type: 'REWARD_REDEMPTION',
      p_reason: `Redeemed perk: ${reward.title} (Code: ${claimCode})`,
      p_reference_id: refId,
      p_actor: user.id,
    });

    if (rpcErr) {
      return { success: false, error: rpcErr.message || 'Database error during XP deduction.' };
    }

    if (!rpcRes?.success) {
      return {
        success: false,
        error:
          rpcRes?.error ||
          `Insufficient XP. You need ${reward.cost} XP to redeem this reward.`,
      };
    }

    const newBalance = Number(rpcRes.new_total);

    // 2. Insert into student_reward_redemptions
    const { data: redemptionRow, error: insertErr } = await adminClient
      .from('student_reward_redemptions')
      .insert({
        student_id: user.id,
        reward_id: reward.id,
        reward_title: reward.title,
        reward_category: reward.category,
        xp_cost: reward.cost,
        claim_code: claimCode,
        status: 'active',
        notes: `Redeemed online via student rewards store. Present claim code to coordinator.`,
      })
      .select('*')
      .single();

    if (insertErr) {
      console.error('Error recording student redemption:', insertErr);
    }

    const redemptionRecord: StudentRedemptionRecord = {
      id: redemptionRow?.id || refId,
      rewardId: reward.id,
      rewardTitle: reward.title,
      rewardCategory: reward.category,
      xpCost: reward.cost,
      claimCode,
      status: 'active',
      redeemedAt: new Date().toISOString(),
      notes: redemptionRow?.notes,
    };

    return {
      success: true,
      claimCode,
      newBalance,
      reward,
      redemption: redemptionRecord,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unexpected server error during redemption.' };
  }
}
