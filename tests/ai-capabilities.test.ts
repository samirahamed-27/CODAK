import { describe, it, expect } from 'vitest';
import { askStudyBuddyAction } from '@/app/actions/ai-study-buddy';

describe('CODAK Phase 4: AI Capabilities & Regional Inclusivity Unit Tests', () => {
  it('generates pedagogical Study Buddy explanations in English for wrong answers', async () => {
    const res = await askStudyBuddyAction({
      questionText: 'What is the optimal substructure property in Dynamic Programming?',
      topic: 'Dynamic Programming',
      options: [
        { id: 'A', text: 'An optimal solution to the problem contains optimal solutions to subproblems' },
        { id: 'B', text: 'Subproblems can be solved completely independently without sharing state' },
        { id: 'C', text: 'The problem can only be solved using greedy choices' },
        { id: 'D', text: 'All subproblems have strictly linear time complexity' },
      ],
      selectedOption: 'B',
      correctOption: 'A',
      explanation: 'Optimal substructure means optimal solutions to subproblems combine into an optimal overall solution.',
      language: 'en',
    });

    expect(res.success).toBe(true);
    expect(res.language).toBe('en');
    expect(res.hint).toBeTruthy();
    expect(res.hint.length).toBeGreaterThan(20);
    // Should mention the correct option
    expect(res.hint).toContain('Option A');
  });

  it('generates warm, conversational Hinglish explanations for regional inclusivity', async () => {
    const res = await askStudyBuddyAction({
      questionText: 'In Binary Search, why must the array be sorted beforehand?',
      topic: 'Binary Search',
      options: [
        { id: 'A', text: 'Because unsorted arrays cannot be stored in RAM' },
        { id: 'B', text: 'To ensure dividing at the middle element deterministically halves the search space' },
        { id: 'C', text: 'To allow O(1) random memory addressing' },
        { id: 'D', text: 'Because compilers reject binary search on unsorted vectors' },
      ],
      selectedOption: 'A',
      correctOption: 'B',
      explanation: 'Sorting guarantees that elements before mid are smaller and after mid are larger, allowing halving.',
      language: 'hinglish',
    });

    expect(res.success).toBe(true);
    expect(res.language).toBe('hinglish');
    expect(res.hint).toBeTruthy();
    // Conversational Indian Hinglish keywords
    const hasHinglishMarkers =
      res.hint.includes('Dekho') ||
      res.hint.includes('dost') ||
      res.hint.includes('kyunki') ||
      res.hint.includes('Bhai') ||
      res.hint.includes('Arre') ||
      res.hint.includes('fikr');
    expect(hasHinglishMarkers).toBe(true);
    expect(res.hint).toContain('Option B');
  });

  it('validates structured question generation schema constraints', () => {
    const validateQuestionSchema = (q: {
      questionText: string;
      optionA: string;
      optionB: string;
      optionC: string;
      optionD: string;
      correctOption: string;
      explanation: string;
    }) => {
      if (!q.questionText || q.questionText.trim().length === 0) return false;
      const opts = [q.optionA, q.optionB, q.optionC, q.optionD];
      const uniqueOpts = new Set(opts.map((o) => o.trim().toLowerCase()));
      if (uniqueOpts.size !== 4) return false;
      if (!['A', 'B', 'C', 'D'].includes(q.correctOption)) return false;
      if (!q.explanation || q.explanation.trim().length === 0) return false;
      return true;
    };

    const validQ = {
      questionText: 'What is the time complexity of searching in an AVL tree with N nodes?',
      optionA: 'O(N)',
      optionB: 'O(log N)',
      optionC: 'O(N log N)',
      optionD: 'O(1)',
      correctOption: 'B',
      explanation: 'AVL trees maintain strict height balance factor between -1 and +1, guaranteeing O(log N) height.',
    };

    const duplicateOptsQ = {
      questionText: 'Test question with duplicates',
      optionA: 'O(log N)',
      optionB: 'O(log N)', // duplicate!
      optionC: 'O(N)',
      optionD: 'O(1)',
      correctOption: 'A',
      explanation: 'Invalid due to duplicate options.',
    };

    expect(validateQuestionSchema(validQ)).toBe(true);
    expect(validateQuestionSchema(duplicateOptsQ)).toBe(false);
  });
});
