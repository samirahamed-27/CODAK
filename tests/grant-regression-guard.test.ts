import { describe, it, expect } from 'vitest';
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

describe('Security Definer Grant Regression Guard (Automated DB Audit)', () => {
  const databaseUrl = process.env.DATABASE_URL;

  // Explicit approved allowlist of SECURITY DEFINER functions callable by non-admin roles:
  // - get_my_role: Used by RLS policies to check student vs faculty vs admin role for auth.uid()
  // - get_student_xp: Read-only XP calculation for student profile
  // - Trigger / Event trigger functions: handle_new_user, log_xp_rule_change, prevent_role_change, rls_auto_enable
  const ALLOWLIST_CALLABLE = new Set<string>([
    'get_my_role',
    'get_student_xp',
    'handle_new_user',
    'log_xp_rule_change',
    'prevent_role_change',
    'rls_auto_enable',
  ]);

  it('guarantees that sensitive SECURITY DEFINER functions in public schema are NOT executable by anon, authenticated, or PUBLIC', async () => {
    expect(databaseUrl).toBeDefined();

    const client = new Client({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    });

    await client.connect();

    try {
      // Query all SECURITY DEFINER functions in public schema and their granted execution privileges
      const res = await client.query(`
        SELECT 
          p.proname as function_name,
          p.prosecdef as security_definer,
          COALESCE(
            ARRAY(
              SELECT grantee 
              FROM information_schema.routine_privileges 
              WHERE specific_schema = 'public' 
                AND routine_name = p.proname 
                AND privilege_type = 'EXECUTE'
            ), 
            ARRAY[]::text[]
          ) as grantees,
          p.proacl::text as raw_acl
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.prosecdef = TRUE
        ORDER BY p.proname;
      `);

      const violations: { function_name: string; unsafe_grantees: string[]; raw_acl: string }[] = [];

      for (const row of res.rows) {
        const fnName = row.function_name;

        // If function is on the explicit approved allowlist, skip
        if (ALLOWLIST_CALLABLE.has(fnName)) {
          continue;
        }

        let grantees: string[] = [];
        if (Array.isArray(row.grantees)) {
          grantees = row.grantees;
        } else if (typeof row.grantees === 'string') {
          grantees = row.grantees
            .replace(/[{}]/g, '')
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);
        }

        const unsafeGrantees = grantees.filter((g) =>
          ['anon', 'authenticated', 'PUBLIC'].includes(g.toUpperCase()) ||
          ['anon', 'authenticated', 'public'].includes(g.toLowerCase())
        );

        // Also inspect raw_acl for default public grants (=X/postgres) or anon/authenticated
        const rawAcl: string = row.raw_acl || '';
        const hasPublicDefaultAcl =
          /(^\{|,\s*)=X\//.test(rawAcl) ||
          /(^\{|,\s*)anon=X\//.test(rawAcl) ||
          /(^\{|,\s*)authenticated=X\//.test(rawAcl);

        if (unsafeGrantees.length > 0 || hasPublicDefaultAcl) {
          violations.push({
            function_name: fnName,
            unsafe_grantees: unsafeGrantees,
            raw_acl: rawAcl,
          });
        }
      }

      // Assert zero violations
      expect(violations).toEqual([]);

      // Explicit positive verification of critical functions
      const criticalFunctions = ['award_xp', 'void_xp', 'submit_battle_answer'];
      for (const fn of criticalFunctions) {
        const row = res.rows.find((r) => r.function_name === fn);
        expect(row, `Function ${fn} must exist as SECURITY DEFINER`).toBeDefined();
        const gList: string[] = Array.isArray(row.grantees)
          ? row.grantees
          : typeof row.grantees === 'string'
          ? row.grantees.replace(/[{}]/g, '').split(',').map((s: string) => s.trim())
          : [];
        expect(gList).not.toContain('anon');
        expect(gList).not.toContain('authenticated');
        expect(gList).not.toContain('PUBLIC');
      }
    } finally {
      await client.end();
    }
  });
});
