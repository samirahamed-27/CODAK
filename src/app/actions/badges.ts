'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { evaluateStudentBadges, Badge } from '@/lib/badges';

export interface StudentBadgeDisplay extends Badge {
  isEarned: boolean;
  earnedAt?: string;
  howToEarn: string;
}

/**
 * Server Action: Evaluate badges for the currently authenticated student.
 * Safe to call repeatedly.
 */
export async function evaluateMyBadgesAction(): Promise<{
  success: boolean;
  newlyEarned: string[];
  error?: string;
}> {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    return { success: false, newlyEarned: [], error: 'Unauthorized' };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    return { success: false, newlyEarned: [], error: 'Server configuration error' };
  }

  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);
  const result = await evaluateStudentBadges(user.id, adminClient);

  return {
    success: true,
    newlyEarned: result.newlyEarned,
  };
}

/**
 * Server Action: Get all badges with earned/locked status for the student profile.
 */
export async function getStudentBadgesAction(targetStudentId?: string): Promise<{
  success: boolean;
  badges: StudentBadgeDisplay[];
  error?: string;
}> {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  const studentId = targetStudentId || user?.id;

  if (!studentId) {
    return { success: false, badges: [], error: 'No student specified' };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  const adminClient = serviceRoleKey
    ? createAdminClient(supabaseUrl, serviceRoleKey)
    : supabaseServer;

  // 1. Fetch all badges
  const { data: allBadges, error: badgesErr } = await adminClient
    .from('badges')
    .select('*')
    .order('category', { ascending: true });

  if (badgesErr || !allBadges) {
    return { success: false, badges: [], error: badgesErr?.message || 'Failed to fetch badges' };
  }

  // 2. Fetch student's earned badges
  const { data: earnedRows } = await adminClient
    .from('student_badges')
    .select('badge_code, earned_at')
    .eq('student_id', studentId);

  const earnedMap = new Map<string, string>();
  (earnedRows || []).forEach((row) => {
    earnedMap.set(row.badge_code, row.earned_at);
  });

  const displayBadges: StudentBadgeDisplay[] = allBadges.map((b) => {
    const isEarned = earnedMap.has(b.code);
    return {
      code: b.code,
      name: b.name,
      description: b.description,
      category: b.category,
      criteria: b.criteria,
      active: b.active,
      isEarned,
      earnedAt: earnedMap.get(b.code),
      howToEarn: b.description,
    };
  });

  return {
    success: true,
    badges: displayBadges,
  };
}
