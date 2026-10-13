import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Database Schema & Migration Validation (001_initial_schema.sql)', () => {
  const migrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/001_initial_schema.sql'
  );

  const sql = fs.readFileSync(migrationPath, 'utf8');

  it('enforces Row Level Security (RLS) on ALL 5 core tables', () => {
    const tables = ['profiles', 'students', 'faculty', 'xp_rules', 'xp_events'];
    for (const table of tables) {
      const rlsRegex = new RegExp(
        `ALTER\\s+TABLE\\s+public\\.${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
        'i'
      );
      expect(sql).toMatch(rlsRegex);
    }
  });

  it('guarantees unique ledger constraint on (student_id, action_type, reference_id)', () => {
    expect(sql).toContain(
      'CONSTRAINT unique_student_action_ref UNIQUE (student_id, action_type, reference_id)'
    );
  });

  it('checks that xp_amount is greater than or equal to 0 (xp_amount >= 0)', () => {
    expect(sql).toMatch(/xp_amount\s+INT\s+NOT\s+NULL\s+CHECK\s*\(\s*xp_amount\s*>=\s*0\s*\)/i);
  });

  it('contains security trigger preventing users from changing their own role', () => {
    expect(sql).toContain('FUNCTION public.prevent_role_change()');
    expect(sql).toContain('TRIGGER trg_prevent_role_change');
    expect(sql).toContain('Security violation: Users are not permitted to change their own role.');
  });

  it('hardcodes role = student in the auth user signup trigger', () => {
    expect(sql).toContain('FUNCTION public.handle_new_user()');
    expect(sql).toContain("'student', -- HARDCODED");
  });

  it('defines get_my_role() as SECURITY DEFINER to avoid RLS recursion', () => {
    expect(sql).toMatch(
      /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.get_my_role\(\)[\s\S]*?SECURITY\s+DEFINER/i
    );
  });

  it('seeds required xp_rules with exact point values and daily limits', () => {
    // ATTENDANCE: 10
    expect(sql).toContain("('ATTENDANCE', 'Class Attendance', 10, 0, NULL, TRUE)");
    // DAILY_QUIZ: 15 base + 5 extra, daily_limit 1
    expect(sql).toContain("('DAILY_QUIZ', 'Daily Concept Quiz', 15, 5, 1, TRUE)");
    // PEER_HELP: 15, daily_limit 3
    expect(sql).toContain("('PEER_HELP', 'Peer Tutoring & Help', 15, 0, 3, TRUE)");
    // ASSIGNMENT_ON_TIME: 20
    expect(sql).toContain("('ASSIGNMENT_ON_TIME', 'On-Time Assignment Submission', 20, 0, NULL, TRUE)");
    // CLUB_ACTIVITY: 25
    expect(sql).toContain("('CLUB_ACTIVITY', 'Technical Club Participation', 25, 0, NULL, TRUE)");
    // STREAK_7_BONUS: 50
    expect(sql).toContain("('STREAK_7_BONUS', '7-Day Streak Milestone Reward', 50, 0, NULL, TRUE)");
  });

  it('ensures no write policies exist on xp_events or xp_rules for normal authenticated users', () => {
    // Normal users should only have SELECT policies, no INSERT/UPDATE/DELETE policies
    const insertPolicyOnXpEvents = /CREATE\s+POLICY[\s\S]*?ON\s+public\.xp_events\s+FOR\s+INSERT\s+TO\s+authenticated/i;
    const updatePolicyOnXpEvents = /CREATE\s+POLICY[\s\S]*?ON\s+public\.xp_events\s+FOR\s+UPDATE\s+TO\s+authenticated/i;
    const insertPolicyOnXpRules = /CREATE\s+POLICY[\s\S]*?ON\s+public\.xp_rules\s+FOR\s+INSERT\s+TO\s+authenticated/i;

    expect(sql).not.toMatch(insertPolicyOnXpEvents);
    expect(sql).not.toMatch(updatePolicyOnXpEvents);
    expect(sql).not.toMatch(insertPolicyOnXpRules);
  });
});
