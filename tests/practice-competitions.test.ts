import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateHackerRankCompetitionUrl,
  filterPracticeLinks,
  validatePracticeLinkMetadata,
  PracticeLink,
} from '@/lib/practice';
import {
  createFacultyCompetitionAction,
  claimPracticeProblemAction,
} from '@/app/actions/practice';

// Mock server auth and Supabase client
const mockGetUser = vi.fn();
const mockAdminSelect = vi.fn();
const mockAdminInsert = vi.fn();
const mockAdminRpc = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

const mockSupabaseAdmin = {
  from: vi.fn((table: string) => ({
    select: vi.fn((cols: string) => ({
      eq: vi.fn((col: string, val: any) => ({
        order: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        maybeSingle: vi.fn(() => {
          if (table === 'profiles') {
            return Promise.resolve({ data: { role: 'student' }, error: null });
          }
          if (table === 'student_practice_completions') {
            return Promise.resolve({ data: null, error: null });
          }
          if (table === 'practice_links') {
            return Promise.resolve({
              data: {
                id: 'link-123',
                platform: 'LeetCode',
                problem_id: 'leetcode:1',
                title: 'Two Sum',
                topic: 'Arrays & Strings',
                difficulty: 'Easy',
                link: 'https://leetcode.com/problems/two-sum/',
                is_competition: false,
              },
              error: null,
            });
          }
          return Promise.resolve({ data: null, error: null });
        }),
      })),
      order: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: { id: 'new-id' }, error: null })),
      })),
    })),
  })),
  rpc: vi.fn((fnName: string, args: any) => {
    if (fnName === 'award_xp') {
      return Promise.resolve({
        data: { status: 'awarded', xp_awarded: 10, new_total: 100 },
        error: null,
      });
    }
    return Promise.resolve({ data: null, error: null });
  }),
};

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockSupabaseAdmin),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseAdmin),
}));

vi.mock('@/lib/rate-limits', () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true })),
}));

vi.mock('@/lib/auth/ensure-student', () => ({
  ensureStudentRecord: vi.fn(async () => {}),
}));

describe('Practice Problem & Faculty HackerRank Competition Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('HackerRank URL Validation', () => {
    it('accepts valid HackerRank contest URLs', () => {
      expect(
        validateHackerRankCompetitionUrl('https://www.hackerrank.com/contests/dsa-challenge-2026')
      ).toBe(true);
      expect(
        validateHackerRankCompetitionUrl('https://hackerrank.com/contests/algorithms-sprint')
      ).toBe(true);
      expect(
        validateHackerRankCompetitionUrl('https://www.hackerrank.com/challenges/solve-me-first/problem')
      ).toBe(true);
    });

    it('rejects non-HackerRank URLs', () => {
      expect(validateHackerRankCompetitionUrl('https://leetcode.com/problems/two-sum/')).toBe(false);
      expect(validateHackerRankCompetitionUrl('https://codeforces.com/contest/158')).toBe(false);
      expect(validateHackerRankCompetitionUrl('https://evil-site.com/hackerrank.com')).toBe(false);
    });

    it('rejects malformed or empty URLs', () => {
      expect(validateHackerRankCompetitionUrl('')).toBe(false);
      expect(validateHackerRankCompetitionUrl('not-a-valid-url')).toBe(false);
      expect(validateHackerRankCompetitionUrl('javascript:alert(1)')).toBe(false);
    });
  });

  describe('Competition Filtering & Metadata Integrity', () => {
    const sampleLinks: PracticeLink[] = [
      {
        id: 'p1',
        platform: 'LeetCode',
        problem_id: 'leetcode:1',
        title: 'Two Sum',
        topic: 'Arrays & Strings',
        difficulty: 'Easy',
        link: 'https://leetcode.com/problems/two-sum/',
        is_competition: false,
      },
      {
        id: 'c1',
        platform: 'HackerRank',
        problem_id: 'hackerrank:comp:spring-sprint',
        title: 'Spring HackerRank Clash',
        topic: 'Dynamic Programming',
        difficulty: 'Hard',
        link: 'https://www.hackerrank.com/contests/spring-sprint',
        is_competition: true,
        instructions: 'Focus on state transitions and memory limits.',
      },
    ];

    it('filters only faculty competitions when isCompetition is true', () => {
      const filtered = filterPracticeLinks(sampleLinks, { isCompetition: true });
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('c1');
      expect(filtered[0].is_competition).toBe(true);
    });

    it('filters only standard problems when isCompetition is false', () => {
      const filtered = filterPracticeLinks(sampleLinks, { isCompetition: false });
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('p1');
      expect(filtered[0].is_competition).toBe(false);
    });

    it('returns both when isCompetition is All or undefined', () => {
      const filtered = filterPracticeLinks(sampleLinks, { isCompetition: 'All' });
      expect(filtered.length).toBe(2);
    });

    it('strictly ensures competition metadata does not leak problem statements', () => {
      const validation = validatePracticeLinkMetadata(sampleLinks[1]);
      expect(validation.valid).toBe(true);
      expect(validation.hasStatementLeak).toBe(false);
    });
  });

  describe('Security & Role Authorization Guards', () => {
    it('blocks unauthenticated users from creating competitions', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });

      const res = await createFacultyCompetitionAction({
        title: 'Unauthorized Contest',
        competitionUrl: 'https://www.hackerrank.com/contests/test',
        topic: 'Arrays & Strings',
        difficulty: 'Easy',
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/unauthorized/i);
    });

    it('blocks students from creating faculty competitions', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'student-uuid-1' } } });

      const res = await createFacultyCompetitionAction({
        title: 'Student Attempting Contest',
        competitionUrl: 'https://www.hackerrank.com/contests/test',
        topic: 'Arrays & Strings',
        difficulty: 'Easy',
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/restricted|faculty/i);
    });

    it('blocks unauthenticated users from claiming practice XP', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });

      const res = await claimPracticeProblemAction({
        practiceLinkId: 'link-123',
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/unauthorized/i);
    });
  });
});
