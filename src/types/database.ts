/**
 * Database Types & Role Enums for CODAK Platform
 */

export type UserRole = 'student' | 'faculty' | 'admin';

export interface Campus {
  id: string;
  slug: string;
  name: string;
  city: string;
  sort_order: number;
  is_active: boolean;
  is_other: boolean;
  created_at: string;
}

export interface RankTier {
  id: string;
  slug: string;
  name: string;
  min_level: number;
  color: string;
  icon_key: string;
  description: string;
  sort_order: number;
  created_at?: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_anonymous: boolean;
  avatar_url?: string | null;
  campus_id?: string | null;
  campus_other_name?: string | null;
  campuses?: Campus | null;
  created_at: string;
}

export interface Student {
  id: string; // Foreign key to profiles.id
  roll_no: string;
  department: string;
  year_of_study: number;
  last_celebrated_level?: number;
  last_celebrated_rank?: string;
  created_at: string;
}

export interface Faculty {
  id: string; // Foreign key to profiles.id
  employee_id: string;
  department: string;
  designation: string;
  created_at: string;
}

export interface XpRule {
  id: string;
  action_type: string;
  display_name: string;
  base_xp: number;
  extra_xp: number;
  daily_limit: number | null;
  active: boolean;
  created_at: string;
}

export type XpEventStatus = 'valid' | 'voided';

export interface XpEvent {
  id: string;
  student_id: string;
  action_type: string;
  xp_amount: number;
  reference_id: string;
  status: XpEventStatus;
  void_reason?: string | null;
  created_at: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  created_at: string;
}

export interface FacultySubject {
  id: string;
  faculty_id: string;
  subject_id: string;
  section: string;
  academic_year: string;
  created_at: string;
  subjects?: Subject;
}

export interface StudentSubject {
  id: string;
  student_id: string;
  subject_id: string;
  section: string;
  academic_year: string;
  created_at: string;
  subjects?: Subject;
}

export type AttendanceSessionStatus = 'active' | 'completed' | 'cancelled';
export type AttendanceRecordStatus = 'present' | 'absent' | 'excused';
export type VerificationMethod = 'manual' | 'session_code' | 'ble' | 'gps';

export interface AttendanceSession {
  id: string;
  subject_id: string;
  section: string;
  faculty_id: string;
  session_date: string;
  session_topic?: string | null;
  status: AttendanceSessionStatus;
  created_at: string;
  updated_at: string;
  subjects?: Subject;
  profiles?: Profile;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  subject_id: string;
  status: AttendanceRecordStatus;
  marked_by: string;
  override_reason?: string | null;
  verification_method: VerificationMethod;
  xp_awarded: number;
  xp_event_id?: string | null;
  marked_at: string;
  updated_at: string;
}

export interface Club {
  id: string;
  name: string;
  code: string;
  category: string;
  description?: string | null;
  lead_faculty_id?: string | null;
  is_active: boolean;
  created_at: string;
  profiles?: Profile;
}

export type ClubActivityStatus = 'upcoming' | 'completed' | 'cancelled';
export type ClubParticipationStatus = 'pending' | 'verified' | 'rejected';

export interface ClubActivity {
  id: string;
  club_id: string;
  title: string;
  description?: string | null;
  activity_date: string;
  status: ClubActivityStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  clubs?: Club;
}

export interface ClubParticipation {
  id: string;
  activity_id: string;
  student_id: string;
  status: ClubParticipationStatus;
  verified_by: string;
  rejection_reason?: string | null;
  override_reason?: string | null;
  xp_awarded: number;
  xp_event_id?: string | null;
  verified_at: string;
  updated_at: string;
  club_activities?: ClubActivity;
  students?: Student;
}


