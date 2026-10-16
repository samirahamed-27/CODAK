import { describe, it, expect } from 'vitest';
import { formatLeaderboardEntries } from '@/lib/leaderboards';

describe('Phase 3D: Leaderboards & Server-Enforced Anonymous Mode Suite', () => {
  const sampleStudents = [
    {
      studentId: 'student-1',
      fullName: 'Aarav Sharma',
      rollNo: 'CS-2026-001',
      department: 'Computer Science',
      yearOfStudy: 1,
      totalXp: 500,
      isAnonymous: false,
    },
    {
      studentId: 'student-2',
      fullName: 'Diya Patel',
      rollNo: 'CS-2026-002',
      department: 'Computer Science',
      yearOfStudy: 1,
      totalXp: 750,
      isAnonymous: true, // Anonymous student!
    },
    {
      studentId: 'student-3',
      fullName: 'Rohan Gupta',
      rollNo: 'ECE-2026-045',
      department: 'Electronics',
      yearOfStudy: 1,
      totalXp: 300,
      isAnonymous: false,
    },
  ];

  describe('Server-Side Anonymization for Peer Students', () => {
    it('replaces an anonymous student’s name with "Anonymous" for a peer student caller', () => {
      // Caller is student-1 (peer)
      const res = formatLeaderboardEntries(sampleStudents, 'student-1', 'student');
      const diyaEntry = res.find((s) => s.studentId === 'student-2');

      expect(diyaEntry).toBeDefined();
      expect(diyaEntry?.name).toBe('Anonymous');
      expect(diyaEntry?.name).not.toBe('Diya Patel');
    });

    it('removes roll number completely from payload for peer student caller', () => {
      const res = formatLeaderboardEntries(sampleStudents, 'student-1', 'student');
      const diyaEntry = res.find((s) => s.studentId === 'student-2');

      expect(diyaEntry?.rollNo).toBeUndefined();
    });

    it('preserves non-anonymous student identity for peer student caller', () => {
      const res = formatLeaderboardEntries(sampleStudents, 'student-1', 'student');
      const rohanEntry = res.find((s) => s.studentId === 'student-3');

      expect(rohanEntry?.name).toBe('Rohan Gupta');
      expect(rohanEntry?.rollNo).toBe('ECE-2026-045');
    });
  });

  describe('Student Viewing Their Own Anonymous Rank', () => {
    it('shows real name and roll number to the student themselves even when anonymous mode is on', () => {
      // Caller is student-2 viewing their own ranking
      const res = formatLeaderboardEntries(sampleStudents, 'student-2', 'student');
      const myEntry = res.find((s) => s.studentId === 'student-2');

      expect(myEntry?.isMe).toBe(true);
      expect(myEntry?.name).toBe('Diya Patel');
      expect(myEntry?.rollNo).toBe('CS-2026-002');
      expect(myEntry?.rank).toBe(1); // Top score (750 XP)
    });
  });

  describe('Faculty and Admin Real Identity Oversight', () => {
    it('reveals real name and roll number to faculty regardless of anonymous mode', () => {
      // Caller is faculty
      const res = formatLeaderboardEntries(sampleStudents, 'faculty-1', 'faculty');
      const diyaEntry = res.find((s) => s.studentId === 'student-2');

      expect(diyaEntry?.name).toBe('Diya Patel');
      expect(diyaEntry?.rollNo).toBe('CS-2026-002');
      expect(diyaEntry?.isAnonymous).toBe(true);
    });

    it('reveals real name and roll number to administrator regardless of anonymous mode', () => {
      // Caller is admin
      const res = formatLeaderboardEntries(sampleStudents, 'admin-1', 'admin');
      const diyaEntry = res.find((s) => s.studentId === 'student-2');

      expect(diyaEntry?.name).toBe('Diya Patel');
      expect(diyaEntry?.rollNo).toBe('CS-2026-002');
    });
  });

  describe('Ledger Ranking & Ordering Integrity', () => {
    it('correctly ranks entries descending by total valid XP', () => {
      const res = formatLeaderboardEntries(sampleStudents, 'student-1', 'student');

      expect(res[0].studentId).toBe('student-2'); // 750 XP
      expect(res[0].rank).toBe(1);

      expect(res[1].studentId).toBe('student-1'); // 500 XP
      expect(res[1].rank).toBe(2);

      expect(res[2].studentId).toBe('student-3'); // 300 XP
      expect(res[2].rank).toBe(3);
    });

    it('breaks ties deterministically by student ID', () => {
      const tiedStudents = [
        {
          studentId: 'student-z',
          fullName: 'Student Z',
          rollNo: 'Z-01',
          department: 'CS',
          yearOfStudy: 1,
          totalXp: 100,
          isAnonymous: false,
        },
        {
          studentId: 'student-a',
          fullName: 'Student A',
          rollNo: 'A-01',
          department: 'CS',
          yearOfStudy: 1,
          totalXp: 100,
          isAnonymous: false,
        },
      ];

      const res = formatLeaderboardEntries(tiedStudents, 'guest', 'student');
      expect(res[0].studentId).toBe('student-a');
      expect(res[1].studentId).toBe('student-z');
    });
  });
});
