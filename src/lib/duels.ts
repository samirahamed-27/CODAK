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

export interface DuelSummary {
  id: string;
  status: 'open' | 'active' | 'completed' | 'expired' | 'declined';
  opponentName: string;
  opponentRollNo?: string;
  isChallenger: boolean;
  myScore?: number | null;
  myTime?: number | null;
  mySubmitted: boolean;
  opponentScore?: number | null;
  opponentTime?: number | null;
  opponentSubmitted: boolean;
  isWinner?: boolean;
  isDraw?: boolean;
  expiresAt: string;
  createdAt: string;
}

/**
 * Server-side scrubbing of duel summaries.
 * Peers see "Anonymous" with no roll number for anonymous opponents.
 * Faculty and admin see real identities.
 */
export function formatDuelSummaries(
  duels: any[],
  currentStudentId: string,
  requesterRole: 'student' | 'faculty' | 'admin' = 'student'
): DuelSummary[] {
  const isPrivileged = requesterRole === 'faculty' || requesterRole === 'admin';

  return duels.map((d: any) => {
    const isChallenger = d.challenger_id === currentStudentId;
    const opponent = isChallenger ? d.challenged : d.challenger;
    const opponentProfile = opponent?.profiles;

    const isAnon = opponentProfile?.is_anonymous || false;
    let opponentName = opponentProfile?.full_name || 'Waiting for Opponent...';
    let opponentRollNo: string | undefined = opponent?.roll_no;

    if (isAnon && !isPrivileged) {
      opponentName = 'Anonymous';
      opponentRollNo = undefined;
    }

    const mySubmitted = isChallenger ? !!d.challenger_submitted_at : !!d.challenged_submitted_at;
    const opponentSubmitted = isChallenger ? !!d.challenged_submitted_at : !!d.challenger_submitted_at;

    return {
      id: d.id,
      status: d.status,
      opponentName,
      opponentRollNo,
      isChallenger,
      myScore: isChallenger ? d.challenger_score : d.challenged_score,
      myTime: isChallenger ? d.challenger_time_seconds : d.challenged_time_seconds,
      mySubmitted,
      opponentScore: isChallenger ? d.challenged_score : d.challenger_score,
      opponentTime: isChallenger ? d.challenged_time_seconds : d.challenger_time_seconds,
      opponentSubmitted,
      isWinner: d.status === 'completed' ? d.winner_id === currentStudentId : undefined,
      isDraw: d.is_draw,
      expiresAt: d.expires_at,
      createdAt: d.created_at,
    };
  });
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

/**
 * Checks whether two levels are within the configured matchmaking band (+/- band, default 2).
 */
export function isWithinLevelBand(levelA: number, levelB: number, band = 2): boolean {
  return Math.abs(levelA - levelB) <= band;
}

/**
 * Anti-win-trading: Checks whether a pair of students can earn duel XP from each other.
 * Limits XP-earning duels between the same two students to N times per calendar day (default 2).
 */
export function canEarnPairDuelXp(completedCountToday: number, maxDaily = 2): boolean {
  return completedCountToday < maxDaily;
}

