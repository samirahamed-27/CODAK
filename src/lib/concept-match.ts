export interface ConceptPair {
  id: string;
  term: string;
  definition: string;
  topic: string;
}

export const CONCEPT_PAIRS_BANK: ConceptPair[] = [
  {
    id: 'cp-1',
    term: 'Binary Search',
    definition: 'Divide-and-conquer search algorithm operating on sorted collections in O(log n) time.',
    topic: 'Algorithms',
  },
  {
    id: 'cp-2',
    term: 'Stack',
    definition: 'Linear data structure that follows the Last-In, First-Out (LIFO) principle.',
    topic: 'Data Structures',
  },
  {
    id: 'cp-3',
    term: 'Queue',
    definition: 'Linear data structure following the First-In, First-Out (FIFO) principle.',
    topic: 'Data Structures',
  },
  {
    id: 'cp-4',
    term: 'Dynamic Programming',
    definition: 'Optimization method solving complex problems by breaking them into overlapping subproblems.',
    topic: 'Algorithms',
  },
  {
    id: 'cp-5',
    term: 'Hash Map',
    definition: 'Associative array indexing key-value pairs using a hash function for average O(1) lookups.',
    topic: 'Data Structures',
  },
  {
    id: 'cp-6',
    term: 'Graph',
    definition: 'Non-linear data structure consisting of a set of vertices connected by edges.',
    topic: 'Data Structures',
  },
  {
    id: 'cp-7',
    term: 'Memoization',
    definition: 'Top-down caching technique that stores function results for identical inputs.',
    topic: 'Optimization',
  },
  {
    id: 'cp-8',
    term: 'Breadth-First Search (BFS)',
    definition: 'Graph traversal algorithm visiting all neighboring vertices at current depth before moving deeper.',
    topic: 'Graph Theory',
  },
];

export interface ConceptMatchRound {
  terms: { id: string; term: string }[];
  definitions: { id: string; definition: string }[];
}

/**
 * Pure function: Generates a randomized concept match round.
 */
export function generateConceptMatchRound(
  count = 4,
  bank = CONCEPT_PAIRS_BANK
): ConceptMatchRound {
  const safeCount = Math.min(count, bank.length);
  const shuffledBank = [...bank].sort(() => 0.5 - Math.random()).slice(0, safeCount);

  const terms = shuffledBank.map((pair) => ({ id: pair.id, term: pair.term }));
  const definitions = shuffledBank
    .map((pair) => ({ id: pair.id, definition: pair.definition }))
    .sort(() => 0.5 - Math.random());

  return { terms, definitions };
}

/**
 * Pure function: Evaluates student's matches on the server.
 */
export function verifyConceptMatches(
  matches: { termId: string; definitionId: string }[]
): {
  correctCount: number;
  totalCount: number;
  isPerfect: boolean;
  incorrectPairs: { termId: string; definitionId: string }[];
} {
  let correctCount = 0;
  const incorrectPairs: { termId: string; definitionId: string }[] = [];

  for (const match of matches) {
    if (match.termId === match.definitionId) {
      correctCount++;
    } else {
      incorrectPairs.push(match);
    }
  }

  return {
    correctCount,
    totalCount: matches.length,
    isPerfect: matches.length >= 4 && correctCount === matches.length,
    incorrectPairs,
  };
}

import crypto from 'crypto';

export interface ConceptMatchTokenPayload {
  roundId: string;
  studentId: string;
  termIds: string[];
  issuedAt: number;
}

export function createSignedRoundToken(
  payload: ConceptMatchTokenPayload,
  secret: string
): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

export function verifySignedRoundToken(
  token: string,
  secret: string,
  maxAgeMs = 5 * 60 * 1000 // 5 minutes
): { valid: boolean; payload?: ConceptMatchTokenPayload; error?: string } {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Missing or invalid token format' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'Malformed token structure' };
  }

  const [data, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64url');

  const sigBuf = Buffer.from(signature, 'utf8');
  const expBuf = Buffer.from(expectedSignature, 'utf8');

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false, error: 'Invalid token signature (forged token)' };
  }

  try {
    const jsonStr = Buffer.from(data, 'base64url').toString('utf8');
    const payload: ConceptMatchTokenPayload = JSON.parse(jsonStr);

    if (Date.now() - payload.issuedAt > maxAgeMs) {
      return { valid: false, error: 'Token expired' };
    }

    if (!payload.roundId || !Array.isArray(payload.termIds) || payload.termIds.length === 0) {
      return { valid: false, error: 'Invalid payload contents' };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, error: 'Corrupt token payload' };
  }
}
