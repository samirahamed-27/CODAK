'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit-logs';

export interface FlagItem {
  id: string;
  kind: 'spike' | 'answer_sharing' | 'win_trading' | 'rate_limit' | 'duplicate_proof' | 'practice_velocity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  studentId: string;
  studentName?: string;
  studentRoll?: string;
  studentCampus?: string;
  secondStudentId?: string | null;
  secondStudentName?: string | null;
  secondStudentRoll?: string | null;
  secondStudentCampus?: string | null;
  windowStart: string;
  windowEnd: string;
  evidence: Record<string, any>;
  status: 'open' | 'reviewed' | 'dismissed' | 'confirmed';
  createdAt: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
}

export interface FlagFilters {
  kind?: string;
  status?: string;
  studentId?: string;
}

async function authenticateFacultyOrAdmin() {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized: Authentication required', statusCode: 401, user: null };
  }

  const { data: profile } = await supabaseServer
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'faculty' && profile.role !== 'admin')) {
    return { error: 'Forbidden: Faculty or Administrator access required', statusCode: 403, user: null };
  }

  return { error: null, statusCode: 200, user, role: profile.role };
}

/**
 * Fetch all anti-gaming flags with optional filtering (Faculty and Admin only).
 */
export async function getFlagsAction(filters?: FlagFilters): Promise<{
  success: boolean;
  statusCode: number;
  flags: FlagItem[];
  error?: string;
}> {
  const auth = await authenticateFacultyOrAdmin();
  if (auth.error || !auth.user) {
    return { success: false, statusCode: auth.statusCode, flags: [], error: auth.error };
  }

  const adminClient = createAdminClient();
  let query = adminClient
    .from('flags')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.kind) {
    query = query.eq('kind', filters.kind);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.studentId) {
    query = query.or(`student_id.eq.${filters.studentId},second_student_id.eq.${filters.studentId}`);
  }

  const { data: flagsData, error } = await query;
  if (error) {
    return { success: false, statusCode: 500, flags: [], error: error.message };
  }

  // Collect distinct student IDs
  const studentIds = new Set<string>();
  for (const f of flagsData || []) {
    if (f.student_id) studentIds.add(f.student_id);
    if (f.second_student_id) studentIds.add(f.second_student_id);
  }

  const { formatCampusDisplayName } = await import('@/lib/campus');
  const studentMap = new Map<string, { rollNo: string; fullName: string; campusName?: string }>();
  if (studentIds.size > 0) {
    const { data: studentRows } = await adminClient
      .from('students')
      .select('id, roll_no, profiles(full_name, campus_other_name, campuses(name, city, is_other))')
      .in('id', Array.from(studentIds));

    for (const s of studentRows || []) {
      const prof = s.profiles as any;
      studentMap.set(s.id, {
        rollNo: s.roll_no || 'N/A',
        fullName: prof?.full_name || 'Student',
        campusName: formatCampusDisplayName(prof?.campuses, prof?.campus_other_name),
      });
    }
  }

  const mapped: FlagItem[] = (flagsData || []).map((f: any) => {
    const s1Info = studentMap.get(f.student_id);
    const s2Info = f.second_student_id ? studentMap.get(f.second_student_id) : undefined;

    return {
      id: f.id,
      kind: f.kind,
      severity: f.severity,
      studentId: f.student_id,
      studentName: s1Info?.fullName || 'Student',
      studentRoll: s1Info?.rollNo || 'N/A',
      studentCampus: s1Info?.campusName,
      secondStudentId: f.second_student_id,
      secondStudentName: s2Info?.fullName || null,
      secondStudentRoll: s2Info?.rollNo || null,
      secondStudentCampus: s2Info?.campusName || null,
      windowStart: f.window_start,
      windowEnd: f.window_end,
      evidence: f.evidence || {},
      status: f.status,
      createdAt: f.created_at,
      reviewedBy: f.reviewed_by,
      reviewedAt: f.reviewed_at,
      reviewNote: f.review_note,
    };
  });

  return { success: true, statusCode: 200, flags: mapped };
}

/**
 * Review, dismiss, or confirm an anti-gaming flag.
 * Logs review action in audit_logs.
 */
export async function reviewFlagAction(input: {
  flagId: string;
  status: 'reviewed' | 'dismissed' | 'confirmed';
  reviewNote?: string;
}): Promise<{
  success: boolean;
  statusCode: number;
  error?: string;
}> {
  const auth = await authenticateFacultyOrAdmin();
  if (auth.error || !auth.user) {
    return { success: false, statusCode: auth.statusCode, error: auth.error };
  }

  const adminClient = createAdminClient();
  const nowIso = new Date().toISOString();

  const { error } = await adminClient
    .from('flags')
    .update({
      status: input.status,
      reviewed_by: auth.user.id,
      reviewed_at: nowIso,
      review_note: input.reviewNote?.trim() || null,
    })
    .eq('id', input.flagId);

  if (error) {
    return { success: false, statusCode: 500, error: error.message };
  }

  await writeAuditLog({
    actorId: auth.user.id,
    action: `review_flag_${input.status}`,
    targetType: 'flag',
    targetId: input.flagId,
    reason: input.reviewNote?.trim() || `Flag marked as ${input.status}`,
    details: {
      flag_id: input.flagId,
      new_status: input.status,
      review_note: input.reviewNote?.trim() || null,
    },
  });

  return { success: true, statusCode: 200 };
}

/**
 * Voids one or more XP events with a required non-empty reason.
 * Soft-voids through void_xp stored procedure, writes audit_logs, and recalculates totals.
 * Available to faculty and admin.
 */
export async function voidFlaggedXpAction(input: {
  eventIds?: string[];
  flagId?: string;
  reason: string;
}): Promise<{
  success: boolean;
  statusCode: number;
  voidedCount: number;
  error?: string;
}> {
  const auth = await authenticateFacultyOrAdmin();
  if (auth.error || !auth.user) {
    return { success: false, statusCode: auth.statusCode, voidedCount: 0, error: auth.error };
  }

  const trimmedReason = input.reason?.trim();
  if (!trimmedReason || trimmedReason.length < 5) {
    return {
      success: false,
      statusCode: 400,
      voidedCount: 0,
      error: 'Validation error: A detailed written reason (minimum 5 characters) is required to void XP.',
    };
  }

  const adminClient = createAdminClient();
  let targetEventIds: string[] = input.eventIds ? [...input.eventIds] : [];

  // If flagId is provided, resolve target event IDs from flag if not provided
  if (input.flagId) {
    const { data: flag } = await adminClient
      .from('flags')
      .select('*')
      .eq('id', input.flagId)
      .single();

    if (flag) {
      if (targetEventIds.length === 0) {
        if (Array.isArray(flag.evidence?.event_ids) && flag.evidence.event_ids.length > 0) {
          targetEventIds = flag.evidence.event_ids;
        } else {
          // Query valid XP events in the flag window for the primary student
          const { data: windowEvents } = await adminClient
            .from('xp_events')
            .select('id')
            .eq('student_id', flag.student_id)
            .eq('status', 'valid')
            .gte('created_at', flag.window_start)
            .lte('created_at', flag.window_end);

          if (windowEvents) {
            targetEventIds = windowEvents.map((e) => e.id);
          }
        }
      }
    }
  }

  if (targetEventIds.length === 0) {
    return {
      success: false,
      statusCode: 400,
      voidedCount: 0,
      error: 'Validation error: No XP events found or provided to void.',
    };
  }

  let voidedCount = 0;
  for (const eventId of targetEventIds) {
    const { data, error } = await adminClient.rpc('void_xp', {
      p_event_id: eventId,
      p_reason: trimmedReason,
      p_actor: auth.user.id,
    });

    if (error) {
      console.error(`Error voiding event ${eventId}:`, error);
      continue;
    }

    const res = data as any;
    if (res?.status === 'voided' || res?.status === 'already_voided') {
      voidedCount++;
    }
  }

  // If a flagId was provided, update the flag's review status to 'confirmed'
  if (input.flagId && voidedCount > 0) {
    const nowIso = new Date().toISOString();
    await adminClient
      .from('flags')
      .update({
        status: 'confirmed',
        reviewed_by: auth.user.id,
        reviewed_at: nowIso,
        review_note: `Confirmed and voided ${voidedCount} XP event(s). Reason: ${trimmedReason}`,
      })
      .eq('id', input.flagId);

    await writeAuditLog({
      actorId: auth.user.id,
      action: 'flag_xp_voided',
      targetType: 'flag',
      targetId: input.flagId,
      reason: trimmedReason,
      details: {
        flag_id: input.flagId,
        voided_count: voidedCount,
        event_ids: targetEventIds,
      },
    });
  }

  return { success: true, statusCode: 200, voidedCount };
}
