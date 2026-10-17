import { describe, it, expect } from 'vitest';
import { formatDuelSummaries } from '@/lib/duels';
import { formatLeagueStandingMembers, MemberOutcomeResult } from '@/lib/leagues';

describe('H1: Server-Side Anonymous Mode Scope Across All Student Listings', () => {
  describe('1. Duel Opponents & Duel History Anonymization', () => {
    const mockDuels = [
      {
        id: 'duel-1',
        status: 'completed',
        challenger_id: 'student-me',
        challenged_id: 'student-anon',
        challenger_score: 5,
        challenger_time_seconds: 30,
        challenger_submitted_at: '2026-10-17T10:00:00Z',
        challenged_score: 4,
        challenged_time_seconds: 40,
        challenged_submitted_at: '2026-10-17T10:05:00Z',
        winner_id: 'student-me',
        is_draw: false,
        expires_at: '2026-10-18T10:00:00Z',
        created_at: '2026-10-17T09:00:00Z',
        challenger: { roll_no: 'CS-ME-01', profiles: { full_name: 'Me Student', is_anonymous: false } },
        challenged: { roll_no: 'CS-ANON-02', profiles: { full_name: 'Secret Player', is_anonymous: true } },
      },
      {
        id: 'duel-2',
        status: 'completed',
        challenger_id: 'student-me',
        challenged_id: 'student-public',
        challenger_score: 3,
        challenger_time_seconds: 45,
        challenger_submitted_at: '2026-10-17T11:00:00Z',
        challenged_score: 5,
        challenged_time_seconds: 25,
        challenged_submitted_at: '2026-10-17T11:05:00Z',
        winner_id: 'student-public',
        is_draw: false,
        expires_at: '2026-10-18T11:00:00Z',
        created_at: '2026-10-17T10:30:00Z',
        challenger: { roll_no: 'CS-ME-01', profiles: { full_name: 'Me Student', is_anonymous: false } },
        challenged: { roll_no: 'CS-PUB-03', profiles: { full_name: 'Public Player', is_anonymous: false } },
      },
    ];

    it('scrubs name and roll number when peer student views anonymous duel opponent', () => {
      const summaries = formatDuelSummaries(mockDuels, 'student-me', 'student');

      // Duel 1: Anonymous opponent
      expect(summaries[0].opponentName).toBe('Anonymous');
      expect(summaries[0].opponentRollNo).toBeUndefined();

      // Duel 2: Public opponent
      expect(summaries[1].opponentName).toBe('Public Player');
      expect(summaries[1].opponentRollNo).toBe('CS-PUB-03');
    });

    it('reveals real name and roll number to faculty and admin reviewers', () => {
      const facultyView = formatDuelSummaries(mockDuels, 'student-me', 'faculty');
      expect(facultyView[0].opponentName).toBe('Secret Player');
      expect(facultyView[0].opponentRollNo).toBe('CS-ANON-02');

      const adminView = formatDuelSummaries(mockDuels, 'student-me', 'admin');
      expect(adminView[0].opponentName).toBe('Secret Player');
      expect(adminView[0].opponentRollNo).toBe('CS-ANON-02');
    });
  });

  describe('2. League Standing Member List Anonymization', () => {
    const mockOutcomes: MemberOutcomeResult[] = [
      {
        studentId: 'student-anon',
        studentName: 'Private Student',
        rollNo: 'CS-ANON-99',
        weeklyXp: 500,
        rank: 1,
        isAnonymous: true,
        isMe: false,
        outcome: 'promoted',
        newTierId: 'silver',
      },
      {
        studentId: 'student-me',
        studentName: 'Myself',
        rollNo: 'CS-ME-01',
        weeklyXp: 350,
        rank: 2,
        isAnonymous: true, // Even if I am anonymous, I should see myself
        isMe: true,
        outcome: 'promoted',
        newTierId: 'silver',
      },
      {
        studentId: 'student-public',
        studentName: 'Open Leader',
        rollNo: 'CS-OPEN-07',
        weeklyXp: 200,
        rank: 3,
        isAnonymous: false,
        isMe: false,
        outcome: 'retained',
        newTierId: 'bronze',
      },
    ];

    it('scrubs anonymous peer standing: peer sees Anonymous with no roll number', () => {
      const standings = formatLeagueStandingMembers(mockOutcomes, 'student-me', 'student');

      // Rank 1: Anonymous peer
      expect(standings[0].name).toBe('Anonymous');
      expect(standings[0].rollNo).toBeUndefined();

      // Rank 2: Myself (even though isAnonymous is true)
      expect(standings[1].name).toBe('Myself');
      expect(standings[1].rollNo).toBe('CS-ME-01');
      expect(standings[1].isMe).toBe(true);

      // Rank 3: Public peer
      expect(standings[2].name).toBe('Open Leader');
      expect(standings[2].rollNo).toBe('CS-OPEN-07');
    });

    it('reveals real names and roll numbers in league standings to faculty and admin', () => {
      const facultyStandings = formatLeagueStandingMembers(mockOutcomes, 'student-me', 'faculty');
      expect(facultyStandings[0].name).toBe('Private Student');
      expect(facultyStandings[0].rollNo).toBe('CS-ANON-99');

      const adminStandings = formatLeagueStandingMembers(mockOutcomes, 'student-me', 'admin');
      expect(adminStandings[0].name).toBe('Private Student');
      expect(adminStandings[0].rollNo).toBe('CS-ANON-99');
    });
  });
});
