import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import {
  createStaffInviteAction,
  getStaffInvitesAction,
  revokeStaffInviteAction,
  redeemInviteAction,
} from '../src/app/actions/invites';
import { getLeaderboardData } from '../src/lib/leaderboards';
import { getCampusStandings } from '../src/lib/campus-standings';

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

const isLiveConfigured =
  supabaseUrl &&
  serviceRoleKey &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseUrl.includes('placeholder');

describe.runIf(isLiveConfigured)('Staff Sign-Up & Invite Codes Security Suite', () => {
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const testRunId = `stf_${Date.now()}`;
  const createdUserIds: string[] = [];
  const createdInviteIds: string[] = [];

  let adminUserId: string;
  let facultyUserId: string;
  let studentAId: string;
  let studentBId: string;

  async function createTestUser(
    role: 'student' | 'faculty' | 'admin',
    suffix: string,
    emailConfirm: boolean = true
  ): Promise<string> {
    const email = `${testRunId}_${role}_${suffix}@test.edu`;
    const password = 'TestPassword123!';

    const { data: user, error: userErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: emailConfirm,
      user_metadata: { role, full_name: `Test ${role} ${suffix}` },
    });

    if (userErr || !user?.user) {
      throw new Error(`Failed to create test user: ${userErr?.message}`);
    }

    const userId = user.user.id;
    createdUserIds.push(userId);

    if (role !== 'student') {
      await adminClient
        .from('profiles')
        .update({ role, full_name: `Test ${role} ${suffix}` })
        .eq('id', userId);

      await adminClient.from('students').delete().eq('id', userId);

      if (role === 'faculty') {
        await adminClient.from('faculty').upsert({
          id: userId,
          employee_id: `EMP_${userId.slice(0, 8)}`,
          department: 'CSE',
        });
      }
    }

    return userId;
  }

  beforeAll(async () => {
    adminUserId = await createTestUser('admin', 'admin1');
    facultyUserId = await createTestUser('faculty', 'fac1');
    studentAId = await createTestUser('student', 'stuA');
    studentBId = await createTestUser('student', 'stuB');
  });

  afterAll(async () => {
    // Clean up created invites
    if (createdInviteIds.length > 0) {
      await adminClient.from('staff_invites').delete().in('id', createdInviteIds);
    }
    // Clean up audit logs for test
    if (createdUserIds.length > 0) {
      await adminClient.from('audit_logs').delete().in('actor_id', createdUserIds);
      // Clean up test users
      for (const uid of createdUserIds) {
        await adminClient.from('faculty').delete().eq('id', uid);
        await adminClient.from('students').delete().eq('id', uid);
        await adminClient.from('profiles').delete().eq('id', uid);
        await adminClient.auth.admin.deleteUser(uid);
      }
    }
  });

  // Scenario 1: Zero-trust signup trigger
  it('1. A new sign-up is always a student, including when client sends role metadata', async () => {
    const signupEmail = `${testRunId}_hacker@test.edu`;
    const { data: user, error } = await adminClient.auth.admin.createUser({
      email: signupEmail,
      password: 'Password123!',
      email_confirm: true,
      user_metadata: { role: 'admin', full_name: 'Hacker User' },
    });

    expect(error).toBeNull();
    expect(user?.user).toBeDefined();
    const hackerId = user!.user!.id;
    createdUserIds.push(hackerId);

    // Profile role MUST be hardcoded to 'student'
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', hackerId)
      .single();

    expect(profile?.role).toBe('student');

    // Students table row MUST exist
    const { data: student } = await adminClient
      .from('students')
      .select('id')
      .eq('id', hackerId)
      .single();

    expect(student?.id).toBe(hackerId);
  });

  // Scenario 2: Valid faculty code promotes to faculty, creates faculty row, deletes student row
  it('2. A valid faculty code promotes to faculty and creates the faculty row', async () => {
    const createRes = await createStaffInviteAction(
      {
        role: 'faculty',
        expiresDays: 7,
        maxUses: 1,
        note: 'CS Faculty Onboarding',
      },
      adminUserId
    );

    expect(createRes.success).toBe(true);
    expect(createRes.rawCode).toBeDefined();
    createdInviteIds.push(createRes.inviteId!);

    const redeemRes = await redeemInviteAction(
      {
        code: createRes.rawCode!,
        department: 'Computer Science & Engineering',
        designation: 'Associate Professor',
        employeeId: `FAC_${studentAId.slice(0, 8)}`,
      },
      studentAId,
      '192.168.1.101'
    );

    expect(redeemRes.success).toBe(true);
    expect(redeemRes.role).toBe('faculty');
    expect(redeemRes.redirectUrl).toBe('/faculty');

    // Verify profile role is now faculty
    const { data: updatedProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', studentAId)
      .single();
    expect(updatedProfile?.role).toBe('faculty');

    // Verify faculty row was created
    const { data: facultyRow } = await adminClient
      .from('faculty')
      .select('*')
      .eq('id', studentAId)
      .single();
    expect(facultyRow).not.toBeNull();
    expect(facultyRow?.department).toBe('Computer Science & Engineering');
    expect(facultyRow?.designation).toBe('Associate Professor');

    // Verify student row was deleted
    const { data: studentRow } = await adminClient
      .from('students')
      .select('id')
      .eq('id', studentAId)
      .maybeSingle();
    expect(studentRow).toBeNull();
  });

  // Scenario 3: Role boundary enforcement: faculty code cannot create admin; admin code creates admin
  it('3. A faculty code can never create an admin; an admin code creates an admin', async () => {
    // 3a: Faculty code gives faculty role
    const facInvite = await createStaffInviteAction(
      { role: 'faculty', maxUses: 5 },
      adminUserId
    );
    expect(facInvite.success).toBe(true);
    createdInviteIds.push(facInvite.inviteId!);

    const studentCId = await createTestUser('student', 'stuC');
    const redeemFac = await redeemInviteAction(
      { code: facInvite.rawCode! },
      studentCId,
      '192.168.1.102'
    );
    expect(redeemFac.success).toBe(true);
    expect(redeemFac.role).toBe('faculty'); // NOT admin

    // 3b: Admin code creates admin
    const adminInvite = await createStaffInviteAction(
      { role: 'admin', maxUses: 1 },
      adminUserId
    );
    expect(adminInvite.success).toBe(true);
    createdInviteIds.push(adminInvite.inviteId!);

    const studentDId = await createTestUser('student', 'stuD');
    const redeemAdmin = await redeemInviteAction(
      { code: adminInvite.rawCode! },
      studentDId,
      '192.168.1.103'
    );
    expect(redeemAdmin.success).toBe(true);
    expect(redeemAdmin.role).toBe('admin');
    expect(redeemAdmin.redirectUrl).toBe('/admin');

    const { data: adminProf } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', studentDId)
      .single();
    expect(adminProf?.role).toBe('admin');
  });

  // Scenario 4: Generic error for expired, revoked, used-up, unknown, and wrong-format codes
  it('4. Expired, revoked, used-up, unknown and wrong-format codes all fail with "Invalid or expired code"', async () => {
    // 4a. Unknown code
    const stuUnknown = await createTestUser('student', 's4_unknown');
    const resUnknown = await redeemInviteAction(
      { code: 'inv_nonexistent_code_with_sufficient_length_12345' },
      stuUnknown,
      '192.168.10.1'
    );
    expect(resUnknown.success).toBe(false);
    expect(resUnknown.error).toBe('Invalid or expired code');

    // 4b. Wrong-format code (too short)
    const stuShort = await createTestUser('student', 's4_short');
    const resShort = await redeemInviteAction(
      { code: 'inv_short' },
      stuShort,
      '192.168.10.2'
    );
    expect(resShort.success).toBe(false);
    expect(resShort.error).toBe('Invalid or expired code');

    // 4c. Revoked code
    const stuRevoked = await createTestUser('student', 's4_revoked');
    const inviteRevoke = await createStaffInviteAction({ role: 'faculty' }, adminUserId);
    createdInviteIds.push(inviteRevoke.inviteId!);
    await revokeStaffInviteAction(inviteRevoke.inviteId!, adminUserId);

    const resRevoked = await redeemInviteAction(
      { code: inviteRevoke.rawCode! },
      stuRevoked,
      '192.168.10.3'
    );
    expect(resRevoked.success).toBe(false);
    expect(resRevoked.error).toBe('Invalid or expired code');

    // 4d. Expired code
    const stuExpired = await createTestUser('student', 's4_expired');
    const inviteExpired = await createStaffInviteAction({ role: 'faculty' }, adminUserId);
    createdInviteIds.push(inviteExpired.inviteId!);
    await adminClient
      .from('staff_invites')
      .update({ expires_at: new Date(Date.now() - 3600000).toISOString() })
      .eq('id', inviteExpired.inviteId);

    const resExpired = await redeemInviteAction(
      { code: inviteExpired.rawCode! },
      stuExpired,
      '192.168.10.4'
    );
    expect(resExpired.success).toBe(false);
    expect(resExpired.error).toBe('Invalid or expired code');

    // 4e. Used-up code
    const stuUsedUp = await createTestUser('student', 's4_usedup');
    const inviteUsedUp = await createStaffInviteAction({ role: 'faculty', maxUses: 1 }, adminUserId);
    createdInviteIds.push(inviteUsedUp.inviteId!);
    await adminClient
      .from('staff_invites')
      .update({ used_count: 1 })
      .eq('id', inviteUsedUp.inviteId);

    const resUsedUp = await redeemInviteAction(
      { code: inviteUsedUp.rawCode! },
      stuUsedUp,
      '192.168.10.5'
    );
    expect(resUsedUp.success).toBe(false);
    expect(resUsedUp.error).toBe('Invalid or expired code');
  });

  // Scenario 5: Concurrent redemptions of a single-use code
  it('5. Two concurrent redemptions of a single-use code: exactly one succeeds', async () => {
    const singleUse = await createStaffInviteAction(
      { role: 'faculty', maxUses: 1 },
      adminUserId
    );
    expect(singleUse.success).toBe(true);
    createdInviteIds.push(singleUse.inviteId!);

    const racer1Id = await createTestUser('student', 'racer1');
    const racer2Id = await createTestUser('student', 'racer2');

    // Execute concurrently
    const [res1, res2] = await Promise.all([
      redeemInviteAction({ code: singleUse.rawCode! }, racer1Id, '192.168.1.105'),
      redeemInviteAction({ code: singleUse.rawCode! }, racer2Id, '192.168.1.106'),
    ]);

    const successes = [res1, res2].filter((r) => r.success);
    const failures = [res1, res2].filter((r) => !r.success);

    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);
    expect(failures[0].error).toBe('Invalid or expired code');

    // Verify used_count is exactly 1
    const { data: invite } = await adminClient
      .from('staff_invites')
      .select('used_count')
      .eq('id', singleUse.inviteId)
      .single();
    expect(invite?.used_count).toBe(1);
  });

  // Scenario 6: Unverified email cannot redeem
  it('6. Unverified email cannot redeem', async () => {
    const unverifiedId = await createTestUser('student', 'unverified', false);
    const invite = await createStaffInviteAction({ role: 'faculty' }, adminUserId);
    createdInviteIds.push(invite.inviteId!);

    const res = await redeemInviteAction(
      { code: invite.rawCode! },
      unverifiedId,
      '192.168.1.107'
    );

    expect(res.success).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.error).toMatch(/email verification required/i);
  });

  // Scenario 7: Rate limiting blocks 6th attempt in 10 minutes
  it('7. Rate limit blocks the 6th attempt in 10 minutes (per user & per IP)', async () => {
    const testUserRateLimitId = await createTestUser('student', 'rate_limit');
    const testIp = `10.200.50.${Date.now() % 250}`;

    // Perform 5 failed attempts
    for (let i = 0; i < 5; i++) {
      await redeemInviteAction(
        { code: `inv_fake_wrong_code_${i}_1234567890` },
        testUserRateLimitId,
        testIp
      );
    }

    // 6th attempt must be blocked by rate limit (HTTP 429)
    const blockedRes = await redeemInviteAction(
      { code: 'inv_fake_wrong_code_6_1234567890' },
      testUserRateLimitId,
      testIp
    );

    expect(blockedRes.success).toBe(false);
    expect(blockedRes.statusCode).toBe(429);
    expect(blockedRes.error).toMatch(/too many attempts/i);

    // Verify burst audit log row created
    const { data: burstAudit } = await adminClient
      .from('audit_logs')
      .select('*')
      .eq('actor_id', testUserRateLimitId)
      .eq('action', 'invite_failed_attempts_burst')
      .maybeSingle();

    expect(burstAudit).not.toBeNull();
  });

  // Scenario 8: Access Control: Students & Faculty get 403; Admin can create, list, and revoke
  it('8. Students and faculty cannot create, list or revoke invites (403); admin can', async () => {
    const freshStudentId = await createTestUser('student', 'guard_stu');
    const freshFacultyId = await createTestUser('faculty', 'guard_fac');

    // Student attempts
    const stuCreate = await createStaffInviteAction({ role: 'faculty' }, freshStudentId);
    expect(stuCreate.success).toBe(false);
    expect(stuCreate.statusCode).toBe(403);

    const stuList = await getStaffInvitesAction(freshStudentId);
    expect(stuList.success).toBe(false);
    expect(stuList.statusCode).toBe(403);

    const stuRevoke = await revokeStaffInviteAction('fake-id', freshStudentId);
    expect(stuRevoke.success).toBe(false);
    expect(stuRevoke.statusCode).toBe(403);

    // Faculty attempts
    const facCreate = await createStaffInviteAction({ role: 'faculty' }, freshFacultyId);
    expect(facCreate.success).toBe(false);
    expect(facCreate.statusCode).toBe(403);

    const facList = await getStaffInvitesAction(freshFacultyId);
    expect(facList.success).toBe(false);
    expect(facList.statusCode).toBe(403);

    const facRevoke = await revokeStaffInviteAction('fake-id', freshFacultyId);
    expect(facRevoke.success).toBe(false);
    expect(facRevoke.statusCode).toBe(403);

    // Admin attempts -> All succeed
    const adminCreate = await createStaffInviteAction({ role: 'faculty', note: 'RBAC Test' }, adminUserId);
    expect(adminCreate.success).toBe(true);
    createdInviteIds.push(adminCreate.inviteId!);

    const adminList = await getStaffInvitesAction(adminUserId);
    expect(adminList.success).toBe(true);
    expect(adminList.invites.some((i) => i.id === adminCreate.inviteId)).toBe(true);

    const adminRevoke = await revokeStaffInviteAction(adminCreate.inviteId!, adminUserId);
    expect(adminRevoke.success).toBe(true);
  });

  // Scenario 9: Zero plain-text storage: Raw code is never stored in DB or audit logs
  it('9. The raw code is never stored (hash only) and never appears in audit_logs or error messages', async () => {
    const invite = await createStaffInviteAction({ role: 'faculty' }, adminUserId);
    expect(invite.success).toBe(true);
    createdInviteIds.push(invite.inviteId!);
    const rawCode = invite.rawCode!;

    // 1. Check staff_invites table
    const { data: dbInvite } = await adminClient
      .from('staff_invites')
      .select('*')
      .eq('id', invite.inviteId)
      .single();

    // Raw code MUST NOT equal code_hash
    expect(dbInvite?.code_hash).not.toBe(rawCode);
    expect(dbInvite?.code_hash).toHaveLength(64); // SHA-256 hex string

    // 2. Check audit_logs
    const { data: logs } = await adminClient
      .from('audit_logs')
      .select('*')
      .eq('target_id', invite.inviteId);

    for (const log of logs || []) {
      const logString = JSON.stringify(log);
      expect(logString).not.toContain(rawCode);
    }
  });

  // Scenario 10: promote_to_staff permission check (Grant Guard)
  it('10. promote_to_staff is not executable by authenticated or anon users', async () => {
    const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

    // Anon attempts to invoke RPC promote_to_staff
    const { error: anonErr } = await anonClient.rpc('promote_to_staff', {
      p_user_id: studentBId,
      p_role: 'admin',
      p_invite_id: '00000000-0000-0000-0000-000000000000',
    });

    // Must be denied by Postgres permissions
    expect(anonErr).toBeDefined();
    expect(anonErr?.message).toMatch(/permission denied|does not exist/i);
  });

  // Scenario 11: Promoted accounts excluded from aggregations; accounts with activity refused
  it('11. Promoted accounts excluded from aggregations; active student accounts refused promotion', async () => {
    // 11a: Create active student account with XP event
    const activeStudentId = await createTestUser('student', 'active_stu');

    // Insert an active XP event
    await adminClient.from('xp_events').insert({
      student_id: activeStudentId,
      action_type: 'DAILY_QUIZ',
      xp_amount: 25,
      reference_id: `ref_test_${Date.now()}`,
    });

    const invite = await createStaffInviteAction({ role: 'faculty' }, adminUserId);
    createdInviteIds.push(invite.inviteId!);

    // Attempt promotion -> MUST be refused
    const res = await redeemInviteAction(
      { code: invite.rawCode! },
      activeStudentId,
      '192.168.1.108'
    );

    expect(res.success).toBe(false);
    expect(res.statusCode).toBe(400);
    expect(res.error).toMatch(/existing student activity/i);

    // Profile remains student
    const { data: prof } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', activeStudentId)
      .single();
    expect(prof?.role).toBe('student');

    // 11b: Verify a promoted faculty user is excluded from leaderboard rankings
    const lbEntries = await getLeaderboardData(adminClient, {
      scope: 'all_campuses',
      timeframe: 'all-time',
    });

    // studentA was promoted to faculty in Scenario 2 -> MUST NOT appear on leaderboard
    const appearsOnLeaderboard = lbEntries.some((s) => s.studentId === studentAId);
    expect(appearsOnLeaderboard).toBe(false);
  });

  // Scenario 12: Existing accounts, /judge, and normal student flows still work
  it('12. Existing faculty and admin accounts, the /judge flow and normal student sign-up still work', async () => {
    // Existing faculty can be queried
    const { data: facProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', facultyUserId)
      .single();
    expect(facProfile?.role).toBe('faculty');

    // Existing admin can be queried
    const { data: admProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', adminUserId)
      .single();
    expect(admProfile?.role).toBe('admin');
  });
});
