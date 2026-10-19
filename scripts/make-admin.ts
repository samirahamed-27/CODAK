/**
 * Bootstrap script: Promote an existing registered user to Administrator.
 * Uses the Supabase service role.
 *
 * Usage:
 *   npx tsx scripts/make-admin.ts <email>
 */

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

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local.');
  process.exit(1);
}

const targetEmail = process.argv[2]?.trim().toLowerCase();

if (!targetEmail) {
  console.error('Usage: npx tsx scripts/make-admin.ts <email>');
  process.exit(1);
}

async function run() {
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // 1. Look up profile by email
  const { data: profile, error: profileErr } = await adminClient
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('email', targetEmail)
    .maybeSingle();

  if (profileErr || !profile) {
    console.error(`Error: No account found for email "${targetEmail}".`);
    console.error('Please have the user sign up first at /login, then run this bootstrap script.');
    process.exit(1);
  }

  if (profile.role === 'admin') {
    console.log(`Account "${targetEmail}" is already an Administrator.`);
    process.exit(0);
  }

  // 2. Safety check: Check for existing student game activity
  const [xpCheck, quizCheck, duelCheck, battleCheck, practiceCheck] = await Promise.all([
    adminClient.from('xp_events').select('id', { count: 'exact', head: true }).eq('student_id', profile.id),
    adminClient.from('quiz_attempts').select('id', { count: 'exact', head: true }).eq('student_id', profile.id),
    adminClient.from('duels').select('id', { count: 'exact', head: true }).or(`challenger_id.eq.${profile.id},challenged_id.eq.${profile.id}`),
    adminClient.from('battle_team_members').select('id', { count: 'exact', head: true }).eq('student_id', profile.id),
    adminClient.from('student_practice_completions').select('id', { count: 'exact', head: true }).eq('student_id', profile.id),
  ]);

  const hasActivity =
    (xpCheck.count || 0) > 0 ||
    (quizCheck.count || 0) > 0 ||
    (duelCheck.count || 0) > 0 ||
    (battleCheck.count || 0) > 0 ||
    (practiceCheck.count || 0) > 0;

  if (hasActivity) {
    console.error(`Error: Account "${targetEmail}" has existing student activity and cannot be converted to Administrator.`);
    process.exit(1);
  }

  // 3. Remove student row if present
  await adminClient.from('students').delete().eq('id', profile.id);

  // 4. Update role to admin
  const { error: updateErr } = await adminClient
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', profile.id);

  if (updateErr) {
    console.error('Error updating profile role:', updateErr.message);
    process.exit(1);
  }

  // 5. Write audit log
  await adminClient.from('audit_logs').insert({
    actor_id: profile.id,
    action: 'admin_promoted_bootstrap',
    target_type: 'profile',
    target_id: profile.id,
    reason: 'Bootstrapped initial administrator via make-admin script',
    details: {
      email: profile.email,
      promoted_at: new Date().toISOString(),
    },
  });

  console.log(`✅ Success: Account "${targetEmail}" (ID: ${profile.id}) has been promoted to Administrator.`);
  console.log('The user can now sign in at /login and access the /admin portal.');
}

run().catch((err) => {
  console.error('Unexpected error:', err.message);
  process.exit(1);
});
