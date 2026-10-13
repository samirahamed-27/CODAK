/**
 * Direct PostgreSQL Migration Runner
 *
 * Runs SQL migration files directly against the database using DATABASE_URL.
 * Usage:
 *   npx tsx scripts/run-migration.ts supabase/migrations/002_xp_core.sql
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

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || databaseUrl.includes('[YOUR-PASSWORD]')) {
  console.error('\n❌ ERROR: DATABASE_URL is missing or contains placeholder values in .env.local.');
  console.error('Please add your direct Supabase connection URI to .env.local:');
  console.error('DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"\n');
  process.exit(1);
}

const targetFile = process.argv[2] || 'supabase/migrations/002_xp_core.sql';
const sqlPath = path.resolve(process.cwd(), targetFile);

if (!fs.existsSync(sqlPath)) {
  console.error(`\n❌ ERROR: Migration file not found at: ${sqlPath}\n`);
  process.exit(1);
}

async function run() {
  console.log(`\n🚀 Applying migration: ${targetFile}...`);
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }, // Required for Supabase cloud connection
  });

  try {
    await client.connect();
    console.log('✅ Connected directly to Supabase PostgreSQL database.');

    await client.query(sql);
    console.log('🎉 Migration applied successfully!\n');
  } catch (err: any) {
    console.error('❌ Migration failed:', err.message);
    if (err.detail) console.error('Details:', err.detail);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
