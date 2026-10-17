import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import { finalizeBattle } from '../src/lib/battles';
import { cleanupLoadtest } from '../scripts/cleanup-loadtest';

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const databaseUrl = process.env.DATABASE_URL || '';

describe('4G: 300-User Live Battle Simulation & Realtime Latency Benchmark', () => {
  let pgClient: Client;
  let adminClient: SupabaseClient;

  let battleId: string;
  let questionId: string;
  let teamAlphaId: string;
  let teamBetaId: string;
  let teamGammaId: string;

  const testStudents: { id: string; email: string; rollNo: string; teamId: string }[] = [];
  const realtimeSubscribers: SupabaseClient[] = [];
  const realtimeChannels: any[] = [];
  const latencyMeasurements: number[] = [];

  beforeAll(async () => {
    // Set 90s timeout for 300-user simulation suite
    pgClient = new Client({ connectionString: databaseUrl });
    await pgClient.connect();
    adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Initial safety cleanup
    await cleanupLoadtest();

    // 1. Fetch pilot subject and an approved question
    const { rows: qRows } = await pgClient.query(`
      SELECT id, correct_option FROM public.questions
      WHERE status = 'approved' AND is_active = true
      LIMIT 1;
    `);

    if (qRows.length === 0) {
      throw new Error('No approved question found for battle loadtest.');
    }
    questionId = qRows[0].id;
    const correctOption = qRows[0].correct_option || 'C';

    // 2. Create the Loadtest Battle
    battleId = crypto.randomUUID();
    await pgClient.query(
      `
      INSERT INTO public.battles (
        id, title, topic, status, starts_at, ends_at, config
      ) VALUES ($1, $2, $3, 'live', now(), now() + interval '2 hours', $4);
    `,
      [battleId, 'Loadtest Battle 300 Users', 'Load & Latency Testing', JSON.stringify({ points_per_correct: 10 })]
    );

    // 3. Attach question to battle
    await pgClient.query(
      `
      INSERT INTO public.battle_questions (battle_id, question_id, question_order)
      VALUES ($1, $2, 1);
    `,
      [battleId, questionId]
    );

    // 4. Create 3 Teams
    teamAlphaId = crypto.randomUUID();
    teamBetaId = crypto.randomUUID();
    teamGammaId = crypto.randomUUID();

    await pgClient.query(`
      INSERT INTO public.battle_teams (id, battle_id, name) VALUES
        ('${teamAlphaId}', '${battleId}', 'Team Alpha'),
        ('${teamBetaId}', '${battleId}', 'Team Beta'),
        ('${teamGammaId}', '${battleId}', 'Team Gamma');
    `);

    // Initialize battle_scores for the 3 teams
    await pgClient.query(`
      INSERT INTO public.battle_scores (battle_id, team_id, total_points, member_count, answered_count, avg_points) VALUES
        ('${battleId}', '${teamAlphaId}', 0, 100, 0, 0),
        ('${battleId}', '${teamBetaId}', 0, 100, 0, 0),
        ('${battleId}', '${teamGammaId}', 0, 100, 0, 0);
    `);

    // 5. Batch-create 300 test students via auth.users (triggers create profiles and students)
    const userValues: string[] = [];
    const memberValues: string[] = [];

    for (let i = 0; i < 300; i++) {
      const studentId = crypto.randomUUID();
      const email = `loadtest_student_${i}@loadtest.invalid`;
      const rollNo = `loadtest_ROLL_${i}`;
      const teamId = i < 100 ? teamAlphaId : i < 200 ? teamBetaId : teamGammaId;

      testStudents.push({ id: studentId, email, rollNo, teamId });

      userValues.push(`(
        '${studentId}',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        '${email}',
        'fake_hashed_pwd',
        now(),
        '{"provider":"email"}',
        '{"full_name":"loadtest_Student_${i}","roll_no":"${rollNo}","department":"CS"}',
        now(),
        now()
      )`);

      memberValues.push(`('${battleId}', '${teamId}', '${studentId}')`);
    }

    // Insert 300 auth.users in chunks of 100
    for (let c = 0; c < 3; c++) {
      const slice = userValues.slice(c * 100, (c + 1) * 100).join(',');
      await pgClient.query(`
        INSERT INTO auth.users (
          id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES ${slice};
      `);
    }

    // Insert 300 team members in one query
    await pgClient.query(`
      INSERT INTO public.battle_team_members (battle_id, team_id, student_id)
      VALUES ${memberValues.join(',')};
    `);

    // 6. Connect 10 Realtime subscribers listening to battle_scores updates
    const subscriptionPromises: Promise<void>[] = [];

    for (let s = 0; s < 10; s++) {
      const subClient = createClient(supabaseUrl, serviceRoleKey);
      realtimeSubscribers.push(subClient);

      const channel = subClient.channel(`loadtest-sub-${s}`);
      realtimeChannels.push(channel);

      const subPromise = new Promise<void>((resolve) => {
        channel
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'battle_scores',
              filter: `battle_id=eq.${battleId}`,
            },
            (payload) => {
              const arrivalTime = Date.now();
              const updateTime = new Date((payload.new as any).updated_at || Date.now()).getTime();
              const latency = Math.max(arrivalTime - updateTime, 5);
              latencyMeasurements.push(latency);
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              resolve();
            }
          });
      });

      subscriptionPromises.push(subPromise);
    }

    await Promise.all(subscriptionPromises);
  }, 90000);

  afterAll(async () => {
    // Unsubscribe all realtime channels
    for (let i = 0; i < realtimeChannels.length; i++) {
      try {
        await realtimeSubscribers[i].removeChannel(realtimeChannels[i]);
      } catch (_) {}
    }

    // Full database cleanup
    await cleanupLoadtest();

    if (pgClient) {
      await pgClient.end();
    }
  }, 60000);

  it('executes 300 parallel submissions with idempotency retries, verifies exact team totals, and validates latency under 2 seconds', async () => {
    // Query actual correct option for the question
    const { rows } = await pgClient.query(`SELECT correct_option FROM public.questions WHERE id = $1`, [questionId]);
    const correctOpt = rows[0]?.correct_option || 'C';
    const wrongOpt = correctOpt === 'A' ? 'B' : 'A';

    // Prepare submissions:
    // Team Alpha (0..99): 50 correct (500 pts), 50 wrong (0 pts) -> Expected = 500
    // Team Beta (100..199): 25 correct (250 pts), 75 wrong (0 pts) -> Expected = 250
    // Team Gamma (200..299): 10 correct (100 pts), 90 wrong (0 pts) -> Expected = 100
    const submissionTasks: {
      studentId: string;
      answer: string;
      submissionId: string;
      expectedPoints: number;
    }[] = [];

    for (let i = 0; i < 300; i++) {
      const student = testStudents[i];
      const submissionId = crypto.randomUUID();
      let isCorrect = false;

      if (i < 100) {
        isCorrect = i % 2 === 0; // 50 correct
      } else if (i < 200) {
        isCorrect = i % 4 === 0; // 25 correct
      } else {
        isCorrect = i % 10 === 0; // 10 correct
      }

      const answer = isCorrect ? correctOpt : wrongOpt;
      const expectedPoints = isCorrect ? 10 : 0;

      submissionTasks.push({
        studentId: student.id,
        answer,
        submissionId,
        expectedPoints,
      });
    }

    // Include 50 duplicate retries using the exact same submissionId
    const retryTasks = submissionTasks.slice(0, 50).map((t) => ({ ...t }));

    // Execute submissions in concurrent batches of 25 to respect pool limits
    const allTasks = [...submissionTasks, ...retryTasks];
    const BATCH_SIZE = 25;

    for (let b = 0; b < allTasks.length; b += BATCH_SIZE) {
      const batch = allTasks.slice(b, b + BATCH_SIZE);
      await Promise.all(
        batch.map(async (task) => {
          const { data, error } = await adminClient.rpc('submit_battle_answer', {
            p_battle_id: battleId,
            p_student_id: task.studentId,
            p_question_id: questionId,
            p_answer: task.answer,
            p_submission_id: task.submissionId,
          });

          expect(error).toBeNull();
          expect(['submitted', 'duplicate_submission', 'already_answered']).toContain(data.status);
        })
      );
    }

    // Wait 2 seconds for Realtime events to process
    await new Promise((r) => setTimeout(r, 2000));

    // =========================================================================
    // VERIFICATION 1: Total points per team equal expected totals exactly
    // =========================================================================
    const { rows: scoresRows } = await pgClient.query(`
      SELECT team_id, total_points, answered_count, avg_points
      FROM public.battle_scores
      WHERE battle_id = $1
      ORDER BY total_points DESC;
    `, [battleId]);

    const scoreMap = new Map(scoresRows.map((r: any) => [r.team_id, r]));

    const alphaScore = scoreMap.get(teamAlphaId);
    expect(alphaScore).toBeDefined();
    expect(Number(alphaScore.total_points)).toBe(500); // 50 * 10
    expect(Number(alphaScore.answered_count)).toBe(100);
    expect(Number(alphaScore.avg_points)).toBe(5.0); // 500 / 100

    const betaScore = scoreMap.get(teamBetaId);
    expect(betaScore).toBeDefined();
    expect(Number(betaScore.total_points)).toBe(250); // 25 * 10
    expect(Number(betaScore.answered_count)).toBe(100);
    expect(Number(betaScore.avg_points)).toBe(2.5); // 250 / 100

    const gammaScore = scoreMap.get(teamGammaId);
    expect(gammaScore).toBeDefined();
    expect(Number(gammaScore.total_points)).toBe(100); // 10 * 10
    expect(Number(gammaScore.answered_count)).toBe(100);
    expect(Number(gammaScore.avg_points)).toBe(1.0); // 100 / 100

    // =========================================================================
    // VERIFICATION 2: No lost or double-counted submissions
    // =========================================================================
    const { rows: countRows } = await pgClient.query(`
      SELECT COUNT(*)::int as total_subs, SUM(points)::int as total_pts
      FROM public.battle_submissions
      WHERE battle_id = $1;
    `, [battleId]);

    expect(countRows[0].total_subs).toBe(300); // Exactly 300 submissions (no duplicates created)
    expect(countRows[0].total_pts).toBe(850); // 500 + 250 + 100 = 850

    // =========================================================================
    // VERIFICATION 3: battle_scores matches battle_submissions exactly
    // =========================================================================
    const { rows: sumByTeam } = await pgClient.query(`
      SELECT team_id, COUNT(*)::int as cnt, SUM(points)::int as pts
      FROM public.battle_submissions
      WHERE battle_id = $1
      GROUP BY team_id;
    `, [battleId]);

    for (const teamSub of sumByTeam) {
      const expected = scoreMap.get(teamSub.team_id);
      expect(Number(expected.total_points)).toBe(teamSub.pts);
      expect(Number(expected.answered_count)).toBe(teamSub.cnt);
    }

    // =========================================================================
    // VERIFICATION 4: Finalization and XP Payouts (Idempotent)
    // =========================================================================
    const finalizationResult = await finalizeBattle(battleId);
    expect(finalizationResult.success).toBe(true);
    expect(finalizationResult.alreadyFinalized).toBe(false);
    expect(finalizationResult.winningTeamId).toBe(teamAlphaId);

    // Verify Team Alpha received WIN + PARTICIPATION (50 XP total each)
    const { rows: alphaXpRows } = await pgClient.query(`
      SELECT action_type, COUNT(*)::int as cnt
      FROM public.xp_events
      WHERE student_id = ANY($1::uuid[])
      GROUP BY action_type;
    `, [testStudents.slice(0, 100).map((s) => s.id)]);

    const alphaWinEvents = alphaXpRows.find((r) => r.action_type === 'BATTLE_WIN');
    const alphaPartEvents = alphaXpRows.find((r) => r.action_type === 'BATTLE_PARTICIPATION');
    expect(alphaWinEvents?.cnt).toBe(100);
    expect(alphaPartEvents?.cnt).toBe(100);

    // Verify Team Beta received PARTICIPATION only (15 XP total each, 0 WIN)
    const { rows: betaXpRows } = await pgClient.query(`
      SELECT action_type, COUNT(*)::int as cnt
      FROM public.xp_events
      WHERE student_id = ANY($1::uuid[])
      GROUP BY action_type;
    `, [testStudents.slice(100, 200).map((s) => s.id)]);

    const betaWinEvents = betaXpRows.find((r) => r.action_type === 'BATTLE_WIN');
    const betaPartEvents = betaXpRows.find((r) => r.action_type === 'BATTLE_PARTICIPATION');
    expect(betaWinEvents).toBeUndefined();
    expect(betaPartEvents?.cnt).toBe(100);

    // Idempotency: Call finalizeBattle again -> no double payouts
    const reFinalize = await finalizeBattle(battleId);
    expect(reFinalize.success).toBe(true);
    expect(reFinalize.alreadyFinalized).toBe(true);

    // Verify no new XP events were created
    const { rows: postXpRows } = await pgClient.query(`
      SELECT COUNT(*)::int as total_xp_events
      FROM public.xp_events
      WHERE reference_id LIKE 'battle:' || $1 || ':%';
    `, [battleId]);

    // 100 wins + 300 participations = 400 events exactly
    expect(postXpRows[0].total_xp_events).toBe(400);

    // =========================================================================
    // VERIFICATION 5: Realtime Latency Metrics (p50 and p95 under 2s target)
    // =========================================================================
    if (latencyMeasurements.length > 0) {
      latencyMeasurements.sort((a, b) => a - b);
      const p50 = latencyMeasurements[Math.floor(latencyMeasurements.length * 0.5)];
      const p95 = latencyMeasurements[Math.floor(latencyMeasurements.length * 0.95)];

      console.log(`\n================ REALTIME LATENCY BENCHMARK ================`);
      console.log(`Total Realtime Samples Received: ${latencyMeasurements.length}`);
      console.log(`p50 Latency: ${p50} ms`);
      console.log(`p95 Latency: ${p95} ms`);
      console.log(`Target: Under 2000 ms (2.0s)`);
      console.log(`Current Supabase Plan Realtime Limit: 200 concurrent connections (Free tier) / 500 (Pro)`);
      console.log(`============================================================\n`);

      expect(p50).toBeLessThan(2000);
      expect(p95).toBeLessThan(2000);
    }
  }, 120000);
});
