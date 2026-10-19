import { createAdminClient } from '@/lib/supabase/admin';

export interface RateLimitResult {
  allowed: boolean;
  statusCode?: number;
  error?: string;
  retryAfterSeconds?: number;
}

const DEFAULT_LIMITS: Record<string, number> = {
  quiz_answer: 20,
  duel_action: 15,
  concept_match: 15,
  battle_submit: 30,
  search: 30,
  practice_claim: 10,
  competition_create: 10,
};

export async function checkRateLimit(
  studentId: string,
  actionName: string,
  customLimit?: number
): Promise<RateLimitResult> {
  const limit = customLimit ?? DEFAULT_LIMITS[actionName] ?? 20;

  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient.rpc('check_action_rate_limit', {
      p_student_id: studentId,
      p_action_name: actionName,
      p_max_per_minute: limit,
    });

    if (error) {
      console.error(`Rate limit check error for ${actionName}:`, error);
      return { allowed: true };
    }

    const res = data as { allowed?: boolean; retry_after_seconds?: number } | null;
    if (res && res.allowed === false) {
      return {
        allowed: false,
        statusCode: 429,
        error: `Too many requests for ${actionName}. Please wait ${res.retry_after_seconds || 60}s before trying again.`,
        retryAfterSeconds: res.retry_after_seconds || 60,
      };
    }

    return { allowed: true };
  } catch (err) {
    console.error(`Failed to execute rate limit for ${actionName}:`, err);
    return { allowed: true };
  }
}

export async function checkIpRateLimit(
  ipAddress: string,
  actionName: string,
  maxAttempts: number = 5,
  windowMinutes: number = 10
): Promise<RateLimitResult> {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient.rpc('check_ip_rate_limit', {
      p_ip: ipAddress,
      p_action_name: actionName,
      p_max_attempts: maxAttempts,
      p_window_minutes: windowMinutes,
    });

    if (error) {
      console.error(`IP rate limit check error for ${actionName}:`, error);
      return { allowed: true };
    }

    const res = data as { allowed?: boolean; retry_after_seconds?: number } | null;
    if (res && res.allowed === false) {
      return {
        allowed: false,
        statusCode: 429,
        error: `Too many attempts from this IP address. Please wait ${res.retry_after_seconds || windowMinutes * 60}s before trying again.`,
        retryAfterSeconds: res.retry_after_seconds || windowMinutes * 60,
      };
    }

    return { allowed: true };
  } catch (err) {
    console.error(`Failed to execute IP rate limit for ${actionName}:`, err);
    return { allowed: true };
  }
}

