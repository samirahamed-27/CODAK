'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { StudentProfile, initialStudentProfile } from '@/data/studentDashboardData';
import { levelFromXp } from '@/lib/levels';
import { getRankForLevel } from '@/lib/ranks';
import { ensureStudentRecord } from '@/lib/auth/ensure-student';
import { formatCampusDisplayName } from '@/lib/campus';

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createAdminClient(supabaseUrl, serviceRoleKey);
}

export interface StudentDashboardResponse {
  success: boolean;
  authenticated: boolean;
  profile: StudentProfile;
  activityCalendar?: Record<string, number>;
  campusName?: string;
  department?: string;
  rollNo?: string;
  yearOfStudy?: number;
  error?: string;
}

/**
 * Server Action: Fetches real student profile, ledger XP, streak, and academic stats for the dashboard.
 * Fallback to demo profile only if no session is active.
 */
export async function getStudentDashboardDataAction(): Promise<StudentDashboardResponse> {
  try {
    const supabaseServer = await createServerClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) {
      return {
        success: true,
        authenticated: false,
        profile: initialStudentProfile,
      };
    }

    const adminClient = getAdminClient();

    // Defensively ensure profile and student records exist
    await ensureStudentRecord(adminClient, user);

    // 1. Fetch Profile & linked Campus
    const { data: profileRow } = await adminClient
      .from('profiles')
      .select('id, full_name, email, avatar_url, campus_id, campus_other_name, campuses(*)')
      .eq('id', user.id)
      .maybeSingle();

    // 2. Fetch Academic Student record
    const { data: studentRow } = await adminClient
      .from('students')
      .select('roll_no, department, year_of_study')
      .eq('id', user.id)
      .maybeSingle();

    // 3. Fetch Total Valid XP from Ledger via RPC or fallback sum
    let totalXp = 0;
    try {
      const { data: rpcXp, error: rpcErr } = await adminClient.rpc('get_student_xp', {
        p_student_id: user.id,
      });
      if (!rpcErr && typeof rpcXp === 'number') {
        totalXp = rpcXp;
      } else {
        const { data: events } = await adminClient
          .from('xp_events')
          .select('xp_amount')
          .eq('student_id', user.id)
          .eq('status', 'valid');
        if (events) {
          totalXp = events.reduce((acc, curr) => acc + (curr.xp_amount || 0), 0);
        }
      }
    } catch {
      totalXp = 0;
    }

    // 4. Fetch Streak Data
    const { data: streakRow } = await adminClient
      .from('student_streaks')
      .select('current_streak, longest_streak')
      .eq('student_id', user.id)
      .maybeSingle();

    const currentStreak = streakRow?.current_streak ?? 0;

    // 5. Fetch Activity Heatmap (last 31 days of XP events in IST)
    const activityCalendar: Record<string, number> = {};
    const { data: recentEvents } = await adminClient
      .from('xp_events')
      .select('created_at, xp_amount')
      .eq('student_id', user.id)
      .eq('status', 'valid')
      .order('created_at', { ascending: false })
      .limit(200);

    if (recentEvents && recentEvents.length > 0) {
      for (const ev of recentEvents) {
        const dateStr = new Date(ev.created_at).toLocaleDateString('en-CA', {
          timeZone: 'Asia/Kolkata',
        }); // Returns YYYY-MM-DD
        activityCalendar[dateStr] = (activityCalendar[dateStr] || 0) + (ev.xp_amount || 0);
      }
    }

    // 6. Compute Level & Rank Tier
    const levelInfo = levelFromXp(totalXp);
    const rankTier = getRankForLevel(levelInfo.level);

    // Resolve display name: priority is profile.full_name > user_metadata > email prefix
    const metadataName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.user_metadata?.display_name ||
      '';
    const emailPrefix = user.email ? user.email.split('@')[0] : 'Student';
    const resolvedName =
      profileRow?.full_name &&
      profileRow.full_name !== 'Student User' &&
      !profileRow.full_name.startsWith('user_')
        ? profileRow.full_name
        : metadataName || (emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1));

    const department = studentRow?.department || 'Computer Science';
    const rollNo = studentRow?.roll_no || 'Unassigned';
    const yearOfStudy = studentRow?.year_of_study || 1;

    let campusName = 'Unassigned Campus';
    if (profileRow?.campuses) {
      campusName = formatCampusDisplayName(
        profileRow.campuses as any,
        profileRow.campus_other_name
      );
    }

    const dynamicProfile: StudentProfile = {
      id: user.id,
      name: resolvedName,
      titleTag: rankTier.name,
      avatarUrl: profileRow?.avatar_url || null,
      rank: `#1 in ${department}`,
      level: levelInfo.level,
      totalXp,
      currentStreak,
      unreadNotifications: 1,
      notifications: [
        {
          id: 'welcome_notif',
          sender: campusName !== 'Unassigned Campus' ? campusName : 'Campus Academic Arena',
          message: `Welcome, ${resolvedName}! Your profile is connected to ${department}. Complete your daily practice quiz to earn XP and level up!`,
          timestamp: 'Just now',
          unread: true,
        },
      ],
    };

    return {
      success: true,
      authenticated: true,
      profile: dynamicProfile,
      activityCalendar,
      campusName,
      department,
      rollNo,
      yearOfStudy,
    };
  } catch (err: any) {
    console.error('Error fetching student dashboard profile:', err);
    return {
      success: false,
      authenticated: false,
      profile: initialStudentProfile,
      error: err.message || 'Failed to load dashboard profile',
    };
  }
}
