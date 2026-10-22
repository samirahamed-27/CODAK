'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit-logs';
import { AttendanceRecordStatus, AttendanceSessionStatus } from '@/types/database';

export interface FacultyCourseItem {
  subjectId: string;
  code: string;
  name: string;
  section: string;
  academicYear: string;
}

export interface StudentRosterAttendanceItem {
  studentId: string;
  fullName: string;
  rollNo: string;
  department: string;
  status: AttendanceRecordStatus | 'unmarked';
  overrideReason?: string | null;
  xpAwarded?: number;
  markedAt?: string | null;
}

export interface AttendanceSessionDetails {
  id: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  section: string;
  facultyId: string;
  sessionDate: string;
  sessionTopic?: string | null;
  status: AttendanceSessionStatus;
  createdAt: string;
}

export interface AttendanceHistoryItem {
  id: string;
  sessionId: string;
  sessionDate: string;
  subjectCode: string;
  subjectName: string;
  topic?: string | null;
  status: AttendanceRecordStatus;
  xpAwarded: number;
  verifierName: string;
  markedAt: string;
  overrideReason?: string | null;
}

export interface SubjectAttendanceBreakdown {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  attendedSessions: number;
  totalSessions: number;
  percentage: number;
}

/**
 * 1. Fetch courses/sections assigned to the authenticated faculty member (or all for admin).
 */
export async function getFacultyCoursesAction(): Promise<{
  success: boolean;
  courses: FacultyCourseItem[];
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, courses: [], error: 'Unauthorized: Please log in.' };
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'faculty' && profile.role !== 'admin')) {
      return { success: false, courses: [], error: 'Forbidden: Only faculty and admins can view course rosters.' };
    }

    if (profile.role === 'admin') {
      // Admins see all subjects
      const { data: allSubjects, error: subErr } = await admin
        .from('subjects')
        .select('id, code, name')
        .order('code');

      if (subErr || !allSubjects) {
        return { success: false, courses: [], error: 'Failed to load subjects.' };
      }

      return {
        success: true,
        courses: allSubjects.map((s) => ({
          subjectId: s.id,
          code: s.code,
          name: s.name,
          section: 'A',
          academicYear: '2026-2027',
        })),
      };
    }

    // Faculty: query faculty_subjects
    const { data: assigned, error: assignErr } = await admin
      .from('faculty_subjects')
      .select(`
        subject_id,
        section,
        academic_year,
        subjects ( id, code, name )
      `)
      .eq('faculty_id', user.id);

    if (assignErr || !assigned) {
      return { success: false, courses: [], error: 'Failed to load assigned subjects.' };
    }

    const courses: FacultyCourseItem[] = assigned
      .filter((row: any) => row.subjects)
      .map((row: any) => ({
        subjectId: row.subject_id,
        code: row.subjects.code,
        name: row.subjects.name,
        section: row.section,
        academicYear: row.academic_year,
      }));

    return { success: true, courses };
  } catch (err: any) {
    return { success: false, courses: [], error: err.message || 'Server error loading courses.' };
  }
}

/**
 * 2. Create an Attendance Session for a subject and section.
 */
export async function createAttendanceSessionAction(input: {
  subjectId: string;
  section: string;
  sessionTopic?: string;
}): Promise<{
  success: boolean;
  session?: AttendanceSessionDetails;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized: Please log in.' };
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'faculty' && profile.role !== 'admin')) {
      return { success: false, error: 'Forbidden: Insufficient privileges.' };
    }

    // If faculty, verify authorization for this subject and section
    if (profile.role === 'faculty') {
      const { data: isAuth } = await admin
        .from('faculty_subjects')
        .select('id')
        .eq('faculty_id', user.id)
        .eq('subject_id', input.subjectId)
        .eq('section', input.section)
        .maybeSingle();

      if (!isAuth) {
        return { success: false, error: 'Forbidden: You are not assigned to this subject/section.' };
      }
    }

    const { data: subject } = await admin
      .from('subjects')
      .select('code, name')
      .eq('id', input.subjectId)
      .single();

    if (!subject) {
      return { success: false, error: 'Subject not found.' };
    }

    const { data: session, error: sessErr } = await admin
      .from('attendance_sessions')
      .insert({
        subject_id: input.subjectId,
        section: input.section,
        faculty_id: user.id,
        session_topic: input.sessionTopic ? input.sessionTopic.trim() : null,
        status: 'active',
      })
      .select('*')
      .single();

    if (sessErr || !session) {
      return { success: false, error: `Failed to create session: ${sessErr?.message}` };
    }

    await writeAuditLog({
      actorId: user.id,
      action: 'CREATE_ATTENDANCE_SESSION',
      targetType: 'attendance_session',
      targetId: session.id,
      reason: `Created attendance session for ${subject.code} (${input.section})`,
      details: {
        subject_id: input.subjectId,
        section: input.section,
        session_topic: input.sessionTopic,
      },
    });

    return {
      success: true,
      session: {
        id: session.id,
        subjectId: session.subject_id,
        subjectCode: subject.code,
        subjectName: subject.name,
        section: session.section,
        facultyId: session.faculty_id,
        sessionDate: session.session_date,
        sessionTopic: session.session_topic,
        status: session.status,
        createdAt: session.created_at,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Server error creating session.' };
  }
}

/**
 * 3. Fetch Session Details and Enrolled Student Roster with current attendance status.
 */
export async function getSessionRosterAction(sessionId: string): Promise<{
  success: boolean;
  session?: AttendanceSessionDetails;
  roster: StudentRosterAttendanceItem[];
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, roster: [], error: 'Unauthorized.' };
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'faculty' && profile.role !== 'admin')) {
      return { success: false, roster: [], error: 'Forbidden.' };
    }

    // Fetch session
    const { data: session, error: sessErr } = await admin
      .from('attendance_sessions')
      .select(`
        id, subject_id, section, faculty_id, session_date, session_topic, status, created_at,
        subjects ( code, name )
      `)
      .eq('id', sessionId)
      .single();

    if (sessErr || !session) {
      return { success: false, roster: [], error: 'Session not found.' };
    }

    // Check authorization: must be creator or admin
    if (profile.role !== 'admin' && session.faculty_id !== user.id) {
      return { success: false, roster: [], error: 'Forbidden: You do not manage this session.' };
    }

    // Fetch enrolled students for this subject & section
    const { data: enrolled, error: enrollErr } = await admin
      .from('student_subjects')
      .select(`
        student_id,
        students (
          id,
          roll_no,
          department,
          profiles ( full_name )
        )
      `)
      .eq('subject_id', session.subject_id)
      .eq('section', session.section);

    if (enrollErr || !enrolled) {
      return { success: false, roster: [], error: 'Failed to fetch enrolled students.' };
    }

    // Fetch existing attendance records for this session
    const { data: existingRecords } = await admin
      .from('attendance_records')
      .select('student_id, status, override_reason, xp_awarded, marked_at')
      .eq('session_id', sessionId);

    const recordMap = new Map<string, any>();
    if (existingRecords) {
      for (const r of existingRecords) {
        recordMap.set(r.student_id, r);
      }
    }

    const roster: StudentRosterAttendanceItem[] = enrolled
      .filter((row: any) => row.students && row.students.profiles)
      .map((row: any) => {
        const student = row.students;
        const profileInfo = student.profiles;
        const rec = recordMap.get(student.id);

        return {
          studentId: student.id,
          fullName: profileInfo.full_name,
          rollNo: student.roll_no,
          department: student.department,
          status: rec ? rec.status : 'unmarked',
          overrideReason: rec?.override_reason || null,
          xpAwarded: rec?.xp_awarded ?? 0,
          markedAt: rec?.marked_at || null,
        };
      })
      .sort((a, b) => a.rollNo.localeCompare(b.rollNo));

    const subj = (session as any).subjects;
    const sessionDetails: AttendanceSessionDetails = {
      id: session.id,
      subjectId: session.subject_id,
      subjectCode: subj?.code || '',
      subjectName: subj?.name || '',
      section: session.section,
      facultyId: session.faculty_id,
      sessionDate: session.session_date,
      sessionTopic: session.session_topic,
      status: session.status,
      createdAt: session.created_at,
    };

    return { success: true, session: sessionDetails, roster };
  } catch (err: any) {
    return { success: false, roster: [], error: err.message || 'Server error loading roster.' };
  }
}

/**
 * 4. Submit or Update Attendance Roster with Idempotent XP Awarding & Voiding.
 */
export async function submitAttendanceRosterAction(input: {
  sessionId: string;
  entries: Array<{
    studentId: string;
    status: AttendanceRecordStatus;
    overrideReason?: string;
  }>;
}): Promise<{
  success: boolean;
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  totalXpAwarded: number;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, presentCount: 0, absentCount: 0, excusedCount: 0, totalXpAwarded: 0, error: 'Unauthorized.' };
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'faculty' && profile.role !== 'admin')) {
      return { success: false, presentCount: 0, absentCount: 0, excusedCount: 0, totalXpAwarded: 0, error: 'Forbidden.' };
    }

    // Verify session
    const { data: session, error: sessErr } = await admin
      .from('attendance_sessions')
      .select('id, subject_id, section, faculty_id, status')
      .eq('id', input.sessionId)
      .single();

    if (sessErr || !session) {
      return { success: false, presentCount: 0, absentCount: 0, excusedCount: 0, totalXpAwarded: 0, error: 'Session not found.' };
    }

    if (profile.role !== 'admin' && session.faculty_id !== user.id) {
      return { success: false, presentCount: 0, absentCount: 0, excusedCount: 0, totalXpAwarded: 0, error: 'Forbidden: You do not manage this session.' };
    }

    // Fetch existing records for this session to handle diffs/overrides
    const { data: existingRecords } = await admin
      .from('attendance_records')
      .select('id, student_id, status, xp_awarded, xp_event_id')
      .eq('session_id', input.sessionId);

    const existingMap = new Map<string, any>();
    if (existingRecords) {
      for (const r of existingRecords) {
        existingMap.set(r.student_id, r);
      }
    }

    let presentCount = 0;
    let absentCount = 0;
    let excusedCount = 0;
    let totalXpAwarded = 0;

    for (const entry of input.entries) {
      const existing = existingMap.get(entry.studentId);
      const isOverride = !!existing && existing.status !== entry.status;
      const refId = `att:${input.sessionId}:${entry.studentId}`;

      if (entry.status === 'present') {
        presentCount++;
        let xpGranted = existing?.xp_awarded || 0;
        let eventId = existing?.xp_event_id || null;

        // If not already awarded XP for this session
        if (!existing || existing.status !== 'present' || !existing.xp_event_id) {
          const { data: xpRes, error: xpErr } = await admin.rpc('award_xp', {
            p_student_id: entry.studentId,
            p_action_type: 'ATTENDANCE_MARKED',
            p_reference_id: refId,
            p_extra_units: 0,
            p_actor: user.id,
          });

          if (!xpErr && xpRes && xpRes.status === 'awarded') {
            xpGranted = xpRes.xp_awarded || 5;
            eventId = xpRes.event_id || null;
            totalXpAwarded += xpGranted;
          } else if (xpRes && xpRes.status === 'duplicate') {
            // Already awarded previously in ledger
            xpGranted = 5;
          }
        }

        // Upsert record
        await admin
          .from('attendance_records')
          .upsert({
            session_id: input.sessionId,
            student_id: entry.studentId,
            subject_id: session.subject_id,
            status: 'present',
            marked_by: user.id,
            override_reason: entry.overrideReason?.trim() || null,
            verification_method: 'manual',
            xp_awarded: xpGranted,
            xp_event_id: eventId,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'session_id, student_id' });

      } else {
        if (entry.status === 'absent') absentCount++;
        if (entry.status === 'excused') excusedCount++;

        // If previously marked PRESENT and had XP awarded, safely void the XP via void_xp
        if (existing && existing.status === 'present' && existing.xp_event_id) {
          const reason = entry.overrideReason?.trim() || `Attendance changed to ${entry.status}`;
          try {
            await admin.rpc('void_xp', {
              p_event_id: existing.xp_event_id,
              p_reason: reason,
              p_actor: user.id,
            });
          } catch (e) {
            console.error('Error voiding attendance XP:', e);
          }
        }

        // Upsert record with absent/excused
        await admin
          .from('attendance_records')
          .upsert({
            session_id: input.sessionId,
            student_id: entry.studentId,
            subject_id: session.subject_id,
            status: entry.status,
            marked_by: user.id,
            override_reason: entry.overrideReason?.trim() || null,
            verification_method: 'manual',
            xp_awarded: 0,
            xp_event_id: null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'session_id, student_id' });
      }

      if (isOverride) {
        await writeAuditLog({
          actorId: user.id,
          action: 'OVERRIDE_ATTENDANCE',
          targetType: 'student',
          targetId: entry.studentId,
          reason: entry.overrideReason?.trim() || `Status updated from ${existing.status} to ${entry.status}`,
          details: {
            session_id: input.sessionId,
            previous_status: existing.status,
            new_status: entry.status,
          },
        });
      }
    }

    // Mark session as completed
    await admin
      .from('attendance_sessions')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', input.sessionId);

    await writeAuditLog({
      actorId: user.id,
      action: 'RECORD_ATTENDANCE_ROSTER',
      targetType: 'attendance_session',
      targetId: input.sessionId,
      reason: `Recorded attendance: ${presentCount} present, ${absentCount} absent, ${excusedCount} excused`,
      details: {
        total_records: input.entries.length,
        present: presentCount,
        absent: absentCount,
        excused: excusedCount,
        total_xp_awarded: totalXpAwarded,
      },
    });

    return {
      success: true,
      presentCount,
      absentCount,
      excusedCount,
      totalXpAwarded,
    };
  } catch (err: any) {
    return { success: false, presentCount: 0, absentCount: 0, excusedCount: 0, totalXpAwarded: 0, error: err.message || 'Server error saving attendance.' };
  }
}

/**
 * 5. Fetch Session History for a given course & section.
 */
export async function getFacultySessionHistoryAction(subjectId: string, section: string = 'A'): Promise<{
  success: boolean;
  sessions: Array<{
    id: string;
    sessionDate: string;
    sessionTopic?: string | null;
    status: AttendanceSessionStatus;
    presentCount: number;
    totalEnrolled: number;
  }>;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, sessions: [], error: 'Unauthorized.' };

    const admin = createAdminClient();

    // Total enrolled in this class
    const { count: enrolledCount } = await admin
      .from('student_subjects')
      .select('*', { count: 'exact', head: true })
      .eq('subject_id', subjectId)
      .eq('section', section);

    const totalEnrolled = enrolledCount || 0;

    const { data: sessions, error } = await admin
      .from('attendance_sessions')
      .select(`
        id, session_date, session_topic, status,
        attendance_records ( status )
      `)
      .eq('subject_id', subjectId)
      .eq('section', section)
      .order('session_date', { ascending: false })
      .limit(30);

    if (error || !sessions) {
      return { success: false, sessions: [], error: 'Failed to load session history.' };
    }

    const history = sessions.map((s: any) => {
      const records = s.attendance_records || [];
      const presentCount = records.filter((r: any) => r.status === 'present').length;
      return {
        id: s.id,
        sessionDate: s.session_date,
        sessionTopic: s.session_topic,
        status: s.status as AttendanceSessionStatus,
        presentCount,
        totalEnrolled,
      };
    });

    return { success: true, sessions: history };
  } catch (err: any) {
    return { success: false, sessions: [], error: err.message || 'Server error.' };
  }
}

/**
 * 6. Student View: Fetch student's own attendance breakdown and history.
 */
export async function getStudentAttendanceHistoryAction(): Promise<{
  success: boolean;
  overallPercentage: number;
  totalAttendanceXp: number;
  subjectBreakdowns: SubjectAttendanceBreakdown[];
  history: AttendanceHistoryItem[];
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        overallPercentage: 0,
        totalAttendanceXp: 0,
        subjectBreakdowns: [],
        history: [],
        error: 'Unauthorized.',
      };
    }

    const admin = createAdminClient();

    // 1. Fetch student's enrolled subjects
    const { data: enrollments } = await admin
      .from('student_subjects')
      .select(`
        subject_id, section,
        subjects ( id, code, name )
      `)
      .eq('student_id', user.id);

    // 2. Fetch all attendance records for this student
    const { data: records, error: recErr } = await admin
      .from('attendance_records')
      .select(`
        id, session_id, subject_id, status, xp_awarded, marked_at, override_reason,
        attendance_sessions ( id, session_date, session_topic, section ),
        subjects ( id, code, name ),
        profiles:marked_by ( full_name )
      `)
      .eq('student_id', user.id)
      .order('marked_at', { ascending: false });

    if (recErr) {
      return {
        success: false,
        overallPercentage: 0,
        totalAttendanceXp: 0,
        subjectBreakdowns: [],
        history: [],
        error: 'Failed to fetch attendance history.',
      };
    }

    // 3. Compute stats
    let totalPresent = 0;
    let totalAttendanceXp = 0;
    const historyList: AttendanceHistoryItem[] = [];

    const subjectStats = new Map<string, { code: string; name: string; attended: number; total: number }>();

    // Initialize with enrolled subjects
    if (enrollments) {
      for (const e of enrollments as any[]) {
        if (e.subjects) {
          subjectStats.set(e.subject_id, {
            code: e.subjects.code,
            name: e.subjects.name,
            attended: 0,
            total: 0,
          });
        }
      }
    }

    if (records) {
      for (const r of records as any[]) {
        const sess = r.attendance_sessions;
        const subj = r.subjects;
        const verifier = r.profiles?.full_name || 'Faculty Staff';

        if (r.status === 'present') {
          totalPresent++;
          totalAttendanceXp += r.xp_awarded || 0;
        }

        // Add to subject stats
        if (subj) {
          const current = subjectStats.get(subj.id) || {
            code: subj.code,
            name: subj.name,
            attended: 0,
            total: 0,
          };
          current.total += 1;
          if (r.status === 'present') {
            current.attended += 1;
          }
          subjectStats.set(subj.id, current);
        }

        historyList.push({
          id: r.id,
          sessionId: r.session_id,
          sessionDate: sess?.session_date || r.marked_at?.substring(0, 10),
          subjectCode: subj?.code || 'SUBJ',
          subjectName: subj?.name || 'Class Session',
          topic: sess?.session_topic || null,
          status: r.status,
          xpAwarded: r.xp_awarded || 0,
          verifierName: verifier,
          markedAt: r.marked_at,
          overrideReason: r.override_reason || null,
        });
      }
    }

    const totalSessions = historyList.length;
    const overallPercentage = totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 100;

    const subjectBreakdowns: SubjectAttendanceBreakdown[] = Array.from(subjectStats.entries()).map(([subId, stat]) => ({
      subjectId: subId,
      subjectCode: stat.code,
      subjectName: stat.name,
      attendedSessions: stat.attended,
      totalSessions: stat.total,
      percentage: stat.total > 0 ? Math.round((stat.attended / stat.total) * 100) : 100,
    }));

    return {
      success: true,
      overallPercentage,
      totalAttendanceXp,
      subjectBreakdowns,
      history: historyList,
    };
  } catch (err: any) {
    return {
      success: false,
      overallPercentage: 0,
      totalAttendanceXp: 0,
      subjectBreakdowns: [],
      history: [],
      error: err.message || 'Server error loading student attendance.',
    };
  }
}
