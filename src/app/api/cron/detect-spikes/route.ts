import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { runSpikeDetection } from '@/lib/anti-gaming/spike-detection';

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
  // Fail closed if CRON_SECRET is unset
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

  let targetDate = req.nextUrl.searchParams.get('date') || undefined;

  if (!isGet) {
    try {
      const body = await req.json();
      targetDate = body.date || targetDate;
    } catch {
      // Body not JSON
    }
  }

  try {
    const result = await runSpikeDetection({ targetDate });
    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Spike detection execution failed: ${error.message}` },
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
