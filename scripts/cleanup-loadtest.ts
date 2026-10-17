/**
 * Cleanup script for loadtest simulation artifacts and test users.
 * Purges loadtest users, battles, submissions, and XP rows.
 * Safe: only targets users with email LIKE 'loadtest_%@loadtest.invalid'
 * and battles titled 'Loadtest Battle%'.
 */

import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

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

export async function cleanupLoadtest() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // 1. Delete loadtest battles and cascaded submissions/scores/members/teams
    const battleRes = await client.query(`
      DELETE FROM public.battles
      WHERE title LIKE 'Loadtest Battle%'
      RETURNING id;
    `);
    const battleIds = battleRes.rows.map((r) => r.id);

    // 2. Delete XP events related to loadtest battles or loadtest students
    await client.query(`SET app.allow_ledger_cleanup = 'on';`);
    await client.query(`
      DELETE FROM public.xp_events
      WHERE reference_id LIKE 'battle:%'
        AND student_id IN (
          SELECT id FROM public.profiles WHERE email LIKE 'loadtest_%@loadtest.invalid'
        );
    `);

    // 3. Delete loadtest users from auth.users (cascades to public.profiles and public.students)
    const userRes = await client.query(`
      DELETE FROM auth.users
      WHERE email LIKE 'loadtest_%@loadtest.invalid'
      RETURNING id;
    `);

    console.log(`[Loadtest Cleanup] Removed ${battleIds.length} battles and ${userRes.rowCount} test users.`);
    return {
      battlesRemoved: battleIds.length,
      usersRemoved: userRes.rowCount,
    };
  } finally {
    await client.end();
  }
}

if (process.argv[1]?.endsWith('cleanup-loadtest.ts')) {
  cleanupLoadtest().catch((err) => {
    console.error('Cleanup failed:', err);
    process.exit(1);
  });
}
