/**
 * Direct PostgreSQL Migration Runner
 *
 * Runs SQL migration files against the database using DATABASE_URL and tracks
 * applied versions in public.schema_migrations.
 *
 * Usage:
 *   npm run migrate                          # Applies all pending migrations in supabase/migrations
 *   npm run migrate -- --status              # Displays applied vs pending migrations
 *   npx tsx scripts/run-migration.ts <file>  # Applies a specific migration file
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
  console.error('DATABASE_URL is for local .env.local only (never in hosting/production envs).');
  console.error('Please add your direct Supabase connection URI to .env.local:');
  console.error('DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"\n');
  process.exit(1);
}

const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations');

async function run() {
  const isStatus = process.argv.includes('--status');
  const specifiedFile = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }, // Required for Supabase cloud connection
  });

  try {
    await client.connect();
    console.log('✅ Connected directly to Supabase PostgreSQL database.');

    // 1. Ensure schema_migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Fetch already applied migrations
    const appliedRes = await client.query(`
      SELECT version, name, applied_at FROM public.schema_migrations ORDER BY version ASC;
    `);
    const appliedVersions = new Set<string>(appliedRes.rows.map((r: any) => r.version));

    // 3. Collect available migration files
    const allFiles = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    // Baseline backfill if schema_migrations is brand new but database already has schema
    if (appliedVersions.size === 0) {
      const tableCheck = await client.query(`
        SELECT to_regclass('public.xp_events') as tbl;
      `);
      if (tableCheck.rows[0]?.tbl) {
        console.log('ℹ️ Existing schema detected without migration history. Backfilling baseline 001-011 into schema_migrations...');
        for (const file of allFiles) {
          const version = file.split('_')[0];
          if (parseInt(version, 10) <= 11) {
            await client.query(
              `INSERT INTO public.schema_migrations (version, name, applied_at)
               VALUES ($1, $2, NOW())
               ON CONFLICT (version) DO NOTHING;`,
              [version, file]
            );
            appliedVersions.add(version);
          }
        }
      }
    }

    if (isStatus) {
      console.log('\n📋 Migration Status:');
      for (const file of allFiles) {
        const version = file.split('_')[0];
        const isApplied = appliedVersions.has(version);
        console.log(`  [${isApplied ? '✓' : ' '}] ${file}`);
      }
      console.log('');
      return;
    }

    // 4. Determine migrations to apply
    let toApply: string[] = [];

    if (specifiedFile) {
      const basename = path.basename(specifiedFile);
      toApply = [basename];
    } else {
      toApply = allFiles.filter((f) => {
        const version = f.split('_')[0];
        return !appliedVersions.has(version);
      });
    }

    if (toApply.length === 0) {
      console.log('✨ All migrations are up to date! Nothing to apply.\n');
      return;
    }

    for (const file of toApply) {
      const version = file.split('_')[0];
      const filePath = path.join(migrationsDir, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Migration file not found: ${filePath}`);
      }

      console.log(`\n🚀 Applying migration: ${file}...`);
      const sql = fs.readFileSync(filePath, 'utf8');

      await client.query('BEGIN;');
      try {
        await client.query(sql);
        await client.query(
          `INSERT INTO public.schema_migrations (version, name, applied_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (version) DO UPDATE SET applied_at = NOW();`,
          [version, file]
        );
        await client.query('COMMIT;');
        console.log(`✅ Applied ${file} successfully.`);
      } catch (err) {
        await client.query('ROLLBACK;');
        throw err;
      }
    }

    console.log('\n🎉 All requested migrations applied successfully!\n');
  } catch (err: any) {
    console.error('❌ Migration failed:', err.message);
    if (err.detail) console.error('Details:', err.detail);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
