import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import {
  balancedSnakeDraft,
  rankTeamsByScore,
  sanitizeBattleQuestions,
  finalizeBattle,
  BattleScore,
} from '@/lib/battles';

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
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const isDevProject = Boolean(
  supabaseUrl &&
    serviceRoleKey &&
    !supabaseUrl.includes('your-project-id') &&
    !supabaseUrl.includes('placeholder')
);

describe('Phase 4A-4C: Battles Core, Live Scoreboard, & Student UI Unit Tests', () => {
  describe('Balanced Snake Draft Algorithm', () => {
    it('drafts players in snake order (1, 2, 2, 1) to balance total levels', () => {
      const players = [
        { id: 'p1', level: 10, totalXp: 1000 },
        { id: 'p2', level: 8, totalXp: 800 },
        { id: 'p3', level: 6, totalXp: 600 },
        { id: 'p4', level: 4, totalXp: 400 },
      ];

      const teams = balancedSnakeDraft(players, 2);
      expect(teams[0]).toEqual(['p1', 'p4']); // 10 + 4 = 14
      expect(teams[1]).toEqual(['p2', 'p3']); // 8 + 6 = 14
    });

    it('handles 3 teams with uneven player count', () => {
      const players = [
        { id: 'p1', level: 9 },
        { id: 'p2', level: 8 },
        { id: 'p3', level: 7 },
        { id: 'p4', level: 6 },
        { id: 'p5', level: 5 },
        { id: 'p6', level: 4 },
        { id: 'p7', level: 3 },
      ];

      const teams = balancedSnakeDraft(players, 3);
      // Round 1: T0: p1, T1: p2, T2: p3
      // Round 2 (reversed): T2: p4, T1: p5, T0: p6
      // Round 3: T0: p7
      expect(teams[0]).toEqual(['p1', 'p6', 'p7']);
      expect(teams[1]).toEqual(['p2', 'p5']);
      expect(teams[2]).toEqual(['p3', 'p4']);
    });
  });

  describe('Question Sanitization (Privacy & Anti-Cheat)', () => {
    it('completely strips correct_answer and explanation before serving to student', () => {
      const rawQuestions = [
        {
          id: 'bq1',
          question_text: 'What does ACID stand for?',
          choice_a: 'Atomicity, Consistency, Isolation, Durability',
          choice_b: 'All Choices In Database',
          choice_c: 'Async Code In Development',
          choice_d: 'None of the above',
          correct_answer: 'a',
          explanation: 'ACID guarantees database transaction reliability.',
        },
      ];

      const safe = sanitizeBattleQuestions(rawQuestions);
      expect(safe[0].id).toBe('bq1');
      expect(safe[0].question_text).toBe('What does ACID stand for?');
      expect((safe[0] as any).correct_answer).toBeUndefined();
      expect((safe[0] as any).explanation).toBeUndefined();
    });
  });

  describe('Scoring & Tie-Breaking Logic', () => {
    it('ranks teams by average points per member for fairness across uneven team sizes', () => {
      const teamA: BattleScore = {
        id: 's1',
        battle_id: 'b1',
        team_id: 'teamA',
        team_name: 'Alpha (2 members)',
        total_points: 20,
        member_count: 2,
        answered_count: 2,
        avg_points: 10.0,
      };

      const teamB: BattleScore = {
        id: 's2',
        battle_id: 'b1',
        team_id: 'teamB',
        team_name: 'Beta (3 members)',
        total_points: 24, // higher total, but lower avg
        member_count: 3,
        answered_count: 3,
        avg_points: 8.0,
      };

      const ranked = rankTeamsByScore([teamB, teamA]);
      expect(ranked[0].team_id).toBe('teamA');
      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].team_id).toBe('teamB');
      expect(ranked[1].rank).toBe(2);
    });

    it('breaks ties using earliest last_submission_at timestamp', () => {
      const t1Time = '2026-10-17T10:00:15Z';
      const t2Time = '2026-10-17T10:00:25Z';

      const team1: BattleScore = {
        id: 's1',
        battle_id: 'b1',
        team_id: 't1',
        total_points: 30,
        member_count: 3,
        answered_count: 3,
        avg_points: 10.0,
        last_submission_at: t1Time, // faster!
      };

      const team2: BattleScore = {
        id: 's2',
        battle_id: 'b1',
        team_id: 't2',
        total_points: 30,
        member_count: 3,
        answered_count: 3,
        avg_points: 10.0,
        last_submission_at: t2Time,
      };

      const ranked = rankTeamsByScore([team2, team1]);
      expect(ranked[0].team_id).toBe('t1');
      expect(ranked[1].team_id).toBe('t2');
    });
  });
});

describe.runIf(isDevProject)('Phase 4A-4B: Database Stored Procedure, RLS, & Finalization Suite', () => {
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  let testStudent1Id: string;
  let testStudent2Id: string;
  let testStudent3Id: string;
  let testBattleId: string;
  let team1Id: string;
  let team2Id: string;
  let question1Id: string;
  let question2Id: string;
  const createdStudentIds: string[] = [];

  async function createTestStudent(name: string, anonymous = false) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 100000);
    const testEmail = `battle-${timestamp}-${random}@dev.local`;

    const { data, error } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: {
        full_name: name,
        roll_no: `BT-${timestamp}-${random}`,
        department: 'CS',
        anonymous_mode: anonymous,
      },
    });

    if (error || !data.user) {
      throw new Error(`Failed to create test student: ${error?.message}`);
    }

    createdStudentIds.push(data.user.id);
    return data.user.id;
  }

  beforeAll(async () => {
    // 1. Create 3 test students
    testStudent1Id = await createTestStudent('Battle Tester 1', false);
    testStudent2Id = await createTestStudent('Battle Tester 2', true);
    testStudent3Id = await createTestStudent('Battle Tester 3 (Non-Member)', false);

    // 2. Fetch or create approved questions
    const { data: existingQ } = await adminClient
      .from('questions')
      .select('id, correct_option')
      .eq('status', 'approved')
      .limit(2);

    if (existingQ && existingQ.length >= 2) {
      question1Id = existingQ[0].id;
      question2Id = existingQ[1].id;
    } else {
      const { data: sub } = await adminClient.from('subjects').select('id').limit(1).single();
      const subjectId = sub?.id;

      const qRes = await adminClient
        .from('questions')
        .insert([
          {
            subject_id: subjectId,
            topic: 'Graph Theory',
            question_text: 'Test Battle Q1',
            option_a: 'Option A',
            option_b: 'Option B',
            option_c: 'Option C',
            option_d: 'Option D',
            correct_option: 'B',
            explanation: 'Option B is correct',
            status: 'approved',
          },
          {
            subject_id: subjectId,
            topic: 'Graph Theory',
            question_text: 'Test Battle Q2',
            option_a: 'Option A',
            option_b: 'Option B',
            option_c: 'Option C',
            option_d: 'Option D',
            correct_option: 'D',
            explanation: 'Option D is correct',
            status: 'approved',
          },
        ])
        .select('id');
      question1Id = qRes.data![0].id;
      question2Id = qRes.data![1].id;
    }

    // 3. Create a test battle
    const endsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const bRes = await adminClient
      .from('battles')
      .insert({
        title: 'Algorithms Live Clash',
        topic: 'Graph Theory',
        status: 'live',
        starts_at: new Date().toISOString(),
        ends_at: endsAt,
        config: { points_per_correct: 10 },
      })
      .select('id')
      .single();
    testBattleId = bRes.data!.id;

    // 4. Attach question1 to battle
    await adminClient.from('battle_questions').insert({
      battle_id: testBattleId,
      question_id: question1Id,
      question_order: 1,
    });

    // 5. Create Team 1 and Team 2
    const t1Res = await adminClient
      .from('battle_teams')
      .insert({ battle_id: testBattleId, name: 'Team Binary' })
      .select('id')
      .single();
    team1Id = t1Res.data!.id;

    const t2Res = await adminClient
      .from('battle_teams')
      .insert({ battle_id: testBattleId, name: 'Team Hex' })
      .select('id')
      .single();
    team2Id = t2Res.data!.id;

    // 6. Assign student 1 to Team 1, student 2 to Team 2 (student 3 is not a member)
    await adminClient.from('battle_team_members').insert([
      { battle_id: testBattleId, team_id: team1Id, student_id: testStudent1Id },
      { battle_id: testBattleId, team_id: team2Id, student_id: testStudent2Id },
    ]);

    // 7. Initialize battle_scores rows
    await adminClient.from('battle_scores').insert([
      {
        battle_id: testBattleId,
        team_id: team1Id,
        total_points: 0,
        member_count: 1,
        answered_count: 0,
        avg_points: 0.0,
      },
      {
        battle_id: testBattleId,
        team_id: team2Id,
        total_points: 0,
        member_count: 1,
        answered_count: 0,
        avg_points: 0.0,
      },
    ]);
  });

  afterAll(async () => {
    // Clean up created battle and test students
    if (testBattleId) {
      await adminClient.from('battle_submissions').delete().eq('battle_id', testBattleId);
      await adminClient.from('battle_scores').delete().eq('battle_id', testBattleId);
      await adminClient.from('battle_team_members').delete().eq('battle_id', testBattleId);
      await adminClient.from('battle_teams').delete().eq('battle_id', testBattleId);
      await adminClient.from('battle_questions').delete().eq('battle_id', testBattleId);
      await adminClient.from('battles').delete().eq('id', testBattleId);
    }
    for (const sId of createdStudentIds) {
      await adminClient.from('xp_events').delete().eq('student_id', sId);
      await adminClient.from('students').delete().eq('id', sId);
      await adminClient.from('profiles').delete().eq('id', sId);
      await adminClient.auth.admin.deleteUser(sId);
    }
  });

  it('rejects submissions from a non-member student', async () => {
    const { data: res } = await adminClient.rpc('submit_battle_answer', {
      p_battle_id: testBattleId,
      p_student_id: testStudent3Id, // not in battle_team_members
      p_question_id: question1Id,
      p_answer: 'b',
      p_submission_id: crypto.randomUUID(),
    });

    expect((res as any)?.status).toBe('not_a_member');
  });

  it('rejects questions that do not belong to the battle', async () => {
    const { data: res } = await adminClient.rpc('submit_battle_answer', {
      p_battle_id: testBattleId,
      p_student_id: testStudent1Id,
      p_question_id: question2Id, // question2 is not in battle_questions
      p_answer: 'd',
      p_submission_id: crypto.randomUUID(),
    });

    expect((res as any)?.status).toBe('question_not_in_battle');
  });

  it('evaluates answers on server and atomically updates battle_scores in single transaction', async () => {
    // Fetch correct answer for question1
    const { data: q } = await adminClient
      .from('questions')
      .select('correct_option')
      .eq('id', question1Id)
      .single();

    const submissionId = crypto.randomUUID();
    const { data: res } = await adminClient.rpc('submit_battle_answer', {
      p_battle_id: testBattleId,
      p_student_id: testStudent1Id,
      p_question_id: question1Id,
      p_answer: q!.correct_option,
      p_submission_id: submissionId,
    });

    expect((res as any)?.status).toBe('submitted');
    expect((res as any)?.is_correct).toBe(true);
    expect((res as any)?.points).toBe(10);
    expect((res as any)?.team_avg_points).toBe(10.0);

    // Verify aggregate score row was updated atomically
    const { data: scoreRow } = await adminClient
      .from('battle_scores')
      .select('*')
      .eq('battle_id', testBattleId)
      .eq('team_id', team1Id)
      .single();

    expect(scoreRow?.total_points).toBe(10);
    expect(Number(scoreRow?.avg_points)).toBe(10.0);
    expect(scoreRow?.answered_count).toBe(1);
    expect(scoreRow?.last_submission_at).not.toBeNull();
  });

  it('idempotency: retrying the exact same submission_id returns original result without double counting', async () => {
    const { data: q } = await adminClient
      .from('questions')
      .select('correct_option')
      .eq('id', question1Id)
      .single();

    // Fetch current total points of team1
    const { data: beforeScore } = await adminClient
      .from('battle_scores')
      .select('total_points')
      .eq('battle_id', testBattleId)
      .eq('team_id', team1Id)
      .single();

    // Find the submission_id used in previous test
    const { data: sub } = await adminClient
      .from('battle_submissions')
      .select('submission_id')
      .eq('battle_id', testBattleId)
      .eq('student_id', testStudent1Id)
      .single();

    // Submit again with identical submission_id
    const { data: res } = await adminClient.rpc('submit_battle_answer', {
      p_battle_id: testBattleId,
      p_student_id: testStudent1Id,
      p_question_id: question1Id,
      p_answer: q!.correct_option,
      p_submission_id: sub!.submission_id,
    });

    expect((res as any)?.status).toBe('duplicate_submission');
    expect((res as any)?.points).toBe(10);

    // Total points must NOT increase
    const { data: afterScore } = await adminClient
      .from('battle_scores')
      .select('total_points')
      .eq('battle_id', testBattleId)
      .eq('team_id', team1Id)
      .single();

    expect(afterScore?.total_points).toBe(beforeScore?.total_points);
  });

  it('finalization: ranks teams, pays participation + win XP through award_xp once', async () => {
    // Finalize the battle
    const result = await finalizeBattle(adminClient, testBattleId);

    expect(result.success).toBe(true);
    expect(result.rankings).toBeDefined();
    expect(result.rankings![0].team_id).toBe(team1Id); // Team 1 has 10 pts, Team 2 has 0 pts

    // Check XP events
    const { data: s1Xp } = await adminClient
      .from('xp_events')
      .select('action_type, xp_amount, reference_id')
      .eq('student_id', testStudent1Id);

    // Student 1 is a participant and a winner
    const s1Types = (s1Xp || []).map((x) => x.action_type);
    expect(s1Types).toContain('BATTLE_PARTICIPATION');
    expect(s1Types).toContain('BATTLE_WIN');

    // Run finalization second time: must be idempotent and not double pay
    const rerun = await finalizeBattle(adminClient, testBattleId);
    expect(rerun.success).toBe(true);
    expect(rerun.awardedCounts?.participation).toBe(0);
    expect(rerun.awardedCounts?.winners).toBe(0);
  });
});
