'use server';

import crypto from 'crypto';
import { headers } from 'next/headers';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase admin credentials missing');
  }
  return createAdminClient(supabaseUrl, serviceRoleKey);
}

async function getClientIp(): Promise<string> {
  try {
    const h = await headers();
    const xff = h.get('x-forwarded-for');
    if (xff) return xff.split(',')[0].trim();
    const realIp = h.get('x-real-ip');
    if (realIp) return realIp.trim();
  } catch {
    // outside request context
  }
  return '127.0.0.1';
}

export interface StaffInviteItem {
  id: string;
  role: 'faculty' | 'admin';
  code_hash: string;
  campus_id: string | null;
  created_by: string | null;
  note: string | null;
  expires_at: string;
  max_uses: number;
  used_count: number;
  revoked_at: string | null;
  created_at: string;
  status: 'active' | 'used up' | 'expired' | 'revoked';
  campuses?: { id: string; name: string; code?: string } | null;
  profiles?: { email: string; full_name: string } | null;
}

/**
 * Admin action: Create a new staff invite code (faculty or admin).
 * Generates a random code of at least 20 chars, stores only SHA-256 hash, returns raw code ONCE.
 */
export async function createStaffInviteAction(
  input: {
    role: 'faculty' | 'admin';
    campusId?: string | null;
    expiresDays?: number;
    maxUses?: number;
    note?: string | null;
  },
  adminIdOverride?: string
): Promise<{
  success: boolean;
  inviteId?: string;
  rawCode?: string;
  error?: string;
  statusCode?: number;
}> {
  let adminId = adminIdOverride;

  if (!adminId) {
    const supabaseServer = await createServerClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized: Session required.', statusCode: 401 };
    }
    adminId = user.id;
  }

  const adminClient = getAdminClient();

  // Role check: Only admin can create invites
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', adminId)
    .maybeSingle();

  if (!profile || profile.role !== 'admin') {
    return {
      success: false,
      error: 'Forbidden: Administrator privileges required to create staff invites.',
      statusCode: 403,
    };
  }

  if (input.role !== 'faculty' && input.role !== 'admin') {
    return { success: false, error: 'Invalid invite role.', statusCode: 400 };
  }

  const expiresDays = Math.max(1, input.expiresDays ?? 7);
  const defaultMaxUses = input.role === 'admin' ? 1 : 25;
  const maxUses = Math.max(1, input.maxUses ?? defaultMaxUses);

  // Generate cryptographically secure random code of at least 20 chars (32 bytes base64url ~ 43 chars)
  const rawCode = 'inv_' + crypto.randomBytes(24).toString('base64url');
  const codeHash = crypto.createHash('sha256').update(rawCode).digest('hex');

  const expiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toISOString();

  try {
    const { data: invite, error: insertError } = await adminClient
      .from('staff_invites')
      .insert({
        role: input.role,
        code_hash: codeHash,
        campus_id: input.campusId || null,
        created_by: adminId,
        note: input.note ? input.note.trim() : null,
        expires_at: expiresAt,
        max_uses: maxUses,
        used_count: 0,
      })
      .select('id')
      .single();

    if (insertError || !invite) {
      console.error('Error creating staff invite:', insertError);
      return { success: false, error: 'Failed to create staff invite.', statusCode: 500 };
    }

    // Write audit log (NEVER log the raw code)
    await adminClient.from('audit_logs').insert({
      actor_id: adminId,
      action: 'invite_created',
      target_type: 'staff_invite',
      target_id: invite.id,
      reason: `Admin created ${input.role} invite code`,
      details: {
        role: input.role,
        campus_id: input.campusId || null,
        max_uses: maxUses,
        expires_at: expiresAt,
      },
    });

    return {
      success: true,
      inviteId: invite.id,
      rawCode,
    };
  } catch (err: any) {
    console.error('Unexpected error creating staff invite:', err);
    return { success: false, error: err.message || 'Server error', statusCode: 500 };
  }
}

/**
 * Admin action: Get all staff invites with calculated status.
 */
export async function getStaffInvitesAction(adminIdOverride?: string): Promise<{
  success: boolean;
  invites: StaffInviteItem[];
  error?: string;
  statusCode?: number;
}> {
  let adminId = adminIdOverride;

  if (!adminId) {
    const supabaseServer = await createServerClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) {
      return { success: false, invites: [], error: 'Unauthorized', statusCode: 401 };
    }
    adminId = user.id;
  }

  const adminClient = getAdminClient();

  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', adminId)
    .maybeSingle();

  if (!profile || profile.role !== 'admin') {
    return {
      success: false,
      invites: [],
      error: 'Forbidden: Administrator privileges required.',
      statusCode: 403,
    };
  }

  const { data: rows, error } = await adminClient
    .from('staff_invites')
    .select('*, campuses(id, name), profiles:created_by(email, full_name)')
    .order('created_at', { ascending: false });

  if (error || !rows) {
    return { success: false, invites: [], error: 'Failed to fetch staff invites.' };
  }

  const now = new Date();

  const invites: StaffInviteItem[] = rows.map((r: any) => {
    let status: 'active' | 'used up' | 'expired' | 'revoked' = 'active';
    if (r.revoked_at) {
      status = 'revoked';
    } else if (new Date(r.expires_at) <= now) {
      status = 'expired';
    } else if (r.used_count >= r.max_uses) {
      status = 'used up';
    }

    return {
      id: r.id,
      role: r.role,
      code_hash: r.code_hash,
      campus_id: r.campus_id,
      created_by: r.created_by,
      note: r.note,
      expires_at: r.expires_at,
      max_uses: r.max_uses,
      used_count: r.used_count,
      revoked_at: r.revoked_at,
      created_at: r.created_at,
      status,
      campuses: r.campuses,
      profiles: r.profiles,
    };
  });

  return { success: true, invites };
}

/**
 * Admin action: Revoke an active staff invite.
 */
export async function revokeStaffInviteAction(
  inviteId: string,
  adminIdOverride?: string
): Promise<{
  success: boolean;
  error?: string;
  statusCode?: number;
}> {
  let adminId = adminIdOverride;

  if (!adminId) {
    const supabaseServer = await createServerClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized', statusCode: 401 };
    }
    adminId = user.id;
  }

  const adminClient = getAdminClient();

  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', adminId)
    .maybeSingle();

  if (!profile || profile.role !== 'admin') {
    return {
      success: false,
      error: 'Forbidden: Administrator privileges required.',
      statusCode: 403,
    };
  }

  const { data: updated, error } = await adminClient
    .from('staff_invites')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', inviteId)
    .is('revoked_at', null)
    .select('id')
    .maybeSingle();

  if (error || !updated) {
    return { success: false, error: 'Invite not found or already revoked.', statusCode: 400 };
  }

  // Audit log
  await adminClient.from('audit_logs').insert({
    actor_id: adminId,
    action: 'invite_revoked',
    target_type: 'staff_invite',
    target_id: inviteId,
    reason: 'Admin revoked staff invite',
    details: { invite_id: inviteId },
  });

  return { success: true };
}

/**
 * Authenticated action: Redeem a staff invite code to promote account to Faculty or Admin.
 * Strictly verifies email verification, checks IP & user rate limits (5 per 10m),
 * performs constant-time-safe hash lookup, calls promote_to_staff atomically,
 * and writes audit logs.
 */
export async function redeemInviteAction(
  input: {
    code: string;
    department?: string;
    designation?: string;
    campusId?: string;
    employeeId?: string;
  },
  userIdOverride?: string,
  clientIpOverride?: string
): Promise<{
  success: boolean;
  role?: 'faculty' | 'admin';
  redirectUrl?: string;
  error?: string;
  statusCode?: number;
}> {
  const genericError = 'Invalid or expired code';

  let user: any = null;

  if (userIdOverride) {
    const adminClient = getAdminClient();
    const { data: authUser } = await adminClient.auth.admin.getUserById(userIdOverride);
    user = authUser?.user || { id: userIdOverride };
  } else {
    const supabaseServer = await createServerClient();
    const {
      data: { user: authUser },
    } = await supabaseServer.auth.getUser();
    user = authUser;
  }

  if (!user || !user.id) {
    return { success: false, error: 'Unauthorized: Session required.', statusCode: 401 };
  }

  // Verify email is confirmed
  const isEmailVerified = Boolean(
    user.email_confirmed_at ||
    user.confirmed_at ||
    user.app_metadata?.provider === 'google'
  );

  if (!isEmailVerified) {
    return {
      success: false,
      error: 'Email verification required. Please verify your email before redeeming an invite code.',
      statusCode: 403,
    };
  }

  const clientIp = clientIpOverride || (await getClientIp());
  const adminClient = getAdminClient();

  // 1. Database Rate Limiting: 5 attempts per 10 minutes per IP and per user
  const [ipRl, userRl] = await Promise.all([
    adminClient.rpc('check_ip_rate_limit', {
      p_ip: clientIp,
      p_action_name: 'redeem_invite_attempt',
      p_max_attempts: 5,
      p_window_minutes: 10,
    }),
    adminClient.rpc('check_ip_rate_limit', {
      p_ip: `user:${user.id}`,
      p_action_name: 'redeem_invite_attempt',
      p_max_attempts: 5,
      p_window_minutes: 10,
    }),
  ]);

  const ipAllowed = ipRl.data?.allowed !== false;
  const userAllowed = userRl.data?.allowed !== false;

  if (!ipAllowed || !userAllowed) {
    // Log burst failure
    await adminClient.from('audit_logs').insert({
      actor_id: user.id,
      action: 'invite_failed_attempts_burst',
      target_type: 'staff_invite',
      target_id: user.id,
      reason: 'Rate limit burst: 5 attempts per 10 minutes exceeded',
      details: {
        ip: clientIp,
        user_id: user.id,
        ip_attempts: ipRl.data?.count,
        user_attempts: userRl.data?.count,
      },
    });

    return {
      success: false,
      error: 'Too many attempts. Please try again after 10 minutes.',
      statusCode: 429,
    };
  }

  // 2. Validate code format (at least 20 chars, non-empty)
  const trimmedCode = (input.code || '').trim();
  if (!trimmedCode || trimmedCode.length < 20) {
    return { success: false, error: genericError, statusCode: 400 };
  }

  // 3. Constant-time-safe lookup
  const codeHash = crypto.createHash('sha256').update(trimmedCode).digest('hex');

  const { data: invite } = await adminClient
    .from('staff_invites')
    .select('*')
    .eq('code_hash', codeHash)
    .maybeSingle();

  const dummyHash = '0'.repeat(64);
  const hashToCompare = invite ? invite.code_hash : dummyHash;

  const isHashMatch = crypto.timingSafeEqual(
    Buffer.from(codeHash, 'utf-8'),
    Buffer.from(hashToCompare, 'utf-8')
  );

  const now = new Date();
  const isInvalidOrExpired =
    !invite ||
    !isHashMatch ||
    Boolean(invite.revoked_at) ||
    new Date(invite.expires_at) <= now ||
    invite.used_count >= invite.max_uses;

  if (isInvalidOrExpired) {
    return { success: false, error: genericError, statusCode: 400 };
  }

  // 4. Atomic promotion transaction via promote_to_staff
  const { data: promoteRes, error: rpcErr } = await adminClient.rpc('promote_to_staff', {
    p_user_id: user.id,
    p_role: invite.role,
    p_invite_id: invite.id,
    p_department: input.department?.trim() || 'General Studies',
    p_designation: input.designation?.trim() || 'Faculty Member',
    p_campus_id: input.campusId || null,
    p_employee_id: input.employeeId?.trim() || null,
  });

  if (rpcErr || !promoteRes || !promoteRes.success) {
    const errMsg = promoteRes?.error || rpcErr?.message;
    if (errMsg && errMsg.includes('existing student activity')) {
      return {
        success: false,
        error: 'Account has existing student activity and cannot be promoted to staff.',
        statusCode: 400,
      };
    }
    return { success: false, error: genericError, statusCode: 400 };
  }

  // 5. Audit log row for successful redemption (NEVER log the raw code)
  await adminClient.from('audit_logs').insert({
    actor_id: user.id,
    action: 'invite_redeemed',
    target_type: 'staff_invite',
    target_id: invite.id,
    reason: `User successfully redeemed invite code for role ${invite.role}`,
    details: {
      user_id: user.id,
      role: invite.role,
      invite_id: invite.id,
      campus_id: invite.campus_id || input.campusId || null,
    },
  });

  return {
    success: true,
    role: invite.role,
    redirectUrl: invite.role === 'admin' ? '/admin' : '/faculty',
  };
}
