'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit-logs';
import { AttendanceRecordStatus, ClubParticipationStatus } from '@/types/database';

export interface FacultyAllocationItem {
  id: string;
  facultyId: string;
  facultyName: string;
  facultyEmail: string;
  facultyDepartment: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  section: string;
  academicYear: string;
  createdAt: string;
}

export interface AttendanceAdminRecordItem {
  id: string;
  sessionId: string;
  sessionDate: string;
  sessionTopic?: string | null;
  subjectCode: string;
  subjectName: string;
  studentId: string;
  studentName: string;
  studentRollNo: string;
  status: AttendanceRecordStatus;
  markedByName: string;
  overrideReason?: string | null;
  xpAwarded: number;
  markedAt: string;
}

export interface ClubParticipationAdminItem {
  id: string;
  activityId: string;
  activityTitle: string;
  activityDate: string;
  clubName: string;
  clubCode: string;
  studentId: string;
  studentName: string;
  studentRollNo: string;
  status: ClubParticipationStatus;
  verifiedByName: string;
  overrideReason?: string | null;
  xpAwarded: number;
  verifiedAt: string;
}

/**
 * 1. Fetch Faculty Subject Allocations (Admin Only).
 */
export async function getFacultySubjectAllocationsAction(): Promise<{
  success: boolean;
  allocations: FacultyAllocationItem[];
  availableFaculty: Array<{ id: string; fullName: string; department: string }>;
  availableSubjects: Array<{ id: string; code: string; name: string }>;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, allocations: [], availableFaculty: [], availableSubjects: [], error: 'Unauthorized.' };

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return { success: false, allocations: [], availableFaculty: [], availableSubjects: [], error: 'Forbidden: Admin access required.' };
    }

    // 1. Fetch allocations
    const { data: rawAllocations, error: allocErr } = await admin
      .from('faculty_subjects')
      .select(`
        id, faculty_id, subject_id, section, academic_year, created_at,
        profiles:faculty_id ( full_name, email ),
        faculty:faculty_id ( department ),
        subjects:subject_id ( code, name )
      `)
      .order('created_at', { ascending: false });

    if (allocErr) {
      return { success: false, allocations: [], availableFaculty: [], availableSubjects: [], error: 'Failed to fetch allocations.' };
    }

    const allocations: FacultyAllocationItem[] = (rawAllocations || []).map((a: any) => ({
      id: a.id,
      facultyId: a.faculty_id,
      facultyName: a.profiles?.full_name || 'Faculty Member',
      facultyEmail: a.profiles?.email || '',
      facultyDepartment: a.faculty?.department || 'Academics',
      subjectId: a.subject_id,
      subjectCode: a.subjects?.code || 'SUBJ',
      subjectName: a.subjects?.name || 'Subject',
      section: a.section,
      academicYear: a.academic_year,
      createdAt: a.created_at,
    }));

    // 2. Fetch available faculty & subjects
    const { data: facultyRows } = await admin
      .from('faculty')
      .select('id, department, profiles ( full_name )')
      .order('department');

    const availableFaculty = (facultyRows || []).map((f: any) => ({
      id: f.id,
      fullName: f.profiles?.full_name || 'Faculty Staff',
      department: f.department,
    }));

    const { data: subjectRows } = await admin
      .from('subjects')
      .select('id, code, name')
      .order('code');

    const availableSubjects = (subjectRows || []).map((s: any) => ({
      id: s.id,
      code: s.code,
      name: s.name,
    }));

    return {
      success: true,
      allocations,
      availableFaculty,
      availableSubjects,
    };
  } catch (err: any) {
    return { success: false, allocations: [], availableFaculty: [], availableSubjects: [], error: err.message || 'Server error.' };
  }
}

/**
 * 2. Assign Faculty to Subject & Section (Admin Only).
 */
export async function assignFacultySubjectAction(input: {
  facultyId: string;
  subjectId: string;
  section?: string;
  academicYear?: string;
}): Promise<{
  success: boolean;
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

    if (profile?.role !== 'admin') {
      return { success: false, error: 'Forbidden: Admin access required.' };
    }

    const section = (input.section || 'A').toUpperCase().trim();
    const academicYear = input.academicYear || '2026-2027';

    const { data: facultyProf } = await admin.from('profiles').select('full_name').eq('id', input.facultyId).single();
    const { data: subj } = await admin.from('subjects').select('code, name').eq('id', input.subjectId).single();

    const { error: insertErr } = await admin
      .from('faculty_subjects')
      .upsert({
        faculty_id: input.facultyId,
        subject_id: input.subjectId,
        section,
        academic_year: academicYear,
      }, { onConflict: 'faculty_id, subject_id, section, academic_year' });

    if (insertErr) {
      return { success: false, error: `Failed to assign subject: ${insertErr.message}` };
    }

    await writeAuditLog({
      actorId: user.id,
      action: 'ASSIGN_FACULTY_SUBJECT',
      targetType: 'faculty',
      targetId: input.facultyId,
      reason: `Assigned ${facultyProf?.full_name || 'Faculty'} to ${subj?.code} (${section})`,
      details: {
        subject_id: input.subjectId,
        subject_code: subj?.code,
        section,
        academic_year: academicYear,
      },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Server error.' };
  }
}

/**
 * 3. Remove Faculty Subject Allocation (Admin Only).
 */
export async function removeFacultySubjectAction(allocationId: string): Promise<{
  success: boolean;
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

    if (profile?.role !== 'admin') {
      return { success: false, error: 'Forbidden: Admin access required.' };
    }

    const { error: delErr } = await admin
      .from('faculty_subjects')
      .delete()
      .eq('id', allocationId);

    if (delErr) {
      return { success: false, error: `Failed to remove allocation: ${delErr.message}` };
    }

    await writeAuditLog({
      actorId: user.id,
      action: 'REMOVE_FACULTY_SUBJECT',
      targetType: 'faculty_subject_allocation',
      targetId: allocationId,
      reason: 'Admin removed faculty course allocation',
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Server error.' };
  }
}

/**
 * 4. Fetch Attendance Records for Admin Override Management.
 */
export async function getAdminAttendanceRecordsAction(searchQuery?: string): Promise<{
  success: boolean;
  records: AttendanceAdminRecordItem[];
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, records: [], error: 'Unauthorized.' };

    const admin = createAdminClient();
    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();

    if (profile?.role !== 'admin') {
      return { success: false, records: [], error: 'Forbidden: Admin access required.' };
    }

    let query = admin
      .from('attendance_records')
      .select(`
        id, session_id, status, xp_awarded, marked_at, override_reason,
        attendance_sessions ( session_date, session_topic, section ),
        subjects ( code, name ),
        students:student_id ( id, roll_no, profiles ( full_name ) ),
        verifier:marked_by ( full_name )
      `)
      .order('marked_at', { ascending: false })
      .limit(50);

    const { data, error } = await query;
    if (error || !data) {
      return { success: false, records: [], error: 'Failed to fetch attendance records.' };
    }

    const records: AttendanceAdminRecordItem[] = data.map((r: any) => {
      const sess = r.attendance_sessions;
      const stud = r.students;
      return {
        id: r.id,
        sessionId: r.session_id,
        sessionDate: sess?.session_date || r.marked_at?.substring(0, 10),
        sessionTopic: sess?.session_topic || null,
        subjectCode: r.subjects?.code || 'SUBJ',
        subjectName: r.subjects?.name || 'Subject',
        studentId: stud?.id || '',
        studentName: stud?.profiles?.full_name || 'Student',
        studentRollNo: stud?.roll_no || '',
        status: r.status as AttendanceRecordStatus,
        markedByName: r.verifier?.full_name || 'Staff',
        overrideReason: r.override_reason || null,
        xpAwarded: r.xp_awarded || 0,
        markedAt: r.marked_at,
      };
    });

    const filtered = searchQuery?.trim()
      ? records.filter(
          (r) =>
            r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.studentRollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.subjectCode.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : records;

    return { success: true, records: filtered };
  } catch (err: any) {
    return { success: false, records: [], error: err.message || 'Server error.' };
  }
}

/**
 * 5. Admin Override Class Attendance Record (Idempotent XP Adjustments & Audit Trail).
 */
export async function adminOverrideAttendanceRecordAction(input: {
  recordId: string;
  newStatus: AttendanceRecordStatus;
  overrideReason: string;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized.' };

    const admin = createAdminClient();
    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();

    if (profile?.role !== 'admin') {
      return { success: false, error: 'Forbidden: Admin access required.' };
    }

    if (!input.overrideReason?.trim()) {
      return { success: false, error: 'Validation error: An override reason is required.' };
    }

    const { data: record, error: recErr } = await admin
      .from('attendance_records')
      .select('id, session_id, student_id, status, xp_awarded, xp_event_id')
      .eq('id', input.recordId)
      .single();

    if (recErr || !record) {
      return { success: false, error: 'Attendance record not found.' };
    }

    const oldStatus = record.status;
    if (oldStatus === input.newStatus) {
      return { success: true }; // No change
    }

    let xpGranted = record.xp_awarded;
    let eventId = record.xp_event_id;

    if (input.newStatus === 'present') {
      // Award XP
      const refId = `att:${record.session_id}:${record.student_id}`;
      const { data: xpRes, error: xpErr } = await admin.rpc('award_xp', {
        p_student_id: record.student_id,
        p_action_type: 'ATTENDANCE_MARKED',
        p_reference_id: refId,
        p_extra_units: 0,
        p_actor: user.id,
      });

      if (!xpErr && xpRes && xpRes.status === 'awarded') {
        xpGranted = xpRes.xp_awarded || 5;
        eventId = xpRes.event_id || null;
      }
    } else {
      // If changing from present to absent/excused, void the XP safely
      if (oldStatus === 'present' && record.xp_event_id) {
        try {
          await admin.rpc('void_xp', {
            p_event_id: record.xp_event_id,
            p_reason: input.overrideReason.trim(),
            p_actor: user.id,
          });
        } catch (e) {
          console.error('Error voiding attendance XP:', e);
        }
      }
      xpGranted = 0;
      eventId = null;
    }

    // Update attendance record
    await admin
      .from('attendance_records')
      .update({
        status: input.newStatus,
        marked_by: user.id,
        override_reason: input.overrideReason.trim(),
        xp_awarded: xpGranted,
        xp_event_id: eventId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.recordId);

    await writeAuditLog({
      actorId: user.id,
      action: 'ADMIN_OVERRIDE_ATTENDANCE',
      targetType: 'attendance_record',
      targetId: input.recordId,
      reason: input.overrideReason.trim(),
      details: {
        student_id: record.student_id,
        previous_status: oldStatus,
        new_status: input.newStatus,
        xp_awarded: xpGranted,
      },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Server error overriding attendance.' };
  }
}

/**
 * 6. Fetch Club Participations for Admin Override Management.
 */
export async function getAdminClubParticipationsAction(searchQuery?: string): Promise<{
  success: boolean;
  participations: ClubParticipationAdminItem[];
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, participations: [], error: 'Unauthorized.' };

    const admin = createAdminClient();
    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();

    if (profile?.role !== 'admin') {
      return { success: false, participations: [], error: 'Forbidden: Admin access required.' };
    }

    const { data, error } = await admin
      .from('club_participations')
      .select(`
        id, activity_id, status, xp_awarded, verified_at, override_reason,
        club_activities (
          title, activity_date,
          clubs ( name, code )
        ),
        students:student_id ( id, roll_no, profiles ( full_name ) ),
        verifier:verified_by ( full_name )
      `)
      .order('verified_at', { ascending: false })
      .limit(50);

    if (error || !data) {
      return { success: false, participations: [], error: 'Failed to fetch club participations.' };
    }

    const participations: ClubParticipationAdminItem[] = data.map((p: any) => {
      const act = p.club_activities;
      const clb = act?.clubs;
      const stud = p.students;

      return {
        id: p.id,
        activityId: p.activity_id,
        activityTitle: act?.title || 'Club Activity',
        activityDate: act?.activity_date || p.verified_at?.substring(0, 10),
        clubName: clb?.name || 'Club',
        clubCode: clb?.code || 'CLUB',
        studentId: stud?.id || '',
        studentName: stud?.profiles?.full_name || 'Student',
        studentRollNo: stud?.roll_no || '',
        status: p.status as ClubParticipationStatus,
        verifiedByName: p.verifier?.full_name || 'Staff',
        overrideReason: p.override_reason || null,
        xpAwarded: p.xp_awarded || 0,
        verifiedAt: p.verified_at,
      };
    });

    const filtered = searchQuery?.trim()
      ? participations.filter(
          (p) =>
            p.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.studentRollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.activityTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.clubName.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : participations;

    return { success: true, participations: filtered };
  } catch (err: any) {
    return { success: false, participations: [], error: err.message || 'Server error.' };
  }
}

/**
 * 7. Admin Override Club Activity Participation (Idempotent XP Adjustments & Audit Trail).
 */
export async function adminOverrideClubParticipationAction(input: {
  participationId: string;
  newStatus: ClubParticipationStatus;
  overrideReason: string;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized.' };

    const admin = createAdminClient();
    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();

    if (profile?.role !== 'admin') {
      return { success: false, error: 'Forbidden: Admin access required.' };
    }

    if (!input.overrideReason?.trim()) {
      return { success: false, error: 'Validation error: An override reason is required.' };
    }

    const { data: part, error: partErr } = await admin
      .from('club_participations')
      .select('id, activity_id, student_id, status, xp_awarded, xp_event_id')
      .eq('id', input.participationId)
      .single();

    if (partErr || !part) {
      return { success: false, error: 'Club participation record not found.' };
    }

    const oldStatus = part.status;
    if (oldStatus === input.newStatus) {
      return { success: true };
    }

    let xpGranted = part.xp_awarded;
    let eventId = part.xp_event_id;

    if (input.newStatus === 'verified') {
      const refId = `club:${part.activity_id}:${part.student_id}`;
      const { data: xpRes, error: xpErr } = await admin.rpc('award_xp', {
        p_student_id: part.student_id,
        p_action_type: 'CLUB_ACTIVITY',
        p_reference_id: refId,
        p_extra_units: 0,
        p_actor: user.id,
      });

      if (!xpErr && xpRes && xpRes.status === 'awarded') {
        xpGranted = xpRes.xp_awarded || 15;
        eventId = xpRes.event_id || null;
      }
    } else {
      if (oldStatus === 'verified' && part.xp_event_id) {
        try {
          await admin.rpc('void_xp', {
            p_event_id: part.xp_event_id,
            p_reason: input.overrideReason.trim(),
            p_actor: user.id,
          });
        } catch (e) {
          console.error('Error voiding club XP:', e);
        }
      }
      xpGranted = 0;
      eventId = null;
    }

    await admin
      .from('club_participations')
      .update({
        status: input.newStatus,
        verified_by: user.id,
        override_reason: input.overrideReason.trim(),
        xp_awarded: xpGranted,
        xp_event_id: eventId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.participationId);

    await writeAuditLog({
      actorId: user.id,
      action: 'ADMIN_OVERRIDE_CLUB_PARTICIPATION',
      targetType: 'club_participation',
      targetId: input.participationId,
      reason: input.overrideReason.trim(),
      details: {
        student_id: part.student_id,
        previous_status: oldStatus,
        new_status: input.newStatus,
        xp_awarded: xpGranted,
      },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Server error overriding club participation.' };
  }
}
