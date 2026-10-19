import React from 'react';
import { AcademicLeaderboardView } from '@/components/leaderboard/AcademicLeaderboardView';

export const metadata = {
  title: 'Faculty Leaderboard & Campus Standings | CODAK',
  description: 'Academic comparison, inter-campus standings, and departmental average analytics.',
};

export default function FacultyLeaderboardPage() {
  return <AcademicLeaderboardView role="faculty" />;
}
