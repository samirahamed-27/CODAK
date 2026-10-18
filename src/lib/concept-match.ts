export interface ConceptPair {
  id: string;
  term: string;
  definition: string;
  topic: string;
  explanation: string;
}

export const CONCEPT_PAIRS_BANK: ConceptPair[] = [
  {
    id: 'cp-1',
    term: 'Binary Search',
    definition: 'Divide-and-conquer search algorithm operating on sorted collections in O(log n) time.',
    topic: 'Algorithms',
    explanation: 'Binary search repeatedly halves the search space by comparing the target value to the middle element. It requires the underlying collection to be sorted.',
  },
  {
    id: 'cp-2',
    term: 'Stack',
    definition: 'Linear data structure that follows the Last-In, First-Out (LIFO) principle.',
    topic: 'Data Structures',
    explanation: 'Elements are added and removed from the top only (LIFO). Stacks power runtime execution call stacks, undo mechanisms, and backtracking algorithms.',
  },
  {
    id: 'cp-3',
    term: 'Queue',
    definition: 'Linear data structure following the First-In, First-Out (FIFO) principle.',
    topic: 'Data Structures',
    explanation: 'Elements are enqueued at the tail and dequeued from the head (FIFO). Queues model task scheduling, IO buffers, and BFS level-order traversals.',
  },
  {
    id: 'cp-4',
    term: 'Dynamic Programming',
    definition: 'Optimization method solving complex problems by breaking them into overlapping subproblems.',
    topic: 'Algorithms',
    explanation: 'Dynamic Programming avoids redundant work by memoizing solutions to overlapping subproblems, often transforming exponential time into polynomial time.',
  },
  {
    id: 'cp-5',
    term: 'Hash Map',
    definition: 'Associative array indexing key-value pairs using a hash function for average O(1) lookups.',
    topic: 'Data Structures',
    explanation: 'A hash function computes an array bucket index from the key. Collisions are handled via chaining or open addressing to deliver O(1) amortized performance.',
  },
  {
    id: 'cp-6',
    term: 'Graph',
    definition: 'Non-linear data structure consisting of a set of vertices connected by edges.',
    topic: 'Data Structures',
    explanation: 'Graphs represent relationships between objects (directed, undirected, or weighted), widely utilized for social networks, dependency trees, and routing.',
  },
  {
    id: 'cp-7',
    term: 'Memoization',
    definition: 'Top-down caching technique that stores function results for identical inputs.',
    topic: 'Optimization',
    explanation: 'Memoization intercepts recursive calls and looks up previous inputs in a cache table, skipping re-computation of already solved states.',
  },
  {
    id: 'cp-8',
    term: 'Breadth-First Search (BFS)',
    definition: 'Graph traversal algorithm visiting all neighboring vertices at current depth before moving deeper.',
    topic: 'Graph Theory',
    explanation: 'BFS uses a FIFO queue to visit vertices layer by layer, guaranteeing the minimum number of edge transitions to find the shortest path in unweighted graphs.',
  },
  {
    id: 'cp-9',
    term: 'Depth-First Search (DFS)',
    definition: 'Graph traversal algorithm exploring as far as possible along each branch before backtracking.',
    topic: 'Graph Theory',
    explanation: 'DFS uses a stack or recursion to dive deep into a path until a dead end is reached, making it ideal for topological sorting, cycle detection, and maze exploration.',
  },
  {
    id: 'cp-10',
    term: 'Trie',
    definition: 'Tree data structure where node edges represent characters for fast prefix searches.',
    topic: 'Data Structures',
    explanation: 'Tries store strings character by character along path branches, allowing prefix matching and dictionary lookups in O(m) time proportional to word length.',
  },
  {
    id: 'cp-11',
    term: 'Dijkstra\'s Algorithm',
    definition: 'Greedy single-source shortest path algorithm for graphs with non-negative edge weights.',
    topic: 'Graph Theory',
    explanation: 'Dijkstra maintains a priority queue of unvisited vertices, greedily expanding the closest node to compute proven shortest distances across weighted graphs.',
  },
  {
    id: 'cp-12',
    term: 'Quick Sort',
    definition: 'Divide-and-conquer sorting algorithm partitioning arrays around a chosen pivot element.',
    topic: 'Algorithms',
    explanation: 'Quick Sort partitions elements into subarrays smaller and larger than a pivot, achieving average O(n log n) sorting speed with in-place memory usage.',
  },
];

import crypto from 'crypto';

export interface ConceptMatchRound {
  terms: { id: string; term: string }[];
  definitions: { id: string; definition: string }[];
  mapping?: Record<string, string>; // termId -> definitionId (kept on server)
}

export interface ConceptMatchReviewItem {
  termId: string;
  term: string;
  correctDefinitionId: string;
  correctDefinition: string;
  userDefinitionId?: string;
  userDefinition?: string;
  isCorrect: boolean;
  explanation: string;
  topic: string;
}

/**
 * Pure function: Generates a randomized concept match round.
 * Option B: Generates separate, independent opaque random IDs for terms and definitions
 * so the client cannot derive or inspect pairings from the token IDs.
 */
export function generateConceptMatchRound(
  count = 4,
  bank = CONCEPT_PAIRS_BANK
): ConceptMatchRound & {
  mapping: Record<string, string>;
  explanations: Record<
    string,
    {
      term: string;
      definition: string;
      explanation: string;
      topic: string;
    }
  >;
} {
  const safeCount = Math.min(count, bank.length);
  const shuffledBank = [...bank].sort(() => 0.5 - Math.random()).slice(0, safeCount);

  const mapping: Record<string, string> = {};
  const explanations: Record<
    string,
    {
      term: string;
      definition: string;
      explanation: string;
      topic: string;
    }
  > = {};
  const terms: { id: string; term: string }[] = [];
  const definitions: { id: string; definition: string }[] = [];

  for (const pair of shuffledBank) {
    // Generate separate, uncorrelatable opaque random IDs
    const termId = `term_${crypto.randomUUID()}`;
    const defId = `def_${crypto.randomUUID()}`;
    mapping[termId] = defId;
    explanations[termId] = {
      term: pair.term,
      definition: pair.definition,
      explanation: pair.explanation,
      topic: pair.topic,
    };
    terms.push({ id: termId, term: pair.term });
    definitions.push({ id: defId, definition: pair.definition });
  }

  // Shuffle definitions so visual order does not correlate with terms
  const shuffledDefs = [...definitions].sort(() => 0.5 - Math.random());

  return { terms, definitions: shuffledDefs, mapping, explanations };
}

/**
 * Pure function: Evaluates student's matches on the server against server-side mapping.
 */
export function verifyConceptMatches(
  matches: { termId: string; definitionId: string }[],
  mapping?: Record<string, string>
): {
  correctCount: number;
  totalCount: number;
  isPerfect: boolean;
  incorrectPairs: { termId: string; definitionId: string }[];
} {
  let correctCount = 0;
  const incorrectPairs: { termId: string; definitionId: string }[] = [];

  if (!mapping || Object.keys(mapping).length === 0) {
    return {
      correctCount: 0,
      totalCount: matches.length,
      isPerfect: false,
      incorrectPairs: matches,
    };
  }

  const expectedCount = Object.keys(mapping).length;

  for (const match of matches) {
    if (mapping[match.termId] && mapping[match.termId] === match.definitionId) {
      correctCount++;
    } else {
      incorrectPairs.push(match);
    }
  }

  const isPerfect = matches.length >= expectedCount && correctCount === expectedCount;

  return {
    correctCount,
    totalCount: matches.length,
    isPerfect,
    incorrectPairs,
  };
}

export interface ConceptMatchTokenPayload {
  roundId: string;
  studentId: string;
  termIds: string[];
  mapping: Record<string, string>; // termId -> expected defId
  explanations?: Record<
    string,
    {
      term: string;
      definition: string;
      explanation: string;
      topic: string;
    }
  >;
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

    if (
      !payload.roundId ||
      !Array.isArray(payload.termIds) ||
      payload.termIds.length === 0 ||
      !payload.mapping ||
      typeof payload.mapping !== 'object'
    ) {
      return { valid: false, error: 'Invalid payload contents' };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, error: 'Corrupt token payload' };
  }
}
