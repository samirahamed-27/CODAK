'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensureStudentRecord } from '@/lib/auth/ensure-student';

export interface BossQuestion {
  id: number;
  module: string;
  question: string;
  options: string[];
  correctOptionIndex: number; // Server-only validation
  explanation: string;
}

export const BOSS_BATTLE_QUESTIONS: BossQuestion[] = [
  {
    id: 1,
    module: 'Data Structures',
    question: 'What is the tight worst-case time complexity of inserting into a Min-Heap of size N?',
    options: ['O(1)', 'O(log N)', 'O(N)', 'O(N log N)'],
    correctOptionIndex: 1,
    explanation: 'Heap insertion appends at the bottom and bubbles up along the height of the binary heap tree (log N levels).',
  },
  {
    id: 2,
    module: 'Algorithms',
    question: 'Which algorithmic paradigm does Floyd-Warshall all-pairs shortest path use?',
    options: ['Greedy', 'Dynamic Programming', 'Divide and Conquer', 'Backtracking'],
    correctOptionIndex: 1,
    explanation: 'Floyd-Warshall iteratively solves subproblems DP[i][j][k] comparing direct edges with intermediate vertex k.',
  },
  {
    id: 3,
    module: 'DBMS',
    question: 'In database ACID properties, which property ensures transactions survive system crashes?',
    options: ['Atomicity', 'Consistency', 'Isolation', 'Durability'],
    correctOptionIndex: 3,
    explanation: 'Durability guarantees that once a transaction commits, its writes persist in write-ahead logs and storage even during system crashes.',
  },
  {
    id: 4,
    module: 'Operating Systems',
    question: 'Which of the following is NOT one of Coffman’s four necessary conditions for deadlock?',
    options: ['Mutual Exclusion', 'Hold and Wait', 'Preemption Allowed', 'Circular Wait'],
    correctOptionIndex: 2,
    explanation: 'Deadlock requires "No Preemption" (resources cannot be forcibly taken). If preemption is allowed, deadlock is broken.',
  },
  {
    id: 5,
    module: 'Computer Networks',
    question: 'In TCP 3-way handshake, what is the exact flag sequence sent between client and server?',
    options: ['SYN -> SYN-ACK -> ACK', 'ACK -> SYN -> ACK', 'SYN -> ACK -> FIN', 'FIN -> ACK -> FIN-ACK'],
    correctOptionIndex: 0,
    explanation: 'The client sends SYN, the server replies with SYN-ACK, and the client finishes handshaking with ACK.',
  },
  {
    id: 6,
    module: 'Data Structures',
    question: 'In an AVL tree, what is the maximum permitted absolute difference between left and right subtree heights?',
    options: ['0', '1', '2', 'log N'],
    correctOptionIndex: 1,
    explanation: 'The AVL balance factor must strictly remain in {-1, 0, +1}, meaning a height difference no greater than 1.',
  },
  {
    id: 7,
    module: 'Algorithms',
    question: 'What is the optimal recurrence relation for the 0/1 Knapsack problem with weights w and values v?',
    options: [
      'dp[i][w] = max(dp[i-1][w], v[i] + dp[i-1][w - w[i]])',
      'dp[i][w] = dp[i-1][w] + dp[i-1][w - w[i]]',
      'dp[i][w] = min(dp[i-1][w], dp[i][w - w[i]])',
      'dp[i][w] = v[i] * dp[i-1][w - 1]',
    ],
    correctOptionIndex: 0,
    explanation: 'For item i, either exclude it (dp[i-1][w]) or include it if capacity permits (v[i] + dp[i-1][w - w[i]]).',
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

export interface ClientBossQuestion {
  id: number;
  module: string;
  question: string;
  options: string[];
}

export interface BossBattleSessionState {
  id: string;
  bossName: string;
  bossMaxHp: number;
  bossCurrentHp: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  timeLimitSeconds: number;
  timeSpentSeconds: number;
  status: 'in_progress' | 'won' | 'lost' | 'abandoned';
  scorePercentage: number;
  xpAwarded: number;
  startedAt: string;
}

/**
 * Starts or retrieves an active 20-minute pre-exam revision boss battle session.
 */
export async function startBossBattleAction(): Promise<{
  success: boolean;
  session?: BossBattleSessionState;
  questions: ClientBossQuestion[];
  error?: string;
}> {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    return {
      success: false,
      questions: [],
      error: 'Please log in to challenge the Pre-Exam Boss Battle.',
    };
  }

  const adminClient = createAdminClient();
  await ensureStudentRecord(adminClient, user);

  // Check for an in-progress session created in the last 20 minutes (1200 seconds)
  const twentyMinsAgo = new Date(Date.now() - 1200 * 1000).toISOString();
  const { data: existing } = await adminClient
    .from('boss_battle_sessions')
    .select('*')
    .eq('student_id', user.id)
    .eq('status', 'in_progress')
    .gte('started_at', twentyMinsAgo)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let sessionRow = existing;

  if (!sessionRow) {
    const { data: created, error } = await adminClient
      .from('boss_battle_sessions')
      .insert({
        student_id: user.id,
        boss_name: 'The Semester Gorgon (Final Boss)',
        boss_max_hp: 100,
        boss_current_hp: 100,
        total_questions: BOSS_BATTLE_QUESTIONS.length,
        correct_answers: 0,
        wrong_answers: 0,
        time_limit_seconds: 1200,
        time_spent_seconds: 0,
        status: 'in_progress',
        score_percentage: 0,
        xp_awarded: 0,
      })
      .select('*')
      .single();

    if (error || !created) {
      return { success: false, questions: [], error: 'Failed to initialize Boss Battle session.' };
    }
    sessionRow = created;
  }

  // Sanitize questions (strip correct answers for client delivery)
  const clientQuestions: ClientBossQuestion[] = BOSS_BATTLE_QUESTIONS.map((q) => ({
    id: q.id,
    module: q.module,
    question: q.question,
    options: q.options,
  }));

  const sessionState: BossBattleSessionState = {
    id: sessionRow.id,
    bossName: sessionRow.boss_name,
    bossMaxHp: sessionRow.boss_max_hp,
    bossCurrentHp: sessionRow.boss_current_hp,
    totalQuestions: sessionRow.total_questions,
    correctAnswers: sessionRow.correct_answers,
    wrongAnswers: sessionRow.wrong_answers,
    timeLimitSeconds: sessionRow.time_limit_seconds,
    timeSpentSeconds: sessionRow.time_spent_seconds,
    status: sessionRow.status,
    scorePercentage: sessionRow.score_percentage,
    xpAwarded: sessionRow.xp_awarded,
    startedAt: sessionRow.started_at,
  };

  return {
    success: true,
    session: sessionState,
    questions: clientQuestions,
  };
}

/**
 * Validates a single question attack in the Boss Battle:
 * Deals 7 HP damage per correct answer (15 * 7 = 105 HP max damage).
 */
export async function submitBossBattleAnswerAction(payload: {
  sessionId: string;
  questionId: number;
  selectedOptionIndex: number;
  timeSpentSeconds: number;
}): Promise<{
  success: boolean;
  isCorrect?: boolean;
  explanation?: string;
  bossHp?: number;
  correctAnswers?: number;
  wrongAnswers?: number;
  error?: string;
}> {
  const adminClient = createAdminClient();

  const { data: session } = await adminClient
    .from('boss_battle_sessions')
    .select('*')
    .eq('id', payload.sessionId)
    .maybeSingle();

  if (!session) {
    return { success: false, error: 'Boss Battle session not found.' };
  }

  if (session.status !== 'in_progress') {
    return { success: false, error: 'Session has already concluded.' };
  }

  const q = BOSS_BATTLE_QUESTIONS.find((item) => item.id === payload.questionId);
  if (!q) {
    return { success: false, error: 'Question not found in battle syllabus.' };
  }

  const isCorrect = payload.selectedOptionIndex === q.correctOptionIndex;
  const damagePerQuestion = 7;
  const newHp = isCorrect ? Math.max(0, session.boss_current_hp - damagePerQuestion) : session.boss_current_hp;
  const newCorrect = isCorrect ? session.correct_answers + 1 : session.correct_answers;
  const newWrong = !isCorrect ? session.wrong_answers + 1 : session.wrong_answers;

  await adminClient
    .from('boss_battle_sessions')
    .update({
      boss_current_hp: newHp,
      correct_answers: newCorrect,
      wrong_answers: newWrong,
      time_spent_seconds: payload.timeSpentSeconds,
    })
    .eq('id', session.id);

  return {
    success: true,
    isCorrect,
    explanation: q.explanation,
    bossHp: newHp,
    correctAnswers: newCorrect,
    wrongAnswers: newWrong,
  };
}

/**
 * Finalizes the Boss Battle sprint:
 * If Boss HP == 0 (or >= 12 correct out of 15), awards +100 XP and unlocks 'boss_slayer' badge!
 */
export async function finalizeBossBattleAction(sessionId: string): Promise<{
  success: boolean;
  won: boolean;
  bossHp: number;
  correctAnswers: number;
  scorePercentage: number;
  xpAwarded: number;
  badgeUnlocked?: string;
  error?: string;
}> {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    return { success: false, won: false, bossHp: 100, correctAnswers: 0, scorePercentage: 0, xpAwarded: 0, error: 'Unauthorized.' };
  }

  const adminClient = createAdminClient();

  const { data: session } = await adminClient
    .from('boss_battle_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('student_id', user.id)
    .single();

  if (!session) {
    return { success: false, won: false, bossHp: 100, correctAnswers: 0, scorePercentage: 0, xpAwarded: 0, error: 'Session not found.' };
  }

  const scorePercentage = Math.round((session.correct_answers / session.total_questions) * 100);
  const won = session.boss_current_hp <= 0 || session.correct_answers >= 11;
  let xpAwarded = 0;
  let badgeUnlocked: string | undefined;

  if (won) {
    const today = new Date().toISOString().split('T')[0];
    const refId = `BOSS_BATTLE_${sessionId.slice(0, 8)}_${today}`;

    // 1. Award +100 XP via award_xp stored procedure
    try {
      const { data: xpRes } = await adminClient.rpc('award_xp', {
        p_student_id: user.id,
        p_action_type: 'BOSS_BATTLE_WIN',
        p_reference_id: refId,
        p_extra_units: 0,
      });

      if (xpRes && (xpRes.status === 'awarded' || xpRes.status === 'success')) {
        xpAwarded = 100;
      }
    } catch (xpErr) {
      console.error('Failed to award boss battle XP:', xpErr);
    }

    // 2. Unlock 'boss_slayer' badge in student_badges
    try {
      await adminClient.from('student_badges').upsert(
        {
          student_id: user.id,
          badge_code: 'boss_slayer',
          earned_at: new Date().toISOString(),
        },
        { onConflict: 'student_id,badge_code' }
      );
      badgeUnlocked = 'boss_slayer';
    } catch (badgeErr) {
      console.error('Failed to unlock boss_slayer badge:', badgeErr);
    }
  }

  // Update session record
  await adminClient
    .from('boss_battle_sessions')
    .update({
      status: won ? 'won' : 'lost',
      score_percentage: scorePercentage,
      xp_awarded: xpAwarded,
      completed_at: new Date().toISOString(),
    })
    .eq('id', session.id);

  return {
    success: true,
    won,
    bossHp: session.boss_current_hp,
    correctAnswers: session.correct_answers,
    scorePercentage,
    xpAwarded,
    badgeUnlocked,
  };
}
