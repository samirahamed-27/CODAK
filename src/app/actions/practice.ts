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

export async function getPracticeLinksAction(filter?: PracticeFilter): Promise<{
  success: boolean;
  links: PracticeLink[];
  topics: string[];
  completedLinkIds: string[];
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
      error: 'Unauthorized',
    };
  }

  if (filter?.search) {
    const rl = await checkRateLimit(user.id, 'search');
    if (!rl.allowed) {
      return { success: false, links: [], topics: [], completedLinkIds: [], error: rl.error };
    }
  }

  let allLinks: PracticeLink[] = [];
  let completedLinkIds: string[] = [];
  let userRole = 'student';

  try {
    const adminClient = createAdminClient();

    // 1. Fetch practice links (including faculty competitions)
    const { data, error } = await adminClient
      .from('practice_links')
      .select('id, platform, problem_id, title, topic, difficulty, link, is_competition, created_by, instructions, deadline, created_at')
      .order('is_competition', { ascending: false })
      .order('topic', { ascending: true })
      .order('difficulty', { ascending: true });

    if (!error && data && data.length > 0) {
      allLinks = data as PracticeLink[];
    }

    // 2. Fetch completions for the current user
    const { data: completions } = await adminClient
      .from('student_practice_completions')
      .select('practice_link_id')
      .eq('student_id', user.id);

    if (completions) {
      completedLinkIds = completions.map((c: any) => c.practice_link_id);
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
    userRole,
  };
}

/**
 * Claim solve for a practice problem or faculty competition to earn game XP.
 */
export async function claimPracticeProblemAction(payload: {
  practiceLinkId: string;
  submissionProof?: string;
}): Promise<{
  success: boolean;
  xpAwarded?: number;
  newTotal?: number;
  isCompetition?: boolean;
  error?: string;
}> {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized. Please log in.' };
  }

  const rl = await checkRateLimit(user.id, 'practice_claim');
  if (!rl.allowed) {
    return { success: false, error: rl.error };
  }

  // Anti-gaming guard: Require verifiable solution link or profile handle to prevent idle-click XP farming
  const trimmedProof = payload.submissionProof?.trim();
  if (!trimmedProof || trimmedProof.length < 3) {
    return {
      success: false,
      error: 'Please provide a verifiable solution URL or profile handle (LeetCode, HackerRank, Codeforces, or GitHub) to confirm your practice solve.',
    };
  }

  try {
    const adminClient = createAdminClient();
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
      // Check if ID matches a seed problem
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
      return { success: false, error: 'Problem not found in practice directory.' };
    }

    // 2. Check if already solved and recorded in student_practice_completions
    const { data: existing } = await adminClient
      .from('student_practice_completions')
      .select('id')
      .eq('student_id', user.id)
      .eq('practice_link_id', effectiveLinkId)
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'You have already claimed XP for this problem.' };
    }

    // 3. Determine action type (HACKERRANK_COMPETITION vs PRACTICE_SOLVE)
    const isComp = Boolean(linkRecord.is_competition);
    const actionType = isComp ? 'HACKERRANK_COMPETITION' : 'PRACTICE_SOLVE';
    const referenceId = `${actionType.toLowerCase()}:${user.id}:${effectiveLinkId}`;

    // 4. Award XP via atomic database procedure award_xp
    const { data: awardRes, error: xpErr } = await adminClient.rpc('award_xp', {
      p_student_id: user.id,
      p_action_type: actionType,
      p_reference_id: referenceId,
      p_extra_units: 0,
      p_actor: null,
    });

    if (xpErr) {
      return { success: false, error: `Failed to award XP: ${xpErr.message}` };
    }

    const res = awardRes as any;

    if (res?.status === 'limit_reached') {
      const msg =
        actionType === 'HACKERRANK_COMPETITION'
          ? 'Daily limit for custom competitions reached (2/day). Come back tomorrow!'
          : 'Daily limit for practice problems reached (5/day). Come back tomorrow!';
      return { success: false, error: msg };
    }

    if (res?.status === 'duplicate') {
      return { success: false, error: 'XP has already been recorded for this problem.' };
    }

    if (res?.status !== 'awarded' && res?.status !== 'success') {
      return { success: false, error: res?.reason || 'Unable to award XP at this time.' };
    }

    const xpAwarded = res.xp_awarded ?? (isComp ? 25 : 10);

    // 5. Record the completion in student_practice_completions
    await adminClient.from('student_practice_completions').insert({
      student_id: user.id,
      practice_link_id: effectiveLinkId,
      submission_proof: payload.submissionProof?.trim() || null,
      xp_awarded: xpAwarded,
    });

    return {
      success: true,
      xpAwarded,
      newTotal: res.new_total,
      isCompetition: isComp,
    };
  } catch (err: any) {
    console.error('Error claiming practice problem XP:', err);
    return { success: false, error: err.message || 'Server error while claiming XP.' };
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
    return { success: false, error: 'Access restricted: Only faculty and admins can create competitions.' };
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
      error: 'Invalid competition link. Must be an official HackerRank URL (e.g., https://www.hackerrank.com/contests/... or https://www.hackerrank.com/challenges/...).',
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
