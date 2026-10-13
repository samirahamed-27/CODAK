/**
 * Database Types & Role Enums for Gamified Learning Platform
 */

export type UserRole = 'student' | 'faculty' | 'admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_anonymous: boolean;
  avatar_url?: string | null;
  created_at: string;
}

export interface Student {
  id: string; // Foreign key to profiles.id
  roll_no: string;
  department: string;
  year_of_study: number;
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
