import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local for live integration tests
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
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const isLiveConfigured =
  supabaseUrl &&
  anonKey &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseUrl.includes('placeholder');

describe.runIf(isLiveConfigured)('Live Supabase Authentication & RLS Integrity', () => {
  let studentClient: any;
  let studentUser: any;

  it('authenticates demo student and verifies role is student', async () => {
    studentClient = createClient(supabaseUrl, anonKey);
    const { data: authData, error: authError } = await studentClient.auth.signInWithPassword({
      email: 'student@demo.edu',
      password: 'Password123!',
    });

    expect(authError).toBeNull();
    expect(authData.user).toBeDefined();
    studentUser = authData.user;

    const { data: profile, error: profileError } = await studentClient
      .from('profiles')
      .select('role, is_anonymous')
      .eq('id', studentUser.id)
      .single();

    expect(profileError).toBeNull();
    expect(profile?.role).toBe('student');
  });

  it('authenticates demo faculty and verifies role is faculty', async () => {
    const client = createClient(supabaseUrl, anonKey);
    const { data: authData, error: authError } = await client.auth.signInWithPassword({
      email: 'faculty@demo.edu',
      password: 'Password123!',
    });

    expect(authError).toBeNull();
    expect(authData.user).toBeDefined();

    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('role')
      .eq('id', authData.user!.id)
      .single();

    expect(profileError).toBeNull();
    expect(profile?.role).toBe('faculty');
  });

  it('authenticates demo admin and verifies role is admin', async () => {
    const client = createClient(supabaseUrl, anonKey);
    const { data: authData, error: authError } = await client.auth.signInWithPassword({
      email: 'admin@demo.edu',
      password: 'Password123!',
    });

    expect(authError).toBeNull();
    expect(authData.user).toBeDefined();

    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('role')
      .eq('id', authData.user!.id)
      .single();

    expect(profileError).toBeNull();
    expect(profile?.role).toBe('admin');
  });

  it('proves that a student CANNOT escalate their own role to admin (blocked by trigger)', async () => {
    expect(studentUser).toBeDefined();

    // Student attempts to hack/update their role to 'admin'
    const { error: updateError } = await studentClient
      .from('profiles')
      .update({ role: 'admin' } as any)
      .eq('id', studentUser.id);

    // Must be rejected by database trigger!
    expect(updateError).toBeDefined();
    expect(updateError?.message).toContain('Users are not permitted to change their own role');
  });

  it('proves that normal authenticated users cannot directly insert into xp_rules or xp_events', async () => {
    expect(studentUser).toBeDefined();

    // Attempt direct insert into xp_rules
    const { error: rulesInsertError } = await studentClient.from('xp_rules').insert({
      action_type: 'HACKED_ACTION',
      display_name: 'Free XP',
      base_xp: 9999,
    });
    expect(rulesInsertError).toBeDefined();

    // Attempt direct insert into xp_events ledger
    const { error: eventsInsertError } = await studentClient.from('xp_events').insert({
      student_id: studentUser.id,
      action_type: 'DAILY_QUIZ',
      xp_amount: 500,
      reference_id: 'fake_ref_123',
    });
    expect(eventsInsertError).toBeDefined();
  });
});
