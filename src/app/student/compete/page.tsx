import React from 'react';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import { PlaceholderCard } from '@/components/PlaceholderCard';
import { Trophy } from 'lucide-react';

export default function StudentCompetePage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 pb-20">
      <Navbar role="student" userName="Aarav Sharma" />

      <main className="flex-1 max-w-md w-full mx-auto px-4 py-6 flex flex-col gap-4">
        <h1 className="text-xl font-extrabold text-white tracking-tight">Compete Area</h1>
        <p className="text-xs text-slate-400 -mt-2 mb-2">
          Weekly leagues, department standings, and live team battles.
        </p>

        <PlaceholderCard
          title="Weekly Leagues & Team Battles"
          description="Compete in 30-student weekly league cohorts (Bronze, Silver, Gold). Fresh resets every Sunday midnight ensure any student who fell behind can still climb to the top."
          phase="Coming in Phase 3 & 4"
          icon={Trophy}
          features={[
            'Weekly League Cohorts with Sunday midnight reset',
            'Department & Campus Leaderboards',
            'Live Team Battles with real-time scoreboard',
            'Server-side Anonymous Mode for opt-out privacy'
          ]}
        />
      </main>

      <BottomNav />
    </div>
  );
}
