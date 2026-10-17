import { describe, it, expect } from 'vitest';
import {
  determineDuelWinner,
  sanitizeDuelQuestions,
  isDuelExpired,
  validateDuelChallenge,
  validateDuelSubmission,
  isWithinLevelBand,
  canEarnPairDuelXp,
} from '@/lib/duels';

describe('Phase 3E & H8: Async Quiz Duels & Anti-Win-Trading Suite', () => {
  describe('Question Sanitization (Answer Key & Explanation Protection)', () => {
    it('completely strips correct_answer and explanation before serving questions to client', () => {
      const rawBank = [
        {
          id: 'q-1',
          question_text: 'What is the time complexity of binary search?',
          choice_a: 'O(1)',
          choice_b: 'O(n)',
          choice_c: 'O(log n)',
          choice_d: 'O(n^2)',
          correct_answer: 'c',
          explanation: 'Binary search halves the search space each step.',
          question_order: 1,
        },
        {
          id: 'q-2',
          question_text: 'Which data structure uses LIFO order?',
          choice_a: 'Queue',
          choice_b: 'Stack',
          choice_c: 'Array',
          choice_d: 'Tree',
          correct_answer: 'b',
          explanation: 'Stack uses Last-In, First-Out.',
          question_order: 2,
        },
      ];

      const safeQuestions = sanitizeDuelQuestions(rawBank);

      expect(safeQuestions).toHaveLength(2);
      safeQuestions.forEach((q) => {
        expect((q as any).correct_answer).toBeUndefined();
        expect((q as any).correct_option).toBeUndefined();
        expect((q as any).explanation).toBeUndefined();
        expect(q.id).toBeDefined();
        expect(q.question_text).toBeDefined();
        expect(q.choice_a).toBeDefined();
        expect(q.choice_b).toBeDefined();
        expect(q.choice_c).toBeDefined();
        expect(q.choice_d).toBeDefined();
        expect(q.question_order).toBeGreaterThanOrEqual(1);
      });
    });

    it('assigns sequential order to questions if question_order was omitted', () => {
      const rawBank = [
        {
          id: 'q-1',
          question_text: 'Q1',
          choice_a: 'A',
          choice_b: 'B',
          choice_c: 'C',
          choice_d: 'D',
          correct_answer: 'a',
        },
        {
          id: 'q-2',
          question_text: 'Q2',
          choice_a: 'A',
          choice_b: 'B',
          choice_c: 'C',
          choice_d: 'D',
          correct_answer: 'b',
        },
      ];

      const safeQuestions = sanitizeDuelQuestions(rawBank);
      expect(safeQuestions[0].question_order).toBe(1);
      expect(safeQuestions[1].question_order).toBe(2);
    });
  });

  describe('Winner Determination, Tie-Breaks, and XP Actions', () => {
    it('declares the player with higher score as winner', () => {
      const challenger = { id: 'student-c', score: 4, timeSeconds: 60 };
      const challenged = { id: 'student-d', score: 3, timeSeconds: 45 };

      const outcome = determineDuelWinner(challenger, challenged);

      expect(outcome.winnerId).toBe('student-c');
      expect(outcome.loserId).toBe('student-d');
      expect(outcome.isDraw).toBe(false);
      expect(outcome.challengerXpAction).toBe('DUEL_WIN');
      expect(outcome.challengedXpAction).toBe('DUEL_PARTICIPATION');
    });

    it('declares the challenged as winner when they score higher', () => {
      const challenger = { id: 'student-c', score: 2, timeSeconds: 50 };
      const challenged = { id: 'student-d', score: 5, timeSeconds: 70 };

      const outcome = determineDuelWinner(challenger, challenged);

      expect(outcome.winnerId).toBe('student-d');
      expect(outcome.loserId).toBe('student-c');
      expect(outcome.isDraw).toBe(false);
      expect(outcome.challengerXpAction).toBe('DUEL_PARTICIPATION');
      expect(outcome.challengedXpAction).toBe('DUEL_WIN');
    });

    it('breaks score ties using speed (shorter total time wins)', () => {
      const challenger = { id: 'student-c', score: 4, timeSeconds: 45 };
      const challenged = { id: 'student-d', score: 4, timeSeconds: 52 };

      const outcome = determineDuelWinner(challenger, challenged);

      expect(outcome.winnerId).toBe('student-c');
      expect(outcome.loserId).toBe('student-d');
      expect(outcome.isDraw).toBe(false);
      expect(outcome.challengerXpAction).toBe('DUEL_WIN');
      expect(outcome.challengedXpAction).toBe('DUEL_PARTICIPATION');
    });

    it('breaks score ties in favor of challenged when challenged was faster', () => {
      const challenger = { id: 'student-c', score: 3, timeSeconds: 65 };
      const challenged = { id: 'student-d', score: 3, timeSeconds: 40 };

      const outcome = determineDuelWinner(challenger, challenged);

      expect(outcome.winnerId).toBe('student-d');
      expect(outcome.loserId).toBe('student-c');
      expect(outcome.isDraw).toBe(false);
      expect(outcome.challengerXpAction).toBe('DUEL_PARTICIPATION');
      expect(outcome.challengedXpAction).toBe('DUEL_WIN');
    });

    it('declares a draw when both score and total time are identical', () => {
      const challenger = { id: 'student-c', score: 4, timeSeconds: 50 };
      const challenged = { id: 'student-d', score: 4, timeSeconds: 50 };

      const outcome = determineDuelWinner(challenger, challenged);

      expect(outcome.winnerId).toBeNull();
      expect(outcome.loserId).toBeNull();
      expect(outcome.isDraw).toBe(true);
      // Both receive participation XP
      expect(outcome.challengerXpAction).toBe('DUEL_PARTICIPATION');
      expect(outcome.challengedXpAction).toBe('DUEL_PARTICIPATION');
    });

    it('never removes XP on losing a duel', () => {
      const challenger = { id: 'student-c', score: 0, timeSeconds: 120 };
      const challenged = { id: 'student-d', score: 5, timeSeconds: 30 };

      const outcome = determineDuelWinner(challenger, challenged);

      expect(outcome.loserId).toBe('student-c');
      // Loser receives DUEL_PARTICIPATION (positive XP), never a penalty
      expect(outcome.challengerXpAction).toBe('DUEL_PARTICIPATION');
    });
  });

  describe('Self-Duel Blocking', () => {
    it('strictly blocks a student from challenging themselves', () => {
      const res = validateDuelChallenge('student-1', 'student-1');
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('Self-duels are strictly blocked');
    });

    it('allows a student to challenge a distinct peer student', () => {
      const res = validateDuelChallenge('student-1', 'student-2');
      expect(res.allowed).toBe(true);
    });
  });

  describe('Expiration & 24-Hour Timer Rule', () => {
    it('detects when a duel has expired past the 24-hour window', () => {
      const expiresAt = new Date('2026-10-16T12:00:00Z').toISOString();
      const afterExpiry = new Date('2026-10-16T12:00:01Z');

      expect(isDuelExpired(expiresAt, afterExpiry)).toBe(true);
    });

    it('allows active participation within the 24-hour window', () => {
      const expiresAt = new Date('2026-10-16T12:00:00Z').toISOString();
      const beforeExpiry = new Date('2026-10-16T11:59:59Z');

      expect(isDuelExpired(expiresAt, beforeExpiry)).toBe(false);
    });

    it('rejects submission on an expired duel', () => {
      const duel = {
        status: 'open',
        expires_at: new Date('2026-10-16T10:00:00Z').toISOString(),
        challenger_id: 'student-1',
        challenged_id: 'student-2',
        challenger_submitted_at: null,
        challenged_submitted_at: null,
      };

      const now = new Date('2026-10-16T10:30:00Z');
      const res = validateDuelSubmission(duel, 'student-1', now);

      expect(res.valid).toBe(false);
      expect(res.reason).toContain('Duel has expired');
    });
  });

  describe('Double-Submission & Participant Blocking', () => {
    it('blocks double-submission when a challenger attempts to submit answers again', () => {
      const duel = {
        status: 'active',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        challenger_id: 'student-1',
        challenged_id: 'student-2',
        challenger_submitted_at: '2026-10-16T11:00:00Z',
        challenged_submitted_at: null,
      };

      const res = validateDuelSubmission(duel, 'student-1');
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('already been submitted');
    });

    it('blocks double-submission when a challenged student attempts to submit answers again', () => {
      const duel = {
        status: 'active',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        challenger_id: 'student-1',
        challenged_id: 'student-2',
        challenger_submitted_at: null,
        challenged_submitted_at: '2026-10-16T11:00:00Z',
      };

      const res = validateDuelSubmission(duel, 'student-2');
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('already been submitted');
    });

    it('blocks third-party non-participants from submitting answers', () => {
      const duel = {
        status: 'active',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        challenger_id: 'student-1',
        challenged_id: 'student-2',
        challenger_submitted_at: null,
        challenged_submitted_at: null,
      };

      const res = validateDuelSubmission(duel, 'student-intruder');
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('Forbidden');
    });

    it('allows valid submission when participant has not yet submitted and duel is active', () => {
      const duel = {
        status: 'active',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        challenger_id: 'student-1',
        challenged_id: 'student-2',
        challenger_submitted_at: null,
        challenged_submitted_at: null,
      };

      const res = validateDuelSubmission(duel, 'student-1');
      expect(res.valid).toBe(true);
    });
  });

  describe('H8: Auto-Match Level Band Matching (+/- 2 Levels by Default)', () => {
    it('matches students who are at the exact same level', () => {
      expect(isWithinLevelBand(3, 3, 2)).toBe(true);
    });

    it('matches students within +/- 1 level', () => {
      expect(isWithinLevelBand(3, 4, 2)).toBe(true);
      expect(isWithinLevelBand(4, 3, 2)).toBe(true);
    });

    it('matches students at the boundary (+/- 2 levels)', () => {
      expect(isWithinLevelBand(2, 4, 2)).toBe(true);
      expect(isWithinLevelBand(5, 3, 2)).toBe(true);
    });

    it('rejects matching students outside the level band (> 2 levels apart)', () => {
      expect(isWithinLevelBand(1, 4, 2)).toBe(false);
      expect(isWithinLevelBand(2, 5, 2)).toBe(false);
      expect(isWithinLevelBand(6, 2, 2)).toBe(false);
    });

    it('respects a custom configured level band', () => {
      expect(isWithinLevelBand(1, 4, 3)).toBe(true);
      expect(isWithinLevelBand(1, 4, 1)).toBe(false);
    });
  });

  describe('H8: Anti-Win-Trading Per-Pair Daily Cap (Default 2 Duels/Day)', () => {
    it('allows earning XP for the 1st and 2nd duel between the same pair on a calendar day', () => {
      expect(canEarnPairDuelXp(0, 2)).toBe(true);
      expect(canEarnPairDuelXp(1, 2)).toBe(true);
    });

    it('blocks earning XP on the 3rd and subsequent duels between the same pair on the same day', () => {
      expect(canEarnPairDuelXp(2, 2)).toBe(false);
      expect(canEarnPairDuelXp(3, 2)).toBe(false);
      expect(canEarnPairDuelXp(10, 2)).toBe(false);
    });

    it('respects custom configured pair limit', () => {
      expect(canEarnPairDuelXp(2, 3)).toBe(true);
      expect(canEarnPairDuelXp(3, 3)).toBe(false);
    });
  });
});
