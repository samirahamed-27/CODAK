import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createAdminClient } from '@/lib/supabase/admin';
import { runAnswerSharingDetection } from '@/lib/anti-gaming/answer-sharing';
import { runWinTradingDetection } from '@/lib/anti-gaming/win-trading';
import { runCollusionDetection } from '@/lib/anti-gaming/collusion-detection';
import { GET as cronGet, POST as cronPost } from '@/app/api/cron/detect-collusion/route';
import { NextRequest } from 'next/server';

describe('Anti-Gaming: Answer-Sharing and Win-Trading Detection Suite', () => {
  const adminClient = createAdminClient();
  const testRunId = `cheat_${Date.now()}`;

  // Created entities for cleanup
  const createdUserIds: string[] = [];
  const createdQuestionIds: string[] = [];
  const createdAttemptIds: string[] = [];
  const createdDuelIds: string[] = [];
  const createdBattleIds: string[] = [];
  let subjectId: string;

  // Test students
  let cheater1Id: string;
  let cheater2Id: string;
  let control1Id: string;
  let control2Id: string;
  let battleMate1Id: string;
  let battleMate2Id: string;
  let duelist1Id: string;
  let duelist2Id: string;

  async function createTestStudent(suffix: string): Promise<string> {
    const email = `${testRunId}_${suffix}@test.edu`;
    const { data: user, error: userErr } = await adminClient.auth.admin.createUser({
      email,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: { role: 'student', full_name: `Test ${suffix}` },
    });

    if (userErr || !user?.user) {
      throw new Error(`Failed to create test user ${email}: ${userErr?.message}`);
    }

    const userId = user.user.id;
    createdUserIds.push(userId);

    // Ensure student record
    await adminClient.from('profiles').upsert({
      id: userId,
      role: 'student',
      full_name: `Test ${suffix}`,
    });

    await adminClient.from('students').upsert({
      id: userId,
      enrollment_no: `EN_${userId.slice(0, 8)}`,
    });

    return userId;
  }

  beforeAll(async () => {
    // 1. Get or create a subject
    const { data: sub } = await adminClient.from('subjects').select('id').limit(1).single();
    if (sub) {
      subjectId = sub.id;
    } else {
      const { data: newSub } = await adminClient
        .from('subjects')
        .insert({ name: `Sub_${testRunId}`, code: `CODE_${testRunId.slice(0, 6)}` })
        .select('id')
        .single();
      subjectId = newSub!.id;
    }

    // 2. Create student pairs
    cheater1Id = await createTestStudent('c1');
    cheater2Id = await createTestStudent('c2');
    control1Id = await createTestStudent('ctrl1');
    control2Id = await createTestStudent('ctrl2');
    battleMate1Id = await createTestStudent('bm1');
    battleMate2Id = await createTestStudent('bm2');
    duelist1Id = await createTestStudent('d1');
    duelist2Id = await createTestStudent('d2');

    // 3. Create 12 questions for answer sharing tests
    for (let i = 1; i <= 12; i++) {
      const { data: q } = await adminClient
        .from('questions')
        .insert({
          subject_id: subjectId,
          topic: 'Collusion Testing',
          question_text: `Test Question ${i} for ${testRunId}`,
          option_a: 'Alpha Option',
          option_b: 'Bravo Option',
          option_c: 'Charlie Option',
          option_d: 'Delta Option',
          correct_option: 'A', // A is always correct
          explanation: 'Alpha is the correct answer.',
          status: 'approved',
          is_active: true,
        })
        .select('id')
        .single();

      if (q) createdQuestionIds.push(q.id);
    }
  });

  afterAll(async () => {
    // Clean up all created test entities
    if (createdDuelIds.length > 0) {
      await adminClient.from('duel_answers').delete().in('duel_id', createdDuelIds);
      await adminClient.from('duel_questions').delete().in('duel_id', createdDuelIds);
      await adminClient.from('duels').delete().in('id', createdDuelIds);
    }

    if (createdBattleIds.length > 0) {
      await adminClient.from('battle_team_members').delete().in('battle_id', createdBattleIds);
      await adminClient.from('battle_questions').delete().in('battle_id', createdBattleIds);
      await adminClient.from('battle_teams').delete().in('battle_id', createdBattleIds);
      await adminClient.from('battles').delete().in('id', createdBattleIds);
    }

    if (createdAttemptIds.length > 0) {
      await adminClient.from('quiz_answers').delete().in('attempt_id', createdAttemptIds);
      await adminClient.from('quiz_attempts').delete().in('id', createdAttemptIds);
    }

    if (createdQuestionIds.length > 0) {
      await adminClient.from('questions').delete().in('id', createdQuestionIds);
    }

    if (createdUserIds.length > 0) {
      await adminClient.from('flags').delete().in('student_id', createdUserIds);
      await adminClient.from('flags').delete().in('second_student_id', createdUserIds);
      for (const uId of createdUserIds) {
        await adminClient.auth.admin.deleteUser(uId).catch(() => {});
      }
    }
  });

  describe('1. Answer Sharing Collusion Detection', () => {
    it('flags cheater pair with >= 60% identical WRONG choices submitted close in time', async () => {
      const now = new Date();

      // Cheater 1 attempt
      const { data: att1, error: err1 } = await adminClient
        .from('quiz_attempts')
        .insert({
          student_id: cheater1Id,
          quiz_date: '2026-10-18',
          mode: 'practice',
          question_ids: createdQuestionIds.slice(0, 10),
          score: 3,
          total_questions: 10,
        })
        .select('id')
        .single();
      if (err1) throw new Error(`att1 insert error: ${err1.message}`);
      createdAttemptIds.push(att1!.id);

      // Cheater 2 attempt
      const { data: att2, error: err2 } = await adminClient
        .from('quiz_attempts')
        .insert({
          student_id: cheater2Id,
          quiz_date: '2026-10-18',
          mode: 'practice',
          question_ids: createdQuestionIds.slice(0, 10),
          score: 3,
          total_questions: 10,
        })
        .select('id')
        .single();
      if (err2) throw new Error(`att2 insert error: ${err2.message}`);
      createdAttemptIds.push(att2!.id);

      // Answer 10 common questions:
      // Questions 0..6 (7 questions): both submit wrong option 'C' within 25 seconds of each other
      // Questions 7..9 (3 questions): both submit correct option 'A' within 25 seconds of each other
      const baseTime = now.getTime() - 3600 * 1000;
      for (let i = 0; i < 10; i++) {
        const qId = createdQuestionIds[i];
        const isWrongChoice = i < 7;
        const option = isWrongChoice ? 'C' : 'A';
        const isCorrect = !isWrongChoice;

        const time1 = new Date(baseTime + i * 5000).toISOString();
        const time2 = new Date(baseTime + i * 5000 + 25000).toISOString(); // 25s delta (< 120s)

        await adminClient.from('quiz_answers').insert([
          {
            attempt_id: att1!.id,
            question_id: qId,
            selected_option: option,
            is_correct: isCorrect,
            answered_at: time1,
          },
          {
            attempt_id: att2!.id,
            question_id: qId,
            selected_option: option,
            is_correct: isCorrect,
            answered_at: time2,
          },
        ]);
      }

      // Run answer sharing detection filtered to this pair
      const result = await runAnswerSharingDetection({
        studentId: cheater1Id,
        secondStudentId: cheater2Id,
        minCommon: 10,
        wrongThreshold: 0.6,
      });

      expect(result.flaggedCount).toBe(1);
      const flag = result.flags[0];
      expect(flag.commonQuestionsCount).toBe(10);
      expect(flag.sharedWrongCount).toBe(7);
      expect(flag.sharedRightCount).toBe(3);
      expect(flag.wrongMatchRatio).toBe(0.7);

      // Verify flag record in database
      const { data: dbFlag } = await adminClient
        .from('flags')
        .select('*')
        .eq('kind', 'answer_sharing')
        .in('student_id', [cheater1Id, cheater2Id])
        .single();

      expect(dbFlag).toBeTruthy();
      expect(dbFlag!.status).toBe('open');
      expect(dbFlag!.evidence.wrong_match_ratio).toBe(0.7);
      expect(dbFlag!.evidence.sample_shared_wrong.length).toBeGreaterThan(0);
    });

    it('CONTROL TEST: two students with 10 identical CORRECT answers are NEVER flagged', async () => {
      const now = new Date();

      // Control student 1 attempt
      const { data: att1, error: err1 } = await adminClient
        .from('quiz_attempts')
        .insert({
          student_id: control1Id,
          quiz_date: '2026-10-18',
          mode: 'practice',
          question_ids: createdQuestionIds.slice(0, 10),
          score: 10,
          total_questions: 10,
        })
        .select('id')
        .single();
      if (err1) throw new Error(`control att1 insert error: ${err1.message}`);
      createdAttemptIds.push(att1!.id);

      // Control student 2 attempt
      const { data: att2, error: err2 } = await adminClient
        .from('quiz_attempts')
        .insert({
          student_id: control2Id,
          quiz_date: '2026-10-18',
          mode: 'practice',
          question_ids: createdQuestionIds.slice(0, 10),
          score: 10,
          total_questions: 10,
        })
        .select('id')
        .single();
      if (err2) throw new Error(`control att2 insert error: ${err2.message}`);
      createdAttemptIds.push(att2!.id);

      // Answer 10 common questions with 100% correct answers 'A'
      const baseTime = now.getTime() - 3600 * 1000;
      for (let i = 0; i < 10; i++) {
        const qId = createdQuestionIds[i];
        const time1 = new Date(baseTime + i * 4000).toISOString();
        const time2 = new Date(baseTime + i * 4000 + 10000).toISOString();

        await adminClient.from('quiz_answers').insert([
          {
            attempt_id: att1!.id,
            question_id: qId,
            selected_option: 'A',
            is_correct: true,
            answered_at: time1,
          },
          {
            attempt_id: att2!.id,
            question_id: qId,
            selected_option: 'A',
            is_correct: true,
            answered_at: time2,
          },
        ]);
      }

      const result = await runAnswerSharingDetection({
        studentId: control1Id,
        secondStudentId: control2Id,
        minCommon: 10,
        wrongThreshold: 0.6,
      });

      // Crucial: Must be 0 flags! Anyone can get questions right legitimately.
      expect(result.flaggedCount).toBe(0);
      expect(result.flags.length).toBe(0);

      // Double-check no flag in DB
      const { data: dbFlags } = await adminClient
        .from('flags')
        .select('id')
        .eq('kind', 'answer_sharing')
        .or(`student_id.eq.${control1Id},second_student_id.eq.${control1Id}`);

      expect(dbFlags?.length || 0).toBe(0);
    });

    it('EXCLUSION TEST: battle teammates sharing answers on battle questions are NOT flagged', async () => {
      const now = new Date();

      // Create a battle and assign battleMate1 and battleMate2 to the same team
      const { data: battle, error: battleErr } = await adminClient
        .from('battles')
        .insert({
          title: `Test Battle ${testRunId}`,
          topic: 'Collusion Testing',
          status: 'finished',
        })
        .select('id')
        .single();
      if (battleErr) throw new Error(`battle insert error: ${battleErr.message}`);
      createdBattleIds.push(battle!.id);

      const { data: team } = await adminClient
        .from('battle_teams')
        .insert({
          battle_id: battle!.id,
          name: `Team Alpha ${testRunId}`,
        })
        .select('id')
        .single();

      await adminClient.from('battle_team_members').insert([
        {
          battle_id: battle!.id,
          team_id: team!.id,
          student_id: battleMate1Id,
        },
        {
          battle_id: battle!.id,
          team_id: team!.id,
          student_id: battleMate2Id,
        },
      ]);

      // Assign the first 10 questions to this battle
      for (let i = 0; i < 10; i++) {
        await adminClient.from('battle_questions').insert({
          battle_id: battle!.id,
          question_id: createdQuestionIds[i],
          question_order: i + 1,
        });
      }

      // Now teammates answer these 10 battle questions with identical wrong answers
      const { data: att1, error: err1 } = await adminClient
        .from('quiz_attempts')
        .insert({
          student_id: battleMate1Id,
          quiz_date: '2026-10-18',
          mode: 'practice',
          question_ids: createdQuestionIds.slice(0, 10),
          score: 0,
          total_questions: 10,
        })
        .select('id')
        .single();
      if (err1) throw new Error(`teammate att1 error: ${err1.message}`);
      createdAttemptIds.push(att1!.id);

      const { data: att2, error: err2 } = await adminClient
        .from('quiz_attempts')
        .insert({
          student_id: battleMate2Id,
          quiz_date: '2026-10-18',
          mode: 'practice',
          question_ids: createdQuestionIds.slice(0, 10),
          score: 0,
          total_questions: 10,
        })
        .select('id')
        .single();
      if (err2) throw new Error(`teammate att2 error: ${err2.message}`);
      createdAttemptIds.push(att2!.id);

      const baseTime = now.getTime() - 3600 * 1000;
      for (let i = 0; i < 10; i++) {
        const qId = createdQuestionIds[i];
        const time1 = new Date(baseTime + i * 2000).toISOString();
        const time2 = new Date(baseTime + i * 2000 + 5000).toISOString();

        await adminClient.from('quiz_answers').insert([
          {
            attempt_id: att1!.id,
            question_id: qId,
            selected_option: 'D', // Identical wrong choice
            is_correct: false,
            answered_at: time1,
          },
          {
            attempt_id: att2!.id,
            question_id: qId,
            selected_option: 'D', // Identical wrong choice
            is_correct: false,
            answered_at: time2,
          },
        ]);
      }

      // Run answer sharing detection for this pair
      const result = await runAnswerSharingDetection({
        studentId: battleMate1Id,
        secondStudentId: battleMate2Id,
        minCommon: 10,
        wrongThreshold: 0.6,
      });

      // Because battle teammates are expected to collaborate on their battle's questions,
      // they must NOT be flagged!
      expect(result.flaggedCount).toBe(0);
      expect(result.flags.length).toBe(0);
    });
  });

  describe('2. Duel Win-Trading Detection', () => {
    it('flags pair exceeding duel threshold (> 6 duels in 7 days)', async () => {
      const now = new Date();

      // Create 7 completed duels between duelist1 and duelist2
      for (let i = 0; i < 7; i++) {
        const duelTime = new Date(now.getTime() - (7 - i) * 3600 * 1000).toISOString();
        const { data: duel } = await adminClient
          .from('duels')
          .insert({
            challenger_id: i % 2 === 0 ? duelist1Id : duelist2Id,
            challenged_id: i % 2 === 0 ? duelist2Id : duelist1Id,
            status: 'completed',
            winner_id: duelist1Id, // duelist1 wins all
            challenger_score: 5,
            challenged_score: 1,
            created_at: duelTime,
          })
          .select('id')
          .single();

        if (duel) createdDuelIds.push(duel.id);
      }

      const result = await runWinTradingDetection({
        studentId: duelist1Id,
        secondStudentId: duelist2Id,
        maxDuelsThreshold: 6,
        oneSidedThreshold: 0.8,
      });

      expect(result.flaggedCount).toBe(1);
      const flag = result.flags[0];
      expect(flag.totalDuels).toBe(7);
      expect(flag.studentAWins + flag.studentBWins).toBe(7);
      expect(flag.oneSidedRatio).toBe(1.0);

      // Verify flag record in database
      const { data: dbFlag } = await adminClient
        .from('flags')
        .select('*')
        .eq('kind', 'win_trading')
        .in('student_id', [duelist1Id, duelist2Id])
        .single();

      expect(dbFlag).toBeTruthy();
      expect(dbFlag!.status).toBe('open');
      expect(dbFlag!.evidence.total_duels).toBe(7);
      expect(dbFlag!.evidence.duels_summary.length).toBe(7);
    });

    it('flags one-sided farming (5 duels with 100% win rate to one player)', async () => {
      // Create a fresh pair of test users for one-sided farming
      const farmer1 = await createTestStudent('farm1');
      const farmer2 = await createTestStudent('farm2');

      const now = new Date();
      for (let i = 0; i < 5; i++) {
        const duelTime = new Date(now.getTime() - (5 - i) * 1800 * 1000).toISOString();
        const { data: duel } = await adminClient
          .from('duels')
          .insert({
            challenger_id: farmer1,
            challenged_id: farmer2,
            status: 'completed',
            winner_id: farmer1, // 100% one-sided
            challenger_score: 5,
            challenged_score: 0,
            created_at: duelTime,
          })
          .select('id')
          .single();

        if (duel) createdDuelIds.push(duel.id);
      }

      const result = await runWinTradingDetection({
        studentId: farmer1,
        secondStudentId: farmer2,
        maxDuelsThreshold: 6,
        oneSidedThreshold: 0.8,
      });

      expect(result.flaggedCount).toBe(1);
      expect(result.flags[0].totalDuels).toBe(5);
      expect(result.flags[0].oneSidedRatio).toBe(1.0);
    });

    it('does NOT flag casual opponents with few and balanced duels', async () => {
      const casual1 = await createTestStudent('cas1');
      const casual2 = await createTestStudent('cas2');

      const now = new Date();
      // 2 balanced duels (1 win each)
      const { data: d1 } = await adminClient
        .from('duels')
        .insert({
          challenger_id: casual1,
          challenged_id: casual2,
          status: 'completed',
          winner_id: casual1,
          challenger_score: 4,
          challenged_score: 3,
          created_at: new Date(now.getTime() - 3600000).toISOString(),
        })
        .select('id')
        .single();
      if (d1) createdDuelIds.push(d1.id);

      const { data: d2 } = await adminClient
        .from('duels')
        .insert({
          challenger_id: casual2,
          challenged_id: casual1,
          status: 'completed',
          winner_id: casual2,
          challenger_score: 5,
          challenged_score: 4,
          created_at: now.toISOString(),
        })
        .select('id')
        .single();
      if (d2) createdDuelIds.push(d2.id);

      const result = await runWinTradingDetection({
        studentId: casual1,
        secondStudentId: casual2,
        maxDuelsThreshold: 6,
        oneSidedThreshold: 0.8,
      });

      expect(result.flaggedCount).toBe(0);
    });
  });

  describe('3. Unified Collusion Detection & Cron Route Security', () => {
    it('runs orchestrator combining answer sharing and win trading', async () => {
      const combined = await runCollusionDetection();
      expect(combined.timestamp).toBeTruthy();
      expect(typeof combined.totalFlaggedCount).toBe('number');
      expect(combined.answerSharing).toBeDefined();
      expect(combined.winTrading).toBeDefined();
    });

    it('rejects cron GET/POST without valid authorization secret', async () => {
      const reqNoAuth = new NextRequest('http://localhost:3000/api/cron/detect-collusion', {
        method: 'GET',
      });
      const res1 = await cronGet(reqNoAuth);
      expect(res1.status).toBe(401);

      const reqWrongAuth = new NextRequest('http://localhost:3000/api/cron/detect-collusion', {
        method: 'POST',
        headers: { 'x-cron-secret': 'wrong-secret-123' },
      });
      const res2 = await cronPost(reqWrongAuth);
      expect(res2.status).toBe(401);
    });

    it('accepts cron request with valid Bearer token', async () => {
      const secret = process.env.CRON_SECRET || 'test-cron-secret';
      process.env.CRON_SECRET = secret;

      const req = new NextRequest('http://localhost:3000/api/cron/detect-collusion', {
        method: 'GET',
        headers: { authorization: `Bearer ${secret}` },
      });
      const res = await cronGet(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.result).toBeDefined();
    });
  });
});
