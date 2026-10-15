import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { executeWeeklyLeagueRollover } from '@/lib/leagues';
import { getIstWeekDetails } from '@/lib/quests';

export async function POST(req: NextRequest) {
  // 1. Verify Secret Header (never public)
  const cronSecretHeader = req.headers.get('x-cron-secret');
  const expectedSecret = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!expectedSecret || !cronSecretHeader || cronSecretHeader !== expectedSecret) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid or missing x-cron-secret header.' },
      { status: 401 }
    );
  }

  // 2. Connect via service role
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Server configuration error: Service role credentials missing.' },
      { status: 500 }
    );
  }

  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);

  // 3. Determine week keys (allows manual override for testing/scripts)
  let closingWeekKey = '';
  let newWeekKey = '';

  try {
    const body = await req.json();
    closingWeekKey = body.closingWeekKey;
    newWeekKey = body.newWeekKey;
  } catch {
    // Body empty, compute from current date
  }

  if (!closingWeekKey) {
    // If not supplied, previous week key
    const currentDetails = getIstWeekDetails();
    newWeekKey = newWeekKey || currentDetails.periodKey;

    // Previous week is 7 days prior
    const prevDate = new Date();
    prevDate.setDate(prevDate.getDate() - 7);
    closingWeekKey = getIstWeekDetails(prevDate).periodKey;
  }

  // 4. Run rollover job
  try {
    const result = await executeWeeklyLeagueRollover(closingWeekKey, newWeekKey, adminClient);
    return NextResponse.json({
      success: true,
      closingWeekKey,
      newWeekKey,
      result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Rollover execution failed: ${error.message}` },
      { status: 500 }
    );
  }
}
