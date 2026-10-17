import { describe, it, expect, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as leaderboardGet } from '@/app/api/leaderboard/route';
import { getConceptMatchRoundAction } from '@/app/actions/concept-match';
import { createOrJoinAutoMatchAction } from '@/app/actions/duels';
import { getStudentQuestsAction } from '@/app/actions/quests';

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
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        process.env[match[1]] = val;
      }
    }
  }
}
loadEnvLocal();

describe('Security Fixes Regression Guards (AUDIT-SEC-01 & AUDIT-SEC-02)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('AUDIT-SEC-02: Production Backdoor Header Immunity', () => {
    it('ignores x-test-requester-role and x-test-requester-id when NODE_ENV is production', async () => {
      // Simulate production environment
      vi.stubEnv('NODE_ENV', 'production');

      const req = new NextRequest('http://localhost:3000/api/leaderboard', {
        headers: {
          'x-test-requester-id': '00000000-0000-0000-0000-000000000001',
          'x-test-requester-role': 'faculty',
        },
      });

      const response = await leaderboardGet(req);
      const json = await response.json();

      // In production, unauthenticated request with test headers MUST be rejected with 401
      expect(response.status).toBe(401);
      expect(json.error).toMatch(/Unauthorized/i);
    });
  });

  describe('Demo Mode Server-Side Guard', () => {
    it('with NEXT_PUBLIC_DEMO_MODE=false, unauthenticated requests are rejected and demo student fallback is disabled', async () => {
      vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'false');

      // 1. Concept Match
      const conceptRes = await getConceptMatchRoundAction();
      if (conceptRes.roundToken) {
        const { verifySignedRoundToken } = await import('@/lib/concept-match');
        const token = verifySignedRoundToken(
          conceptRes.roundToken,
          process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.CRON_SECRET || 'concept-match-local-secret'
        );
        // Student ID in round token must be anonymous, never a demo student ID
        expect(token.payload?.studentId).toBe('anonymous');
      }

      // 2. Duels auto-match action without session
      const duelRes = await createOrJoinAutoMatchAction();
      expect(duelRes.success).toBe(false);
      expect(duelRes.error).toMatch(/Student not found|login required/i);

      // 3. Quests action without session
      const questsRes = await getStudentQuestsAction();
      expect(questsRes.success).toBe(false);
      expect(questsRes.error).toMatch(/Student not found|login required/i);
    });
  });
});
