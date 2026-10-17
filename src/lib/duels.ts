export interface SafeDuelQuestion {
  id: string;
  question_text: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  question_order: number;
}

export interface DuelOutcome {
  winnerId: string | null;
  loserId: string | null;
  isDraw: boolean;
  challengerXpAction: 'DUEL_WIN' | 'DUEL_PARTICIPATION';
  challengedXpAction: 'DUEL_WIN' | 'DUEL_PARTICIPATION';
  reason: string;
}

/**
 * Pure function: Determines duel winner by score, then time tie-break.
 * Losing NEVER removes XP.
 */
export function determineDuelWinner(
  challenger: { id: string; score: number; timeSeconds: number },
  challenged: { id: string; score: number; timeSeconds: number }
): DuelOutcome {
  // 1. Compare score
  if (challenger.score > challenged.score) {
    return {
      winnerId: challenger.id,
      loserId: challenged.id,
      isDraw: false,
      challengerXpAction: 'DUEL_WIN',
      challengedXpAction: 'DUEL_PARTICIPATION',
      reason: `Challenger won with higher score (${challenger.score} vs ${challenged.score})`,
    };
  }

  if (challenged.score > challenger.score) {
    return {
      winnerId: challenged.id,
      loserId: challenger.id,
      isDraw: false,
      challengerXpAction: 'DUEL_PARTICIPATION',
      challengedXpAction: 'DUEL_WIN',
      reason: `Challenged won with higher score (${challenged.score} vs ${challenger.score})`,
    };
  }

  // 2. Score tie: compare time (shorter time wins)
  if (challenger.timeSeconds < challenged.timeSeconds) {
    return {
      winnerId: challenger.id,
      loserId: challenged.id,
      isDraw: false,
      challengerXpAction: 'DUEL_WIN',
      challengedXpAction: 'DUEL_PARTICIPATION',
      reason: `Challenger won tie-break on speed (${challenger.timeSeconds}s vs ${challenged.timeSeconds}s)`,
    };
  }

  if (challenged.timeSeconds < challenger.timeSeconds) {
    return {
      winnerId: challenged.id,
      loserId: challenger.id,
      isDraw: false,
      challengerXpAction: 'DUEL_PARTICIPATION',
      challengedXpAction: 'DUEL_WIN',
      reason: `Challenged won tie-break on speed (${challenged.timeSeconds}s vs ${challenger.timeSeconds}s)`,
    };
  }

  // 3. Exact score and time tie: Draw (both receive participation XP)
  return {
    winnerId: null,
    loserId: null,
    isDraw: true,
    challengerXpAction: 'DUEL_PARTICIPATION',
    challengedXpAction: 'DUEL_PARTICIPATION',
    reason: `Draw! Identical score (${challenger.score}) and speed (${challenger.timeSeconds}s)`,
  };
}

/**
 * Sanitizes questions for safe delivery to client.
 * Strips correct_answer and explanation so answers never leak before submission.
 */
export function sanitizeDuelQuestions(
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
): SafeDuelQuestion[] {
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
 * Checks whether a duel has exceeded its 24-hour expiration window.
 */
export function isDuelExpired(expiresAt: string | Date, now: Date = new Date()): boolean {
  return now.getTime() > new Date(expiresAt).getTime();
}

/**
 * Validates whether a challenge can be issued (blocks self-duels).
 */
export function validateDuelChallenge(challengerId: string, targetStudentId: string): {
  allowed: boolean;
  reason?: string;
} {
  if (challengerId === targetStudentId) {
    return {
      allowed: false,
      reason: 'Self-duels are strictly blocked. You cannot challenge yourself.',
    };
  }
  return { allowed: true };
}

/**
 * Validates whether a student can submit answers for a duel.
 * Enforces: participant check, expiration check, and double-submission block.
 */
export function validateDuelSubmission(
  duel: {
    status: string;
    expires_at: string;
    challenger_id: string;
    challenged_id: string | null;
    challenger_submitted_at: string | null;
    challenged_submitted_at: string | null;
  },
  studentId: string,
  now: Date = new Date()
): { valid: boolean; reason?: string } {
  if (duel.challenger_id !== studentId && duel.challenged_id !== studentId) {
    return { valid: false, reason: 'Forbidden: You are not a participant in this duel.' };
  }

  if (duel.status === 'expired' || isDuelExpired(duel.expires_at, now)) {
    return { valid: false, reason: 'Duel has expired. No submission or XP allowed.' };
  }

  const isChallenger = duel.challenger_id === studentId;
  const alreadySubmitted = isChallenger
    ? duel.challenger_submitted_at !== null
    : duel.challenged_submitted_at !== null;

  if (alreadySubmitted) {
    return { valid: false, reason: 'Answers for this duel have already been submitted.' };
  }

  return { valid: true };
}
