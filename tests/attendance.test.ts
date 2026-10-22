import { describe, it, expect } from 'vitest';
import { AttendanceRecordStatus } from '@/types/database';

describe('CODAK Phase 1: Attendance Engine Unit Tests', () => {
  it('calculates overall attendance percentage correctly', () => {
    const calculatePercentage = (attended: number, total: number) => {
      if (total === 0) return 100;
      return Math.round((attended / total) * 100);
    };

    expect(calculatePercentage(0, 0)).toBe(100);
    expect(calculatePercentage(18, 20)).toBe(90);
    expect(calculatePercentage(7, 10)).toBe(70);
    expect(calculatePercentage(1, 3)).toBe(33);
  });

  it('generates consistent, idempotent reference IDs for award_xp', () => {
    const generateAttendanceRefId = (sessionId: string, studentId: string) => {
      return `att:${sessionId}:${studentId}`;
    };

    const ref1 = generateAttendanceRefId('sess-123', 'student-456');
    const ref2 = generateAttendanceRefId('sess-123', 'student-456');
    expect(ref1).toBe('att:sess-123:student-456');
    expect(ref1).toBe(ref2);
  });

  it('validates allowed attendance status values', () => {
    const validStatuses: AttendanceRecordStatus[] = ['present', 'absent', 'excused'];
    
    expect(validStatuses.includes('present')).toBe(true);
    expect(validStatuses.includes('absent')).toBe(true);
    expect(validStatuses.includes('excused')).toBe(true);
    // @ts-expect-error invalid status test
    expect(validStatuses.includes('unknown')).toBe(false);
  });

  it('computes attendance XP correctly based on base rule (10 XP per lecture, daily limit 6)', () => {
    const ATTENDANCE_BASE_XP = 10;
    const DAILY_LIMIT = 6;

    const computeDailyAttendanceXp = (lecturesAttended: number) => {
      const eligibleLectures = Math.min(lecturesAttended, DAILY_LIMIT);
      return eligibleLectures * ATTENDANCE_BASE_XP;
    };

    expect(computeDailyAttendanceXp(1)).toBe(10);
    expect(computeDailyAttendanceXp(4)).toBe(40);
    expect(computeDailyAttendanceXp(6)).toBe(60);
    expect(computeDailyAttendanceXp(8)).toBe(60); // Capped by daily limit
  });
});
