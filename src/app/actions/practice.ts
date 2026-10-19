'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  PracticeLink,
  PracticeFilter,
  SEED_PRACTICE_LINKS,
  filterPracticeLinks,
  validateHackerRankCompetitionUrl,
} from '@/lib/practice';
import { checkRateLimit } from '@/lib/rate-limits';
import { ensureStudentRecord } from '@/lib/auth/ensure-student';
import { validateProofUrl } from '@/lib/practice-validation';

export interface PracticeCompletionStatus {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  xpAwarded: number;
  rejectionReason?: string | null;
}

export async function getPracticeLinksAction(filter?: PracticeFilter): Promise<{
  success: boolean;
  links: PracticeLink[];
  topics: string[];
  completedLinkIds: string[];
  completions: Record<string, PracticeCompletionStatus>;
  userRole?: string;
  error?: string;
}> {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    return {
      success: false,
      links: [],
      topics: [],
      completedLinkIds: [],
      completions: {},
      error: 'Unauthorized',
    };
  }

  if (filter?.search) {
    const rl = await checkRateLimit(user.id, 'search');
    if (!rl.allowed) {
      return {
        success: false,
        links: [],
        topics: [],
        completedLinkIds: [],
        completions: {},
        error: rl.error,
      };
    }
  }

  let allLinks: PracticeLink[] = [];
  const completedLinkIds: string[] = [];
  const completionsMap: Record<string, PracticeCompletionStatus> = {};
  let userRole = 'student';

  try {
    const adminClient = createAdminClient();

    // 1. Fetch practice links (including faculty competitions)
    const { data, error } = await adminClient
      .from('practice_links')
      .select(
        'id, platform, problem_id, title, topic, difficulty, link, is_competition, created_by, instructions, deadline, created_at'
      )
      .order('is_competition', { ascending: false })
      .order('topic', { ascending: true })
      .order('difficulty', { ascending: true });

    if (!error && data && data.length > 0) {
      allLinks = data as PracticeLink[];
    }

    // 2. Fetch completions for the current user
    const { data: completions } = await adminClient
      .from('student_practice_completions')
      .select('id, practice_link_id, status, xp_awarded, rejection_reason')
      .eq('student_id', user.id);

    if (completions) {
      for (const c of completions) {
        completedLinkIds.push(c.practice_link_id);
        completionsMap[c.practice_link_id] = {
          id: c.id,
          status: (c.status as any) || 'pending',
          xpAwarded: c.xp_awarded || 0,
          rejectionReason: c.rejection_reason || null,
        };
      }
    }

    // 3. Fetch user role
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role) {
      userRole = profile.role;
    }
  } catch (err) {
    console.warn('Practice links fetch warning, using curated seeds:', err);
  }

  // Fallback to verified seed links if database table not yet populated
  if (allLinks.length === 0) {
    allLinks = SEED_PRACTICE_LINKS;
  }

  const distinctTopics = Array.from(new Set(allLinks.map((l) => l.topic)));
  const filtered = filterPracticeLinks(allLinks, filter);

  return {
    success: true,
    links: filtered,
    topics: distinctTopics,
    completedLinkIds,
    completions: completionsMap,
    userRole,
  };
}

/**
 * Claim solve for a practice problem or faculty competition.
 * Creates a PENDING record in student_practice_completions. Awards NO XP yet.
 * Requires verifiable proof URL on supported domains.
 */
export async function claimPracticeProblemAction(
  payload: {
    practiceLinkId: string;
    submissionProof?: string;
  },
  userIdOverride?: string
): Promise<{
  success: boolean;
  status?: string;
  claimId?: string;
  xpAwarded?: number;
  message?: string;
  error?: string;
  statusCode?: number;
}> {
  let user: { id: string } | null = null;

  if (userIdOverride) {
    user = { id: userIdOverride };
  } else {
    const supabaseServer = await createServerClient();
    const {
      data: { user: authUser },
    } = await supabaseServer.auth.getUser();
    user = authUser;
  }

  if (!user) {
    return { success: false, error: 'Unauthorized. Please log in.', statusCode: 401 };
  }

  const adminClient = createAdminClient();

  // Step 3 Guard: Only student role can submit practice problem claims (faculty/admin get 403)
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'student') {
    return {
      success: false,
      error: 'Forbidden: Only enrolled students can submit practice problem claims.',
      statusCode: 403,
    };
  }

  const rl = await checkRateLimit(user.id, 'practice_claim');
  if (!rl.allowed) {
    return { success: false, error: rl.error, statusCode: 429 };
  }

  // Validate proof URL is required and hosted on authorized platforms
  const proofValidation = validateProofUrl(payload.submissionProof || '');
  if (!proofValidation.valid) {
    return {
      success: false,
      error: proofValidation.error || 'A valid submission proof URL is required.',
      statusCode: 400,
    };
  }
  const normalizedProof = (payload.submissionProof || '').trim();

  try {
    await ensureStudentRecord(adminClient, user);

    // 1. Look up problem in practice_links
    let linkRecord: any = null;
    let effectiveLinkId = payload.practiceLinkId;

    const { data: found } = await adminClient
      .from('practice_links')
      .select('*')
      .eq('id', payload.practiceLinkId)
      .maybeSingle();

    if (found) {
      linkRecord = found;
    } else {
      const seed = SEED_PRACTICE_LINKS.find(
        (s) => s.id === payload.practiceLinkId || s.problem_id === payload.practiceLinkId
      );
      if (seed) {
        const { data: upserted } = await adminClient
          .from('practice_links')
          .upsert(
            {
              platform: seed.platform,
              problem_id: seed.problem_id,
              title: seed.title,
              topic: seed.topic,
              difficulty: seed.difficulty,
              link: seed.link,
            },
            { onConflict: 'problem_id' }
          )
          .select('*')
          .single();
        linkRecord = upserted;
        effectiveLinkId = upserted.id;
      }
    }

    if (!linkRecord) {
      return { success: false, error: 'Problem not found in practice directory.', statusCode: 404 };
    }

    // 2. Reject re-claiming an approved or pending item
    const { data: existing } = await adminClient
      .from('student_practice_completions')
      .select('id, status')
      .eq('student_id', user.id)
      .eq('practice_link_id', effectiveLinkId)
      .maybeSingle();

    if (existing && (existing.status === 'pending' || existing.status === 'approved')) {
      return {
        success: false,
        error:
          existing.status === 'approved'
            ? 'You have already completed and received approved XP for this problem.'
            : 'You already have a pending claim under review for this problem.',
        statusCode: 400,
      };
    }

    // 3. Anti-gaming Velocity Check: Flag more than 5 claims in the last hour (flag only, never auto-void)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentClaimsCount } = await adminClient
      .from('student_practice_completions')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', user.id)
      .gte('created_at', oneHourAgo);

    if ((recentClaimsCount || 0) >= 5) {
      await adminClient.from('flags').insert({
        kind: 'practice_velocity',
        severity: 'medium',
        student_id: user.id,
        window_start: oneHourAgo,
        window_end: new Date().toISOString(),
        evidence: {
          claims_in_last_hour: (recentClaimsCount || 0) + 1,
          threshold: 5,
          problem_id: effectiveLinkId,
        },
        status: 'open',
      });
    }

    // 4. Anti-gaming Duplicate Proof Check: Flag if another student used the same proof URL
    const { data: duplicateClaims } = await adminClient
      .from('student_practice_completions')
      .select('id, student_id')
      .eq('submission_proof', normalizedProof)
      .neq('student_id', user.id)
      .limit(1);

    if (duplicateClaims && duplicateClaims.length > 0) {
      const secondStudentId = duplicateClaims[0].student_id;
      await adminClient.from('flags').insert({
        kind: 'duplicate_proof',
        severity: 'high',
        student_id: user.id,
        second_student_id: secondStudentId,
        window_start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        window_end: new Date().toISOString(),
        evidence: {
          proof_url: normalizedProof,
          matched_claim_id: duplicateClaims[0].id,
          second_student_id: secondStudentId,
        },
        status: 'open',
      });
    }

    // 5. Create PENDING record in student_practice_completions (NO XP YET)
    const { data: claimRow, error: insertError } = await adminClient
      .from('student_practice_completions')
      .upsert(
        {
          student_id: user.id,
          practice_link_id: effectiveLinkId,
          submission_proof: normalizedProof,
          xp_awarded: 0,
          status: 'pending',
          rejection_reason: null,
          reviewed_by: null,
          reviewed_at: null,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'student_id,practice_link_id' }
      )
      .select('id, status, created_at')
      .single();

    if (insertError) {
      return { success: false, error: `Failed to record claim: ${insertError.message}` };
    }

    return {
      success: true,
      status: 'pending',
      claimId: claimRow.id,
      xpAwarded: 0,
      message: 'Practice solve submitted successfully! Your claim is pending faculty review.',
    };
  } catch (err: any) {
    console.error('Error recording practice claim:', err);
    return { success: false, error: err.message || 'Server error while submitting claim.' };
  }
}

/**
 * Faculty/Admin action: Fetch all pending practice problem claims for review.
 */
export async function getPendingPracticeClaimsAction(): Promise<{
  success: boolean;
  claims: Array<{
    id: string;
    studentId: string;
    studentName: string;
    studentEmail: string;
    studentRoll: string;
    practiceLinkId: string;
    problemTitle: string;
    platform: string;
    topic: string;
    difficulty: string;
    isCompetition: boolean;
    submissionProof: string;
    createdAt: string;
  }>;
  error?: string;
  statusCode?: number;
}> {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    return { success: false, claims: [], error: 'Unauthorized', statusCode: 401 };
  }

  const adminClient = createAdminClient();

  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || (profile.role !== 'faculty' && profile.role !== 'admin')) {
    return {
      success: false,
      claims: [],
      error: 'Forbidden: Faculty or Administrator access required.',
      statusCode: 403,
    };
  }

  try {
    const { data: claims, error } = await adminClient
      .from('student_practice_completions')
      .select(
        `
        id,
        student_id,
        practice_link_id,
        submission_proof,
        created_at,
        practice_links (
          title,
          platform,
          topic,
          difficulty,
          is_competition
        ),
        students (
          roll_no,
          profiles (
            full_name,
            email
          )
        )
      `
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, claims: [], error: error.message };
    }

    const formatted = (claims || []).map((c: any) => ({
      id: c.id,
      studentId: c.student_id,
      studentName: c.students?.profiles?.full_name || 'Student',
      studentEmail: c.students?.profiles?.email || '',
      studentRoll: c.students?.roll_no || '',
      practiceLinkId: c.practice_link_id,
      problemTitle: c.practice_links?.title || 'Practice Problem',
      platform: c.practice_links?.platform || 'Coding Platform',
      topic: c.practice_links?.topic || 'General',
      difficulty: c.practice_links?.difficulty || 'Medium',
      isCompetition: Boolean(c.practice_links?.is_competition),
      submissionProof: c.submission_proof || '',
      createdAt: c.created_at,
    }));

    return { success: true, claims: formatted };
  } catch (err: any) {
    return { success: false, claims: [], error: err.message || 'Server error.' };
  }
}

/**
 * Faculty/Admin action: Approve a single practice problem claim.
 * Awards XP via atomic award_xp procedure with difficulty rules and daily cap.
 * Writes an audit_logs row.
 */
export async function approvePracticeClaimAction(
  claimId: string,
  reviewerIdOverride?: string
): Promise<{
  success: boolean;
  xpAwarded?: number;
  status?: string;
  error?: string;
  statusCode?: number;
}> {
  let reviewerId = reviewerIdOverride;

  if (!reviewerId) {
    const supabaseServer = await createServerClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized', statusCode: 401 };
    }
    reviewerId = user.id;
  }

  const adminClient = createAdminClient();

  // Role verification
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', reviewerId)
    .maybeSingle();

  if (!profile || (profile.role !== 'faculty' && profile.role !== 'admin')) {
    return {
      success: false,
      error: 'Forbidden: Faculty or Administrator access required to approve practice claims.',
      statusCode: 403,
    };
  }

  try {
    // 1. Fetch claim
    const { data: claim, error: claimErr } = await adminClient
      .from('student_practice_completions')
      .select('*, practice_links(*)')
      .eq('id', claimId)
      .maybeSingle();

    if (claimErr || !claim) {
      return { success: false, error: 'Practice claim record not found.', statusCode: 404 };
    }

    // Idempotency: If already approved, return success without duplicate award
    if (claim.status === 'approved') {
      return {
        success: true,
        xpAwarded: claim.xp_awarded,
        status: 'approved',
      };
    }

    const isComp = Boolean(claim.practice_links?.is_competition);
    const difficulty = (claim.practice_links?.difficulty || 'Medium').toLowerCase();

    // 2. Fetch difficulty XP rules
    let actionType = 'PRACTICE_MEDIUM';
    let defaultBaseXp = 20;

    if (isComp) {
      actionType = 'HACKERRANK_COMPETITION';
      defaultBaseXp = 25;
    } else if (difficulty === 'easy') {
      actionType = 'PRACTICE_EASY';
      defaultBaseXp = 10;
    } else if (difficulty === 'hard') {
      actionType = 'PRACTICE_HARD';
      defaultBaseXp = 40;
    }

    const { data: ruleRow } = await adminClient
      .from('xp_rules')
      .select('base_xp')
      .eq('action_type', actionType)
      .maybeSingle();

    const baseXp = ruleRow?.base_xp ?? defaultBaseXp;

    // 3. Daily Practice Cap Enforcement (default 40 XP per day, admin editable)
    let actualXpToAward = baseXp;

    if (!isComp) {
      const { data: capSetting } = await adminClient
        .from('app_settings')
        .select('value')
        .eq('key', 'daily_practice_xp_cap')
        .maybeSingle();

      const dailyCap =
        typeof capSetting?.value === 'number'
          ? capSetting.value
          : parseInt(String(capSetting?.value || '40'), 10) || 40;

      // Query today's practice XP in Asia/Kolkata
      const { data: todayEvents } = await adminClient
        .from('xp_events')
        .select('xp_amount, created_at')
        .eq('student_id', claim.student_id)
        .in('action_type', ['PRACTICE_EASY', 'PRACTICE_MEDIUM', 'PRACTICE_HARD', 'PRACTICE_SOLVE'])
        .eq('status', 'valid');

      const todayStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
      }).format(new Date());

      const todayPracticeXp = (todayEvents || [])
        .filter((ev: any) => {
          const evDate = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
          }).format(new Date(ev.created_at));
          return evDate === todayStr;
        })
        .reduce((sum: number, ev: any) => sum + (ev.xp_amount || 0), 0);

      const remainingCap = Math.max(0, dailyCap - todayPracticeXp);
      actualXpToAward = Math.min(baseXp, remainingCap);
    }

    const referenceId = isComp
      ? `hackerrank_competition:${claim.student_id}:${claim.practice_link_id}`
      : `practice_solve:${claim.student_id}:${claim.practice_link_id}`;

    // 4. Award XP via atomic database procedure award_xp if actualXpToAward > 0
    if (actualXpToAward > 0) {
      const { data: awardRes, error: awardErr } = await adminClient.rpc('award_xp', {
        p_student_id: claim.student_id,
        p_action_type: actionType,
        p_reference_id: referenceId,
        p_extra_units: 0,
        p_actor: reviewerId,
      });

      if (awardErr) {
        return { success: false, error: `Failed to award XP: ${awardErr.message}` };
      }

      if (awardRes && typeof awardRes.xp_awarded === 'number') {
        actualXpToAward = awardRes.xp_awarded;
      }
    }

    // 5. Update claim status to approved
    await adminClient
      .from('student_practice_completions')
      .update({
        status: 'approved',
        xp_awarded: actualXpToAward,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', claimId);

    // 6. Write audit_logs record
    await adminClient.from('audit_logs').insert({
      actor_id: reviewerId,
      action: 'approve_practice_claim',
      target_type: 'practice_claim',
      target_id: claimId,
      reason: 'Faculty approval of practice solution proof',
      details: {
        student_id: claim.student_id,
        practice_link_id: claim.practice_link_id,
        action_type: actionType,
        xp_awarded: actualXpToAward,
        reference_id: referenceId,
      },
    });

    return {
      success: true,
      status: 'approved',
      xpAwarded: actualXpToAward,
    };
  } catch (err: any) {
    console.error('Error approving practice claim:', err);
    return { success: false, error: err.message || 'Server error while approving claim.' };
  }
}

/**
 * Faculty/Admin action: Bulk approve multiple practice problem claims idempotently.
 */
export async function bulkApprovePracticeClaimsAction(
  claimIds: string[],
  reviewerIdOverride?: string
): Promise<{
  success: boolean;
  approvedCount: number;
  failedCount: number;
  error?: string;
  statusCode?: number;
}> {
  let reviewerId = reviewerIdOverride;

  if (!reviewerId) {
    const supabaseServer = await createServerClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) {
      return { success: false, approvedCount: 0, failedCount: 0, error: 'Unauthorized', statusCode: 401 };
    }
    reviewerId = user.id;
  }

  const adminClient = createAdminClient();

  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', reviewerId)
    .maybeSingle();

  if (!profile || (profile.role !== 'faculty' && profile.role !== 'admin')) {
    return {
      success: false,
      approvedCount: 0,
      failedCount: 0,
      error: 'Forbidden: Faculty or Administrator access required.',
      statusCode: 403,
    };
  }

  let approvedCount = 0;
  let failedCount = 0;

  for (const claimId of claimIds) {
    const res = await approvePracticeClaimAction(claimId, reviewerId);
    if (res.success) {
      approvedCount++;
    } else {
      failedCount++;
    }
  }

  // Write single bulk audit log
  await adminClient.from('audit_logs').insert({
    actor_id: reviewerId,
    action: 'bulk_approve_practice_claims',
    target_type: 'practice_claims',
    target_id: 'bulk_claims',
    reason: `Bulk approval of ${approvedCount} practice claims`,
    details: {
      totalRequested: claimIds.length,
      approvedCount,
      failedCount,
      claimIds,
    },
  });

  return {
    success: true,
    approvedCount,
    failedCount,
  };
}

/**
 * Faculty/Admin action: Reject a practice problem claim with a mandatory reason.
 * Pays 0 XP and writes an audit_logs row.
 */
export async function rejectPracticeClaimAction(
  claimId: string,
  reason: string,
  reviewerIdOverride?: string
): Promise<{
  success: boolean;
  error?: string;
  statusCode?: number;
}> {
  if (!reason || !reason.trim() || reason.trim().length < 3) {
    return {
      success: false,
      error: 'A valid rejection reason (at least 3 characters) is required.',
      statusCode: 400,
    };
  }

  let reviewerId = reviewerIdOverride;

  if (!reviewerId) {
    const supabaseServer = await createServerClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized', statusCode: 401 };
    }
    reviewerId = user.id;
  }

  const adminClient = createAdminClient();

  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', reviewerId)
    .maybeSingle();

  if (!profile || (profile.role !== 'faculty' && profile.role !== 'admin')) {
    return {
      success: false,
      error: 'Forbidden: Faculty or Administrator access required.',
      statusCode: 403,
    };
  }

  try {
    const { data: claim, error: claimErr } = await adminClient
      .from('student_practice_completions')
      .select('id, student_id, practice_link_id, status')
      .eq('id', claimId)
      .maybeSingle();

    if (claimErr || !claim) {
      return { success: false, error: 'Practice claim not found.', statusCode: 404 };
    }

    const rejectionReason = reason.trim();

    await adminClient
      .from('student_practice_completions')
      .update({
        status: 'rejected',
        rejection_reason: rejectionReason,
        xp_awarded: 0,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', claimId);

    // Write audit_logs row
    await adminClient.from('audit_logs').insert({
      actor_id: reviewerId,
      action: 'reject_practice_claim',
      target_type: 'practice_claim',
      target_id: claimId,
      reason: rejectionReason,
      details: {
        student_id: claim.student_id,
        practice_link_id: claim.practice_link_id,
        rejection_reason: rejectionReason,
      },
    });

    return { success: true };
  } catch (err: any) {
    console.error('Error rejecting practice claim:', err);
    return { success: false, error: err.message || 'Server error while rejecting claim.' };
  }
}

/**
 * Faculty action: Create a custom HackerRank competition/challenge.
 */
export async function createFacultyCompetitionAction(payload: {
  title: string;
  competitionUrl: string;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  instructions?: string;
  deadline?: string;
}): Promise<{
  success: boolean;
  competition?: PracticeLink;
  error?: string;
}> {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized. Please log in.' };
  }

  const adminClient = createAdminClient();

  // 1. Role verification
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || (profile.role !== 'faculty' && profile.role !== 'admin')) {
    return {
      success: false,
      error: 'Access restricted: Only faculty and admins can create competitions.',
    };
  }

  // 2. Rate limit
  const rl = await checkRateLimit(user.id, 'competition_create');
  if (!rl.allowed) {
    return { success: false, error: rl.error };
  }

  // 3. Validation
  const title = payload.title?.trim();
  if (!title || title.length < 3) {
    return { success: false, error: 'Title must be at least 3 characters long.' };
  }
  if (title.length > 100) {
    return { success: false, error: 'Title must not exceed 100 characters.' };
  }

  if (!validateHackerRankCompetitionUrl(payload.competitionUrl)) {
    return {
      success: false,
      error:
        'Invalid competition link. Must be an official HackerRank URL (e.g., https://www.hackerrank.com/contests/... or https://www.hackerrank.com/challenges/...).',
    };
  }

  if (!['Easy', 'Medium', 'Hard'].includes(payload.difficulty)) {
    return { success: false, error: 'Difficulty must be Easy, Medium, or Hard.' };
  }

  try {
    const cleanSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 30);
    const randomHex = Math.random().toString(36).substring(2, 8);
    const problemId = `hackerrank:comp:${cleanSlug}-${randomHex}`;

    const { data: inserted, error: insertError } = await adminClient
      .from('practice_links')
      .insert({
        platform: 'HackerRank',
        problem_id: problemId,
        title,
        topic: payload.topic?.trim() || 'General Coding',
        difficulty: payload.difficulty,
        link: payload.competitionUrl.trim(),
        is_competition: true,
        created_by: user.id,
        instructions: payload.instructions?.trim() || null,
        deadline: payload.deadline ? new Date(payload.deadline).toISOString() : null,
      })
      .select('*')
      .single();

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    return {
      success: true,
      competition: inserted as PracticeLink,
    };
  } catch (err: any) {
    console.error('Error creating faculty competition:', err);
    return { success: false, error: err.message || 'Failed to create competition.' };
  }
}

/**
 * Faculty action: Retrieve all faculty-created competitions with student completion counts.
 */
export async function getFacultyCompetitionsAction(): Promise<{
  success: boolean;
  competitions: (PracticeLink & { completionCount: number })[];
  error?: string;
}> {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    return { success: false, competitions: [], error: 'Unauthorized.' };
  }

  try {
    const adminClient = createAdminClient();

    // Verify role
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || (profile.role !== 'faculty' && profile.role !== 'admin')) {
      return { success: false, competitions: [], error: 'Access restricted to faculty and admins.' };
    }

    const { data: rows, error } = await adminClient
      .from('practice_links')
      .select(`
        id,
        platform,
        problem_id,
        title,
        topic,
        difficulty,
        link,
        is_competition,
        created_by,
        instructions,
        deadline,
        created_at,
        student_practice_completions(count)
      `)
      .eq('is_competition', true)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, competitions: [], error: error.message };
    }

    const competitions = (rows || []).map((row: any) => ({
      id: row.id,
      platform: row.platform,
      problem_id: row.problem_id,
      title: row.title,
      topic: row.topic,
      difficulty: row.difficulty,
      link: row.link,
      is_competition: row.is_competition,
      created_by: row.created_by,
      instructions: row.instructions,
      deadline: row.deadline,
      created_at: row.created_at,
      completionCount: row.student_practice_completions?.[0]?.count ?? 0,
    }));

    return {
      success: true,
      competitions,
    };
  } catch (err: any) {
    console.error('Error fetching faculty competitions:', err);
    return { success: false, competitions: [], error: err.message || 'Server error.' };
  }
}
