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

  describe('Phase 2 - Katana Blade Geometry & Hit Detection', () => {
    // Helper function verifying segment-box intersection algorithm
    const segmentIntersectsBox = (
      p1: { x: number; y: number },
      p2: { x: number; y: number },
      box: { x: number; y: number; width: number; height: number }
    ): boolean => {
      const minX = box.x;
      const maxX = box.x + box.width;
      const minY = box.y;
      const maxY = box.y + box.height;

      const inBox = (p: { x: number; y: number }) =>
        p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;

      if (inBox(p1) || inBox(p2)) return true;

      const ccw = (
        ax: number,
        ay: number,
        bx: number,
        by: number,
        cx: number,
        cy: number
      ) => (cy - ay) * (bx - ax) > (by - ay) * (cx - ax);

      const linesIntersect = (
        ax: number,
        ay: number,
        bx: number,
        by: number,
        cx: number,
        cy: number,
        dx: number,
        dy: number
      ) =>
        ccw(ax, ay, cx, cy, dx, dy) !== ccw(bx, by, cx, cy, dx, dy) &&
        ccw(ax, ay, bx, by, cx, cy) !== ccw(ax, ay, bx, by, dx, dy);

      if (linesIntersect(p1.x, p1.y, p2.x, p2.y, minX, minY, maxX, minY)) return true;
      if (linesIntersect(p1.x, p1.y, p2.x, p2.y, minX, maxY, maxX, maxY)) return true;
      if (linesIntersect(p1.x, p1.y, p2.x, p2.y, minX, minY, minX, maxY)) return true;
      if (linesIntersect(p1.x, p1.y, p2.x, p2.y, maxX, minY, maxX, maxY)) return true;

      return false;
    };

    it('detects a diagonal slash cleanly cutting through a token bounding box', () => {
      const targetBox = { x: 100, y: 100, width: 60, height: 25 };
      // Diagonal slash from top-left (80, 80) to bottom-right (180, 140)
      const p1 = { x: 80, y: 80 };
      const p2 = { x: 180, y: 140 };

      expect(segmentIntersectsBox(p1, p2, targetBox)).toBe(true);
    });

    it('detects hit when slash starts or ends directly inside the box', () => {
      const targetBox = { x: 200, y: 200, width: 50, height: 20 };
      const insidePoint = { x: 220, y: 210 };
      const outsidePoint = { x: 300, y: 300 };

      expect(segmentIntersectsBox(insidePoint, outsidePoint, targetBox)).toBe(true);
      expect(segmentIntersectsBox(outsidePoint, insidePoint, targetBox)).toBe(true);
    });

    it('correctly reports no hit when a slash completely misses the token box', () => {
      const targetBox = { x: 100, y: 100, width: 40, height: 20 };
      // Slash passing far above
      const p1 = { x: 50, y: 50 };
      const p2 = { x: 200, y: 50 };

      expect(segmentIntersectsBox(p1, p2, targetBox)).toBe(false);

      // Slash passing to the right
      const p3 = { x: 160, y: 90 };
      const p4 = { x: 160, y: 140 };
      expect(segmentIntersectsBox(p3, p4, targetBox)).toBe(false);
    });

    it('calculates velocity angle so blade tip aligns with swipe direction', () => {
      // Swiping right: angle should be ~0 radians
      const angleRight = Math.atan2(0, 50);
      expect(angleRight).toBeCloseTo(0, 2);

      // Swiping straight down: angle should be PI/2 (~1.57 rad)
      const angleDown = Math.atan2(50, 0);
      expect(angleDown).toBeCloseTo(Math.PI / 2, 2);

      // Swiping 45 deg down-right
      const angleDiag = Math.atan2(50, 50);
      expect(angleDiag).toBeCloseTo(Math.PI / 4, 2);
    });
  });

  describe('Phase 3 - Pixel Crumble Engine & Physics Model', () => {
    it('spawns 40-80 pixel particles with sizes 2px or 4px upon token explosion', async () => {
      const { PixelCrumbleEngine } = await import(
        '@/components/games/syntax-samurai/PixelCrumbleEngine'
      );
      const engine = new PixelCrumbleEngine();
      expect(engine.particles).toHaveLength(0);

      engine.explode({
        x: 100,
        y: 200,
        width: 60,
        height: 24,
        count: 65,
        cutAngle: -Math.PI / 4,
      });

      expect(engine.particles).toHaveLength(65);
      engine.particles.forEach((p) => {
        expect([2, 4]).toContain(p.size);
        expect(p.life).toBe(0);
        expect(p.maxLife).toBeGreaterThan(0.3);
        expect(p.x).toBeGreaterThanOrEqual(100);
        expect(p.x).toBeLessThanOrEqual(160);
        expect(p.y).toBeGreaterThanOrEqual(200);
        expect(p.y).toBeLessThanOrEqual(224);
      });
    });

    it('applies downward gravity ay = +0.4 and decays particle lifetime over time', async () => {
      const { PixelCrumbleEngine } = await import(
        '@/components/games/syntax-samurai/PixelCrumbleEngine'
      );
      const engine = new PixelCrumbleEngine();
      engine.explode({
        x: 50,
        y: 50,
        width: 20,
        height: 20,
        count: 10,
      });

      const initialVy = engine.particles[0].vy;
      engine.update(1 / 60);

      // vy should have increased by gravity (0.4) scaled by friction
      expect(engine.gravity).toBe(0.4);
      expect(engine.particles[0].life).toBeCloseTo(1 / 60, 4);

      // Advance by 1 second so all particles exceed maxLife
      for (let step = 0; step < 60; step++) {
        engine.update(1 / 60);
      }
      expect(engine.particles).toHaveLength(0);
    });

    it('clears all active debris instantly on clear()', async () => {
      const { PixelCrumbleEngine } = await import(
        '@/components/games/syntax-samurai/PixelCrumbleEngine'
      );
      const engine = new PixelCrumbleEngine();
      engine.explode({ x: 0, y: 0, width: 50, height: 20, count: 50 });
      expect(engine.particles.length).toBe(50);
      engine.clear();
      expect(engine.particles.length).toBe(0);
    });
  });

  describe('Phase 5 - Victory Dojo, Samurai Ranks & Performance Scoring', () => {
    it('awards SHOGUN rank exclusively for 95%+ accuracy on Codemare difficulty', async () => {
      const { calculateSamuraiRank } = await import(
        '@/components/games/syntax-samurai/VictoryScreen'
      );

      const codemare100 = calculateSamuraiRank(100, 'codemare');
      expect(codemare100.rank).toBe('SHOGUN');
      expect(codemare100.kanji).toBe('将軍');
      expect(codemare100.requiresCodemare).toBe(true);

      const codemare95 = calculateSamuraiRank(95, 'codemare');
      expect(codemare95.rank).toBe('SHOGUN');

      // 95%+ on hard or normal difficulty receives DAIMYO (only Codemare achieves Shogun!)
      const hard100 = calculateSamuraiRank(100, 'hard');
      expect(hard100.rank).toBe('DAIMYO');
      expect(hard100.kanji).toBe('大名');

      const easy95 = calculateSamuraiRank(95, 'easy');
      expect(easy95.rank).toBe('DAIMYO');
    });

    it('awards DAIMYO rank for 80% to 94% accuracy', async () => {
      const { calculateSamuraiRank } = await import(
        '@/components/games/syntax-samurai/VictoryScreen'
      );

      const codemare85 = calculateSamuraiRank(85, 'codemare');
      expect(codemare85.rank).toBe('DAIMYO');

      const normal80 = calculateSamuraiRank(80, 'normal');
      expect(normal80.rank).toBe('DAIMYO');
    });

    it('awards SAMURAI rank for 60% to 79% accuracy', async () => {
      const { calculateSamuraiRank } = await import(
        '@/components/games/syntax-samurai/VictoryScreen'
      );

      const rank75 = calculateSamuraiRank(75, 'normal');
      expect(rank75.rank).toBe('SAMURAI');
      expect(rank75.kanji).toBe('侍');

      const rank60 = calculateSamuraiRank(60, 'hard');
      expect(rank60.rank).toBe('SAMURAI');
    });

    it('awards RONIN rank for under 60% accuracy', async () => {
      const { calculateSamuraiRank } = await import(
        '@/components/games/syntax-samurai/VictoryScreen'
      );

      const rank59 = calculateSamuraiRank(59, 'easy');
      expect(rank59.rank).toBe('RONIN');
      expect(rank59.kanji).toBe('浪人');

      const rank0 = calculateSamuraiRank(0, 'codemare');
      expect(rank0.rank).toBe('RONIN');
    });

    it('calculates score based on slashes landed, accuracy, combo, and time bonuses', () => {
      const slashesLanded = 5;
      const correctCount = 5;
      const totalQuestions = 5;
      const xpReward = 150;
      const comboMultiplier = 4; // x4
      const timeRemainingSec = 12;

      const slashBonus = slashesLanded * 50;
      const accuracyBonus = correctCount * xpReward;
      const comboBonus = Math.round(xpReward * (comboMultiplier * 0.1));
      const timeBonus = timeRemainingSec * 2;
      const totalScore = slashBonus + accuracyBonus + comboBonus + timeBonus;

      expect(slashBonus).toBe(250);
      expect(accuracyBonus).toBe(750);
      expect(comboBonus).toBe(60);
      expect(timeBonus).toBe(24);
      expect(totalScore).toBe(1084);
    });
  });
});

