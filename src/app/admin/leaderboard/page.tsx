import React from 'react';
import { AcademicLeaderboardView } from '@/components/leaderboard/AcademicLeaderboardView';

export const metadata = {
  title: 'Admin Leaderboard & Campus Standings | CODAK',
  description: 'Cross-campus comparative analytics, intra-campus student rankings, and cohort performance benchmarks.',
};

export default function AdminLeaderboardPage() {
  return <AcademicLeaderboardView role="admin" />;
}
