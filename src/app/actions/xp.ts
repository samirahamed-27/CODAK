'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { writeAuditLog } from '@/lib/audit-logs';

export interface AwardXpInput {
  studentId: string;
  actionType: string;
  referenceId: string;
  extraUnits?: number;
}

export interface AwardXpResult {
  success: boolean;
  status: 'awarded' | 'duplicate' | 'limit_reached' | 'rule_inactive' | 'rule_not_found' | 'student_not_found' | 'error';
  xpAwarded?: number;
  newTotal?: number;
  eventId?: string | null;
  reason?: string;
  message?: string;
  error?: string;
  statusCode?: number;
}

/**
 * Server Action: Manually Award XP (Faculty and Admin Only)
 *
 * Strict Security Checks:
 * 1. Authenticates session via getUser() (never trusts client)
 * 2. Checks database role: Faculty or Admin only. Rejects students with 403.
 * 3. Validates extraUnits: integer between 0 and 50.
 * 4. Validates referenceId: trimmed, between 1 and 100 chars.
 * 5. Validates student existence and rule active status.
 * 6. Invokes award_xp using the server-side service role key.
 */
export async function awardXpAction(input: AwardXpInput): Promise<AwardXpResult> {
  const supabaseServer = await createServerClient();

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    return {
      success: false,
      status: 'error',
      statusCode: 401,
      error: 'Unauthorized: You must be logged in to award XP.',
    };
  }

  // 2. Fetch role from database
  const { data: profile } = await supabaseServer
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const callerRole = profile?.role;
  if (callerRole !== 'faculty' && callerRole !== 'admin') {
    return {
      success: false,
      status: 'error',
      statusCode: 403,
      error: 'Forbidden: Only faculty and administrators are permitted to award XP.',
    };
  }

  // 3. Validate extraUnits (integer between 0 and 50)
  const units = input.extraUnits ?? 0;
  if (!Number.isInteger(units) || units < 0 || units > 50) {
    return {
      success: false,
      status: 'error',
      statusCode: 400,
      error: 'Validation error: Extra units must be an integer between 0 and 50.',
    };
  }

  // 4. Validate referenceId (1 to 100 chars, non-empty)
  const trimmedRef = input.referenceId ? input.referenceId.trim() : '';
  if (trimmedRef.length < 1 || trimmedRef.length > 100) {
    return {
      success: false,
      status: 'error',
      statusCode: 400,
      error: 'Validation error: Reference ID must be between 1 and 100 characters.',
    };
  }

  // 5. Connect via service role client (server-side only)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      success: false,
      status: 'error',
      statusCode: 500,
      error: 'Server configuration error: Service role credentials missing.',
    };
  }

  const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey);

  // 6. Check student existence
  const { data: student, error: studentError } = await supabaseAdmin
    .from('students')
    .select('id')
    .eq('id', input.studentId)
    .single();

  if (studentError || !student) {
    return {
      success: false,
      status: 'student_not_found',
      statusCode: 404,
      error: 'Validation error: Target student record not found.',
    };
  }

  // 7. Check rule existence and active status
  const { data: rule, error: ruleError } = await supabaseAdmin
    .from('xp_rules')
    .select('action_type, active')
    .eq('action_type', input.actionType)
    .single();

  if (ruleError || !rule) {
    return {
      success: false,
      status: 'rule_not_found',
      statusCode: 404,
      error: `Validation error: Rule "${input.actionType}" does not exist.`,
    };
  }

  if (!rule.active) {
    return {
      success: false,
      status: 'rule_inactive',
      statusCode: 400,
      error: `Validation error: Rule "${input.actionType}" is currently inactive.`,
    };
  }

  // 8. Execute award_xp RPC with advisory lock in single transaction
  const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('award_xp', {
    p_student_id: input.studentId,
    p_action_type: input.actionType,
    p_reference_id: trimmedRef,
    p_extra_units: units,
    p_actor: user.id,
  });

  if (rpcError) {
    return {
      success: false,
      status: 'error',
      statusCode: 500,
      error: `Database error during award_xp: ${rpcError.message}`,
    };
  }

  const result = rpcResult as {
    status: 'awarded' | 'duplicate' | 'limit_reached' | 'rule_inactive' | 'rule_not_found' | 'student_not_found';
    reason?: string;
    xp_awarded: number;
    new_total: number;
    event_id: string | null;
  };

  const friendlyMessage =
    result.status === 'limit_reached'
      ? 'Daily XP limit reached. Great work today! Come back tomorrow to earn more XP.'
      : undefined;

  if (result.status === 'awarded') {
    await writeAuditLog({
      actorId: user.id,
      action: 'manual_award_xp',
      targetType: 'student',
      targetId: input.studentId,
      reason: `Manual XP award for ${input.actionType}`,
      details: {
        action_type: input.actionType,
        extra_units: units,
        reference_id: trimmedRef,
        xp_awarded: result.xp_awarded,
        event_id: result.event_id,
      },
    });
  }

  return {
    success: result.status === 'awarded',
    status: result.status,
    reason: result.reason,
    message: friendlyMessage,
    error: friendlyMessage,
    xpAwarded: result.xp_awarded,
    newTotal: Number(result.new_total),
    eventId: result.event_id,
  };
}
