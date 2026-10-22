export interface BossBattleQuestion {
  id: number;
  module: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export interface ClientBossQuestion {
  id: number;
  module: string;
  question: string;
  options: string[];
}

export const BOSS_BATTLE_QUESTIONS: BossBattleQuestion[] = [
  {
    id: 1,
    module: 'Data Structures',
    question: 'What is the worst-case time complexity of searching for an element in a Red-Black Tree with N nodes?',
    options: ['O(1)', 'O(log N)', 'O(N)', 'O(N log N)'],
    correctOptionIndex: 1,
    explanation: 'A Red-Black Tree is self-balancing with maximum height 2 * log2(N + 1), guaranteeing O(log N) search in the worst case.',
  },
  {
    id: 2,
    module: 'Algorithms',
    question: 'Which algorithmic paradigm does the Floyd-Warshall all-pairs shortest path algorithm employ?',
    options: ['Greedy Approach', 'Dynamic Programming', 'Divide and Conquer', 'Backtracking'],
    correctOptionIndex: 1,
    explanation: 'Floyd-Warshall computes shortest paths through intermediate vertices using the dynamic programming recurrence dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j]).',
  },
  {
    id: 3,
    module: 'DBMS',
    question: 'Which ACID property guarantees that committed transactions survive subsequent system crashes or power failures?',
    options: ['Atomicity', 'Consistency', 'Isolation', 'Durability'],
    correctOptionIndex: 3,
    explanation: 'Durability ensures that once a transaction commits, its state changes are recorded in non-volatile write-ahead logs and persist through crashes.',
  },
  {
    id: 4,
    module: 'Operating Systems',
    question: 'Which condition is NOT one of Coffman’s four necessary conditions for a deadlock to occur?',
    options: ['Mutual Exclusion', 'Hold and Wait', 'Preemption Allowed', 'Circular Wait'],
    correctOptionIndex: 2,
    explanation: 'Deadlock requires NO preemption; allowing preemption eliminates deadlocks by revoking resources from waiting processes.',
  },
  {
    id: 5,
    module: 'Computer Networks',
    question: 'In TCP congestion control, what event causes the congestion window (cwnd) to drop to 1 MSS immediately?',
    options: ['Three duplicate ACKs', 'Retransmission Timeout (RTO)', 'Fast Recovery trigger', 'Delayed ACK timeout'],
    correctOptionIndex: 1,
    explanation: 'A Retransmission Timeout (RTO) represents severe network loss, resetting cwnd to 1 MSS and entering Slow Start.',
  },
  {
    id: 6,
    module: 'Data Structures',
    question: 'Which of the following operations takes O(1) amortized time in a Disjoint Set Union (DSU) with Path Compression and Union by Rank?',
    options: ['Finding minimum in set', 'Find and Union operations', 'Sorting set elements', 'Splitting sets'],
    correctOptionIndex: 1,
    explanation: 'With both path compression and union by rank, Find and Union run in nearly O(1) amortized time, specifically O(α(N)) where α is the inverse Ackermann function.',
  },
  {
    id: 7,
    module: 'Algorithms',
    question: 'In dynamic programming, what is the core difference between the Memoization and Tabulation approaches?',
    options: [
      'Memoization is top-down (recursive); Tabulation is bottom-up (iterative)',
      'Memoization requires more asymptotic time',
      'Tabulation only works for greedy problems',
      'Memoization cannot solve overlapping subproblems',
    ],
    correctOptionIndex: 0,
    explanation: 'Memoization solves recursively on-demand from top-down caching subproblem answers, while Tabulation iteratively fills an array bottom-up.',
  },
  {
    id: 8,
    module: 'DBMS',
    question: 'A table in 2NF must be in 1NF and additionally satisfy which condition?',
    options: [
      'No transitive dependencies',
      'No partial dependency of non-prime attributes on any candidate key',
      'Multivalued dependencies eliminated',
      'All columns must have unique indexes',
    ],
    correctOptionIndex: 1,
    explanation: '2NF requires eliminating partial dependencies where non-prime attributes depend only on a proper subset of a composite candidate key.',
  },
  {
    id: 9,
    module: 'Operating Systems',
    question: 'What page replacement algorithm suffers from Belady’s Anomaly?',
    options: ['LRU (Least Recently Used)', 'Optimal Page Replacement', 'FIFO (First-In, First-Out)', 'LFU (Least Frequently Used)'],
    correctOptionIndex: 2,
    explanation: 'FIFO is prone to Belady’s Anomaly, where allocating more physical frames can paradoxically increase page faults.',
  },
  {
    id: 10,
    module: 'Computer Networks',
    question: 'Which layer of the OSI model handles end-to-end flow control and error recovery?',
    options: ['Network Layer', 'Transport Layer', 'Data Link Layer', 'Session Layer'],
    correctOptionIndex: 1,
    explanation: 'The Transport layer (Layer 4, e.g. TCP) provides end-to-end communication, segmentation, flow control, and error recovery.',
  },
  {
    id: 11,
    module: 'Data Structures',
    question: 'What data structure is utilized in Dijkstra’s algorithm to achieve optimal O((V + E) log V) runtime?',
    options: ['Stack', 'Priority Queue / Min-Heap', 'Circular Queue', 'Hash Set'],
    correctOptionIndex: 1,
    explanation: 'A min-heap priority queue allows extracting the minimum distance vertex in O(log V) time.',
  },
  {
    id: 12,
    module: 'Algorithms',
    question: 'What is the average time complexity of QuickSelect to find the k-th smallest element in an unsorted array?',
    options: ['O(log N)', 'O(N)', 'O(N log N)', 'O(N^2)'],
    correctOptionIndex: 1,
    explanation: 'On average, partitioning halves the search interval each step: N + N/2 + N/4 + ... = 2N, giving O(N) linear time.',
  },
  {
    id: 13,
    module: 'DBMS',
    question: 'What isolation level in SQL standard guarantees prevention of Dirty Read, Non-Repeatable Read, AND Phantom Read?',
    options: ['Read Committed', 'Repeatable Read', 'Serializable', 'Snapshot Read'],
    correctOptionIndex: 2,
    explanation: 'Serializable is the highest isolation level and prevents all three concurrency phenomena.',
  },
  {
    id: 14,
    module: 'Operating Systems',
    question: 'What is the primary purpose of the Translation Lookaside Buffer (TLB)?',
    options: [
      'To store dirty disk blocks',
      'To cache recent virtual-to-physical address translations',
      'To schedule CPU kernel threads',
      'To detect memory leaks in user processes',
    ],
    correctOptionIndex: 1,
    explanation: 'The TLB is a high-speed hardware MMU associative cache that stores recently resolved virtual-to-physical frame numbers.',
  },
  {
    id: 15,
    module: 'Computer Networks',
    question: 'What is the default port number used by HTTPS with TLS encryption?',
    options: ['80', '8080', '443', '22'],
    correctOptionIndex: 2,
    explanation: 'Standard unencrypted HTTP operates on port 80, while encrypted HTTPS operates on port 443.',
  },
];

export const CLIENT_BOSS_QUESTIONS: ClientBossQuestion[] = BOSS_BATTLE_QUESTIONS.map((q) => ({
  id: q.id,
  module: q.module,
  question: q.question,
  options: q.options,
}));
