'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit-logs';

export interface FlagItem {
  id: string;
  kind: 'spike' | 'answer_sharing' | 'win_trading' | 'rate_limit';
  severity: 'low' | 'medium' | 'high' | 'critical';
  studentId: string;
  studentName?: string;
  studentRoll?: string;
  secondStudentId?: string | null;
  secondStudentName?: string | null;
  secondStudentRoll?: string | null;
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
    .select(`
      *,
      student:students!flags_student_id_fkey(id, roll_no, profiles(full_name)),
      second_student:students!flags_second_student_id_fkey(id, roll_no, profiles(full_name))
    `)
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

  const { data, error } = await query;
  if (error) {
    return { success: false, statusCode: 500, flags: [], error: error.message };
  }

  const mapped: FlagItem[] = (data || []).map((f: any) => ({
    id: f.id,
    kind: f.kind,
    severity: f.severity,
    studentId: f.student_id,
    studentName: f.student?.profiles?.full_name || 'Student',
    studentRoll: f.student?.roll_no || 'N/A',
    secondStudentId: f.second_student_id,
    secondStudentName: f.second_student?.profiles?.full_name || null,
    secondStudentRoll: f.second_student?.roll_no || null,
    windowStart: f.window_start,
    windowEnd: f.window_end,
    evidence: f.evidence || {},
    status: f.status,
    createdAt: f.created_at,
    reviewedBy: f.reviewed_by,
    reviewedAt: f.reviewed_at,
    reviewNote: f.review_note,
  }));

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
  eventIds: string[];
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

  if (!input.reason || !input.reason.trim()) {
    return {
      success: false,
      statusCode: 400,
      voidedCount: 0,
      error: 'Validation error: A written reason is strictly required to void XP.',
    };
  }

  if (!input.eventIds || input.eventIds.length === 0) {
    return {
      success: false,
      statusCode: 400,
      voidedCount: 0,
      error: 'Validation error: No event IDs provided to void.',
    };
  }

  const adminClient = createAdminClient();
  let voidedCount = 0;

  for (const eventId of input.eventIds) {
    const { data, error } = await adminClient.rpc('void_xp', {
      p_event_id: eventId,
      p_reason: input.reason.trim(),
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

  return { success: true, statusCode: 200, voidedCount };
}
