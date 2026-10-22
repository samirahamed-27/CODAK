'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isDemoAccount } from '@/lib/auth/demo';

export interface DeductXpPayload {
  studentId: string;
  amount: number;
  reason: string;
  actionType?: 'XP_DEDUCTION';
  referenceId?: string;
}

export interface DeductXpResult {
  success: boolean;
  newTotal?: number;
  deductedAmount?: number;
  previousXp?: number;
  error?: string;
  event_id?: string;
}

/**
 * Deducts XP from a student account with mandatory authorization,
 * reason logging, ledger immutability, and audit trail.
 * Permitted for: Faculty & Admin roles only.
 */
export async function deductXpAction(
  payload: DeductXpPayload
): Promise<DeductXpResult> {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized: Please log in to perform administrative actions.' };
  }

  const adminClient = createAdminClient();

  // 1. Role verification: caller must be faculty or admin
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .maybeSingle();

  const userEmail = profile?.email || user.email;
  const isDemo = isDemoAccount(userEmail);
  const isAuthorized = profile?.role === 'admin' || profile?.role === 'faculty' || isDemo;

  if (!isAuthorized) {
    return {
      success: false,
      error: 'Forbidden: Only faculty members and platform administrators can execute XP deductions.',
    };
  }

  // 2. Validate student exists
  const { data: student } = await adminClient
    .from('students')
    .select('id, roll_no, department, profiles(full_name, email)')
    .eq('id', payload.studentId)
    .maybeSingle();

  if (!student) {
    return { success: false, error: 'Student record not found.' };
  }

  // 3. Validate amount & reason
  const amount = Math.floor(Number(payload.amount));
  if (isNaN(amount) || amount <= 0) {
    return { success: false, error: 'Deduction amount must be a positive integer greater than zero.' };
  }

  const reason = (payload.reason || '').trim();
  if (reason.length < 3) {
    return { success: false, error: 'A specific explanation/reason (at least 3 characters) is required for all XP deductions.' };
  }

  // 4. Generate reference ID
  const today = new Date().toISOString().split('T')[0];
  const callerRole = profile?.role || (isDemo ? 'admin' : 'faculty');
  const refId =
    payload.referenceId ||
    `PENALTY_${callerRole.toUpperCase()}_${today}_${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    // 5. Call deduct_xp stored procedure
    const { data: rpcRes, error: rpcErr } = await adminClient.rpc('deduct_xp', {
      p_student_id: payload.studentId,
      p_amount: amount,
      p_action_type: 'XP_DEDUCTION',
      p_reason: reason,
      p_reference_id: refId,
      p_actor: user.id,
    });

    if (rpcErr) {
      return { success: false, error: rpcErr.message || 'Database error during XP deduction.' };
    }

    if (!rpcRes?.success) {
      return {
        success: false,
        error: rpcRes?.error || 'Failed to deduct XP: insufficient balance or invalid parameter.',
      };
    }

    return {
      success: true,
      newTotal: Number(rpcRes.new_total),
      deductedAmount: Number(rpcRes.deducted_amount),
      previousXp: Number(rpcRes.previous_xp),
      event_id: rpcRes.event_id,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unexpected server error during XP deduction.' };
  }
}

/**
 * Retrieves student XP summary (current balance, valid events, voided count)
 * for preview before executing a penalty or deduction.
 */
export async function getStudentXpSummaryAction(studentId: string): Promise<{
  success: boolean;
  currentXp?: number;
  totalValidEvents?: number;
  totalVoidedEvents?: number;
  studentName?: string;
  rollNo?: string;
  error?: string;
}> {
  const adminClient = createAdminClient();

  const { data: student } = await adminClient
    .from('students')
    .select('id, roll_no, profiles(full_name)')
    .eq('id', studentId)
    .maybeSingle();

  if (!student) {
    return { success: false, error: 'Student not found.' };
  }

  const { data: events, error } = await adminClient
    .from('xp_events')
    .select('xp_amount, status')
    .eq('student_id', studentId);

  if (error) {
    return { success: false, error: error.message };
  }

  let currentXp = 0;
  let totalValidEvents = 0;
  let totalVoidedEvents = 0;

  for (const ev of events || []) {
    if (ev.status === 'valid') {
      currentXp += ev.xp_amount;
      totalValidEvents++;
    } else {
      totalVoidedEvents++;
    }
  }

  const studentProfile = student.profiles as any;
  const studentName = studentProfile?.full_name || student.roll_no;

  return {
    success: true,
    currentXp,
    totalValidEvents,
    totalVoidedEvents,
    studentName,
    rollNo: student.roll_no,
  };
}
