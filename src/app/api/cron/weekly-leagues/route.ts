import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { executeWeeklyLeagueRollover } from '@/lib/leagues';
import { getIstWeekDetails } from '@/lib/quests';

function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function extractProvidedSecret(req: NextRequest): string | null {
  const xCronSecret = req.headers.get('x-cron-secret');
  if (xCronSecret) return xCronSecret.trim();

  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match) return match[1].trim();
  }
  return null;
}

async function handleCronRequest(req: NextRequest, isGet = false) {
  // If CRON_SECRET is unset, reject every request (fail closed)
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    return NextResponse.json(
      { error: 'Unauthorized: Cron secret not configured.' },
      { status: 401 }
    );
  }

  const providedSecret = extractProvidedSecret(req);
  if (!providedSecret || !timingSafeCompare(providedSecret, expectedSecret)) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid or missing cron secret.' },
      { status: 401 }
    );
  }

  // Connect via service role
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Server configuration error: Service role credentials missing.' },
      { status: 500 }
    );
  }

  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);

  let closingWeekKey = req.nextUrl.searchParams.get('closingWeekKey') || '';
  let newWeekKey = req.nextUrl.searchParams.get('newWeekKey') || '';

  if (!isGet) {
    try {
      const body = await req.json();
      closingWeekKey = body.closingWeekKey || closingWeekKey;
      newWeekKey = body.newWeekKey || newWeekKey;
    } catch {
      // Body empty or not JSON, fallback to query params
    }
  }

  if (!closingWeekKey) {
    const currentDetails = getIstWeekDetails();
    newWeekKey = newWeekKey || currentDetails.periodKey;

    const prevDate = new Date();
    prevDate.setDate(prevDate.getDate() - 7);
    closingWeekKey = getIstWeekDetails(prevDate).periodKey;
  }

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

export async function GET(req: NextRequest) {
  return handleCronRequest(req, true);
}

export async function POST(req: NextRequest) {
  return handleCronRequest(req, false);
}

