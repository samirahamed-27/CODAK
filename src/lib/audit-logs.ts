import { createAdminClient } from '@/lib/supabase/admin';

export interface WriteAuditLogInput {
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  reason: string;
  details?: Record<string, any>;
}

export async function writeAuditLog(input: WriteAuditLogInput): Promise<boolean> {
  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient.from('audit_logs').insert({
      actor_id: input.actorId || null,
      action: input.action,
      target_type: input.targetType,
      target_id: input.targetId,
      reason: input.reason.trim(),
      details: input.details || {},
    });

    if (error) {
      console.error('Failed to write audit log:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception writing audit log:', err);
    return false;
  }
}
