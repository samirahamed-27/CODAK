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

  describe('Demo Mode Server-Side Guard (L3)', () => {
    const modes = ['false', 'true'] as const;

    for (const mode of modes) {
      it(`with NEXT_PUBLIC_DEMO_MODE=${mode}, unauthenticated requests to server actions return Unauthorized / 401`, async () => {
        vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', mode);

        // 1. Concept Match Round & Submit
        const conceptRound = await getConceptMatchRoundAction();
        if (conceptRound.roundToken) {
          const { verifySignedRoundToken } = await import('@/lib/concept-match');
          const token = verifySignedRoundToken(
            conceptRound.roundToken,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.CRON_SECRET || 'concept-match-local-secret'
          );
          expect(token.payload?.studentId).toBe('anonymous');
        }

        const { submitConceptMatchAction } = await import('@/app/actions/concept-match');
        const conceptSubmit = await submitConceptMatchAction([], 'invalid');
        expect(conceptSubmit.success).toBe(false);
        expect(conceptSubmit.error).toMatch(/Unauthorized/i);

        // 2. Duels auto-match action without session
        const duelRes = await createOrJoinAutoMatchAction();
        expect(duelRes.success).toBe(false);
        expect(duelRes.error).toMatch(/Unauthorized/i);

        // 3. Quests action without session
        const questsRes = await getStudentQuestsAction();
        expect(questsRes.success).toBe(false);
        expect(questsRes.error).toMatch(/Unauthorized/i);

        // 4. Leagues actions without session
        const { getStudentLeagueAction } = await import('@/app/actions/leagues');
        const leagueRes = await getStudentLeagueAction();
        expect(leagueRes.success).toBe(false);
        expect(leagueRes.error).toMatch(/Unauthorized/i);

        // 5. Battles actions without session
        const { getMyBattlesAction } = await import('@/app/actions/battles');
        const battlesRes = await getMyBattlesAction();
        expect(battlesRes.success).toBe(false);
        expect(battlesRes.error).toMatch(/Unauthorized/i);

        // 6. Quiz actions without session
        const {
          getDailyQuizSessionAction,
          submitQuizAnswerAction,
          finalizeQuizAction,
          getPracticeQuizSessionAction,
          getStudentStreakAction,
        } = await import('@/app/actions/quiz');

        const dailyQuizRes = await getDailyQuizSessionAction();
        expect(dailyQuizRes.status).toBe('error');
        expect(dailyQuizRes.error).toMatch(/Unauthorized/i);

        const submitQuizRes = await submitQuizAnswerAction({
          attemptId: '00000000-0000-0000-0000-000000000000',
          questionId: '00000000-0000-0000-0000-000000000000',
          selectedOption: 'A',
        });
        expect(submitQuizRes.success).toBe(false);
        expect(submitQuizRes.error).toMatch(/Unauthorized/i);

        const finalizeQuizRes = await finalizeQuizAction({
          attemptId: '00000000-0000-0000-0000-000000000000',
        });
        expect(finalizeQuizRes.success).toBe(false);
        expect(finalizeQuizRes.error).toMatch(/Unauthorized/i);

        const practiceQuizRes = await getPracticeQuizSessionAction();
        expect(practiceQuizRes.success).toBe(false);
        expect(practiceQuizRes.error).toMatch(/Unauthorized/i);

        const streakRes = await getStudentStreakAction();
        expect(streakRes.error).toMatch(/Unauthorized/i);

        // 7. Badges actions without session
        const { getStudentBadgesAction, evaluateMyBadgesAction } = await import('@/app/actions/badges');
        const getBadgesRes = await getStudentBadgesAction();
        expect(getBadgesRes.success).toBe(false);
        expect(getBadgesRes.error).toMatch(/Unauthorized/i);

        const evalBadgesRes = await evaluateMyBadgesAction();
        expect(evalBadgesRes.success).toBe(false);
        expect(evalBadgesRes.error).toMatch(/Unauthorized/i);

        // 8. Faculty actions without session
        const { getFacultyAnalyticsAction } = await import('@/app/actions/faculty-analytics');
        const analyticsRes = await getFacultyAnalyticsAction();
        expect(analyticsRes.success).toBe(false);
        expect(analyticsRes.statusCode).toBe(401);

        const { searchStudentsAction } = await import('@/app/actions/student-search');
        const searchRes = await searchStudentsAction('test');
        expect(searchRes.success).toBe(false);
        expect(searchRes.statusCode).toBe(401);

        // 9. XP actions without session
        const { awardXpAction } = await import('@/app/actions/xp');
        const awardRes = await awardXpAction({
          studentId: '00000000-0000-0000-0000-000000000000',
          actionType: 'MANUAL_AWARD',
          referenceId: 'ref_test',
        });
        expect(awardRes.success).toBe(false);
        expect(awardRes.statusCode).toBe(401);

        // 10. Practice links action without session
        const { getPracticeLinksAction } = await import('@/app/actions/practice');
        const practiceLinksRes = await getPracticeLinksAction();
        expect(practiceLinksRes.success).toBe(false);
        expect(practiceLinksRes.error).toMatch(/Unauthorized/i);

        // 11. API routes without session (Leaderboard)
        const req = new NextRequest('http://localhost:3000/api/leaderboard');
        const response = await leaderboardGet(req);
        expect(response.status).toBe(401);
      });
    }
  });
});
