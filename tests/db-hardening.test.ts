import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { executeWeeklyLeagueRollover } from '@/lib/leagues';

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

const isDevProject = Boolean(
  supabaseUrl &&
    serviceRoleKey &&
    !supabaseUrl.includes('your-project-id') &&
    !supabaseUrl.includes('placeholder')
);

describe.runIf(isDevProject)('H6: Database-Level Security & Idempotency Suite', () => {
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const createdStudentIds: string[] = [];
  const createdGroupIds: string[] = [];

  async function createTestStudent(name: string) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 100000);
    const testEmail = `db-h6-${timestamp}-${random}@dev.local`;

    const { data, error } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: {
        full_name: name,
        roll_no: `H6-${timestamp}-${random}`,
        department: 'DB Hardening',
      },
    });

    if (error || !data.user) {
      throw new Error(`Failed to create test student: ${error?.message}`);
    }

    createdStudentIds.push(data.user.id);
    return data.user.id;
  }

  afterAll(async () => {
    // 1. Clean up league records
    for (const gId of createdGroupIds) {
      await adminClient.from('league_members').delete().eq('group_id', gId);
      await adminClient.from('league_groups').delete().eq('id', gId);
    }

    // 2. Clean up student statuses and XP records
    for (const sId of createdStudentIds) {
      await adminClient.from('student_league_status').delete().eq('student_id', sId);
      await adminClient.from('xp_events').delete().eq('student_id', sId);
      await adminClient.from('students').delete().eq('id', sId);
      await adminClient.from('profiles').delete().eq('id', sId);
      await adminClient.auth.admin.deleteUser(sId);
    }
  });

  describe('1. Weekly League Rollover Idempotency', () => {
    it('running the weekly league rollover twice for the same week produces identical result without double payouts', async () => {
      const student1 = await createTestStudent('League Student Alpha');
      const student2 = await createTestStudent('League Student Beta');

      const testWeekKey = `2099-W${Math.floor(10 + Math.random() * 80)}`;
      const nextWeekKey = `2099-W99`;

      // Create an active test group in bronze tier
      const { data: group, error: groupErr } = await adminClient
        .from('league_groups')
        .insert({
          tier_id: 'bronze',
          week_key: testWeekKey,
          group_number: 999,
          status: 'active',
        })
        .select('id')
        .single();

      expect(groupErr).toBeNull();
      expect(group?.id).toBeDefined();
      createdGroupIds.push(group!.id);

      // Add both students to this group
      await adminClient.from('league_members').insert([
        {
          group_id: group!.id,
          student_id: student1,
          week_key: testWeekKey,
          initial_tier_id: 'bronze',
        },
        {
          group_id: group!.id,
          student_id: student2,
          week_key: testWeekKey,
          initial_tier_id: 'bronze',
        },
      ]);

      // Award XP to student 1 so they have higher rank
      await adminClient.rpc('award_xp', {
        p_student_id: student1,
        p_action_type: 'DAILY_QUIZ',
        p_reference_id: `test:quiz:${testWeekKey}:s1`,
        p_extra_units: 5,
        p_actor: null,
      });

      // RUN 1: First rollover execution
      const run1Result = await executeWeeklyLeagueRollover(testWeekKey, nextWeekKey, adminClient);
      expect(run1Result.groupsProcessed).toBe(1);

      // Verify group status is completed
      const { data: groupAfterRun1 } = await adminClient
        .from('league_groups')
        .select('status')
        .eq('id', group!.id)
        .single();
      expect(groupAfterRun1?.status).toBe('completed');

      // Verify outcomes recorded
      const { data: membersRun1 } = await adminClient
        .from('league_members')
        .select('student_id, final_rank, outcome')
        .eq('group_id', group!.id)
        .order('final_rank', { ascending: true });

      expect(membersRun1).toHaveLength(2);
      expect(membersRun1![0].final_rank).toBe(1);
      expect(membersRun1![0].student_id).toBe(student1);

      // Count XP events before Run 2
      const { data: xpBeforeRun2 } = await adminClient
        .from('xp_events')
        .select('id')
        .in('student_id', [student1, student2]);
      const xpCountBefore = xpBeforeRun2?.length || 0;

      // RUN 2: Re-run for the EXACT same week key
      const run2Result = await executeWeeklyLeagueRollover(testWeekKey, nextWeekKey, adminClient);

      // Verify Run 2 detected already completed group and skipped it (idempotency)
      expect(run2Result.groupsProcessed).toBe(0);
      expect(run2Result.promotedCount).toBe(0);
      expect(run2Result.relegatedCount).toBe(0);
      expect(run2Result.retainedCount).toBe(0);

      // Verify no extra XP rows were inserted
      const { data: xpAfterRun2 } = await adminClient
        .from('xp_events')
        .select('id')
        .in('student_id', [student1, student2]);
      expect(xpAfterRun2?.length).toBe(xpCountBefore);

      // Verify members table unchanged
      const { data: membersRun2 } = await adminClient
        .from('league_members')
        .select('student_id, final_rank, outcome')
        .eq('group_id', group!.id)
        .order('final_rank', { ascending: true });

      expect(membersRun2).toEqual(membersRun1);
    });
  });

  describe('2. Daily Caps Enforcement via award_xp', () => {
    it('enforces daily caps for DUEL_WIN, QUEST_REWARD, and CONCEPT_MATCH', async () => {
      const student = await createTestStudent('Caps Test Student');

      // Ensure QUEST_REWARD has a daily_limit configured
      await adminClient
        .from('xp_rules')
        .update({ daily_limit: 5 })
        .eq('action_type', 'QUEST_REWARD');

      // Fetch rule limits
      const { data: rules } = await adminClient
        .from('xp_rules')
        .select('action_type, daily_limit')
        .in('action_type', ['DUEL_WIN', 'QUEST_REWARD', 'CONCEPT_MATCH']);

      const duelLimit = rules?.find((r) => r.action_type === 'DUEL_WIN')?.daily_limit ?? 5;
      const questLimit = rules?.find((r) => r.action_type === 'QUEST_REWARD')?.daily_limit ?? 5;
      const matchLimit = rules?.find((r) => r.action_type === 'CONCEPT_MATCH')?.daily_limit ?? 2;

      // 1. Test DUEL_WIN up to limit + 1
      for (let i = 1; i <= duelLimit; i++) {
        const { data: res } = await adminClient.rpc('award_xp', {
          p_student_id: student,
          p_action_type: 'DUEL_WIN',
          p_reference_id: `test:duel:${Date.now()}:${i}`,
          p_extra_units: 0,
          p_actor: null,
        });
        expect((res as any)?.status).toBe('awarded');
      }
      // Attempt beyond limit
      const { data: duelOverLimit } = await adminClient.rpc('award_xp', {
        p_student_id: student,
        p_action_type: 'DUEL_WIN',
        p_reference_id: `test:duel:${Date.now()}:overflow`,
        p_extra_units: 0,
        p_actor: null,
      });
      expect((duelOverLimit as any)?.status).toBe('limit_reached');
      expect((duelOverLimit as any)?.xp_awarded).toBe(0);

      // 2. Test QUEST_REWARD up to limit + 1
      for (let i = 1; i <= questLimit; i++) {
        const { data: res } = await adminClient.rpc('award_xp', {
          p_student_id: student,
          p_action_type: 'QUEST_REWARD',
          p_reference_id: `test:quest:${Date.now()}:${i}`,
          p_extra_units: 0,
          p_actor: null,
        });
        expect((res as any)?.status).toBe('awarded');
      }
      const { data: questOverLimit } = await adminClient.rpc('award_xp', {
        p_student_id: student,
        p_action_type: 'QUEST_REWARD',
        p_reference_id: `test:quest:${Date.now()}:overflow`,
        p_extra_units: 0,
        p_actor: null,
      });
      expect((questOverLimit as any)?.status).toBe('limit_reached');
      expect((questOverLimit as any)?.xp_awarded).toBe(0);

      // 3. Test CONCEPT_MATCH up to limit + 1
      for (let i = 1; i <= matchLimit; i++) {
        const { data: res } = await adminClient.rpc('award_xp', {
          p_student_id: student,
          p_action_type: 'CONCEPT_MATCH',
          p_reference_id: `test:match:${Date.now()}:${i}`,
          p_extra_units: 0,
          p_actor: null,
        });
        expect((res as any)?.status).toBe('awarded');
      }
      const { data: matchOverLimit } = await adminClient.rpc('award_xp', {
        p_student_id: student,
        p_action_type: 'CONCEPT_MATCH',
        p_reference_id: `test:match:${Date.now()}:overflow`,
        p_extra_units: 0,
        p_actor: null,
      });
      expect((matchOverLimit as any)?.status).toBe('limit_reached');
      expect((matchOverLimit as any)?.xp_awarded).toBe(0);
    });
  });

  describe('3. Total XP Ledger Invariant', () => {
    it('proves that XP ledger SUM strictly equals get_student_xp RPC and student_xp_totals view', async () => {
      const student = await createTestStudent('Ledger Invariant Student');

      // Award assorted valid XP
      await adminClient.rpc('award_xp', {
        p_student_id: student,
        p_action_type: 'DAILY_QUIZ',
        p_reference_id: `test:ledger:quiz:${Date.now()}`,
        p_extra_units: 3,
        p_actor: null,
      });
      await adminClient.rpc('award_xp', {
        p_student_id: student,
        p_action_type: 'CONCEPT_MATCH',
        p_reference_id: `test:ledger:match:${Date.now()}`,
        p_extra_units: 0,
        p_actor: null,
      });
      await adminClient.rpc('award_xp', {
        p_student_id: student,
        p_action_type: 'DUEL_WIN',
        p_reference_id: `test:ledger:duel:${Date.now()}`,
        p_extra_units: 0,
        p_actor: null,
      });

      // 1. Fetch all events for student from raw xp_events ledger
      const { data: events, error: evErr } = await adminClient
        .from('xp_events')
        .select('xp_amount, status')
        .eq('student_id', student);

      expect(evErr).toBeNull();
      expect(events).toBeDefined();
      expect(events!.length).toBeGreaterThan(0);

      const computedLedgerSum = events!
        .filter((e) => e.status === 'valid')
        .reduce((sum, e) => sum + e.xp_amount, 0);

      // 2. Query get_student_xp RPC
      const { data: rpcTotal, error: rpcErr } = await adminClient.rpc('get_student_xp', {
        p_student_id: student,
      });

      expect(rpcErr).toBeNull();
      expect(rpcTotal).toBe(computedLedgerSum);

      // 3. Query student_xp_totals view
      const { data: viewRow, error: viewErr } = await adminClient
        .from('student_xp_totals')
        .select('total_xp')
        .eq('student_id', student)
        .single();

      expect(viewErr).toBeNull();
      expect(viewRow?.total_xp).toBe(computedLedgerSum);
    });
  });
});
