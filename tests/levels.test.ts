import { describe, it, expect } from 'vitest';
import { levelFromXp } from '../src/lib/levels';

describe('Level Calculation Engine (levelFromXp)', () => {
  describe('Boundary Tests for Base Levels (1 to 6)', () => {
    it('handles 0 XP (initial starting point)', () => {
      const res = levelFromXp(0);
      expect(res.level).toBe(1);
      expect(res.xpIntoLevel).toBe(0);
      expect(res.xpForNextLevel).toBe(100);
      expect(res.progressPercent).toBe(0);
    });

    it('handles negative numbers safely by clamping to 0', () => {
      const res = levelFromXp(-50);
      expect(res.level).toBe(1);
      expect(res.xpIntoLevel).toBe(0);
      expect(res.xpForNextLevel).toBe(100);
      expect(res.progressPercent).toBe(0);
    });

    it('handles mid-level 1 (50 XP)', () => {
      const res = levelFromXp(50);
      expect(res.level).toBe(1);
      expect(res.xpIntoLevel).toBe(50);
      expect(res.xpForNextLevel).toBe(100);
      expect(res.progressPercent).toBe(50);
    });

    it('handles boundary just before Level 2 (99 XP)', () => {
      const res = levelFromXp(99);
      expect(res.level).toBe(1);
      expect(res.xpIntoLevel).toBe(99);
      expect(res.xpForNextLevel).toBe(100);
      expect(res.progressPercent).toBe(99);
    });

    it('handles exact Level 2 boundary (100 XP)', () => {
      const res = levelFromXp(100);
      expect(res.level).toBe(2);
      expect(res.xpIntoLevel).toBe(0);
      expect(res.xpForNextLevel).toBe(150); // 250 - 100
      expect(res.progressPercent).toBe(0);
    });

    it('handles mid-level 2 (175 XP)', () => {
      const res = levelFromXp(175);
      expect(res.level).toBe(2);
      expect(res.xpIntoLevel).toBe(75);
      expect(res.xpForNextLevel).toBe(150);
      expect(res.progressPercent).toBe(50);
    });

    it('handles boundary just before Level 3 (249 XP)', () => {
      const res = levelFromXp(249);
      expect(res.level).toBe(2);
      expect(res.xpIntoLevel).toBe(149);
      expect(res.xpForNextLevel).toBe(150);
      expect(res.progressPercent).toBe(99);
    });

    it('handles exact Level 3 boundary (250 XP)', () => {
      const res = levelFromXp(250);
      expect(res.level).toBe(3);
      expect(res.xpIntoLevel).toBe(0);
      expect(res.xpForNextLevel).toBe(200); // 450 - 250
      expect(res.progressPercent).toBe(0);
    });

    it('handles exact Level 4 boundary (450 XP)', () => {
      const res = levelFromXp(450);
      expect(res.level).toBe(4);
      expect(res.xpIntoLevel).toBe(0);
      expect(res.xpForNextLevel).toBe(250); // 700 - 450
      expect(res.progressPercent).toBe(0);
    });

    it('handles exact Level 5 boundary (700 XP)', () => {
      const res = levelFromXp(700);
      expect(res.level).toBe(5);
      expect(res.xpIntoLevel).toBe(0);
      expect(res.xpForNextLevel).toBe(300); // 1000 - 700
      expect(res.progressPercent).toBe(0);
    });

    it('handles boundary just before Level 6 (999 XP)', () => {
      const res = levelFromXp(999);
      expect(res.level).toBe(5);
      expect(res.xpIntoLevel).toBe(299);
      expect(res.xpForNextLevel).toBe(300);
      expect(res.progressPercent).toBe(100);
    });

    it('handles exact Level 6 boundary (1000 XP)', () => {
      const res = levelFromXp(1000);
      expect(res.level).toBe(6);
      expect(res.xpIntoLevel).toBe(0);
      expect(res.xpForNextLevel).toBe(350);
      expect(res.progressPercent).toBe(0);
    });
  });

  describe('Post-Base Levels (Level 6+ with +350 XP step)', () => {
    it('handles boundary just before Level 7 (1349 XP)', () => {
      const res = levelFromXp(1349);
      expect(res.level).toBe(6);
      expect(res.xpIntoLevel).toBe(349);
      expect(res.xpForNextLevel).toBe(350);
      expect(res.progressPercent).toBe(100);
    });

    it('handles exact Level 7 boundary (1350 XP)', () => {
      const res = levelFromXp(1350);
      expect(res.level).toBe(7);
      expect(res.xpIntoLevel).toBe(0);
      expect(res.xpForNextLevel).toBe(350);
      expect(res.progressPercent).toBe(0);
    });

    it('handles Level 8 boundary (1700 XP)', () => {
      const res = levelFromXp(1700);
      expect(res.level).toBe(8);
      expect(res.xpIntoLevel).toBe(0);
      expect(res.xpForNextLevel).toBe(350);
      expect(res.progressPercent).toBe(0);
    });

    it('handles high level accurately (3100 XP = Level 12)', () => {
      // 1000 (lvl 6) + 6 * 350 (2100) = 3100 (Level 12)
      const res = levelFromXp(3100);
      expect(res.level).toBe(12);
      expect(res.xpIntoLevel).toBe(0);
      expect(res.xpForNextLevel).toBe(350);
    });
  });
});
