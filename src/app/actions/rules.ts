'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit-logs';

export interface UpdateXpRuleInput {
  id: string;
  displayName: string;
  baseXp: number;
  extraXp: number;
  dailyLimit: number | null;
  active: boolean;
  reason?: string;
}

export async function updateXpRuleAction(input: UpdateXpRuleInput): Promise<{
  success: boolean;
  statusCode: number;
  error?: string;
}> {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    return { success: false, statusCode: 401, error: 'Unauthorized: Admin session required' };
  }

  const { data: profile } = await supabaseServer
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { success: false, statusCode: 403, error: 'Forbidden: Administrator privileges required' };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from('xp_rules')
    .update({
      display_name: input.displayName.trim(),
      base_xp: input.baseXp,
      extra_xp: input.extraXp,
      daily_limit: input.dailyLimit,
      active: input.active,
    })
    .eq('id', input.id);

  if (error) {
    return { success: false, statusCode: 500, error: error.message };
  }

  await writeAuditLog({
    actorId: user.id,
    action: 'update_xp_rule',
    targetType: 'xp_rule',
    targetId: input.id,
    reason: input.reason?.trim() || 'Admin updated rule configuration',
    details: {
      displayName: input.displayName,
      baseXp: input.baseXp,
      extraXp: input.extraXp,
      dailyLimit: input.dailyLimit,
      active: input.active,
    },
  });

  return { success: true, statusCode: 200 };
}
