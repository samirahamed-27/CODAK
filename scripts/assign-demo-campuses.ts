/**
 * Assign Demo Accounts to Distinct Campuses
 *
 * Configures the three official demo accounts:
 * - student@demo.edu -> Hi-Tech Institute of Technology (Delhi)
 * - faculty@demo.edu -> Jagannath University (Jaipur)
 * - admin@demo.edu   -> Rathinam Institute of Technology (Bengaluru)
 *
 * Run with:
 *   npx tsx scripts/assign-demo-campuses.ts
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
        let val = match[2] || '';
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        process.env[match[1]] = val;
      }
    }
  }
}

loadEnvLocal();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ Error: DATABASE_URL is not set in .env.local');
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  console.log('🏛️ Fetching campuses...');
  const campusesRes = await client.query('SELECT id, slug, name, city FROM public.campuses');
  const campusMap = new Map<string, string>();
  for (const row of campusesRes.rows) {
    campusMap.set(row.slug, row.id);
  }

  const assignments = [
    { email: 'student@demo.edu', campusSlug: 'hi-tech-delhi', label: 'Hi-Tech Institute of Technology (Delhi)' },
    { email: 'faculty@demo.edu', campusSlug: 'jagannath-jaipur', label: 'Jagannath University (Jaipur)' },
    { email: 'admin@demo.edu', campusSlug: 'rathinam-bengaluru', label: 'Rathinam Institute of Technology (Bengaluru)' },
  ];

  console.log('Assigning demo users to campuses:');
  for (const assign of assignments) {
    const campusId = campusMap.get(assign.campusSlug);
    if (!campusId) {
      console.error(`❌ Campus slug not found: ${assign.campusSlug}`);
      continue;
    }

    const res = await client.query(
      `UPDATE public.profiles 
       SET campus_id = $1, campus_other_name = NULL 
       WHERE email = $2 
       RETURNING id, email, full_name`,
      [campusId, assign.email]
    );

    if (res.rowCount && res.rowCount > 0) {
      console.log(`  ✅ [${assign.email}] -> ${assign.label}`);
    } else {
      console.log(`  ⚠️ User ${assign.email} not found in profiles (will be assigned when seeded)`);
    }
  }

  await client.end();
  console.log('\n🎉 Demo accounts successfully assigned to distinct campuses!');
}

main().catch((err) => {
  console.error('Migration execution failed:', err);
  process.exit(1);
});
