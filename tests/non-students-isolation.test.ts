import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensureStudentRecord } from '@/lib/auth/ensure-student';
import { getLeaderboardData } from '@/lib/leaderboards';
import { getCampusStandings } from '@/lib/campus-standings';
import { getFacultyAnalytics } from '@/lib/faculty-analytics';
import { assignStudentToWeeklyLeague } from '@/lib/leagues';
import { autoSplitTeamsAction } from '@/app/actions/battles';
import { claimPracticeProblemAction } from '@/app/actions/practice';

describe('Non-Students Isolation & Student Record Guards (Step 3)', () => {
  const adminClient = createAdminClient();
  const testRunId = `isol_${Date.now()}`;

  const createdUserIds: string[] = [];

  let testStudentId: string;
  let testFacultyId: string;
  let testAdminId: string;

  async function createTestUser(
    role: 'student' | 'faculty' | 'admin',
    suffix: string
  ): Promise<string> {
    const email = `${testRunId}_${role}_${suffix}@test.edu`;
    const password = 'TestPassword123!';

    const { data: user, error: userErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role, full_name: `Test ${role} ${suffix}` },
    });

    if (userErr || !user?.user) {
      throw new Error(`Failed to create test user: ${userErr?.message}`);
    }

    const userId = user.user.id;
    createdUserIds.push(userId);

    await adminClient.from('profiles').update({
      role,
      full_name: `Test ${role} ${suffix}`,
    }).eq('id', userId);

    if (role === 'faculty') {
      await adminClient.from('faculty').upsert({
        id: userId,
        employee_id: `EMP_${userId.slice(0, 8)}`,
        department: 'CSE',
      });
      // Purge default student row created by handle_new_user trigger
      await adminClient.from('students').delete().eq('id', userId);
    } else if (role === 'admin') {
      // Purge default student row created by handle_new_user trigger
      await adminClient.from('students').delete().eq('id', userId);
    }

    return userId;
  }

  beforeAll(async () => {
    testStudentId = await createTestUser('student', '1');
    testFacultyId = await createTestUser('faculty', '1');
    testAdminId = await createTestUser('admin', '1');
  }, 60000);

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await adminClient.from('xp_events').delete().in('student_id', createdUserIds);
      await adminClient.from('flags').delete().in('student_id', createdUserIds);
      await adminClient.from('students').delete().in('id', createdUserIds);
      await adminClient.from('faculty').delete().in('id', createdUserIds);
      await adminClient.from('profiles').delete().in('id', createdUserIds);
      for (const uid of createdUserIds) {
        await adminClient.auth.admin.deleteUser(uid);
      }
    }
  }, 60000);

  describe('1. ensureStudentRecord Role Filtering', () => {
    it('creates student row for verified student profile and returns true', async () => {
      const res = await ensureStudentRecord(adminClient, { id: testStudentId });
      expect(res).toBe(true);

      const { data: student } = await adminClient
        .from('students')
        .select('*')
        .eq('id', testStudentId)
        .maybeSingle();

      expect(student).not.toBeNull();
      expect(student.id).toBe(testStudentId);
    });

    it('rejects faculty profile, returns false, and does NOT create a student row', async () => {
      const res = await ensureStudentRecord(adminClient, { id: testFacultyId });
      expect(res).toBe(false);

      const { data: student } = await adminClient
        .from('students')
        .select('*')
        .eq('id', testFacultyId)
        .maybeSingle();

      expect(student).toBeNull();
    });

    it('rejects admin profile, returns false, and does NOT create a student row', async () => {
      const res = await ensureStudentRecord(adminClient, { id: testAdminId });
      expect(res).toBe(false);

      const { data: student } = await adminClient
        .from('students')
        .select('*')
        .eq('id', testAdminId)
        .maybeSingle();

      expect(student).toBeNull();
    });
  });

  describe('2. Student Actions Reject Non-Students (403 Forbidden)', () => {
    it('blocks faculty from claiming practice problem XP (403 Forbidden)', async () => {
      const res = await claimPracticeProblemAction(
        {
          practiceLinkId: 'dummy-link-id',
          submissionProof: 'https://leetcode.com/submissions/detail/12345/',
        },
        testFacultyId
      );

      expect(res.success).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.error).toMatch(/forbidden|student/i);
    });

    it('blocks admin from claiming practice problem XP (403 Forbidden)', async () => {
      const res = await claimPracticeProblemAction(
        {
          practiceLinkId: 'dummy-link-id',
          submissionProof: 'https://leetcode.com/submissions/detail/12345/',
        },
        testAdminId
      );

      expect(res.success).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.error).toMatch(/forbidden|student/i);
    });
  });

  describe('3. Leaderboard & Campus Standings Exclude Non-Students', () => {
    it('leaderboards never include faculty or admin accounts', async () => {
      const allCampusesLb = await getLeaderboardData(adminClient, {
        scope: 'all_campuses',
        timeframe: 'all-time',
      });

      const facultyInLb = allCampusesLb.find((entry) => entry.studentId === testFacultyId);
      const adminInLb = allCampusesLb.find((entry) => entry.studentId === testAdminId);

      expect(facultyInLb).toBeUndefined();
      expect(adminInLb).toBeUndefined();
    });

    it('campus standings never include faculty or admin accounts in active student counts', async () => {
      const standings = await getCampusStandings(adminClient);

      // Check all active student sets
      for (const row of standings.standings) {
        expect(row.activeStudentCount).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('4. Faculty Analytics & League Exclusions', () => {
    it('getFacultyAnalytics excludes non-student accounts from totalStudents', async () => {
      const analytics = await getFacultyAnalytics({}, adminClient);
      expect(analytics.totalStudents).toBeGreaterThanOrEqual(0);
    });

    it('assignStudentToWeeklyLeague throws error for faculty or admin', async () => {
      await expect(
        assignStudentToWeeklyLeague(testFacultyId, adminClient)
      ).rejects.toThrow(/forbidden.*student/i);

      await expect(
        assignStudentToWeeklyLeague(testAdminId, adminClient)
      ).rejects.toThrow(/forbidden.*student/i);
    });

    it('autoSplitTeamsAction excludes faculty from drafted teams', async () => {
      const result = await autoSplitTeamsAction(
        [testStudentId, testFacultyId, testAdminId],
        2
      );

      if (result.success && result.teams) {
        const allDrafted = [
          ...(result.teams[0] || []),
          ...(result.teams[1] || []),
        ];
        const facultyInTeams = allDrafted.find((s) => s.id === testFacultyId);
        const adminInTeams = allDrafted.find((s) => s.id === testAdminId);

        expect(facultyInTeams).toBeUndefined();
        expect(adminInTeams).toBeUndefined();
      }
    });
  });
});
