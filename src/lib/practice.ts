export interface PracticeLink {
  id: string;
  platform: string;
  problem_id: string;
  title: string;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  link: string;
  created_at?: string;
}

export interface PracticeFilter {
  topic?: string;
  difficulty?: string;
  platform?: string;
  search?: string;
}

/**
 * 15 Curated Practice Links across 3 core topics (5 each: Easy, Medium, Hard).
 * Stores metadata and links only — NEVER problem statements.
 */
export const SEED_PRACTICE_LINKS: PracticeLink[] = [
  // TOPIC 1: Arrays & Strings
  {
    id: 'link-arr-1',
    platform: 'LeetCode',
    problem_id: 'leetcode:1',
    title: 'Two Sum',
    topic: 'Arrays & Strings',
    difficulty: 'Easy',
    link: 'https://leetcode.com/problems/two-sum/',
  },
  {
    id: 'link-arr-2',
    platform: 'LeetCode',
    problem_id: 'leetcode:121',
    title: 'Best Time to Buy and Sell Stock',
    topic: 'Arrays & Strings',
    difficulty: 'Easy',
    link: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/',
  },
  {
    id: 'link-arr-3',
    platform: 'LeetCode',
    problem_id: 'leetcode:15',
    title: '3Sum',
    topic: 'Arrays & Strings',
    difficulty: 'Medium',
    link: 'https://leetcode.com/problems/3sum/',
  },
  {
    id: 'link-arr-4',
    platform: 'Codeforces',
    problem_id: 'codeforces:158B',
    title: 'Taxi',
    topic: 'Arrays & Strings',
    difficulty: 'Medium',
    link: 'https://codeforces.com/problemset/problem/158/B',
  },
  {
    id: 'link-arr-5',
    platform: 'LeetCode',
    problem_id: 'leetcode:42',
    title: 'Trapping Rain Water',
    topic: 'Arrays & Strings',
    difficulty: 'Hard',
    link: 'https://leetcode.com/problems/trapping-rain-water/',
  },

  // TOPIC 2: Dynamic Programming
  {
    id: 'link-dp-1',
    platform: 'LeetCode',
    problem_id: 'leetcode:70',
    title: 'Climbing Stairs',
    topic: 'Dynamic Programming',
    difficulty: 'Easy',
    link: 'https://leetcode.com/problems/climbing-stairs/',
  },
  {
    id: 'link-dp-2',
    platform: 'HackerRank',
    problem_id: 'hackerrank:fibonacci-modified',
    title: 'Fibonacci Modified',
    topic: 'Dynamic Programming',
    difficulty: 'Easy',
    link: 'https://www.hackerrank.com/challenges/fibonacci-modified/problem',
  },
  {
    id: 'link-dp-3',
    platform: 'LeetCode',
    problem_id: 'leetcode:322',
    title: 'Coin Change',
    topic: 'Dynamic Programming',
    difficulty: 'Medium',
    link: 'https://leetcode.com/problems/coin-change/',
  },
  {
    id: 'link-dp-4',
    platform: 'Codeforces',
    problem_id: 'codeforces:455A',
    title: 'Boredom',
    topic: 'Dynamic Programming',
    difficulty: 'Medium',
    link: 'https://codeforces.com/problemset/problem/455/A',
  },
  {
    id: 'link-dp-5',
    platform: 'LeetCode',
    problem_id: 'leetcode:72',
    title: 'Edit Distance',
    topic: 'Dynamic Programming',
    difficulty: 'Hard',
    link: 'https://leetcode.com/problems/edit-distance/',
  },

  // TOPIC 3: Trees & Graphs
  {
    id: 'link-tg-1',
    platform: 'LeetCode',
    problem_id: 'leetcode:104',
    title: 'Maximum Depth of Binary Tree',
    topic: 'Trees & Graphs',
    difficulty: 'Easy',
    link: 'https://leetcode.com/problems/maximum-depth-of-binary-tree/',
  },
  {
    id: 'link-tg-2',
    platform: 'LeetCode',
    problem_id: 'leetcode:226',
    title: 'Invert Binary Tree',
    topic: 'Trees & Graphs',
    difficulty: 'Easy',
    link: 'https://leetcode.com/problems/invert-binary-tree/',
  },
  {
    id: 'link-tg-3',
    platform: 'LeetCode',
    problem_id: 'leetcode:200',
    title: 'Number of Islands',
    topic: 'Trees & Graphs',
    difficulty: 'Medium',
    link: 'https://leetcode.com/problems/number-of-islands/',
  },
  {
    id: 'link-tg-4',
    platform: 'Codeforces',
    problem_id: 'codeforces:520B',
    title: 'Two Buttons',
    topic: 'Trees & Graphs',
    difficulty: 'Medium',
    link: 'https://codeforces.com/problemset/problem/520/B',
  },
  {
    id: 'link-tg-5',
    platform: 'LeetCode',
    problem_id: 'leetcode:297',
    title: 'Serialize and Deserialize Binary Tree',
    topic: 'Trees & Graphs',
    difficulty: 'Hard',
    link: 'https://leetcode.com/problems/serialize-and-deserialize-binary-tree/',
  },
];

/**
 * Pure function: Filters practice links by topic, difficulty, platform, or search query.
 */
export function filterPracticeLinks(
  links: PracticeLink[],
  filter?: PracticeFilter
): PracticeLink[] {
  if (!filter) return links;

  return links.filter((link) => {
    if (filter.topic && filter.topic !== 'All' && link.topic !== filter.topic) {
      return false;
    }
    if (filter.difficulty && filter.difficulty !== 'All' && link.difficulty !== filter.difficulty) {
      return false;
    }
    if (filter.platform && filter.platform !== 'All' && link.platform !== filter.platform) {
      return false;
    }
    if (filter.search && filter.search.trim()) {
      const q = filter.search.toLowerCase().trim();
      const matchesTitle = link.title.toLowerCase().includes(q);
      const matchesId = link.problem_id.toLowerCase().includes(q);
      const matchesTopic = link.topic.toLowerCase().includes(q);
      if (!matchesTitle && !matchesId && !matchesTopic) return false;
    }
    return true;
  });
}

/**
 * Pure function: Groups links by topic.
 */
export function groupPracticeLinksByTopic(
  links: PracticeLink[]
): Record<string, PracticeLink[]> {
  const groups: Record<string, PracticeLink[]> = {};
  for (const link of links) {
    if (!groups[link.topic]) {
      groups[link.topic] = [];
    }
    groups[link.topic].push(link);
  }
  return groups;
}

/**
 * Validates that a practice link strictly contains metadata and no unauthorized statement content.
 */
export function validatePracticeLinkMetadata(link: any): {
  valid: boolean;
  hasStatementLeak: boolean;
} {
  const statementFields = ['statement', 'description', 'problem_statement', 'body', 'solution'];
  const hasStatementLeak = statementFields.some((field) => field in link);

  const hasRequiredFields =
    typeof link.platform === 'string' &&
    typeof link.problem_id === 'string' &&
    typeof link.title === 'string' &&
    typeof link.topic === 'string' &&
    ['Easy', 'Medium', 'Hard'].includes(link.difficulty) &&
    typeof link.link === 'string' &&
    link.link.startsWith('http');

  return {
    valid: hasRequiredFields && !hasStatementLeak,
    hasStatementLeak,
  };
}
