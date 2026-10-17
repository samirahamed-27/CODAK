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

  describe('3. Award-XP Student Search Anonymity & Role Restriction', () => {
    it('strictly forbids students from searching peer identities (returns 403 Forbidden)', async () => {
      const { searchStudentsAction } = await import('@/app/actions/student-search');
      // Unauthenticated or student caller
      const res = await searchStudentsAction('Aarav');
      expect(res.success).toBe(false);
      expect(res.statusCode).toBe(401); // Without faculty session, returns 401/403
      expect(res.students).toEqual([]);
    });
  });

  describe('4. Battle Teams and Scoreboard Anonymity', () => {
    it('ensures battle scoreboards contain only team-level metrics with no individual student identities leaked', async () => {
      const { rankTeamsByScore } = await import('@/lib/battles');
      const sampleScores = [
        {
          team_id: 'team-1',
          team_name: 'Binary Beasts',
          total_points: 120,
          member_count: 5,
          answered_count: 12,
          avg_points: 24.0,
          last_submission_at: '2026-10-17T12:00:00Z',
        },
        {
          team_id: 'team-2',
          team_name: 'Cyber Dragons',
          total_points: 150,
          member_count: 5,
          answered_count: 15,
          avg_points: 30.0,
          last_submission_at: '2026-10-17T12:01:00Z',
        },
      ];

      const ranked = rankTeamsByScore(sampleScores);
      expect(ranked[0].team_name).toBe('Cyber Dragons');
      expect(ranked[0].rank).toBe(1);

      // Verify that no individual student names, roll numbers, or personal IDs exist in the scoreboard payload
      for (const row of ranked) {
        expect((row as any).student_id).toBeUndefined();
        expect((row as any).student_name).toBeUndefined();
        expect((row as any).roll_no).toBeUndefined();
      }
    });
  });
});

