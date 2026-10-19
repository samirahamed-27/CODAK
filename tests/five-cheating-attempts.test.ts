import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@supabase/supabase-js';
import { runSpikeDetection } from '@/lib/anti-gaming/spike-detection';
import { runAnswerSharingDetection } from '@/lib/anti-gaming/answer-sharing';
import { runWinTradingDetection } from '@/lib/anti-gaming/win-trading';
import { getKolkataDate } from '@/lib/streaks';
import { claimPracticeProblemAction } from '@/app/actions/practice';

describe('4F: The 5 Cheating Attempts Checkpoint', () => {
  const adminClient = createAdminClient();
  const testRunId = `cheat_${Date.now()}`;

  // Tracking for clean purge
  const createdUserIds: string[] = [];
  const createdQuestionIds: string[] = [];
  const createdAttemptIds: string[] = [];
  const createdDuelIds: string[] = [];
  const createdBattleIds: string[] = [];
  const createdFlagIds: string[] = [];
  const createdEventIds: string[] = [];

  let subjectId: string;

  // Real students with auth tokens
  let sReplay: { id: string; jwt: string };
  let sTamper: { id: string; jwt: string };
  let sSpike: { id: string; jwt: string };
  let sColluder1: { id: string; jwt: string };
  let sColluder2: { id: string; jwt: string };
  let sControl1: { id: string; jwt: string };
  let sControl2: { id: string; jwt: string };
  let sBattleMate1: { id: string; jwt: string };
  let sBattleMate2: { id: string; jwt: string };
  let sDuelist1: { id: string; jwt: string };
  let sDuelist2: { id: string; jwt: string };
  let facultyUser: { id: string; jwt: string };

  async function createTestStudent(suffix: string, withAuth = false): Promise<{ id: string; jwt: string }> {
    const email = `${testRunId}_${suffix}@test.edu`;
    const password = 'CheatPassword123!';

    const { data: user, error: userErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'student', full_name: `Cheater ${suffix}` },
    });

    if (userErr || !user?.user) {
      throw new Error(`Failed to create test user ${email}: ${userErr?.message}`);
    }

    const userId = user.user.id;
    createdUserIds.push(userId);

    await adminClient.from('profiles').upsert({
      id: userId,
      role: 'student',
      full_name: `Cheater ${suffix}`,
    });

    await adminClient.from('students').upsert({
      id: userId,
      roll_no: `R_${userId.slice(0, 8)}`,
      department: 'CSE',
      year_of_study: 3,
    });

    let jwt = '';
    if (withAuth) {
      const anonClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: signinRes } = await anonClient.auth.signInWithPassword({
        email,
        password,
      });
      jwt = signinRes.session?.access_token || '';
    }

    return { id: userId, jwt };
  }

  async function createFacultyUser(suffix: string): Promise<{ id: string; jwt: string }> {
    const email = `${testRunId}_fac_${suffix}@test.edu`;
    const password = 'CheatPassword123!';

    const { data: user, error: userErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'faculty', full_name: `Faculty ${suffix}` },
    });

    if (userErr || !user?.user) {
      throw new Error(`Failed to create faculty user ${email}: ${userErr?.message}`);
    }

    const userId = user.user.id;
    createdUserIds.push(userId);

    await adminClient.from('profiles').upsert({
      id: userId,
      role: 'faculty',
      full_name: `Faculty ${suffix}`,
    });

    await adminClient.from('faculty').upsert({
      id: userId,
      department: 'CSE',
    });

    return { id: userId, jwt: '' };
  }

  beforeAll(async () => {
    // Subject setup
    const { data: sub } = await adminClient.from('subjects').select('id').limit(1).single();
    if (sub) {
      subjectId = sub.id;
    } else {
      const { data: newSub } = await adminClient
        .from('subjects')
        .insert({ name: `Sub_${testRunId}`, code: `C_${testRunId.slice(0, 6)}` })
        .select('id')
        .single();
      subjectId = newSub!.id;
    }

    // Provision test students in parallel
    const [replay, tamper, spike, col1, col2, ctrl1, ctrl2, bm1, bm2, d1, d2, fac] = await Promise.all([
      createTestStudent('replay', false),
      createTestStudent('tamper', true), // Requires auth JWT for client-level tampering tests
      createTestStudent('spike', false),
      createTestStudent('col1', false),
      createTestStudent('col2', false),
      createTestStudent('ctrl1', false),
      createTestStudent('ctrl2', false),
      createTestStudent('bm1', false),
      createTestStudent('bm2', false),
      createTestStudent('d1', false),
      createTestStudent('d2', false),
      createFacultyUser('f1'),
    ]);

    sReplay = replay;
    sTamper = tamper;
    sSpike = spike;
    sColluder1 = col1;
    sColluder2 = col2;
    sControl1 = ctrl1;
    sControl2 = ctrl2;
    sBattleMate1 = bm1;
    sBattleMate2 = bm2;
    sDuelist1 = d1;
    sDuelist2 = d2;
    facultyUser = fac;

    // Create 12 questions for collusion tests
    for (let i = 1; i <= 12; i++) {
      const { data: q } = await adminClient
        .from('questions')
        .insert({
          subject_id: subjectId,
          topic: 'Anti-Gaming 4F',
          question_text: `4F Question ${i} ${testRunId}`,
          option_a: 'Option A (Correct)',
          option_b: 'Option B',
          option_c: 'Option C',
          option_d: 'Option D',
          correct_option: 'A',
          explanation: 'Option A is the correct answer.',
          status: 'approved',
          is_active: true,
        })
        .select('id')
        .single();

      if (q) createdQuestionIds.push(q.id);
    }
  }, 120000);

  afterAll(async () => {
    // Purge all test entities cleanly
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

    if (createdFlagIds.length > 0) {
      await adminClient.from('flags').delete().in('id', createdFlagIds);
    }

    if (createdEventIds.length > 0) {
      await adminClient.from('xp_events').delete().in('id', createdEventIds);
    }

    for (const uid of createdUserIds) {
      try { await adminClient.from('flags').delete().or(`student_id.eq.${uid},second_student_id.eq.${uid}`); } catch {}
      try { await adminClient.from('xp_events').delete().eq('student_id', uid); } catch {}
      try { await adminClient.from('students').delete().eq('id', uid); } catch {}
      try { await adminClient.from('faculty').delete().eq('id', uid); } catch {}
      try { await adminClient.from('profiles').delete().eq('id', uid); } catch {}
      try { await adminClient.auth.admin.deleteUser(uid); } catch {}
    }
  }, 120000);

  describe('Scenario 1: Replay Attack (Double-tap / replay submit)', () => {
    it('awards XP on first submission, but second submission pays 0 XP and prevents double-streak', async () => {
      const todayKolkata = getKolkataDate();

      // 1. First daily quiz completion award
      const { data: firstAward, error: err1 } = await adminClient.rpc('award_xp', {
        p_student_id: sReplay.id,
        p_action_type: 'DAILY_QUIZ',
        p_reference_id: `daily_${sReplay.id}_${todayKolkata}`,
      });

      expect(err1).toBeNull();
      const res1 = firstAward as any;
      expect(res1.status).toBe('awarded');
      expect(res1.xp_awarded).toBeGreaterThan(0);
      createdEventIds.push(res1.event_id);

      // 2. Second submission with the same reference_id (double-tap replay attempt)
      const { data: secondAward, error: err2 } = await adminClient.rpc('award_xp', {
        p_student_id: sReplay.id,
        p_action_type: 'DAILY_QUIZ',
        p_reference_id: `daily_${sReplay.id}_${todayKolkata}`,
      });

      expect(err2).toBeNull();
      const res2 = secondAward as any;
      // Replay is caught and pays 0 XP! (Status is duplicate or daily limit reached)
      expect(['duplicate', 'limit_reached']).toContain(res2.status);
      expect(res2.xp_awarded).toBe(0);
      expect(res2.event_id).toBeNull();
      expect(res2.new_total).toBe(res1.new_total);

      // 3. Proves database unique index on quiz_attempts blocks second daily quiz attempt on same date
      const { error: att1Err } = await adminClient.from('quiz_attempts').insert({
        student_id: sReplay.id,
        quiz_date: todayKolkata,
        mode: 'daily',
        question_ids: createdQuestionIds.slice(0, 5),
      });
      expect(att1Err).toBeNull();

      // Double-submit daily attempt
      const { error: att2Err } = await adminClient.from('quiz_attempts').insert({
        student_id: sReplay.id,
        quiz_date: todayKolkata,
        mode: 'daily',
        question_ids: createdQuestionIds.slice(0, 5),
      });
      expect(att2Err).not.toBeNull();
      expect(att2Err!.message).toContain('idx_unique_daily_quiz_attempt');
    });
  });

  describe('Scenario 2: Direct Ledger Tampering', () => {
    it('blocks student client from directly calling INSERT, UPDATE, DELETE on xp_events, xp_rules, and void_xp', async () => {
      const studentClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${sTamper.jwt}` } } }
      );

      // 1. Direct INSERT into xp_events
      const { error: insErr } = await studentClient.from('xp_events').insert({
        student_id: sTamper.id,
        action_type: 'DAILY_QUIZ',
        xp_amount: 500,
        reference_id: `forged_${testRunId}`,
        status: 'valid',
      });
      expect(insErr).not.toBeNull(); // Blocked by RLS

      // 2. Direct UPDATE on xp_events
      const { error: updErr } = await studentClient
        .from('xp_events')
        .update({ xp_amount: 99999 })
        .eq('student_id', sTamper.id);
      expect(updErr).not.toBeNull(); // Blocked by RLS or immutability trigger

      // 3. Direct DELETE on xp_events
      const { error: delErr } = await studentClient
        .from('xp_events')
        .delete()
        .eq('student_id', sTamper.id);
      expect(delErr).not.toBeNull(); // Blocked by RLS or immutability trigger

      // 4. Direct void_xp RPC call by student
      const { error: rpcErr } = await studentClient.rpc('void_xp', {
        p_event_id: '00000000-0000-0000-0000-000000000000',
        p_reason: 'Tampered void attempt',
      });
      expect(rpcErr).not.toBeNull();
      expect(rpcErr!.message.toLowerCase()).toContain('permission denied');

      // 5. Direct UPDATE on xp_rules
      await studentClient
        .from('xp_rules')
        .update({ base_xp: 1000 })
        .eq('action_type', 'DAILY_QUIZ');

      const { data: ruleCheck } = await adminClient
        .from('xp_rules')
        .select('base_xp')
        .eq('action_type', 'DAILY_QUIZ')
        .single();
      // Rules remain un-tampered (0 rows modified by student)
      expect(ruleCheck!.base_xp).not.toBe(1000);
    });
  });

  describe('Scenario 3: Daily XP Spike (> 3x 14-day average)', () => {
    it('flags student with spike flag, daily caps protect system, and ZERO XP is auto-voided', async () => {
      const todayKolkata = getKolkataDate();
      const now = new Date();

      // Seed 6 prior active days with ~50 XP/day
      for (let dayOffset = 1; dayOffset <= 6; dayOffset++) {
        const pastDate = new Date(now.getTime() - dayOffset * 24 * 3600 * 1000);
        const { data: pastEv } = await adminClient.rpc('award_xp', {
          p_student_id: sSpike.id,
          p_action_type: 'DAILY_QUIZ',
          p_reference_id: `hist_${sSpike.id}_${dayOffset}`,
          p_actor: null,
          p_custom_timestamp: pastDate.toISOString(),
        });
        if ((pastEv as any)?.event_id) createdEventIds.push((pastEv as any).event_id);
      }

      // Today student earns 250 XP (10 x 25 XP CLUB_ACTIVITY, exceeding 200 minXp and > 3x average)
      for (let i = 1; i <= 10; i++) {
        const { data: todayEv } = await adminClient.rpc('award_xp', {
          p_student_id: sSpike.id,
          p_action_type: 'CLUB_ACTIVITY',
          p_reference_id: `today_${sSpike.id}_${i}`,
        });
        if ((todayEv as any)?.event_id) createdEventIds.push((todayEv as any).event_id);
      }

      // Run spike detection
      const spikeRes = await runSpikeDetection({
        targetDate: todayKolkata,
        studentId: sSpike.id,
      });

      expect(spikeRes.flaggedCount).toBe(1);
      const flagInfo = spikeRes.flags[0];
      expect(flagInfo.ratio).toBeGreaterThan(3.0);
      if (flagInfo.id) createdFlagIds.push(flagInfo.id);

      // Verify flag in DB: status is OPEN, not auto-punished
      const { data: dbFlag } = await adminClient
        .from('flags')
        .select('*')
        .eq('student_id', sSpike.id)
        .eq('kind', 'spike')
        .single();

      expect(dbFlag).toBeTruthy();
      expect(dbFlag!.status).toBe('open');

      // Crucial: Student still possesses their valid XP. ZERO XP auto-voided!
      const { data: events } = await adminClient
        .from('xp_events')
        .select('status')
        .eq('student_id', sSpike.id);

      const allValid = events?.every((e) => e.status === 'valid');
      expect(allValid).toBe(true);
    });
  });

  describe('Scenario 4: Answer-Sharing Collusion & Control Pair Integrity', () => {
    it('flags cheaters with identical wrong choices, but NEVER flags control pair or battle teammates', async () => {
      const now = new Date();
      const baseTime = now.getTime() - 7200 * 1000;

      // 1. Cheating Pair (10 questions, 7 identical wrong choices 'B', 3 correct 'A')
      const { data: att1 } = await adminClient.from('quiz_attempts').insert({
        student_id: sColluder1.id,
        quiz_date: '2026-10-18',
        mode: 'practice',
        question_ids: createdQuestionIds.slice(0, 10),
        score: 3,
        total_questions: 10,
      }).select('id').single();
      createdAttemptIds.push(att1!.id);

      const { data: att2 } = await adminClient.from('quiz_attempts').insert({
        student_id: sColluder2.id,
        quiz_date: '2026-10-18',
        mode: 'practice',
        question_ids: createdQuestionIds.slice(0, 10),
        score: 3,
        total_questions: 10,
      }).select('id').single();
      createdAttemptIds.push(att2!.id);

      for (let i = 0; i < 10; i++) {
        const qId = createdQuestionIds[i];
        const isWrong = i < 7;
        const opt = isWrong ? 'B' : 'A';
        const isCorr = !isWrong;

        await adminClient.from('quiz_answers').insert([
          {
            attempt_id: att1!.id,
            question_id: qId,
            selected_option: opt,
            is_correct: isCorr,
            answered_at: new Date(baseTime + i * 4000).toISOString(),
          },
          {
            attempt_id: att2!.id,
            question_id: qId,
            selected_option: opt,
            is_correct: isCorr,
            answered_at: new Date(baseTime + i * 4000 + 15000).toISOString(),
          },
        ]);
      }

      const colluderRes = await runAnswerSharingDetection({
        studentId: sColluder1.id,
        secondStudentId: sColluder2.id,
        minCommon: 10,
        wrongThreshold: 0.6,
      });

      expect(colluderRes.flaggedCount).toBe(1);
      expect(colluderRes.flags[0].sharedWrongCount).toBe(7);
      if (colluderRes.flags[0].id) createdFlagIds.push(colluderRes.flags[0].id);

      // 2. Control Pair (10 common questions with 100% correct answers 'A')
      const { data: ctrlAtt1 } = await adminClient.from('quiz_attempts').insert({
        student_id: sControl1.id,
        quiz_date: '2026-10-18',
        mode: 'practice',
        question_ids: createdQuestionIds.slice(0, 10),
        score: 10,
        total_questions: 10,
      }).select('id').single();
      createdAttemptIds.push(ctrlAtt1!.id);

      const { data: ctrlAtt2 } = await adminClient.from('quiz_attempts').insert({
        student_id: sControl2.id,
        quiz_date: '2026-10-18',
        mode: 'practice',
        question_ids: createdQuestionIds.slice(0, 10),
        score: 10,
        total_questions: 10,
      }).select('id').single();
      createdAttemptIds.push(ctrlAtt2!.id);

      for (let i = 0; i < 10; i++) {
        const qId = createdQuestionIds[i];
        await adminClient.from('quiz_answers').insert([
          {
            attempt_id: ctrlAtt1!.id,
            question_id: qId,
            selected_option: 'A',
            is_correct: true,
            answered_at: new Date(baseTime + i * 3000).toISOString(),
          },
          {
            attempt_id: ctrlAtt2!.id,
            question_id: qId,
            selected_option: 'A',
            is_correct: true,
            answered_at: new Date(baseTime + i * 3000 + 8000).toISOString(),
          },
        ]);
      }

      const controlRes = await runAnswerSharingDetection({
        studentId: sControl1.id,
        secondStudentId: sControl2.id,
        minCommon: 10,
        wrongThreshold: 0.6,
      });

      // Control pair MUST NEVER be flagged
      expect(controlRes.flaggedCount).toBe(0);

      // 3. Battle Teammates Exclusion
      const { data: btl } = await adminClient.from('battles').insert({
        title: `Teammate Battle ${testRunId}`,
        topic: 'Anti-Gaming 4F',
        status: 'finished',
      }).select('id').single();
      createdBattleIds.push(btl!.id);

      const { data: bTeam } = await adminClient.from('battle_teams').insert({
        battle_id: btl!.id,
        name: `Team Beta ${testRunId}`,
      }).select('id').single();

      await adminClient.from('battle_team_members').insert([
        { battle_id: btl!.id, team_id: bTeam!.id, student_id: sBattleMate1.id },
        { battle_id: btl!.id, team_id: bTeam!.id, student_id: sBattleMate2.id },
      ]);

      for (let i = 0; i < 10; i++) {
        await adminClient.from('battle_questions').insert({
          battle_id: btl!.id,
          question_id: createdQuestionIds[i],
          question_order: i + 1,
        });
      }

      const { data: bmAtt1 } = await adminClient.from('quiz_attempts').insert({
        student_id: sBattleMate1.id,
        quiz_date: '2026-10-18',
        mode: 'practice',
        question_ids: createdQuestionIds.slice(0, 10),
      }).select('id').single();
      createdAttemptIds.push(bmAtt1!.id);

      const { data: bmAtt2 } = await adminClient.from('quiz_attempts').insert({
        student_id: sBattleMate2.id,
        quiz_date: '2026-10-18',
        mode: 'practice',
        question_ids: createdQuestionIds.slice(0, 10),
      }).select('id').single();
      createdAttemptIds.push(bmAtt2!.id);

      for (let i = 0; i < 10; i++) {
        const qId = createdQuestionIds[i];
        await adminClient.from('quiz_answers').insert([
          {
            attempt_id: bmAtt1!.id,
            question_id: qId,
            selected_option: 'C',
            is_correct: false,
            answered_at: new Date(baseTime + i * 2000).toISOString(),
          },
          {
            attempt_id: bmAtt2!.id,
            question_id: qId,
            selected_option: 'C',
            is_correct: false,
            answered_at: new Date(baseTime + i * 2000 + 4000).toISOString(),
          },
        ]);
      }

      const mateRes = await runAnswerSharingDetection({
        studentId: sBattleMate1.id,
        secondStudentId: sBattleMate2.id,
        minCommon: 10,
        wrongThreshold: 0.6,
      });

      // Teammates on same battle team are expected to collaborate; EXCLUDED from flagging
      expect(mateRes.flaggedCount).toBe(0);
    });
  });

  describe('Scenario 5: Duel Win-Trading & Faculty Written Voiding', () => {
    it('flags excessive duels between pair, and faculty voids XP with mandatory reason', async () => {
      const now = new Date();

      // 1. Create 8 duels between duelist1 and duelist2 in the afternoon
      for (let i = 0; i < 8; i++) {
        const duelTime = new Date(now.getTime() - (8 - i) * 600000).toISOString();
        const { data: d } = await adminClient.from('duels').insert({
          challenger_id: sDuelist1.id,
          challenged_id: sDuelist2.id,
          status: 'completed',
          winner_id: sDuelist1.id,
          challenger_score: 5,
          challenged_score: 0,
          created_at: duelTime,
        }).select('id').single();

        if (d) createdDuelIds.push(d.id);
      }

      // Award XP for one of these duels to test faculty voiding
      const { data: awardRes } = await adminClient.rpc('award_xp', {
        p_student_id: sDuelist1.id,
        p_action_type: 'DAILY_QUIZ',
        p_reference_id: `duel_win_${createdDuelIds[0]}`,
      });
      const duelEventId = (awardRes as any).event_id;
      if (duelEventId) createdEventIds.push(duelEventId);

      // Run win-trading detection
      const winTradingRes = await runWinTradingDetection({
        studentId: sDuelist1.id,
        secondStudentId: sDuelist2.id,
        maxDuelsThreshold: 6,
        oneSidedThreshold: 0.8,
      });

      expect(winTradingRes.flaggedCount).toBe(1);
      const flag = winTradingRes.flags[0];
      expect(flag.totalDuels).toBe(8);
      if (flag.id) createdFlagIds.push(flag.id);

      // 2. Faculty executes void with mandatory written reason
      const facultyVoidReason = 'Verified repeated asymmetric duel farming between colluding pair';
      const { data: voidRes, error: voidErr } = await adminClient.rpc('void_xp', {
        p_event_id: duelEventId,
        p_reason: facultyVoidReason,
        p_actor: facultyUser.id,
      });

      expect(voidErr).toBeNull();
      expect((voidRes as any).status).toBe('voided');

      // 3. Verify event is soft-voided with the reason
      const { data: voidedRow } = await adminClient
        .from('xp_events')
        .select('*')
        .eq('id', duelEventId)
        .single();

      expect(voidedRow!.status).toBe('voided');
      expect(voidedRow!.void_reason).toBe(facultyVoidReason);

      // 4. Verify audit_logs entry
      const { data: auditLog } = await adminClient
        .from('audit_logs')
        .select('*')
        .eq('target_id', duelEventId)
        .eq('action', 'void_xp')
        .single();

      expect(auditLog).toBeDefined();
      expect(auditLog!.actor_id).toBe(facultyUser.id);
      expect(auditLog!.reason).toBe(facultyVoidReason);
    });
  });

  describe('Scenario 6: Practice Claim Anti-Gaming: Pending Proof & Duplicate Detection', () => {
    it('fake practice claim stays pending and pays nothing; duplicate proof flagged', async () => {
      // 1. Create two test students with blk_ prefix
      const sPractice1 = await createTestStudent('blk_prac1');
      const sPractice2 = await createTestStudent('blk_prac2');

      const sharedProofUrl = 'https://leetcode.com/submissions/detail/999888777/';

      // 2. Student 1 claims practice problem
      const res1 = await claimPracticeProblemAction(
        {
          practiceLinkId: 'link-arr-1',
          submissionProof: sharedProofUrl,
        },
        sPractice1.id
      );

      expect(res1.success).toBe(true);
      expect(res1.status).toBe('pending');
      expect(res1.xpAwarded).toBe(0);

      // Verify Student 1 has earned 0 XP from the claim
      const { data: events1 } = await adminClient
        .from('xp_events')
        .select('id')
        .eq('student_id', sPractice1.id)
        .in('action_type', ['PRACTICE_EASY', 'PRACTICE_MEDIUM', 'PRACTICE_HARD', 'PRACTICE_SOLVE']);
      expect(events1?.length || 0).toBe(0);

      // 3. Student 2 attempts to claim with the EXACT SAME proof URL (duplicate proof cheating attempt)
      const res2 = await claimPracticeProblemAction(
        {
          practiceLinkId: 'link-arr-2',
          submissionProof: sharedProofUrl,
        },
        sPractice2.id
      );

      expect(res2.success).toBe(true);
      expect(res2.status).toBe('pending');
      expect(res2.xpAwarded).toBe(0);

      // Verify Student 2 has earned 0 XP from the claim
      const { data: events2 } = await adminClient
        .from('xp_events')
        .select('id')
        .eq('student_id', sPractice2.id)
        .in('action_type', ['PRACTICE_EASY', 'PRACTICE_MEDIUM', 'PRACTICE_HARD', 'PRACTICE_SOLVE']);
      expect(events2?.length || 0).toBe(0);

      // 4. Verify duplicate proof flag is recorded in flags table
      const { data: flags } = await adminClient
        .from('flags')
        .select('*')
        .eq('student_id', sPractice2.id)
        .eq('kind', 'duplicate_proof');

      expect(flags).toBeDefined();
      expect(flags!.length).toBeGreaterThanOrEqual(1);
      const dupFlag = flags![0];
      expect(dupFlag.second_student_id).toBe(sPractice1.id);
      expect(dupFlag.severity).toBe('high');
      expect(dupFlag.evidence.proof_url).toBe(sharedProofUrl);
      createdFlagIds.push(dupFlag.id);

      // Cleanup practice completions for clean purge
      await adminClient
        .from('student_practice_completions')
        .delete()
        .in('student_id', [sPractice1.id, sPractice2.id]);
    });
  });
});
