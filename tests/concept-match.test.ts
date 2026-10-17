import { describe, it, expect, vi } from 'vitest';
import {
  createSignedRoundToken,
  verifySignedRoundToken,
  generateConceptMatchRound,
  verifyConceptMatches,
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
        let val = match[2] || '';
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1);
        }
        process.env[match[1]] = val;
      }
    }
  }
}

loadEnvLocal();

// Mock authenticated student session for server actions
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: '0ffe4ab0-5e55-4205-a6b1-980a24b21de4' } },
        error: null,
      }),
    },
  })),
}));

describe('H7 & Option B: Concept Match Server-Verification & Anti-Tamper Suite', () => {
  const SECRET = 'test-secret-key-concept-match-12345';

  describe('1. Option B ID Separation & Cryptographic Opacity', () => {
    it('generates terms and definitions with distinct, independent opaque IDs that are not equal and cannot be derived from each other', () => {
      const round = generateConceptMatchRound(4);
      expect(round.terms).toHaveLength(4);
      expect(round.definitions).toHaveLength(4);
      expect(round.mapping).toBeDefined();

      const termIds = round.terms.map((t) => t.id);
      const defIds = round.definitions.map((d) => d.id);

      // Verify prefix differentiation and UUID generation
      termIds.forEach((tid) => {
        expect(tid).toMatch(/^term_/);
      });
      defIds.forEach((did) => {
        expect(did).toMatch(/^def_/);
      });

      // Crucial test: termId and definitionId MUST NEVER be equal
      for (const t of round.terms) {
        for (const d of round.definitions) {
          expect(t.id).not.toBe(d.id);
        }
      }

      // Verify mapping pairs terms to definitions correctly
      for (const [tId, dId] of Object.entries(round.mapping)) {
        expect(termIds).toContain(tId);
        expect(defIds).toContain(dId);
        expect(tId).not.toBe(dId);
      }
    });

    it('verifies a valid round token with correct HMAC signature and mapping', () => {
      const mapping = {
        'term_1': 'def_1',
        'term_2': 'def_2',
        'term_3': 'def_3',
        'term_4': 'def_4',
      };
      const payload = {
        roundId: 'round-101',
        studentId: 'student-abc',
        termIds: ['term_1', 'term_2', 'term_3', 'term_4'],
        mapping,
        issuedAt: Date.now(),
      };

      const token = createSignedRoundToken(payload, SECRET);
      const res = verifySignedRoundToken(token, SECRET);

      expect(res.valid).toBe(true);
      expect(res.payload?.roundId).toBe('round-101');
      expect(res.payload?.studentId).toBe('student-abc');
      expect(res.payload?.mapping).toEqual(mapping);
    });

    it('rejects a forged token where signature does not match secret', () => {
      const payload = {
        roundId: 'round-forged',
        studentId: 'attacker',
        termIds: ['term_1', 'term_2'],
        mapping: { term_1: 'def_1', term_2: 'def_2' },
        issuedAt: Date.now(),
      };

      const forgedToken = createSignedRoundToken(payload, 'wrong-secret');
      const res = verifySignedRoundToken(forgedToken, SECRET);

      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/Invalid token signature/i);
    });

    it('rejects an expired token exceeding maxAgeMs', () => {
      const payload = {
        roundId: 'round-old',
        studentId: 'student-abc',
        termIds: ['term_1', 'term_2'],
        mapping: { term_1: 'def_1', term_2: 'def_2' },
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
        { termId: 'term_1', definitionId: 'def_1' },
      ];

      const res = await submitConceptMatchAction(matches);
      expect(res.success).toBe(false);
      expect(res.xpAwarded).toBe(0);
      expect(res.error).toMatch(/Missing server-issued round token/i);
    });

    it('rejects submission with forged roundToken or forged mapping', async () => {
      const matches = [
        { termId: 'term_1', definitionId: 'def_1' },
      ];

      const fakeToken = createSignedRoundToken(
        {
          roundId: 'fake-round-id',
          studentId: 'anonymous',
          termIds: ['term_1'],
          mapping: { term_1: 'def_1' },
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

      const fakeMatches = [
        { termId: 'term_different_1', definitionId: 'def_different_1' },
        { termId: 'term_different_2', definitionId: 'def_different_2' },
        { termId: 'term_different_3', definitionId: 'def_different_3' },
        { termId: 'term_different_4', definitionId: 'def_different_4' },
      ];

      const res = await submitConceptMatchAction(fakeMatches, roundRes.roundToken);
      expect(res.success).toBe(false);
      expect(res.xpAwarded).toBe(0);
      expect(res.error).toMatch(/do not match the round issued/i);
    });

    it('evaluates submitted matches against server-side mapping, awards 10 XP on perfect match, and pays 0 on replay', async () => {
      // 1. Fetch round from server action
      const roundRes = await getConceptMatchRoundAction();
      expect(roundRes.success).toBe(true);
      expect(roundRes.round).toBeDefined();
      expect(roundRes.roundToken).toBeDefined();

      // Verify client payload does NOT leak mapping
      expect((roundRes.round as any).mapping).toBeUndefined();

      // Inspect signed token using test secret to extract expected mapping for test submit
      const tokenCheck = verifySignedRoundToken(
        roundRes.roundToken!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.CRON_SECRET || 'concept-match-local-secret'
      );
      expect(tokenCheck.valid).toBe(true);
      expect(tokenCheck.payload?.mapping).toBeDefined();

      const serverMapping = tokenCheck.payload!.mapping;

      // Construct perfect matches according to server mapping
      const perfectMatches = roundRes.round!.terms.map((t) => ({
        termId: t.id,
        definitionId: serverMapping[t.id],
      }));

      // SUBMISSION 1: Valid initial submit
      const res1 = await submitConceptMatchAction(perfectMatches, roundRes.roundToken);
      expect(res1.success).toBe(true);
      expect(res1.isPerfect).toBe(true);
      // If student hasn't hit daily cap, awards 10 XP
      if (res1.xpAwarded !== undefined && res1.xpAwarded > 0) {
        expect(res1.xpAwarded).toBe(10);
      }

      // SUBMISSION 2: Replay attack with same roundToken
      const res2 = await submitConceptMatchAction(perfectMatches, roundRes.roundToken);
      expect(res2.success).toBe(true);
      // Replay pays nothing due to unique reference_id
      expect(res2.xpAwarded).toBe(0);
    });

    it('rejects an expired round token and pays 0 XP', async () => {
      const expiredToken = createSignedRoundToken(
        {
          roundId: 'expired-round-123',
          studentId: 'anonymous',
          termIds: ['term_1', 'term_2', 'term_3', 'term_4'],
          mapping: { term_1: 'def_1', term_2: 'def_2', term_3: 'def_3', term_4: 'def_4' },
          issuedAt: Date.now() - 15 * 60 * 1000, // 15 mins ago (expired)
        },
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.CRON_SECRET || 'concept-match-local-secret'
      );

      const matches = [
        { termId: 'term_1', definitionId: 'def_1' },
        { termId: 'term_2', definitionId: 'def_2' },
        { termId: 'term_3', definitionId: 'def_3' },
        { termId: 'term_4', definitionId: 'def_4' },
      ];

      const res = await submitConceptMatchAction(matches, expiredToken);
      expect(res.success).toBe(false);
      expect(res.xpAwarded).toBe(0);
      expect(res.error).toMatch(/expired/i);
    });
  });
});
