'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit-logs';
import { Club, ClubActivity, ClubParticipationStatus } from '@/types/database';

export interface ClubItem {
  id: string;
  name: string;
  code: string;
  category: string;
  description?: string | null;
  leadFacultyId?: string | null;
  leadFacultyName?: string | null;
  activityCount: number;
}

export interface ClubActivityItem {
  id: string;
  clubId: string;
  clubName: string;
  clubCode: string;
  title: string;
  description?: string | null;
  activityDate: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  participantCount: number;
}

export interface ParticipantRosterItem {
  studentId: string;
  fullName: string;
  rollNo: string;
  department: string;
  status: ClubParticipationStatus | 'unmarked';
  xpAwarded: number;
  overrideReason?: string | null;
  verifiedAt?: string | null;
}

/**
 * 1. Fetch Clubs (Admin sees all; Faculty sees all with lead indicators).
 */
export async function getClubsAction(): Promise<{
  success: boolean;
  clubs: ClubItem[];
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, clubs: [], error: 'Unauthorized.' };
    }

    const admin = createAdminClient();
    const { data: clubsData, error } = await admin
      .from('clubs')
      .select(`
        id, name, code, category, description, lead_faculty_id, is_active,
        profiles:lead_faculty_id ( full_name ),
        club_activities ( id )
      `)
      .eq('is_active', true)
      .order('name');

    if (error || !clubsData) {
      return { success: false, clubs: [], error: 'Failed to fetch clubs.' };
    }

    const clubs: ClubItem[] = clubsData.map((c: any) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      category: c.category,
      description: c.description,
      leadFacultyId: c.lead_faculty_id,
      leadFacultyName: c.profiles?.full_name || 'Unassigned',
      activityCount: c.club_activities?.length || 0,
    }));

    return { success: true, clubs };
  } catch (err: any) {
    return { success: false, clubs: [], error: err.message || 'Server error loading clubs.' };
  }
}

/**
 * 2. Create a Club Activity Event.
 */
export async function createClubActivityAction(input: {
  clubId: string;
  title: string;
  description?: string;
  activityDate?: string;
}): Promise<{
  success: boolean;
  activity?: any;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized.' };

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'faculty' && profile.role !== 'admin')) {
      return { success: false, error: 'Forbidden: Insufficient privileges.' };
    }

    // Verify club
    const { data: club } = await admin
      .from('clubs')
      .select('id, name, lead_faculty_id')
      .eq('id', input.clubId)
      .single();

    if (!club) {
      return { success: false, error: 'Club not found.' };
    }

    // If faculty, must be lead or admin
    if (profile.role === 'faculty' && club.lead_faculty_id && club.lead_faculty_id !== user.id) {
      return { success: false, error: 'Forbidden: You are not the assigned advisor for this club.' };
    }

    const { data: activity, error: actErr } = await admin
      .from('club_activities')
      .insert({
        club_id: input.clubId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        activity_date: input.activityDate || new Date().toISOString().substring(0, 10),
        status: 'upcoming',
        created_by: user.id,
      })
      .select('*')
      .single();

    if (actErr || !activity) {
      return { success: false, error: `Failed to create activity: ${actErr?.message}` };
    }

    await writeAuditLog({
      actorId: user.id,
      action: 'CREATE_CLUB_ACTIVITY',
      targetType: 'club_activity',
      targetId: activity.id,
      reason: `Created club activity "${input.title}" for ${club.name}`,
      details: {
        club_id: input.clubId,
        title: input.title,
        activity_date: activity.activity_date,
      },
    });

    return { success: true, activity };
  } catch (err: any) {
    return { success: false, error: err.message || 'Server error creating club activity.' };
  }
}

/**
 * 3. Fetch Club Activities for a Club.
 */
export async function getClubActivitiesAction(clubId?: string): Promise<{
  success: boolean;
  activities: ClubActivityItem[];
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, activities: [], error: 'Unauthorized.' };

    const admin = createAdminClient();
    let query = admin
      .from('club_activities')
      .select(`
        id, club_id, title, description, activity_date, status,
        clubs ( name, code ),
        club_participations ( id, status )
      `)
      .order('activity_date', { ascending: false });

    if (clubId) {
      query = query.eq('club_id', clubId);
    }

    const { data, error } = await query;
    if (error || !data) {
      return { success: false, activities: [], error: 'Failed to load activities.' };
    }

    const activities: ClubActivityItem[] = data.map((a: any) => ({
      id: a.id,
      clubId: a.club_id,
      clubName: a.clubs?.name || 'Club',
      clubCode: a.clubs?.code || 'CLUB',
      title: a.title,
      description: a.description,
      activityDate: a.activity_date,
      status: a.status,
      participantCount: (a.club_participations || []).filter((p: any) => p.status === 'verified').length,
    }));

    return { success: true, activities };
  } catch (err: any) {
    return { success: false, activities: [], error: err.message || 'Server error.' };
  }
}

/**
 * 4. Fetch Participant Roster for a Club Activity.
 */
export async function getActivityParticipantsAction(activityId: string): Promise<{
  success: boolean;
  activity?: any;
  roster: ParticipantRosterItem[];
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, roster: [], error: 'Unauthorized.' };

    const admin = createAdminClient();

    // 1. Fetch activity
    const { data: activity, error: actErr } = await admin
      .from('club_activities')
      .select(`
        id, club_id, title, description, activity_date, status,
        clubs ( name, code, lead_faculty_id )
      `)
      .eq('id', activityId)
      .single();

    if (actErr || !activity) {
      return { success: false, roster: [], error: 'Activity not found.' };
    }

    // 2. Fetch all registered students
    const { data: allStudents } = await admin
      .from('students')
      .select(`
        id, roll_no, department,
        profiles ( full_name )
      `)
      .order('roll_no');

    // 3. Fetch existing participations
    const { data: participations } = await admin
      .from('club_participations')
      .select('student_id, status, xp_awarded, override_reason, verified_at')
      .eq('activity_id', activityId);

    const partMap = new Map<string, any>();
    if (participations) {
      for (const p of participations) {
        partMap.set(p.student_id, p);
      }
    }

    const roster: ParticipantRosterItem[] = (allStudents || []).map((s: any) => {
      const p = partMap.get(s.id);
      return {
        studentId: s.id,
        fullName: s.profiles?.full_name || 'Student',
        rollNo: s.roll_no,
        department: s.department,
        status: p ? p.status : 'unmarked',
        xpAwarded: p?.xp_awarded ?? 0,
        overrideReason: p?.override_reason || null,
        verifiedAt: p?.verified_at || null,
      };
    });

    return { success: true, activity, roster };
  } catch (err: any) {
    return { success: false, roster: [], error: err.message || 'Server error.' };
  }
}

/**
 * 5. Verify and Award Club Participation XP (Atomic & Idempotent).
 */
export async function submitClubParticipationAction(input: {
  activityId: string;
  entries: Array<{
    studentId: string;
    status: 'verified' | 'rejected';
    overrideReason?: string;
  }>;
}): Promise<{
  success: boolean;
  verifiedCount: number;
  totalXpAwarded: number;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, verifiedCount: 0, totalXpAwarded: 0, error: 'Unauthorized.' };

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'faculty' && profile.role !== 'admin')) {
      return { success: false, verifiedCount: 0, totalXpAwarded: 0, error: 'Forbidden.' };
    }

    const { data: activity } = await admin
      .from('club_activities')
      .select('id, title, club_id, clubs(lead_faculty_id)')
      .eq('id', input.activityId)
      .single();

    if (!activity) {
      return { success: false, verifiedCount: 0, totalXpAwarded: 0, error: 'Activity not found.' };
    }

    // Fetch existing records for this activity
    const { data: existingRecords } = await admin
      .from('club_participations')
      .select('id, student_id, status, xp_awarded, xp_event_id')
      .eq('activity_id', input.activityId);

    const existingMap = new Map<string, any>();
    if (existingRecords) {
      for (const r of existingRecords) {
        existingMap.set(r.student_id, r);
      }
    }

    let verifiedCount = 0;
    let totalXpAwarded = 0;

    for (const entry of input.entries) {
      const existing = existingMap.get(entry.studentId);
      const isOverride = !!existing && existing.status !== entry.status;
      const refId = `club:${input.activityId}:${entry.studentId}`;

      if (entry.status === 'verified') {
        verifiedCount++;
        let xpGranted = existing?.xp_awarded || 0;
        let eventId = existing?.xp_event_id || null;

        // If not already awarded XP
        if (!existing || existing.status !== 'verified' || !existing.xp_event_id) {
          const { data: xpRes, error: xpErr } = await admin.rpc('award_xp', {
            p_student_id: entry.studentId,
            p_action_type: 'CLUB_ACTIVITY',
            p_reference_id: refId,
            p_extra_units: 0,
            p_actor: user.id,
          });

          if (!xpErr && xpRes && xpRes.status === 'awarded') {
            xpGranted = xpRes.xp_awarded || 25;
            eventId = xpRes.event_id || null;
            totalXpAwarded += xpGranted;
          } else if (xpRes && xpRes.status === 'duplicate') {
            xpGranted = 25;
          }
        }

        await admin
          .from('club_participations')
          .upsert({
            activity_id: input.activityId,
            student_id: entry.studentId,
            status: 'verified',
            verified_by: user.id,
            override_reason: entry.overrideReason?.trim() || null,
            xp_awarded: xpGranted,
            xp_event_id: eventId,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'activity_id, student_id' });

      } else {
        // If rejected and was previously verified with XP, safely void the XP via void_xp
        if (existing && existing.status === 'verified' && existing.xp_event_id) {
          try {
            await admin.rpc('void_xp', {
              p_event_id: existing.xp_event_id,
              p_reason: entry.overrideReason?.trim() || 'Club participation rejected by faculty/admin',
              p_actor: user.id,
            });
          } catch (e) {
            console.error('Error voiding club XP:', e);
          }
        }

        await admin
          .from('club_participations')
          .upsert({
            activity_id: input.activityId,
            student_id: entry.studentId,
            status: 'rejected',
            verified_by: user.id,
            override_reason: entry.overrideReason?.trim() || null,
            xp_awarded: 0,
            xp_event_id: null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'activity_id, student_id' });
      }

      if (isOverride) {
        await writeAuditLog({
          actorId: user.id,
          action: 'OVERRIDE_CLUB_PARTICIPATION',
          targetType: 'student',
          targetId: entry.studentId,
          reason: entry.overrideReason?.trim() || `Status updated from ${existing.status} to ${entry.status}`,
          details: {
            activity_id: input.activityId,
            previous_status: existing.status,
            new_status: entry.status,
          },
        });
      }
    }

    // Mark activity completed
    await admin
      .from('club_activities')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', input.activityId);

    await writeAuditLog({
      actorId: user.id,
      action: 'VERIFY_CLUB_PARTICIPATION',
      targetType: 'club_activity',
      targetId: input.activityId,
      reason: `Verified ${verifiedCount} participants for activity "${activity.title}"`,
      details: {
        total_entries: input.entries.length,
        verified: verifiedCount,
        total_xp_awarded: totalXpAwarded,
      },
    });

    return { success: true, verifiedCount, totalXpAwarded };
  } catch (err: any) {
    return { success: false, verifiedCount: 0, totalXpAwarded: 0, error: err.message || 'Server error.' };
  }
}

/**
 * 6. Student View: Fetch Student's Verified Club Activities.
 */
export async function getStudentClubHistoryAction(): Promise<{
  success: boolean;
  totalClubXp: number;
  activities: Array<{
    id: string;
    activityTitle: string;
    clubName: string;
    clubCode: string;
    activityDate: string;
    status: ClubParticipationStatus;
    xpAwarded: number;
    verifiedBy: string;
    verifiedAt: string;
  }>;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, totalClubXp: 0, activities: [], error: 'Unauthorized.' };

    const admin = createAdminClient();
    const { data: participations, error } = await admin
      .from('club_participations')
      .select(`
        id, status, xp_awarded, verified_at,
        club_activities (
          title, activity_date,
          clubs ( name, code )
        ),
        profiles:verified_by ( full_name )
      `)
      .eq('student_id', user.id)
      .eq('status', 'verified')
      .order('verified_at', { ascending: false });

    if (error || !participations) {
      return { success: false, totalClubXp: 0, activities: [], error: 'Failed to load club history.' };
    }

    let totalClubXp = 0;
    const activities = participations.map((p: any) => {
      const xp = p.xp_awarded || 0;
      totalClubXp += xp;
      const act = p.club_activities;
      const clb = act?.clubs;

      return {
        id: p.id,
        activityTitle: act?.title || 'Club Activity',
        clubName: clb?.name || 'Technical Club',
        clubCode: clb?.code || 'CLUB',
        activityDate: act?.activity_date || p.verified_at?.substring(0, 10),
        status: p.status as ClubParticipationStatus,
        xpAwarded: xp,
        verifiedBy: p.profiles?.full_name || 'Faculty Advisor',
        verifiedAt: p.verified_at,
      };
    });

    return { success: true, totalClubXp, activities };
  } catch (err: any) {
    return { success: false, totalClubXp: 0, activities: [], error: err.message || 'Server error.' };
  }
}
