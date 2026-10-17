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

  // Explicit approved allowlist of SECURITY DEFINER functions with written justifications:
  // 1. get_my_role:
  //    - Reason: Evaluated within RLS policies for authenticated users to determine role without recursion.
  //    - Security: Revoked from anon and PUBLIC; granted only to authenticated and service_role.
  // 2. get_student_xp:
  //    - Reason: Read-only XP calculation helper for authenticated profiles.
  //    - Security: Enforces auth.uid() check; students can only view own total, faculty/admin any. Revoked from anon.
  // 3. handle_new_user:
  //    - Reason: Auth trigger creating student profile on auth.users insert.
  // 4. log_xp_rule_change:
  //    - Reason: Audit trigger recording xp_rules updates into xp_rules_history.
  // 5. prevent_role_change:
  //    - Reason: Integrity trigger preventing students from escalating their own role.
  // 6. rls_auto_enable:
  //    - Reason: DDL event trigger ensuring new tables automatically have RLS enabled.
  // 7. prevent_xp_events_tamper:
  //    - Reason: Immutability trigger rejecting any direct UPDATE or DELETE on xp_events ledger.
  const ALLOWLIST_CALLABLE = new Set<string>([
    'get_my_role',
    'get_student_xp',
    'handle_new_user',
    'log_xp_rule_change',
    'prevent_role_change',
    'rls_auto_enable',
    'prevent_xp_events_tamper',
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

      // Explicit positive verification of critical functions:
      // MUST NOT be executable by anon, authenticated, or PUBLIC
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

      // Explicit verification for helper functions:
      // get_my_role and get_student_xp must NEVER be executable by anon or PUBLIC
      const helperFunctions = ['get_my_role', 'get_student_xp'];
      for (const fn of helperFunctions) {
        const row = res.rows.find((r) => r.function_name === fn);
        expect(row, `Helper function ${fn} must exist`).toBeDefined();
        const gList: string[] = Array.isArray(row.grantees)
          ? row.grantees
          : typeof row.grantees === 'string'
          ? row.grantees.replace(/[{}]/g, '').split(',').map((s: string) => s.trim())
          : [];
        expect(gList, `${fn} must NOT be executable by anon`).not.toContain('anon');
        expect(gList, `${fn} must NOT be executable by PUBLIC`).not.toContain('PUBLIC');
      }
    } finally {
      await client.end();
    }
  });

  it('guarantees that xp_events immutability trigger blocks direct UPDATE or DELETE', async () => {
    const client = new Client({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();

    try {
      // Find one existing event to test trigger
      const ev = await client.query(`SELECT id FROM public.xp_events LIMIT 1;`);
      if (ev.rows.length > 0) {
        const id = ev.rows[0].id;
        // Attempt UPDATE
        let updateFailed = false;
        try {
          await client.query(`UPDATE public.xp_events SET xp_amount = 999999 WHERE id = $1;`, [id]);
        } catch (err: any) {
          updateFailed = true;
          expect(err.message).toMatch(/Immutable ledger violation/i);
        }
        expect(updateFailed, 'Trigger must reject direct UPDATE on xp_events').toBe(true);

        // Attempt DELETE
        let deleteFailed = false;
        try {
          await client.query(`DELETE FROM public.xp_events WHERE id = $1;`, [id]);
        } catch (err: any) {
          deleteFailed = true;
          expect(err.message).toMatch(/Immutable ledger violation/i);
        }
        expect(deleteFailed, 'Trigger must reject direct DELETE on xp_events').toBe(true);
      }
    } finally {
      await client.end();
    }
  });
});
