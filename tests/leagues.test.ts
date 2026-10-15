import { describe, it, expect } from 'vitest';
import {
  calculateGroupOutcomes,
  DEFAULT_LEAGUE_CONFIG,
  MemberRankInput,
  LeagueConfig,
} from '@/lib/leagues';

describe('Phase 3C: Weekly Leagues & Edge Cases Suite', () => {
  const config: LeagueConfig = {
    target_group_size: 20,
    min_group_size_for_relegation: 10,
    promotion_count: 5,
    relegation_count: 5,
  };

  describe('Standard 20-Student Group Outcomes', () => {
    it('promotes top 5 and relegates bottom 5 in a Silver league group of 20 students', () => {
      // 20 students with distinct XP
      const members: MemberRankInput[] = Array.from({ length: 20 }, (_, i) => ({
        studentId: `student-${i + 1}`,
        weeklyXp: (20 - i) * 10, // 200, 190, ..., 10
      }));

      const outcomes = calculateGroupOutcomes(members, config, 'silver');
      expect(outcomes).toHaveLength(20);

      // Top 5 promoted to Gold
      for (let i = 0; i < 5; i++) {
        expect(outcomes[i].rank).toBe(i + 1);
        expect(outcomes[i].outcome).toBe('promoted');
        expect(outcomes[i].newTierId).toBe('gold');
      }

      // Middle 10 retained in Silver
      for (let i = 5; i < 15; i++) {
        expect(outcomes[i].rank).toBe(i + 1);
        expect(outcomes[i].outcome).toBe('retained');
        expect(outcomes[i].newTierId).toBe('silver');
      }

      // Bottom 5 relegated to Bronze
      for (let i = 15; i < 20; i++) {
        expect(outcomes[i].rank).toBe(i + 1);
        expect(outcomes[i].outcome).toBe('relegated');
        expect(outcomes[i].newTierId).toBe('bronze');
      }
    });
  });

  describe('Edge Case 1: Group Smaller than 10 (No Relegation)', () => {
    it('prevents relegation when group size is under 10 students', () => {
      const members: MemberRankInput[] = Array.from({ length: 8 }, (_, i) => ({
        studentId: `student-${i + 1}`,
        weeklyXp: (8 - i) * 10,
      }));

      const outcomes = calculateGroupOutcomes(members, config, 'silver');
      expect(outcomes).toHaveLength(8);

      // Bottom students must NOT be relegated
      const bottomStudents = outcomes.slice(5);
      bottomStudents.forEach((student) => {
        expect(student.outcome).toBe('retained');
        expect(student.newTierId).toBe('silver');
      });
    });
  });

  describe('Edge Case 2: Students with 0 XP', () => {
    it('blocks promotion for students with 0 XP even if their rank is in the top 5', () => {
      // Group of 12 students where everyone has 0 XP
      const members: MemberRankInput[] = Array.from({ length: 12 }, (_, i) => ({
        studentId: `student-${i + 1}`,
        weeklyXp: 0,
      }));

      const outcomes = calculateGroupOutcomes(members, config, 'silver');

      // Top 5 students must NOT be promoted because weeklyXp is 0
      for (let i = 0; i < 5; i++) {
        expect(outcomes[i].outcome).not.toBe('promoted');
        expect(outcomes[i].outcome).toBe('retained');
      }
    });

    it('relegates students with 0 XP when the group is large enough (>= 10)', () => {
      // Group of 12: top 7 have XP, bottom 5 have 0 XP
      const members: MemberRankInput[] = [
        ...Array.from({ length: 7 }, (_, i) => ({
          studentId: `active-${i + 1}`,
          weeklyXp: 100 - i * 10,
        })),
        ...Array.from({ length: 5 }, (_, i) => ({
          studentId: `inactive-${i + 1}`,
          weeklyXp: 0,
        })),
      ];

      const outcomes = calculateGroupOutcomes(members, config, 'silver');
      const relegated = outcomes.filter((o) => o.outcome === 'relegated');
      expect(relegated).toHaveLength(5);
      relegated.forEach((student) => {
        expect(student.weeklyXp).toBe(0);
        expect(student.newTierId).toBe('bronze');
      });
    });
  });

  describe('Edge Case 4: Bottom Tier (Bronze) Cannot Relegate', () => {
    it('retains bottom-ranked students in Bronze without relegating below Bronze', () => {
      const members: MemberRankInput[] = Array.from({ length: 15 }, (_, i) => ({
        studentId: `bronze-student-${i + 1}`,
        weeklyXp: 15 - i,
      }));

      const outcomes = calculateGroupOutcomes(members, config, 'bronze');
      const bottomStudents = outcomes.slice(10); // Ranks 11-15 (relegation zone)

      bottomStudents.forEach((student) => {
        expect(student.outcome).toBe('retained');
        expect(student.newTierId).toBe('bronze');
      });
    });
  });

  describe('Edge Case 5: Top Tier (Diamond) Cannot Promote', () => {
    it('retains top-ranked students in Diamond without promoting above Diamond', () => {
      const members: MemberRankInput[] = Array.from({ length: 15 }, (_, i) => ({
        studentId: `diamond-student-${i + 1}`,
        weeklyXp: 500 - i * 20,
      }));

      const outcomes = calculateGroupOutcomes(members, config, 'diamond');
      const topStudents = outcomes.slice(0, 5); // Ranks 1-5

      topStudents.forEach((student) => {
        expect(student.outcome).toBe('retained');
        expect(student.newTierId).toBe('diamond');
      });
    });
  });

  describe('Idempotency & Tie Breaking', () => {
    it('breaks score ties deterministically by student ID', () => {
      const members: MemberRankInput[] = [
        { studentId: 'student-b', weeklyXp: 100 },
        { studentId: 'student-a', weeklyXp: 100 },
      ];

      const outcomes1 = calculateGroupOutcomes(members, config, 'silver');
      const outcomes2 = calculateGroupOutcomes(members, config, 'silver');

      expect(outcomes1[0].studentId).toBe('student-a');
      expect(outcomes1[1].studentId).toBe('student-b');
      expect(outcomes1).toEqual(outcomes2);
    });
  });
});
