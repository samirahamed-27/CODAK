import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getLeaderboardData } from '@/lib/leaderboards';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const scope = (searchParams.get('scope') as 'campus' | 'batch') || 'campus';
  const timeframe = (searchParams.get('timeframe') as 'weekly' | 'all-time') || 'weekly';
  const department = searchParams.get('department') || undefined;
  const yearParam = searchParams.get('year');
  const yearOfStudy = yearParam ? parseInt(yearParam, 10) : undefined;
  const customDate = searchParams.get('date') || undefined;

  // 1. Identify requester from session or test header
  const supabaseServer = await createServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  const requesterId = user?.id || req.headers.get('x-test-requester-id') || undefined;
  if (!requesterId) {
    return NextResponse.json(
      { error: 'Unauthorized: login required to view leaderboard' },
      { status: 401 }
    );
  }
  let requesterRole: 'student' | 'faculty' | 'admin' = 'student';

  if (user) {
    const { data: profile } = await supabaseServer
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role) {
      requesterRole = profile.role as 'student' | 'faculty' | 'admin';
    }
  } else if (req.headers.get('x-test-requester-role')) {
    requesterRole = req.headers.get('x-test-requester-role') as 'student' | 'faculty' | 'admin';
  }

  // 2. Connect via service role for secure database queries
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Server configuration error: Service role credentials missing.' },
      { status: 500 }
    );
  }

  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);

  // 3. Retrieve leaderboard data
  try {
    const leaderboard = await getLeaderboardData(adminClient, {
      scope,
      timeframe,
      department,
      yearOfStudy,
      requesterId,
      requesterRole,
      customDate,
    });

    return NextResponse.json({
      success: true,
      scope,
      timeframe,
      requesterRole,
      leaderboard,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to load leaderboard: ${error.message}` },
      { status: 500 }
    );
  }
}
