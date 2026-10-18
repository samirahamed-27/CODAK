'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import {
  generateConceptMatchRound,
  verifyConceptMatches,
  createSignedRoundToken,
  verifySignedRoundToken,
  ConceptMatchRound,
  ConceptMatchReviewItem,
  CONCEPT_PAIRS_BANK,
} from '@/lib/concept-match';
import { checkRateLimit } from '@/lib/rate-limits';
import { ensureStudentRecord } from '@/lib/auth/ensure-student';

function getSigningSecret(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.CRON_SECRET ||
    'concept-match-local-secret'
  );
}

export async function getConceptMatchRoundAction(): Promise<{
  success: boolean;
  round?: ConceptMatchRound;
  roundToken?: string;
  error?: string;
}> {
  try {
    const supabaseServer = await createServerClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    let studentId = user?.id;
    if (!studentId) {
      return { success: false, error: 'Unauthorized: Student session required' };
    }

    const round = generateConceptMatchRound(4);
    const roundId = crypto.randomUUID();
    const roundToken = createSignedRoundToken(
      {
        roundId,
        studentId: studentId || 'anonymous',
        termIds: round.terms.map((t) => t.id),
        mapping: round.mapping,
        explanations: round.explanations,
        issuedAt: Date.now(),
      },
      getSigningSecret()
    );

    // Strip server-side mapping before delivering to client (Option B: pairing never reaches browser)
    const clientRound = {
      terms: round.terms,
      definitions: round.definitions,
    };

    return { success: true, round: clientRound, roundToken };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to generate round' };
  }
}

export async function submitConceptMatchAction(
  matches: { termId: string; definitionId: string }[],
  roundToken?: string
): Promise<{
  success: boolean;
  correctCount: number;
  totalCount: number;
  isPerfect: boolean;
  xpAwarded?: number;
  review?: ConceptMatchReviewItem[];
  error?: string;
}> {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    return {
      success: false,
      correctCount: 0,
      totalCount: 0,
      isPerfect: false,
      xpAwarded: 0,
      error: 'Unauthorized: Student session required',
    };
  }

  const rl = await checkRateLimit(user.id, 'concept_match');
  if (!rl.allowed) {
    return {
      success: false,
      correctCount: 0,
      totalCount: 0,
      isPerfect: false,
      xpAwarded: 0,
      error: rl.error,
    };
  }

  if (!roundToken) {
    return {
      success: false,
      correctCount: 0,
      totalCount: matches.length,
      isPerfect: false,
      xpAwarded: 0,
      error: 'Submission rejected: Missing server-issued round token.',
    };
  }

  // 1. Verify signed expiring token
  const tokenCheck = verifySignedRoundToken(roundToken, getSigningSecret());
  if (!tokenCheck.valid || !tokenCheck.payload) {
    return {
      success: false,
      correctCount: 0,
      totalCount: matches.length,
      isPerfect: false,
      xpAwarded: 0,
      error: `Submission rejected: ${tokenCheck.error || 'Invalid token'}`,
    };
  }

  const { payload } = tokenCheck;
  const studentId = user.id;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    return { success: false, correctCount: 0, totalCount: 0, isPerfect: false, error: 'Server configuration error' };
  }

  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);
  await ensureStudentRecord(adminClient, user);

  if (!studentId) {
    return { success: false, correctCount: 0, totalCount: 0, isPerfect: false, xpAwarded: 0, error: 'Unauthorized: Student session required' };
  }

  // Verify token matches current student if authenticated
  if (payload.studentId !== 'anonymous' && payload.studentId !== studentId) {
    return {
      success: false,
      correctCount: 0,
      totalCount: matches.length,
      isPerfect: false,
      xpAwarded: 0,
      error: 'Submission rejected: Round token belongs to a different student.',
    };
  }

  // 3. Verify submitted terms match the exact terms issued in this round
  const issuedTerms = new Set(payload.termIds);
  const submittedTerms = new Set(matches.map((m) => m.termId));

  if (
    issuedTerms.size !== submittedTerms.size ||
    [...issuedTerms].some((t) => !submittedTerms.has(t))
  ) {
    return {
      success: false,
      correctCount: 0,
      totalCount: matches.length,
      isPerfect: false,
      xpAwarded: 0,
      error: 'Submission rejected: Submitted terms do not match the round issued by the server.',
    };
  }

  // 4. Verify match correctness on server against signed server-side mapping (Option B)
  const outcome = verifyConceptMatches(matches, payload.mapping);

  // 5. Build review items with correct answers and explanations for client
  const review: ConceptMatchReviewItem[] = [];
  const matchesMap = new Map(matches.map((m) => [m.termId, m.definitionId]));

  // Build definition ID -> text map
  const defIdToText: Record<string, string> = {};
  if (payload.explanations) {
    for (const [tId, dId] of Object.entries(payload.mapping)) {
      if (payload.explanations[tId]) {
        defIdToText[dId] = payload.explanations[tId].definition;
      }
    }
  }

  for (const termId of payload.termIds) {
    const expectedDefId = payload.mapping[termId];
    const userChosenDefId = matchesMap.get(termId);
    const isCorrect = Boolean(userChosenDefId && userChosenDefId === expectedDefId);

    const explanationDetail = payload.explanations?.[termId];
    const fallbackBankPair = !explanationDetail ? CONCEPT_PAIRS_BANK.find((p) => p.term === termId) : undefined;

    const termName = explanationDetail?.term || fallbackBankPair?.term || termId;
    const correctDefText = explanationDetail?.definition || fallbackBankPair?.definition || '';
    const userDefText = userChosenDefId ? defIdToText[userChosenDefId] || 'Selected definition' : 'Unmatched';
    const explanationText = explanationDetail?.explanation || fallbackBankPair?.explanation || `Connects "${termName}" with its core computer science definition.`;
    const topic = explanationDetail?.topic || fallbackBankPair?.topic || 'Computer Science';

    review.push({
      termId,
      term: termName,
      correctDefinitionId: expectedDefId,
      correctDefinition: correctDefText,
      userDefinitionId: userChosenDefId,
      userDefinition: userDefText,
      isCorrect,
      explanation: explanationText,
      topic,
    });
  }

  let xpAwarded = 0;

  // 6. Award XP if perfect match (all 4 correct) with unique round reference
  if (outcome.isPerfect) {
    const referenceId = `concept_match:${payload.roundId}`;

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
        xpAwarded = typed.xp_awarded ?? 10;
      }
    }
  }

  return {
    success: true,
    correctCount: outcome.correctCount,
    totalCount: outcome.totalCount,
    isPerfect: outcome.isPerfect,
    xpAwarded,
    review,
  };
}
