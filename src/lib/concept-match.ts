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
