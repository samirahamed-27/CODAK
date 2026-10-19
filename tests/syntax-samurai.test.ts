import { describe, it, expect } from 'vitest';
import {
  ENEMY_PROFILES,
  DIFFICULTY_TIERS,
  SYNTAX_QUESTIONS,
  getQuestionsByFilter,
  getRandomQuestions,
  getEnemyProfile,
  getDifficultyConfig,
  getAllQuestions,
} from '@/data/syntaxSamuraiQuestions';
import { LanguageEnemy, Difficulty } from '@/types/syntaxSamurai';

describe('Syntax Samurai - Phase 1 Data Model & Question Bank Audit', () => {
  const languages: LanguageEnemy[] = ['python', 'javascript', 'cpp', 'java'];
  const difficulties: Difficulty[] = ['easy', 'normal', 'hard', 'codemare'];

  describe('Enemy Profiles', () => {
    it('defines complete configuration for all 4 language adversaries', () => {
      expect(Object.keys(ENEMY_PROFILES)).toHaveLength(4);
      languages.forEach((lang) => {
        const profile = getEnemyProfile(lang);
        expect(profile).toBeDefined();
        expect(profile.id).toBe(lang);
        expect(profile.name.length).toBeGreaterThan(0);
        expect(profile.alias.length).toBeGreaterThan(0);
        expect(profile.kanji.length).toBeGreaterThan(0);
        expect(profile.element.length).toBeGreaterThan(0);
        expect(profile.themeColor).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(profile.stats.attackSpeed).toBeDefined();
        expect(profile.stats.precision).toBeDefined();
        expect(profile.stats.lethalThreat).toBeDefined();
      });
    });
  });

  describe('Difficulty Tiers', () => {
    it('defines scaling rules for all 4 difficulty levels', () => {
      expect(Object.keys(DIFFICULTY_TIERS)).toHaveLength(4);
      difficulties.forEach((diff) => {
        const config = getDifficultyConfig(diff);
        expect(config).toBeDefined();
        expect(config.id).toBe(diff);
        expect(config.questionCount).toBeGreaterThan(0);
        expect(config.timePerQuestionSec).toBeGreaterThan(0);
        expect(config.xpReward).toBeGreaterThan(0);
        expect(config.slashMultiplier).toBeGreaterThanOrEqual(1.0);
      });
    });

    it('matches required scaling question quotas', () => {
      expect(DIFFICULTY_TIERS.easy.questionCount).toBe(5);
      expect(DIFFICULTY_TIERS.normal.questionCount).toBe(7);
      expect(DIFFICULTY_TIERS.hard.questionCount).toBe(10);
      expect(DIFFICULTY_TIERS.codemare.questionCount).toBe(12);
    });
  });

  describe('Question Bank Composition & Scaling', () => {
    it('has exactly 136 curated questions in total (34 per language)', () => {
      expect(getAllQuestions()).toHaveLength(136);
    });

    it('has exactly the expected number of questions per language and tier', () => {
      languages.forEach((lang) => {
        const easyQs = getQuestionsByFilter(lang, 'easy');
        const normalQs = getQuestionsByFilter(lang, 'normal');
        const hardQs = getQuestionsByFilter(lang, 'hard');
        const codemareQs = getQuestionsByFilter(lang, 'codemare');

        expect(easyQs).toHaveLength(5);
        expect(normalQs).toHaveLength(7);
        expect(hardQs).toHaveLength(10);
        expect(codemareQs).toHaveLength(12);
      });
    });
  });

  describe('Question Sanity & Integrity Invariants', () => {
    it('guarantees unique IDs across all questions', () => {
      const ids = SYNTAX_QUESTIONS.map((q) => q.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('guarantees exactly 4 fix options with no duplicates and correctReplacement included', () => {
      SYNTAX_QUESTIONS.forEach((q) => {
        expect(q.fixOptions).toHaveLength(4);
        const uniqueOptions = new Set(q.fixOptions);
        expect(uniqueOptions.size).toBe(4);
        expect(q.fixOptions).toContain(q.correctReplacement);
      });
    });

    it('guarantees valid line indices and bounding hints', () => {
      SYNTAX_QUESTIONS.forEach((q) => {
        const lines = q.codeSnippet.split('\n');
        expect(q.errorLineIndex).toBeGreaterThanOrEqual(0);
        expect(q.errorLineIndex).toBeLessThan(lines.length);
        expect(q.errorBoundingHint.length).toBeGreaterThan(5);
        expect(q.explanation.length).toBeGreaterThan(10);
      });
    });

    it('getRandomQuestions returns the specified count and does not mutate question pool', () => {
      const sampled = getRandomQuestions('python', 'normal', 3);
      expect(sampled).toHaveLength(3);

      const defaultSample = getRandomQuestions('javascript', 'easy');
      expect(defaultSample).toHaveLength(5);

      const poolOriginal = getQuestionsByFilter('javascript', 'easy');
      expect(poolOriginal).toHaveLength(5);
    });
  });
});
