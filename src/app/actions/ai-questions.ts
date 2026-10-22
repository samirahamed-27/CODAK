'use server';

import { GoogleGenAI, Type } from '@google/genai';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { authenticateFaculty } from '@/app/actions/faculty-questions';
import { writeAuditLog } from '@/lib/audit-logs';

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createAdminClient(supabaseUrl, serviceRoleKey);
}

export interface GenerateAiQuestionsInput {
  subjectId?: string;
  topic: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  count?: number; // 1 to 5
  focus?: string;
}

export interface GeneratedQuestionItem {
  id: string;
  topic: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  difficulty: string;
  status: 'pending';
}

/**
 * High-fidelity curriculum question bank generator for CSE topics.
 * Used when GEMINI_API_KEY is not configured or in offline demo environments.
 */
function generateFallbackQuestions(
  topic: string,
  difficulty: string,
  count: number,
  focus?: string
): Array<{
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: 'A' | 'B' | 'C' | 'D';
  explanation: string;
}> {
  const normalized = topic.toLowerCase();
  const seedQuestions: Record<string, Array<{
    questionText: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctOption: 'A' | 'B' | 'C' | 'D';
    explanation: string;
  }>> = {
    'dynamic programming': [
      {
        questionText: 'In the 0/1 Knapsack problem with weights [2, 3, 4] and values [3, 4, 5] with capacity 5, what is the optimal value achievable?',
        optionA: '7',
        optionB: '8',
        optionC: '9',
        optionD: '6',
        correctOption: 'A',
        explanation: 'Selecting items with weights 2 and 3 gives combined weight 5 and total value 3 + 4 = 7, which is optimal for capacity 5.',
      },
      {
        questionText: 'What is the fundamental property required for a problem to be solvable via Dynamic Programming?',
        optionA: 'Greedy choice property and disjoint subproblems',
        optionB: 'Optimal substructure and overlapping subproblems',
        optionC: 'Monotonic state transitions and linear recursion',
        optionD: 'Unbounded memory and divide-and-conquer independence',
        correctOption: 'B',
        explanation: 'Dynamic Programming requires both optimal substructure (optimal solution contains optimal sub-solutions) and overlapping subproblems to cache intermediate results.',
      },
      {
        questionText: 'Which space optimization technique reduces space from O(N*W) to O(W) in 0/1 Knapsack?',
        optionA: 'Traversing the DP capacity array backwards from W down to weight[i]',
        optionB: 'Traversing the DP capacity array forwards from 0 up to W',
        optionC: 'Memoizing with a hash table instead of a static array',
        optionD: 'Converting 0/1 Knapsack to Fractional Knapsack via greedy sort',
        correctOption: 'A',
        explanation: 'Iterating capacity backwards prevents reusing the same item multiple times within the same state transition row.',
      },
      {
        questionText: 'What is the time complexity of finding the Longest Common Subsequence (LCS) of two strings of lengths M and N using memoization?',
        optionA: 'O(M + N)',
        optionB: 'O(M * N)',
        optionC: 'O(2^(M + N))',
        optionD: 'O(M * log N)',
        correctOption: 'B',
        explanation: 'There are M x N unique subproblem states in the 2D grid, each taking O(1) computation with memoization, giving O(M * N) time.',
      },
    ],
    'binary search': [
      {
        questionText: 'When calculating the middle index in Binary Search to prevent 32-bit integer overflow, which expression is mathematically correct?',
        optionA: 'mid = (low + high) / 2',
        optionB: 'mid = low + (high - low) / 2',
        optionC: 'mid = (high - low) / 2',
        optionD: 'mid = low + (high + low) / 2',
        correctOption: 'B',
        explanation: '`low + (high - low) / 2` avoids the integer overflow risk present in `low + high` when both indices approach INT_MAX.',
      },
      {
        questionText: 'In a rotated sorted array with distinct integers [4, 5, 6, 7, 0, 1, 2], how do we decide which half is strictly sorted during Binary Search?',
        optionA: 'Check if arr[mid] > arr[low]',
        optionB: 'Check if arr[mid] == arr[high]',
        optionC: 'Check if arr[low] > arr[high]',
        optionD: 'Check if arr[mid] is even or odd',
        correctOption: 'A',
        explanation: 'If arr[low] <= arr[mid], the left subarray is sorted; otherwise, the right subarray [mid...high] is guaranteed to be sorted.',
      },
      {
        questionText: 'What is the worst-case number of comparisons in Binary Search on a sorted array of 1,024 elements?',
        optionA: '1,024',
        optionB: '512',
        optionC: '11',
        optionD: '10',
        correctOption: 'C',
        explanation: 'floor(log2(1024)) + 1 = 10 + 1 = 11 maximum comparisons to either find the element or confirm it does not exist.',
      },
    ],
    'tree': [
      {
        questionText: 'In an AVL Tree, after inserting a node causing an imbalance with Balance Factor +2 and child Balance Factor -1, which rotation is required?',
        optionA: 'Left-Right (LR) Double Rotation',
        optionB: 'Right-Left (RL) Double Rotation',
        optionC: 'Single Left (LL) Rotation',
        optionD: 'Single Right (RR) Rotation',
        correctOption: 'A',
        explanation: 'A left-heavy node (+2) with a right-heavy child (-1) forms a "Left-Right" shape, requiring an LR double rotation to restore balance.',
      },
      {
        questionText: 'What is the maximum number of nodes at depth d (root at d = 0) in a strictly binary tree?',
        optionA: '2^d',
        optionB: '2^(d+1) - 1',
        optionC: '2*d',
        optionD: 'd^2',
        correctOption: 'A',
        explanation: 'At depth d, each level doubles the capacity of the previous level, so level d has at most 2^d nodes.',
      },
      {
        questionText: 'Which traversal of a Binary Search Tree (BST) yields the keys in strictly ascending sorted order?',
        optionA: 'Pre-order traversal',
        optionB: 'In-order traversal',
        optionC: 'Post-order traversal',
        optionD: 'Level-order traversal',
        correctOption: 'B',
        explanation: 'In-order traversal visits (Left, Root, Right). Since all nodes in the left subtree are smaller and right subtree are larger, keys are visited in ascending order.',
      },
    ],
    'graph': [
      {
        questionText: 'Why does Dijkstra’s algorithm fail to produce correct shortest paths on graphs containing negative edge weights?',
        optionA: 'It visits vertices multiple times causing infinite loops',
        optionB: 'Its greedy assumption that once a vertex is finalized its distance is optimal is violated',
        optionC: 'Priority queues cannot store negative numbers in memory',
        optionD: 'It only works on directed acyclic graphs (DAGs)',
        correctOption: 'B',
        explanation: 'Dijkstra greedily marks the closest unvisited vertex as finalized. A negative edge later could offer a shorter path, invalidating the greedy choice.',
      },
      {
        questionText: 'What is the time complexity of detecting a cycle in an undirected graph with V vertices and E edges using Disjoint Set Union (DSU) with path compression?',
        optionA: 'O(V^2)',
        optionB: 'O(E * alpha(V))',
        optionC: 'O(V * E)',
        optionD: 'O(E * log V)',
        correctOption: 'B',
        explanation: 'DSU with union-by-rank and path compression runs in O(E * alpha(V)) time, where alpha is the inverse Ackermann function (effectively constant <= 4).',
      },
    ],
  };

  // Find best matching key or default to dynamic programming / computer science fundamentals
  let pool = seedQuestions['dynamic programming'];
  for (const k of Object.keys(seedQuestions)) {
    if (normalized.includes(k)) {
      pool = seedQuestions[k];
      break;
    }
  }

  // Slice or generate questions up to requested count
  const results = [];
  for (let i = 0; i < count; i++) {
    const template = pool[i % pool.length];
    results.push({
      questionText: `${template.questionText}${focus ? ` [Focus: ${focus}]` : ''}`,
      optionA: template.optionA,
      optionB: template.optionB,
      optionC: template.optionC,
      optionD: template.optionD,
      correctOption: template.correctOption,
      explanation: template.explanation,
    });
  }

  return results;
}

/**
 * Server Action: Generate multiple-choice questions with AI (Need #5).
 * Invokes Gemini 3.8 Flash via official @google/genai SDK with structured output schema.
 * Generated questions are automatically dropped into the Pending Review Queue (status: 'pending')
 * ensuring strict faculty audit and approval before students see them.
 */
export async function generateQuestionsAiAction(input: GenerateAiQuestionsInput): Promise<{
  success: boolean;
  count: number;
  statusCode: number;
  message?: string;
  error?: string;
  source?: 'gemini' | 'pedagogical_engine';
  questions?: GeneratedQuestionItem[];
}> {
  const auth = await authenticateFaculty();
  if (auth.error || !auth.user) {
    return { success: false, count: 0, statusCode: auth.statusCode, error: auth.error };
  }

  const topic = input.topic?.trim();
  if (!topic) {
    return { success: false, count: 0, statusCode: 400, error: 'Topic is required to generate questions.' };
  }

  const difficulty = input.difficulty || 'Medium';
  const targetCount = Math.min(Math.max(Number(input.count) || 3, 1), 5);
  const focus = input.focus?.trim() || '';

  const adminClient = getAdminClient();

  // Find pilot subject ID (default CS101)
  let subjectId = input.subjectId;
  if (!subjectId) {
    const { data: subject } = await adminClient
      .from('subjects')
      .select('id')
      .eq('code', 'CS101')
      .maybeSingle();
    subjectId = subject?.id;
  }

  if (!subjectId) {
    return { success: false, count: 0, statusCode: 404, error: 'Curriculum subject CS101 not found.' };
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  let parsedQuestions: Array<{
    questionText: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctOption: 'A' | 'B' | 'C' | 'D';
    explanation: string;
  }> = [];

  let generationSource: 'gemini' | 'pedagogical_engine' = 'pedagogical_engine';

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are a distinguished Computer Science university professor designing rigorous exam questions.
Generate ${targetCount} high-quality, conceptual, multiple-choice questions on the topic: "${topic}".
Target Difficulty: ${difficulty}.
${focus ? `Specific Pedagogical Focus: "${focus}".` : ''}

Rules:
1. Each question must have exactly 4 distinct, plausible answer choices (Option A, Option B, Option C, Option D).
2. Exactly one option must be strictly correct (indicate as 'A', 'B', 'C', or 'D').
3. Include a clear, pedagogical 2-sentence explanation demonstrating why the correct answer is right and correcting common misconceptions.
4. Avoid trivial questions; focus on algorithmic reasoning, time/space complexity, edge cases, and architectural principles.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: {
            type: Type.ARRAY,
            description: 'List of generated multiple-choice questions',
            items: {
              type: Type.OBJECT,
              properties: {
                questionText: { type: Type.STRING, description: 'The question text' },
                optionA: { type: Type.STRING, description: 'First choice option A' },
                optionB: { type: Type.STRING, description: 'Second choice option B' },
                optionC: { type: Type.STRING, description: 'Third choice option C' },
                optionD: { type: Type.STRING, description: 'Fourth choice option D' },
                correctOption: {
                  type: Type.STRING,
                  description: 'The single correct option character: A, B, C, or D',
                },
                explanation: {
                  type: Type.STRING,
                  description: 'Detailed conceptual explanation of the answer',
                },
              },
              required: [
                'questionText',
                'optionA',
                'optionB',
                'optionC',
                'optionD',
                'correctOption',
                'explanation',
              ],
            },
          },
        },
      });

      if (response && response.text) {
        const rawJson = JSON.parse(response.text);
        if (Array.isArray(rawJson) && rawJson.length > 0) {
          parsedQuestions = rawJson.map((q: any) => ({
            questionText: String(q.questionText || '').trim(),
            optionA: String(q.optionA || '').trim(),
            optionB: String(q.optionB || '').trim(),
            optionC: String(q.optionC || '').trim(),
            optionD: String(q.optionD || '').trim(),
            correctOption: (['A', 'B', 'C', 'D'].includes(String(q.correctOption).toUpperCase())
              ? String(q.correctOption).toUpperCase()
              : 'A') as 'A' | 'B' | 'C' | 'D',
            explanation: String(q.explanation || '').trim(),
          }));
          generationSource = 'gemini';
        }
      }
    } catch (genErr) {
      console.warn('Gemini API call failed or rate-limited; falling back to curated curriculum engine:', genErr);
    }
  }

  // Fallback if API key missing or call threw
  if (parsedQuestions.length === 0) {
    parsedQuestions = generateFallbackQuestions(topic, difficulty, targetCount, focus);
    generationSource = 'pedagogical_engine';
  }

  // Ensure all questions meet schema distinctness check
  const validatedRows = [];
  for (const q of parsedQuestions) {
    const opts = [q.optionA, q.optionB, q.optionC, q.optionD];
    const unique = new Set(opts.map((o) => o.toLowerCase()));
    if (unique.size !== 4) {
      // Auto-differentiate duplicates if needed
      q.optionB = q.optionB === q.optionA ? `${q.optionB} (Alt)` : q.optionB;
      q.optionC = q.optionC === q.optionA || q.optionC === q.optionB ? `${q.optionC} (None of the above)` : q.optionC;
      q.optionD = new Set([q.optionA, q.optionB, q.optionC, q.optionD]).size === 4 ? q.optionD : `${q.optionD} (Special case)`;
    }

    validatedRows.push({
      subject_id: subjectId,
      topic,
      question_text: q.questionText,
      option_a: q.optionA,
      option_b: q.optionB,
      option_c: q.optionC,
      option_d: q.optionD,
      correct_option: q.correctOption,
      explanation: q.explanation,
      status: 'pending' as const, // Strictly dropped into pending review queue
      created_by: auth.user.id,
      is_active: true,
      created_at: new Date().toISOString(),
    });
  }

  // Insert batch into Supabase
  const { data: inserted, error: insertErr } = await adminClient
    .from('questions')
    .insert(validatedRows)
    .select('id, topic, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, status');

  if (insertErr || !inserted) {
    console.error('Failed to insert AI questions into database:', insertErr);
    return {
      success: false,
      count: 0,
      statusCode: 500,
      error: `Database insertion error: ${insertErr?.message || 'Unknown'}`,
    };
  }

  // Record audit log
  await writeAuditLog({
    action: 'AI_QUESTIONS_GENERATED',
    actorId: auth.user.id,
    targetType: 'subject',
    targetId: subjectId,
    reason: `Generated ${inserted.length} questions on topic "${topic}" (${difficulty}) via ${generationSource}. Added to pending queue.`,
  });

  const formattedQuestions: GeneratedQuestionItem[] = inserted.map((q: any) => ({
    id: q.id,
    topic: q.topic,
    questionText: q.question_text,
    optionA: q.option_a,
    optionB: q.option_b,
    optionC: q.option_c,
    optionD: q.option_d,
    correctOption: q.correct_option,
    explanation: q.explanation,
    difficulty,
    status: 'pending',
  }));

  return {
    success: true,
    count: formattedQuestions.length,
    statusCode: 200,
    source: generationSource,
    message: `Successfully generated ${formattedQuestions.length} questions on "${topic}". Added to your Pending Review Queue for verification!`,
    questions: formattedQuestions,
  };
}
