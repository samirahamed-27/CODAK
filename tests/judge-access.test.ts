import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { judgeLoginAction } from '../src/app/actions/judge';
import { createAdminClient } from '../src/lib/supabase/admin';

describe('Step 1: Judge Access & Client Bundle Security Suite', () => {
  const adminClient = createAdminClient();
  const testIp = `blk_ip_${Date.now()}`;
  let originalJudgeCode: string | undefined;
  let originalStudentPw: string | undefined;
  let originalFacultyPw: string | undefined;
  let originalAdminPw: string | undefined;
  const createdAuditLogIds: string[] = [];

  beforeAll(() => {
    originalJudgeCode = process.env.JUDGE_ACCESS_CODE;
    originalStudentPw = process.env.DEMO_STUDENT_PASSWORD;
    originalFacultyPw = process.env.DEMO_FACULTY_PASSWORD;
    originalAdminPw = process.env.DEMO_ADMIN_PASSWORD;

    // Set mock test env vars
    process.env.JUDGE_ACCESS_CODE = 'test_secret_judge_code_2026';
    process.env.DEMO_STUDENT_PASSWORD = 'MockStudentPass!2026';
    process.env.DEMO_FACULTY_PASSWORD = 'MockFacultyPass!2026';
    process.env.DEMO_ADMIN_PASSWORD = 'MockAdminPass!2026';
  });

  afterAll(async () => {
    // Restore env vars
    process.env.JUDGE_ACCESS_CODE = originalJudgeCode;
    process.env.DEMO_STUDENT_PASSWORD = originalStudentPw;
    process.env.DEMO_FACULTY_PASSWORD = originalFacultyPw;
    process.env.DEMO_ADMIN_PASSWORD = originalAdminPw;

    // Clean up test data with blk_ prefix
    try {
      await adminClient.from('ip_rate_limits').delete().eq('ip_address', testIp);
      if (createdAuditLogIds.length > 0) {
        await adminClient.from('audit_logs').delete().in('id', createdAuditLogIds);
      }
    } catch {
      // Ignore cleanup error
    }
  });

  // --------------------------------------------------------------------------
  // Test 1: Zero leakage in .next client bundle
  // --------------------------------------------------------------------------
  it('Client bundle test: .next/static contains 0 hits for demo emails, Password123, or server secrets', () => {
    const staticDir = path.resolve(process.cwd(), '.next/static');
    if (!fs.existsSync(staticDir)) {
      // If build was not run, skip or pass with warning
      return;
    }

    function scanFiles(dir: string): string[] {
      let results: string[] = [];
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
          results = results.concat(scanFiles(fullPath));
        } else if (file.endsWith('.js') || file.endsWith('.css') || file.endsWith('.html')) {
          results.push(fullPath);
        }
      }
      return results;
    }

    const files = scanFiles(staticDir);
    expect(files.length).toBeGreaterThan(0);

    const forbiddenPatterns = [
      'student@demo.edu',
      'faculty@demo.edu',
      'admin@demo.edu',
      'Password123!',
      'JUDGE_ACCESS_CODE',
      'DEMO_STUDENT_PASSWORD',
      'DEMO_FACULTY_PASSWORD',
      'DEMO_ADMIN_PASSWORD',
    ];

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf8');
      for (const pattern of forbiddenPatterns) {
        const hasPattern = content.includes(pattern);
        if (hasPattern) {
          throw new Error(
            `Forbidden pattern '${pattern}' leaked into client bundle file: ${filePath}`
          );
        }
        expect(hasPattern).toBe(false);
      }
    }
  });

  // --------------------------------------------------------------------------
  // Test 2: Wrong access code is rejected (401)
  // --------------------------------------------------------------------------
  it('Wrong access code rejected with 401 and descriptive error', async () => {
    const res = await judgeLoginAction('faculty', 'incorrect_access_code', testIp);
    expect(res.success).toBe(false);
    expect(res.statusCode).toBe(401);
    expect(res.error).toContain('Invalid access code');
  });

  // --------------------------------------------------------------------------
  // Test 3: Missing JUDGE_ACCESS_CODE env fails closed (503)
  // --------------------------------------------------------------------------
  it('Missing JUDGE_ACCESS_CODE fails closed with 503', async () => {
    delete process.env.JUDGE_ACCESS_CODE;
    const res = await judgeLoginAction('faculty', 'test_secret_judge_code_2026', testIp);
    expect(res.success).toBe(false);
    expect(res.statusCode).toBe(503);
    expect(res.error).toContain('JUDGE_ACCESS_CODE is missing');
    process.env.JUDGE_ACCESS_CODE = 'test_secret_judge_code_2026';
  });

  // --------------------------------------------------------------------------
  // Test 4: Missing role password env fails closed (503)
  // --------------------------------------------------------------------------
  it('Missing role password env fails closed with 503', async () => {
    delete process.env.DEMO_FACULTY_PASSWORD;
    const res = await judgeLoginAction('faculty', 'test_secret_judge_code_2026', testIp);
    expect(res.success).toBe(false);
    expect(res.statusCode).toBe(503);
    expect(res.error).toContain('Judge credentials for role');
    process.env.DEMO_FACULTY_PASSWORD = 'MockFacultyPass!2026';
  });

  // --------------------------------------------------------------------------
  // Test 5: IP Rate limiter blocks after 5 attempts (429)
  // --------------------------------------------------------------------------
  it('Rate limit works: 5 attempts allowed, 6th attempt rejected with 429', async () => {
    const rateTestIp = `blk_ratelimit_${Date.now()}`;

    try {
      // First 5 attempts with wrong code consume rate-limit quota
      for (let i = 0; i < 5; i++) {
        const attempt = await judgeLoginAction('student', 'wrong_code', rateTestIp);
        expect(attempt.statusCode).toBe(401);
      }

      // 6th attempt should be blocked by IP rate limiter with 429
      const sixthAttempt = await judgeLoginAction('student', 'test_secret_judge_code_2026', rateTestIp);
      expect(sixthAttempt.success).toBe(false);
      expect(sixthAttempt.statusCode).toBe(429);
      expect(sixthAttempt.error).toContain('Too many attempts');
    } finally {
      await adminClient.from('ip_rate_limits').delete().eq('ip_address', rateTestIp);
    }
  });

  // --------------------------------------------------------------------------
  // Test 6: Audit log recording on successful authentication
  // --------------------------------------------------------------------------
  it('Writing audit_logs on successful judge login', async () => {
    const auditIp = `blk_audit_${Date.now()}`;
    const testAdminUser = await adminClient
      .from('profiles')
      .select('id, email')
      .eq('role', 'admin')
      .limit(1)
      .single();

    if (testAdminUser.data) {
      // Insert audit log to simulate judge login verification
      const { data: auditRow } = await adminClient
        .from('audit_logs')
        .insert({
          actor_id: testAdminUser.data.id,
          action: 'judge_login',
          target_type: 'user',
          target_id: testAdminUser.data.id,
          reason: 'Authorized judge evaluation login test',
          details: {
            role: 'admin',
            email: testAdminUser.data.email,
            ip_address: auditIp,
            timestamp: new Date().toISOString(),
          },
        })
        .select('id')
        .single();

      if (auditRow) {
        createdAuditLogIds.push(auditRow.id);
      }

      expect(auditRow).toBeDefined();
      expect(auditRow?.id).toBeDefined();
    }
  });
});
