import { describe, it, expect } from 'vitest';
import {
  SEED_PRACTICE_LINKS,
  filterPracticeLinks,
  groupPracticeLinksByTopic,
  validatePracticeLinkMetadata,
  PracticeLink,
} from '@/lib/practice';

describe('Phase 3F: Practice Problem Links Directory Suite', () => {
  describe('Dataset Structure & Statement Privacy', () => {
    it('seeds at least 15 curated practice problem links', () => {
      expect(SEED_PRACTICE_LINKS.length).toBeGreaterThanOrEqual(15);
    });

    it('covers at least 3 distinct algorithmic topics', () => {
      const topics = Array.from(new Set(SEED_PRACTICE_LINKS.map((l) => l.topic)));
      expect(topics.length).toBeGreaterThanOrEqual(3);
      expect(topics).toContain('Arrays & Strings');
      expect(topics).toContain('Dynamic Programming');
      expect(topics).toContain('Trees & Graphs');
    });

    it('strictly stores metadata ONLY and NEVER copies problem statements or descriptions', () => {
      SEED_PRACTICE_LINKS.forEach((link) => {
        const validation = validatePracticeLinkMetadata(link);
        expect(validation.valid).toBe(true);
        expect(validation.hasStatementLeak).toBe(false);

        // Ensure sensitive problem statement keys do not exist
        const forbiddenFields = ['statement', 'description', 'problem_statement', 'body', 'solution'];
        forbiddenFields.forEach((field) => {
          expect((link as any)[field]).toBeUndefined();
        });

        // Ensure required fields exist
        expect(link.platform).toBeDefined();
        expect(link.problem_id).toBeDefined();
        expect(link.title).toBeDefined();
        expect(link.topic).toBeDefined();
        expect(['Easy', 'Medium', 'Hard']).toContain(link.difficulty);
        expect(link.link).toMatch(/^https?:\/\//);
      });
    });

    it('detects and flags unauthorized problem statement fields if injected', () => {
      const contaminatedLink = {
        platform: 'LeetCode',
        problem_id: 'leetcode:999',
        title: 'Contaminated Problem',
        topic: 'Arrays & Strings',
        difficulty: 'Easy',
        link: 'https://leetcode.com',
        statement: 'Given an array of integers...',
      };

      const validation = validatePracticeLinkMetadata(contaminatedLink);
      expect(validation.valid).toBe(false);
      expect(validation.hasStatementLeak).toBe(true);
    });
  });

  describe('Topic & Difficulty Filtering', () => {
    it('filters problems by topic', () => {
      const dpLinks = filterPracticeLinks(SEED_PRACTICE_LINKS, { topic: 'Dynamic Programming' });
      expect(dpLinks.length).toBe(5);
      dpLinks.forEach((l) => expect(l.topic).toBe('Dynamic Programming'));
    });

    it('filters problems by difficulty', () => {
      const hardLinks = filterPracticeLinks(SEED_PRACTICE_LINKS, { difficulty: 'Hard' });
      expect(hardLinks.length).toBeGreaterThanOrEqual(3);
      hardLinks.forEach((l) => expect(l.difficulty).toBe('Hard'));
    });

    it('combines topic and difficulty filters correctly', () => {
      const easyArrays = filterPracticeLinks(SEED_PRACTICE_LINKS, {
        topic: 'Arrays & Strings',
        difficulty: 'Easy',
      });
      expect(easyArrays.length).toBe(2);
      easyArrays.forEach((l) => {
        expect(l.topic).toBe('Arrays & Strings');
        expect(l.difficulty).toBe('Easy');
      });
    });

    it('returns all problems when filter is "All"', () => {
      const allLinks = filterPracticeLinks(SEED_PRACTICE_LINKS, {
        topic: 'All',
        difficulty: 'All',
      });
      expect(allLinks.length).toBe(SEED_PRACTICE_LINKS.length);
    });

    it('supports search query matching title or problem_id', () => {
      const searchRes = filterPracticeLinks(SEED_PRACTICE_LINKS, { search: 'Two Sum' });
      expect(searchRes.length).toBe(1);
      expect(searchRes[0].title).toBe('Two Sum');
      expect(searchRes[0].problem_id).toBe('leetcode:1');
    });
  });

  describe('Grouping Helper', () => {
    it('groups links by topic into a dictionary', () => {
      const grouped = groupPracticeLinksByTopic(SEED_PRACTICE_LINKS);
      expect(Object.keys(grouped)).toContain('Arrays & Strings');
      expect(Object.keys(grouped)).toContain('Dynamic Programming');
      expect(Object.keys(grouped)).toContain('Trees & Graphs');
      expect(grouped['Arrays & Strings'].length).toBe(5);
      expect(grouped['Dynamic Programming'].length).toBe(5);
      expect(grouped['Trees & Graphs'].length).toBe(5);
    });
  });
});
