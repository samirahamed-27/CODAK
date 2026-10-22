'use server';

import crypto from 'crypto';
import { headers } from 'next/headers';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkIpRateLimit } from '@/lib/rate-limits';

export type JudgeRole = 'student' | 'faculty' | 'admin';

const DEMO_EMAILS: Record<JudgeRole, string> = {
  student: 'student@demo.edu',
  faculty: 'faculty@demo.edu',
  admin: 'admin@demo.edu',
};

function safeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    const hashA = crypto.createHash('sha256').update(bufA).digest();
    const hashB = crypto.createHash('sha256').update(bufB).digest();
    crypto.timingSafeEqual(hashA, hashB);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function judgeLoginAction(
  role: JudgeRole,
  code: string,
  clientIpOverride?: string
): Promise<{
  success: boolean;
  redirectPath?: string;
  error?: string;
  statusCode?: number;
}> {
  // 1. Validate role input
  if (!role || !['student', 'faculty', 'admin'].includes(role)) {
    return { success: false, error: 'Invalid role specified', statusCode: 400 };
  }

  // 2. Extract client IP and enforce IP Rate Limiting (5 attempts per 10 minutes per IP)
  let clientIp = clientIpOverride;
  if (!clientIp) {
    try {
      const headerList = await headers();
      clientIp =
        headerList.get('x-forwarded-for')?.split(',')[0].trim() ||
        headerList.get('x-real-ip') ||
        '127.0.0.1';
    } catch {
      clientIp = '127.0.0.1';
    }
  }

  const rl = await checkIpRateLimit(clientIp, 'judge_login', 5, 10);
  if (!rl.allowed) {
    return {
      success: false,
      error: rl.error || 'Too many attempts. Rate limit exceeded.',
      statusCode: 429,
    };
  }

  // 3. Verify server environment configuration - FAIL CLOSED if any env is missing
  const judgeAccessCode = process.env.JUDGE_ACCESS_CODE;
  if (!judgeAccessCode) {
    return {
      success: false,
      error: 'Judge access is not configured on this server (JUDGE_ACCESS_CODE is missing).',
      statusCode: 503,
    };
  }

  const passwordMap: Record<JudgeRole, string | undefined> = {
    student: process.env.DEMO_STUDENT_PASSWORD,
    faculty: process.env.DEMO_FACULTY_PASSWORD,
    admin: process.env.DEMO_ADMIN_PASSWORD,
  };

  const password = passwordMap[role];
  if (!password) {
    return {
      success: false,
      error: `Judge credentials for role '${role}' are not configured on this server.`,
      statusCode: 503,
    };
  }

  // 4. Constant-time comparison of the submitted access code
  if (!code || !safeCompare(code.trim(), judgeAccessCode.trim())) {
    return {
      success: false,
      error: 'Invalid access code. Authorization denied.',
      statusCode: 401,
    };
  }

  // 5. Sign in demo user using server Supabase client
  const demoEmail = DEMO_EMAILS[role];
  const supabaseServer = await createServerClient();

  const { data, error: authError } = await supabaseServer.auth.signInWithPassword({
    email: demoEmail,
    password,
  });

  if (authError || !data.user) {
    return {
      success: false,
      error: authError?.message || 'Authentication failed with the configured demo credentials.',
      statusCode: 401,
    };
  }

  // 6. Write audit_logs row for successful judge login
  try {
    const adminClient = createAdminClient();
    await adminClient.from('audit_logs').insert({
      actor_id: data.user.id,
      action: 'judge_login',
      target_type: 'user',
      target_id: data.user.id,
      reason: 'Authorized judge evaluation login via access code',
      details: {
        role,
        email: demoEmail,
        ip_address: clientIp,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (auditErr) {
    console.error('Failed to log judge login to audit_logs:', auditErr);
  }

  return {
    success: true,
    redirectPath: `/${role}`,
  };
}

export async function quickDemoLoginAction(role: JudgeRole): Promise<{
  success: boolean;
  redirectPath?: string;
  error?: string;
}> {
  if (!role || !['student', 'faculty', 'admin'].includes(role)) {
    return { success: false, error: 'Invalid role specified' };
  }

  const passwordMap: Record<JudgeRole, string> = {
    student: process.env.DEMO_STUDENT_PASSWORD || 'Password123!',
    faculty: process.env.DEMO_FACULTY_PASSWORD || 'Password123!',
    admin: process.env.DEMO_ADMIN_PASSWORD || 'Password123!',
  };

  const password = passwordMap[role];
  const demoEmail = DEMO_EMAILS[role];
  const supabaseServer = await createServerClient();

  const { data, error: authError } = await supabaseServer.auth.signInWithPassword({
    email: demoEmail,
    password,
  });

  if (authError || !data.user) {
    return {
      success: false,
      error: authError?.message || 'Quick demo login failed.',
    };
  }

  return {
    success: true,
    redirectPath: `/${role}`,
  };
}
