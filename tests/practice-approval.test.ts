import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateProofUrl } from '@/lib/practice-validation';
import {
  claimPracticeProblemAction,
  approvePracticeClaimAction,
  bulkApprovePracticeClaimsAction,
  rejectPracticeClaimAction,
  getPendingPracticeClaimsAction,
} from '@/app/actions/practice';

describe('Practice & Competition Approval Workflow (Step 2)', () => {
  const adminClient = createAdminClient();
  const testRunId = `papp_${Date.now()}`;

  const createdUserIds: string[] = [];
  const createdLinkIds: string[] = [];
  const createdClaimIds: string[] = [];
  const createdFlagIds: string[] = [];

  let studentAId: string;
  let studentBId: string;
  let studentCId: string;
  let facultyId: string;

  let easyLinkId: string;
  let mediumLinkId: string;
  let hardLinkId: string;
  let compLinkId: string;

  async function getStudentTotalXp(studentId: string): Promise<number> {
    const { data: events } = await adminClient
      .from('xp_events')
      .select('xp_amount')
      .eq('student_id', studentId)
      .eq('status', 'valid');
    return (events || []).reduce((acc, ev) => acc + (ev.xp_amount || 0), 0);
  }

  async function createTestStudent(suffix: string): Promise<string> {
    const email = `${testRunId}_${suffix}@test.edu`;
    const password = 'TestPassword123!';

    const { data: user, error: userErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'student', full_name: `Student ${suffix}` },
    });

    if (userErr || !user?.user) {
      throw new Error(`Failed to create test user ${email}: ${userErr?.message}`);
    }

    const userId = user.user.id;
    createdUserIds.push(userId);

    await adminClient.from('profiles').update({
      role: 'student',
      full_name: `Student ${suffix}`,
    }).eq('id', userId);

    const { error: studentErr } = await adminClient.from('students').upsert({
      id: userId,
      roll_no: `R_${userId.slice(0, 8)}`,
      department: 'CSE',
      year_of_study: 3,
    });

    if (studentErr) {
      throw new Error(`Failed to upsert student record: ${studentErr.message}`);
    }

    return userId;
  }

  async function createTestFaculty(suffix: string): Promise<string> {
    const email = `${testRunId}_fac_${suffix}@test.edu`;
    const password = 'TestPassword123!';

    const { data: user, error: userErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'faculty', full_name: `Faculty ${suffix}` },
    });

    if (userErr || !user?.user) {
      throw new Error(`Failed to create faculty user ${email}: ${userErr?.message}`);
    }

    const userId = user.user.id;
    createdUserIds.push(userId);

    const { error: profErr } = await adminClient.from('profiles').update({
      role: 'faculty',
      full_name: `Faculty ${suffix}`,
    }).eq('id', userId);

    if (profErr) {
      throw new Error(`Failed to update faculty profile: ${profErr.message}`);
    }

    const { error: facErr } = await adminClient.from('faculty').upsert({
      id: userId,
      employee_id: `EMP_${userId.slice(0, 8)}`,
      department: 'CSE',
    });

    if (facErr) {
      throw new Error(`Failed to upsert faculty record: ${facErr.message}`);
    }

    return userId;
  }

  async function createPracticeLink(
    title: string,
    difficulty: 'Easy' | 'Medium' | 'Hard',
    isComp: boolean
  ): Promise<string> {
    const { data: link, error } = await adminClient
      .from('practice_links')
      .insert({
        platform: isComp ? 'HackerRank' : 'LeetCode',
        problem_id: `${testRunId}:${title.toLowerCase().replace(/\s+/g, '-')}`,
        title: `${title} (${testRunId})`,
        topic: 'Algorithms',
        difficulty,
        link: isComp
          ? `https://www.hackerrank.com/contests/${testRunId}`
          : `https://leetcode.com/problems/${testRunId}/`,
        is_competition: isComp,
      })
      .select('id')
      .single();

    if (error || !link) {
      throw new Error(`Failed to create practice link: ${error?.message}`);
    }

    createdLinkIds.push(link.id);
    return link.id;
  }

  beforeAll(async () => {
    studentAId = await createTestStudent('a');
    studentBId = await createTestStudent('b');
    studentCId = await createTestStudent('c');
    facultyId = await createTestFaculty('main');

    easyLinkId = await createPracticeLink('Easy Problem', 'Easy', false);
    mediumLinkId = await createPracticeLink('Medium Problem', 'Medium', false);
    hardLinkId = await createPracticeLink('Hard Problem', 'Hard', false);
    compLinkId = await createPracticeLink('Faculty Contest', 'Hard', true);
  }, 60000);

  afterAll(async () => {
    if (createdClaimIds.length > 0) {
      await adminClient.from('student_practice_completions').delete().in('id', createdClaimIds);
    }
    if (createdLinkIds.length > 0) {
      await adminClient.from('student_practice_completions').delete().in('practice_link_id', createdLinkIds);
      await adminClient.from('practice_links').delete().in('id', createdLinkIds);
    }
    if (createdUserIds.length > 0) {
      await adminClient.from('xp_events').delete().in('student_id', createdUserIds);
      await adminClient.from('flags').delete().in('student_id', createdUserIds);
      await adminClient.from('audit_logs').delete().in('actor_id', createdUserIds);
      await adminClient.from('students').delete().in('id', createdUserIds);
      await adminClient.from('faculty').delete().in('id', createdUserIds);
      await adminClient.from('profiles').delete().in('id', createdUserIds);
      for (const uid of createdUserIds) {
        await adminClient.auth.admin.deleteUser(uid);
      }
    }
  }, 60000);

  describe('1. Proof URL Validation', () => {
    it('rejects empty, whitespace, and missing URLs', () => {
      expect(validateProofUrl('').valid).toBe(false);
      expect(validateProofUrl('   ').valid).toBe(false);
      expect(validateProofUrl(undefined).valid).toBe(false);
    });

    it('rejects unauthorized domains or javascript: links', () => {
      expect(validateProofUrl('https://evil.com/fake-proof').valid).toBe(false);
      expect(validateProofUrl('javascript:alert(1)').valid).toBe(false);
      expect(validateProofUrl('ftp://leetcode.com/submission/123').valid).toBe(false);
    });

    it('accepts authorized platform URLs', () => {
      expect(validateProofUrl('https://leetcode.com/submissions/detail/12345/').valid).toBe(true);
      expect(validateProofUrl('https://www.hackerrank.com/challenges/solve-me/submissions/code/987').valid).toBe(true);
      expect(validateProofUrl('https://github.com/student/solutions/blob/main/two-sum.py').valid).toBe(true);
      expect(validateProofUrl('https://codeforces.com/contest/123/submission/456').valid).toBe(true);
    });
  });

  describe('2. Claim Creation & Pending State (0 XP Awarded)', () => {
    it('rejects claim submission without valid proof URL', async () => {
      const res = await claimPracticeProblemAction(
        { practiceLinkId: easyLinkId, submissionProof: 'https://invalid-site.com/sub/1' },
        studentAId
      );
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/authorized coding platform|valid/i);
    });

    it('creates pending claim with 0 XP immediately and does not increase student XP', async () => {
      const res = await claimPracticeProblemAction(
        {
          practiceLinkId: easyLinkId,
          submissionProof: 'https://leetcode.com/submissions/detail/10001/',
        },
        studentAId
      );

      expect(res.success).toBe(true);
      expect(res.status).toBe('pending');
      expect(res.xpAwarded).toBe(0);

      // Verify DB record
      const { data: claim } = await adminClient
        .from('student_practice_completions')
        .select('*')
        .eq('student_id', studentAId)
        .eq('practice_link_id', easyLinkId)
        .single();

      expect(claim).not.toBeNull();
      expect(claim.status).toBe('pending');
      expect(claim.xp_awarded).toBe(0);
      createdClaimIds.push(claim.id);

      // Verify NO xp_events were generated
      const { data: events } = await adminClient
        .from('xp_events')
        .select('id')
        .eq('student_id', studentAId);
      expect(events?.length || 0).toBe(0);

      // Verify student total XP is 0
      const totalXp = await getStudentTotalXp(studentAId);
      expect(totalXp).toBe(0);
    });

    it('blocks re-claiming an already pending problem', async () => {
      const res = await claimPracticeProblemAction(
        {
          practiceLinkId: easyLinkId,
          submissionProof: 'https://leetcode.com/submissions/detail/10002/',
        },
        studentAId
      );
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/already claimed|under review/i);
    });
  });

  describe('3. Role Authorization Guard on Approvals', () => {
    it('blocks student from approving claims (403 Forbidden)', async () => {
      const { data: claim } = await adminClient
        .from('student_practice_completions')
        .select('id')
        .eq('student_id', studentAId)
        .eq('practice_link_id', easyLinkId)
        .single();

      const res = await approvePracticeClaimAction(claim!.id, studentAId);
      expect(res.success).toBe(false);
      expect(res.statusCode).toBe(403);
    });

    it('blocks student from rejecting claims (403 Forbidden)', async () => {
      const { data: claim } = await adminClient
        .from('student_practice_completions')
        .select('id')
        .eq('student_id', studentAId)
        .eq('practice_link_id', easyLinkId)
        .single();

      const res = await rejectPracticeClaimAction(claim!.id, 'Cheating proof', studentAId);
      expect(res.success).toBe(false);
      expect(res.statusCode).toBe(403);
    });
  });

  describe('4. Faculty Single Approval & Difficulty XP Rules', () => {
    it('faculty approves Easy problem claim and awards exact 10 XP', async () => {
      const { data: claim } = await adminClient
        .from('student_practice_completions')
        .select('id')
        .eq('student_id', studentAId)
        .eq('practice_link_id', easyLinkId)
        .single();

      const res = await approvePracticeClaimAction(claim!.id, facultyId);
      expect(res.success).toBe(true);
      expect(res.status).toBe('approved');
      expect(res.xpAwarded).toBe(10);

      // Check claim status in DB
      const { data: updatedClaim } = await adminClient
        .from('student_practice_completions')
        .select('*')
        .eq('id', claim!.id)
        .single();
      expect(updatedClaim.status).toBe('approved');
      expect(updatedClaim.xp_awarded).toBe(10);
      expect(updatedClaim.reviewed_by).toBe(facultyId);

      // Verify student total XP incremented by 10
      const totalXp = await getStudentTotalXp(studentAId);
      expect(totalXp).toBe(10);

      // Verify audit log created
      const { data: auditLog } = await adminClient
        .from('audit_logs')
        .select('*')
        .eq('target_id', claim!.id)
        .eq('action', 'approve_practice_claim')
        .single();
      expect(auditLog).not.toBeNull();
      expect(auditLog.actor_id).toBe(facultyId);
    });

    it('idempotency: calling approve on already-approved claim does NOT award extra XP', async () => {
      const { data: claim } = await adminClient
        .from('student_practice_completions')
        .select('id')
        .eq('student_id', studentAId)
        .eq('practice_link_id', easyLinkId)
        .single();

      const res = await approvePracticeClaimAction(claim!.id, facultyId);
      expect(res.success).toBe(true);
      expect(res.xpAwarded).toBe(10);

      // Student XP remains 10
      const totalXp = await getStudentTotalXp(studentAId);
      expect(totalXp).toBe(10);
    });

    it('blocks re-claiming an already approved problem', async () => {
      const res = await claimPracticeProblemAction(
        {
          practiceLinkId: easyLinkId,
          submissionProof: 'https://leetcode.com/submissions/detail/10003/',
        },
        studentAId
      );
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/already completed|approved/i);
    });
  });

  describe('5. Daily Cap Enforcement (40 XP Cap)', () => {
    it('caps practice XP at 40 XP per day', async () => {
      // studentA currently has 10 XP from Easy problem.
      // Claim Medium problem (worth 20 XP).
      const medRes = await claimPracticeProblemAction(
        {
          practiceLinkId: mediumLinkId,
          submissionProof: 'https://leetcode.com/submissions/detail/10004/',
        },
        studentAId
      );
      expect(medRes.success).toBe(true);

      const { data: medClaim } = await adminClient
        .from('student_practice_completions')
        .select('id')
        .eq('student_id', studentAId)
        .eq('practice_link_id', mediumLinkId)
        .single();
      createdClaimIds.push(medClaim!.id);

      const approveMed = await approvePracticeClaimAction(medClaim!.id, facultyId);
      expect(approveMed.success).toBe(true);
      expect(approveMed.xpAwarded).toBe(20);

      // Total XP is now 10 + 20 = 30. Remaining daily cap = 40 - 30 = 10 XP.
      // Now claim Hard problem (normally 40 XP).
      const hardRes = await claimPracticeProblemAction(
        {
          practiceLinkId: hardLinkId,
          submissionProof: 'https://leetcode.com/submissions/detail/10005/',
        },
        studentAId
      );
      expect(hardRes.success).toBe(true);

      const { data: hardClaim } = await adminClient
        .from('student_practice_completions')
        .select('id')
        .eq('student_id', studentAId)
        .eq('practice_link_id', hardLinkId)
        .single();
      createdClaimIds.push(hardClaim!.id);

      // Approving Hard problem should be capped at 10 XP (total 40 XP cap).
      const approveHard = await approvePracticeClaimAction(hardClaim!.id, facultyId);
      expect(approveHard.success).toBe(true);
      expect(approveHard.xpAwarded).toBe(10); // Capped from 40 to 10

      // Student total XP should now be exactly 40
      const totalXp = await getStudentTotalXp(studentAId);
      expect(totalXp).toBe(40);
    });
  });

  describe('6. Rejection with Reason & 0 XP', () => {
    it('requires a non-empty reason for rejection', async () => {
      const claimRes = await claimPracticeProblemAction(
        {
          practiceLinkId: easyLinkId,
          submissionProof: 'https://leetcode.com/submissions/detail/20001/',
        },
        studentBId
      );
      expect(claimRes.success).toBe(true);

      const { data: claim } = await adminClient
        .from('student_practice_completions')
        .select('id')
        .eq('student_id', studentBId)
        .eq('practice_link_id', easyLinkId)
        .single();
      createdClaimIds.push(claim!.id);

      const res = await rejectPracticeClaimAction(claim!.id, '', facultyId);
      expect(res.success).toBe(false);
      expect(res.statusCode).toBe(400);
    });

    it('rejects claim with reason, awards 0 XP, and logs audit record', async () => {
      const { data: claim } = await adminClient
        .from('student_practice_completions')
        .select('id')
        .eq('student_id', studentBId)
        .eq('practice_link_id', easyLinkId)
        .single();

      const reason = 'Submission does not match account name';
      const res = await rejectPracticeClaimAction(claim!.id, reason, facultyId);
      expect(res.success).toBe(true);

      // Verify DB record
      const { data: updatedClaim } = await adminClient
        .from('student_practice_completions')
        .select('*')
        .eq('id', claim!.id)
        .single();

      expect(updatedClaim.status).toBe('rejected');
      expect(updatedClaim.xp_awarded).toBe(0);
      expect(updatedClaim.rejection_reason).toBe(reason);

      // Verify 0 XP for studentB
      const totalXp = await getStudentTotalXp(studentBId);
      expect(totalXp).toBe(0);

      // Verify audit log
      const { data: audit } = await adminClient
        .from('audit_logs')
        .select('*')
        .eq('target_id', claim!.id)
        .eq('action', 'reject_practice_claim')
        .single();
      expect(audit).not.toBeNull();
      expect(audit.reason).toBe(reason);
    });
  });

  describe('7. Anti-Gaming: Duplicate Proof Flagging', () => {
    it('flags duplicate proof submitted by a different student', async () => {
      const sharedProofUrl = 'https://leetcode.com/submissions/detail/999999999/';

      // Student B submits proof URL
      const resB = await claimPracticeProblemAction(
        {
          practiceLinkId: mediumLinkId,
          submissionProof: sharedProofUrl,
        },
        studentBId
      );
      expect(resB.success).toBe(true);

      const { data: claimB } = await adminClient
        .from('student_practice_completions')
        .select('id')
        .eq('student_id', studentBId)
        .eq('practice_link_id', mediumLinkId)
        .single();
      createdClaimIds.push(claimB!.id);

      // Student C submits the exact same proof URL for another problem
      const resC = await claimPracticeProblemAction(
        {
          practiceLinkId: hardLinkId,
          submissionProof: sharedProofUrl,
        },
        studentCId
      );
      expect(resC.success).toBe(true);

      const { data: claimC } = await adminClient
        .from('student_practice_completions')
        .select('id')
        .eq('student_id', studentCId)
        .eq('practice_link_id', hardLinkId)
        .single();
      createdClaimIds.push(claimC!.id);

      // Verify duplicate_proof flag raised for Student C
      const { data: flag } = await adminClient
        .from('flags')
        .select('*')
        .eq('student_id', studentCId)
        .eq('kind', 'duplicate_proof')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      expect(flag).not.toBeNull();
      expect(flag.severity).toBe('high');
      expect(flag.evidence?.proof_url).toBe(sharedProofUrl);
    });
  });

  describe('8. Bulk Approval Flow', () => {
    it('bulk approves multiple claims and writes a single bulk audit record', async () => {
      const claimIds: string[] = [];

      // Student C claims Easy problem
      const res1 = await claimPracticeProblemAction(
        {
          practiceLinkId: easyLinkId,
          submissionProof: 'https://leetcode.com/submissions/detail/30001/',
        },
        studentCId
      );
      expect(res1.success).toBe(true);

      const { data: c1 } = await adminClient
        .from('student_practice_completions')
        .select('id')
        .eq('student_id', studentCId)
        .eq('practice_link_id', easyLinkId)
        .single();
      claimIds.push(c1!.id);
      createdClaimIds.push(c1!.id);

      // Student C claims competition problem (25 XP)
      const res2 = await claimPracticeProblemAction(
        {
          practiceLinkId: compLinkId,
          submissionProof: 'https://www.hackerrank.com/challenges/solve-me/submissions/code/30002',
        },
        studentCId
      );
      expect(res2.success).toBe(true);

      const { data: c2 } = await adminClient
        .from('student_practice_completions')
        .select('id')
        .eq('student_id', studentCId)
        .eq('practice_link_id', compLinkId)
        .single();
      claimIds.push(c2!.id);
      createdClaimIds.push(c2!.id);

      // Bulk approve both
      const bulkRes = await bulkApprovePracticeClaimsAction(claimIds, facultyId);
      expect(bulkRes.success).toBe(true);
      expect(bulkRes.approvedCount).toBe(2);
      expect(bulkRes.failedCount).toBe(0);

      // Check bulk audit log
      const { data: bulkAudit } = await adminClient
        .from('audit_logs')
        .select('*')
        .eq('actor_id', facultyId)
        .eq('action', 'bulk_approve_practice_claims')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      expect(bulkAudit).not.toBeNull();
      expect(bulkAudit.details.approvedCount).toBe(2);
    });
  });
});
