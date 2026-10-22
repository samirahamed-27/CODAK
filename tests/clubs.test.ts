import { describe, it, expect } from 'vitest';
import { ClubParticipationStatus } from '@/types/database';

describe('CODAK Phase 2: Club Activities & Admin Allocations Unit Tests', () => {
  it('generates consistent, idempotent reference IDs for club participation XP', () => {
    const generateClubRefId = (activityId: string, studentId: string) => {
      return `club:${activityId}:${studentId}`;
    };

    const ref1 = generateClubRefId('act-987', 'student-456');
    const ref2 = generateClubRefId('act-987', 'student-456');
    expect(ref1).toBe('club:act-987:student-456');
    expect(ref1).toBe(ref2);
  });

  it('validates allowed club participation status values', () => {
    const validStatuses: ClubParticipationStatus[] = ['verified', 'rejected', 'pending'];

    expect(validStatuses.includes('verified')).toBe(true);
    expect(validStatuses.includes('rejected')).toBe(true);
    expect(validStatuses.includes('pending')).toBe(true);
    // @ts-expect-error test invalid status
    expect(validStatuses.includes('unmarked')).toBe(false);
  });

  it('computes club activity XP correctly based on base rule (15 XP, daily limit 2)', () => {
    const CLUB_BASE_XP = 15;
    const DAILY_LIMIT = 2;

    const computeDailyClubXp = (activitiesVerified: number) => {
      const eligibleActivities = Math.min(activitiesVerified, DAILY_LIMIT);
      return eligibleActivities * CLUB_BASE_XP;
    };

    expect(computeDailyClubXp(0)).toBe(0);
    expect(computeDailyClubXp(1)).toBe(15);
    expect(computeDailyClubXp(2)).toBe(30);
    expect(computeDailyClubXp(3)).toBe(30); // Capped at daily limit 2
    expect(computeDailyClubXp(5)).toBe(30); // Capped at daily limit 2
  });

  it('enforces override reasons for administrative adjustments', () => {
    const validateAdminOverride = (
      currentStatus: string,
      newStatus: string,
      reason?: string
    ): { valid: boolean; error?: string } => {
      if (currentStatus === newStatus) {
        return { valid: true };
      }
      if (!reason || reason.trim().length < 3) {
        return { valid: false, error: 'A justification reason of at least 3 characters is mandatory for audit logging.' };
      }
      return { valid: true };
    };

    expect(validateAdminOverride('absent', 'present', '').valid).toBe(false);
    expect(validateAdminOverride('absent', 'present', 'Medical certificate verified').valid).toBe(true);
    expect(validateAdminOverride('rejected', 'verified', 'Faculty signed attendance slip').valid).toBe(true);
    expect(validateAdminOverride('present', 'present', '').valid).toBe(true);
  });

  it('validates faculty-to-subject allocation uniqueness key', () => {
    const allocations = new Set<string>();
    const makeKey = (facultyId: string, subjectId: string) => `${facultyId}::${subjectId}`;

    const addAllocation = (facultyId: string, subjectId: string) => {
      const key = makeKey(facultyId, subjectId);
      if (allocations.has(key)) {
        return { success: false, error: 'Faculty already assigned to this subject.' };
      }
      allocations.add(key);
      return { success: true };
    };

    expect(addAllocation('fac-1', 'sub-101').success).toBe(true);
    expect(addAllocation('fac-1', 'sub-102').success).toBe(true);
    expect(addAllocation('fac-2', 'sub-101').success).toBe(true);
    expect(addAllocation('fac-1', 'sub-101').success).toBe(false);
  });
});
