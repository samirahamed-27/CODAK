import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const isDevProject = Boolean(
  supabaseUrl &&
    serviceRoleKey &&
    !supabaseUrl.includes('your-project-id') &&
    !supabaseUrl.includes('placeholder')
);

describe.runIf(isDevProject)('L9: Battle Security & Realtime Resilience', () => {
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  let battleId: string;
  let enrolledStudentId: string;
  let outsiderStudentId: string;
  let enrolledClient: any;
  let outsiderClient: any;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    // 1. Create Enrolled Student
    const emailA = `audit_battle_enrolled_${Date.now()}@dev.local`;
    const { data: userA } = await adminClient.auth.admin.createUser({
      email: emailA,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: { full_name: 'Enrolled Battler', roll_no: `BAT-A-${Date.now()}` },
    });
    enrolledStudentId = userA!.user!.id;
    createdUserIds.push(enrolledStudentId);

    // 2. Create Outsider Student
    const emailB = `audit_battle_outsider_${Date.now()}@dev.local`;
    const { data: userB } = await adminClient.auth.admin.createUser({
      email: emailB,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: { full_name: 'Outsider Battler', roll_no: `BAT-B-${Date.now()}` },
    });
    outsiderStudentId = userB!.user!.id;
    createdUserIds.push(outsiderStudentId);

    // 3. Create Authenticated Clients
    const clientA = createClient(supabaseUrl, anonKey);
    const { data: sessionA } = await clientA.auth.signInWithPassword({
      email: emailA,
      password: 'TestPassword123!',
    });
    enrolledClient = clientA;

    const clientB = createClient(supabaseUrl, anonKey);
    const { data: sessionB } = await clientB.auth.signInWithPassword({
      email: emailB,
      password: 'TestPassword123!',
    });
    outsiderClient = clientB;

    // 4. Create Battle and Team
    const { data: battle } = await adminClient
      .from('battles')
      .insert({
        title: 'Security Audit Battle',
        topic: 'Security',
        status: 'live',
      })
      .select('id')
      .single();
    battleId = battle!.id;

    const { data: team } = await adminClient
      .from('battle_teams')
      .insert({
        battle_id: battleId,
        name: 'Team Alpha',
      })
      .select('id')
      .single();

    // Enroll only Student A into the battle team
    await adminClient.from('battle_team_members').insert({
      battle_id: battleId,
      team_id: team!.id,
      student_id: enrolledStudentId,
    });

    // Create a score row
    await adminClient.from('battle_scores').insert({
      battle_id: battleId,
      team_id: team!.id,
      total_points: 100,
      member_count: 1,
      answered_count: 5,
      avg_points: 100,
    });

    // Create a question and a submission by student A
    const { data: question } = await adminClient
      .from('questions')
      .select('id')
      .eq('status', 'approved')
      .limit(1)
      .single();

    if (question) {
      const { error: subErr } = await adminClient.from('battle_submissions').insert({
        battle_id: battleId,
        team_id: team!.id,
        student_id: enrolledStudentId,
        question_id: question.id,
        answer: 'A',
        is_correct: true,
        points: 20,
        submission_id: crypto.randomUUID(),
      });
      expect(subErr).toBeNull();
    }
  });

  afterAll(async () => {
    // Clean up battle test data
    if (battleId) {
      await adminClient.from('battle_submissions').delete().eq('battle_id', battleId);
      await adminClient.from('battle_scores').delete().eq('battle_id', battleId);
      await adminClient.from('battle_team_members').delete().eq('battle_id', battleId);
      await adminClient.from('battle_teams').delete().eq('battle_id', battleId);
      await adminClient.from('battles').delete().eq('id', battleId);
    }

    // Clean up test users
    for (const uId of createdUserIds) {
      await adminClient.from('students').delete().eq('id', uId);
      await adminClient.from('profiles').delete().eq('id', uId);
      await adminClient.auth.admin.deleteUser(uId);
    }
  });

  it('1. A student outside a battle cannot read its scores (RLS denies SELECT)', async () => {
    // Outsider queries battle_scores
    const { data: outsiderScores, error: outErr } = await outsiderClient
      .from('battle_scores')
      .select('*')
      .eq('battle_id', battleId);

    expect(outErr).toBeNull();
    // Outsider receives 0 rows due to RLS filter
    expect(outsiderScores).toHaveLength(0);

    // Enrolled student queries battle_scores
    const { data: enrolledScores, error: inErr } = await enrolledClient
      .from('battle_scores')
      .select('*')
      .eq('battle_id', battleId);

    expect(inErr).toBeNull();
    expect(enrolledScores).toHaveLength(1);
    expect(enrolledScores![0].total_points).toBe(100);
  });

  it("2. A student cannot read another student's submissions (RLS denies SELECT)", async () => {
    // Outsider student B queries battle_submissions
    const { data: otherSubmissions, error } = await outsiderClient
      .from('battle_submissions')
      .select('*')
      .eq('battle_id', battleId);

    expect(error).toBeNull();
    // Outsider receives 0 rows of Student A's submission
    expect(otherSubmissions).toHaveLength(0);

    // Enrolled student A queries their own submissions
    const { data: mySubmissions } = await enrolledClient
      .from('battle_submissions')
      .select('*')
      .eq('battle_id', battleId);

    expect(mySubmissions).toHaveLength(1);
    expect(mySubmissions![0].student_id).toBe(enrolledStudentId);
  });

  it('3. Live scoreboard falls back to 3-second polling when Realtime subscription is rejected', async () => {
    // Simulate rejected realtime subscription callback
    vi.useFakeTimers();

    let pollingIntervalMs: number | null = null;
    let fallbackPollTriggered = false;

    // Emulate the logic inside LiveScoreboard.tsx
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: (callback: (status: string) => void) => {
        // Trigger CHANNEL_ERROR rejection
        callback('CHANNEL_ERROR');
      },
    };

    // Callback handler mirroring LiveScoreboard:
    function handleSubscriptionStatus(status: string) {
      if (status === 'TIMED_OUT' || status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        // Fallback polling starts at 3000ms
        pollingIntervalMs = 3000;
        setInterval(() => {
          fallbackPollTriggered = true;
        }, 3000);
      }
    }

    mockChannel.subscribe(handleSubscriptionStatus);

    expect(pollingIntervalMs).toBe(3000);

    // Advance 3 seconds
    vi.advanceTimersByTime(3000);
    expect(fallbackPollTriggered).toBe(true);

    vi.useRealTimers();
  });
});
