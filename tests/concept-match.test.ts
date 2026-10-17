import { describe, it, expect } from 'vitest';
import {
  createSignedRoundToken,
  verifySignedRoundToken,
  generateConceptMatchRound,
  CONCEPT_PAIRS_BANK,
} from '@/lib/concept-match';
import {
  getConceptMatchRoundAction,
  submitConceptMatchAction,
} from '@/app/actions/concept-match';
import * as fs from 'fs';
import * as path from 'path';

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  }
}

loadEnvLocal();

describe('H7: Concept Match Server-Verification & Anti-Tamper Suite', () => {
  const SECRET = 'test-secret-key-concept-match-12345';

  describe('1. Signed Token Creation & Cryptographic Verification', () => {
    it('verifies a valid round token with correct HMAC signature', () => {
      const payload = {
        roundId: 'round-101',
        studentId: 'student-abc',
        termIds: ['cp-1', 'cp-2', 'cp-3', 'cp-4'],
        issuedAt: Date.now(),
      };

      const token = createSignedRoundToken(payload, SECRET);
      const res = verifySignedRoundToken(token, SECRET);

      expect(res.valid).toBe(true);
      expect(res.payload?.roundId).toBe('round-101');
      expect(res.payload?.studentId).toBe('student-abc');
      expect(res.payload?.termIds).toEqual(['cp-1', 'cp-2', 'cp-3', 'cp-4']);
    });

    it('rejects a forged token where signature does not match secret', () => {
      const payload = {
        roundId: 'round-forged',
        studentId: 'attacker',
        termIds: ['cp-1', 'cp-2', 'cp-3', 'cp-4'],
        issuedAt: Date.now(),
      };

      const forgedToken = createSignedRoundToken(payload, 'wrong-secret');
      const res = verifySignedRoundToken(forgedToken, SECRET);

      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/Invalid token signature/i);
    });

    it('rejects a token where payload data was altered in transit', () => {
      const payload = {
        roundId: 'round-legit',
        studentId: 'student-legit',
        termIds: ['cp-1', 'cp-2', 'cp-3', 'cp-4'],
        issuedAt: Date.now(),
      };

      const token = createSignedRoundToken(payload, SECRET);
      const [data, sig] = token.split('.');

      // Alter data
      const tamperedData = Buffer.from(
        JSON.stringify({ ...payload, studentId: 'student-tampered' })
      ).toString('base64url');

      const tamperedToken = `${tamperedData}.${sig}`;
      const res = verifySignedRoundToken(tamperedToken, SECRET);

      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/Invalid token signature/i);
    });

    it('rejects an expired token exceeding maxAgeMs', () => {
      const payload = {
        roundId: 'round-old',
        studentId: 'student-abc',
        termIds: ['cp-1', 'cp-2'],
        issuedAt: Date.now() - 10 * 60 * 1000, // 10 minutes ago
      };

      const token = createSignedRoundToken(payload, SECRET);
      const res = verifySignedRoundToken(token, SECRET, 5 * 60 * 1000); // 5 min max

      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/expired/i);
    });
  });

  describe('2. Server Action Anti-Tamper & Replay Protection', () => {
    it('rejects submission with missing roundToken', async () => {
      const matches = [
        { termId: 'cp-1', definitionId: 'cp-1' },
        { termId: 'cp-2', definitionId: 'cp-2' },
        { termId: 'cp-3', definitionId: 'cp-3' },
        { termId: 'cp-4', definitionId: 'cp-4' },
      ];

      const res = await submitConceptMatchAction(matches);
      expect(res.success).toBe(false);
      expect(res.xpAwarded).toBe(0);
      expect(res.error).toMatch(/Missing server-issued round token/i);
    });

    it('rejects submission with forged roundToken', async () => {
      const matches = [
        { termId: 'cp-1', definitionId: 'cp-1' },
        { termId: 'cp-2', definitionId: 'cp-2' },
        { termId: 'cp-3', definitionId: 'cp-3' },
        { termId: 'cp-4', definitionId: 'cp-4' },
      ];

      const fakeToken = createSignedRoundToken(
        {
          roundId: 'fake-round-id',
          studentId: 'anonymous',
          termIds: ['cp-1', 'cp-2', 'cp-3', 'cp-4'],
          issuedAt: Date.now(),
        },
        'fake-forged-secret-key'
      );

      const res = await submitConceptMatchAction(matches, fakeToken);
      expect(res.success).toBe(false);
      expect(res.xpAwarded).toBe(0);
      expect(res.error).toMatch(/Invalid token signature/i);
    });

    it('rejects submission where matches do not match issued term IDs', async () => {
      const roundRes = await getConceptMatchRoundAction();
      expect(roundRes.success).toBe(true);
      expect(roundRes.roundToken).toBeDefined();

      // Submit completely different terms than the ones issued
      const fakeMatches = [
        { termId: 'different-1', definitionId: 'different-1' },
        { termId: 'different-2', definitionId: 'different-2' },
        { termId: 'different-3', definitionId: 'different-3' },
        { termId: 'different-4', definitionId: 'different-4' },
      ];

      const res = await submitConceptMatchAction(fakeMatches, roundRes.roundToken);
      expect(res.success).toBe(false);
      expect(res.xpAwarded).toBe(0);
      expect(res.error).toMatch(/do not match the round issued/i);
    });

    it('pays nothing when the exact same roundToken is replayed a second time', async () => {
      const roundRes = await getConceptMatchRoundAction();
      expect(roundRes.success).toBe(true);
      expect(roundRes.round).toBeDefined();
      expect(roundRes.roundToken).toBeDefined();

      // Construct perfect matches for the issued round
      const perfectMatches = roundRes.round!.terms.map((t) => ({
        termId: t.id,
        definitionId: t.id,
      }));

      // SUBMISSION 1: Valid initial submit
      const res1 = await submitConceptMatchAction(perfectMatches, roundRes.roundToken);
      expect(res1.success).toBe(true);
      expect(res1.isPerfect).toBe(true);

      // SUBMISSION 2: Replay attack with same roundToken
      const res2 = await submitConceptMatchAction(perfectMatches, roundRes.roundToken);
      expect(res2.success).toBe(true);
      // Replay must pay nothing (duplicate reference prevents duplicate award)
      expect(res2.xpAwarded).toBe(0);
    });
  });
});
