'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import {
  generateConceptMatchRound,
  verifyConceptMatches,
  ConceptMatchRound,
} from '@/lib/concept-match';

export async function getConceptMatchRoundAction(): Promise<{
  success: boolean;
  round?: ConceptMatchRound;
  error?: string;
}> {
  try {
    const round = generateConceptMatchRound(4);
    return { success: true, round };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to generate round' };
  }
}

export async function submitConceptMatchAction(matches: { termId: string; definitionId: string }[]): Promise<{
  success: boolean;
  correctCount: number;
  totalCount: number;
  isPerfect: boolean;
  xpAwarded?: number;
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
    return { success: false, correctCount: 0, totalCount: 0, isPerfect: false, error: 'Server configuration error' };
  }

  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);

  if (!studentId) {
    const { data: demo } = await adminClient.from('students').select('id').limit(1).single();
    studentId = demo?.id;
  }

  if (!studentId) {
    return { success: false, correctCount: 0, totalCount: 0, isPerfect: false, error: 'Student not found' };
  }

  // 1. Verify matches
  const outcome = verifyConceptMatches(matches);

  let xpAwarded = 0;

  // 2. Award XP if perfect match (all 4 correct)
  if (outcome.isPerfect) {
    const nowIso = new Date().toISOString().split('T')[0];
    const timestampMs = Date.now();
    const referenceId = `concept_match:${nowIso}:${studentId}:${timestampMs}`;

    const { data: awardRes, error: xpErr } = await adminClient.rpc('award_xp', {
      p_student_id: studentId,
      p_action_type: 'CONCEPT_MATCH',
      p_reference_id: referenceId,
      p_extra_units: 0,
      p_actor: null,
    });

    if (!xpErr && awardRes && typeof awardRes === 'object') {
      const typed = awardRes as any;
      if (typed.status === 'awarded' || typed.status === 'success') {
        xpAwarded = 10;
      }
    }
  }

  return {
    success: true,
    correctCount: outcome.correctCount,
    totalCount: outcome.totalCount,
    isPerfect: outcome.isPerfect,
    xpAwarded,
  };
}
