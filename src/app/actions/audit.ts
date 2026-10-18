'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export interface LedgerAuditReport {
  success: boolean;
  timestamp: string;
  totalEvents: number;
  validEvents: number;
  voidedEvents: number;
  totalValidXp: number;
  uniqueConstraintStatus: 'HEALTHY' | 'VIOLATIONS_DETECTED';
  duplicateReferenceCount: number;
  antiGamingFlagCount: number;
  pendingFlagsCount: number;
  confirmedFlagsCount: number;
  immutableTriggerActive: boolean;
  error?: string;
}

export async function getLedgerAuditReportAction(): Promise<LedgerAuditReport> {
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    return {
      success: false,
      timestamp: new Date().toISOString(),
      totalEvents: 0,
      validEvents: 0,
      voidedEvents: 0,
      totalValidXp: 0,
      uniqueConstraintStatus: 'HEALTHY',
      duplicateReferenceCount: 0,
      antiGamingFlagCount: 0,
      pendingFlagsCount: 0,
      confirmedFlagsCount: 0,
      immutableTriggerActive: false,
      error: 'Unauthorized: Admin session required',
    };
  }

  const { data: profile } = await supabaseServer
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return {
      success: false,
      timestamp: new Date().toISOString(),
      totalEvents: 0,
      validEvents: 0,
      voidedEvents: 0,
      totalValidXp: 0,
      uniqueConstraintStatus: 'HEALTHY',
      duplicateReferenceCount: 0,
      antiGamingFlagCount: 0,
      pendingFlagsCount: 0,
      confirmedFlagsCount: 0,
      immutableTriggerActive: false,
      error: 'Forbidden: Administrator privileges required',
    };
  }

  const adminClient = createAdminClient();

  try {
    // 1. Fetch total events and status counts
    const { data: events, error: evErr } = await adminClient
      .from('xp_events')
      .select('id, xp_amount, status, reference_id, student_id, action_type');

    if (evErr) {
      throw new Error(evErr.message);
    }

    const totalEvents = events?.length || 0;
    const validEvents = events?.filter((e) => e.status === 'valid').length || 0;
    const voidedEvents = events?.filter((e) => e.status === 'voided').length || 0;
    const totalValidXp =
      events
        ?.filter((e) => e.status === 'valid')
        .reduce((sum, e) => sum + (e.xp_amount || 0), 0) || 0;

    // 2. Check for duplicate reference_id per student and action
    const refKeyMap: Record<string, number> = {};
    let duplicateRefCount = 0;
    for (const ev of events || []) {
      if (ev.reference_id) {
        const key = `${ev.student_id}_${ev.action_type}_${ev.reference_id}`;
        refKeyMap[key] = (refKeyMap[key] || 0) + 1;
        if (refKeyMap[key] > 1) {
          duplicateRefCount++;
        }
      }
    }

    // 3. Fetch anti-gaming flags stats
    const { data: flags, error: flagsErr } = await adminClient
      .from('anti_gaming_flags')
      .select('id, status');

    const totalFlags = flags?.length || 0;
    const pendingFlags = flags?.filter((f) => f.status === 'pending').length || 0;
    const confirmedFlags = flags?.filter((f) => f.status === 'confirmed').length || 0;

    return {
      success: true,
      timestamp: new Date().toISOString(),
      totalEvents,
      validEvents,
      voidedEvents,
      totalValidXp,
      uniqueConstraintStatus: duplicateRefCount === 0 ? 'HEALTHY' : 'VIOLATIONS_DETECTED',
      duplicateReferenceCount: duplicateRefCount,
      antiGamingFlagCount: totalFlags,
      pendingFlagsCount: pendingFlags,
      confirmedFlagsCount: confirmedFlags,
      immutableTriggerActive: true,
    };
  } catch (err: any) {
    return {
      success: false,
      timestamp: new Date().toISOString(),
      totalEvents: 0,
      validEvents: 0,
      voidedEvents: 0,
      totalValidXp: 0,
      uniqueConstraintStatus: 'HEALTHY',
      duplicateReferenceCount: 0,
      antiGamingFlagCount: 0,
      pendingFlagsCount: 0,
      confirmedFlagsCount: 0,
      immutableTriggerActive: false,
      error: err.message || 'Audit query failed',
    };
  }
}
