import React from 'react';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import { PlaceholderCard } from '@/components/PlaceholderCard';
import { Gamepad2 } from 'lucide-react';

export default function StudentPlayPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 pb-20">
      <Navbar role="student" userName="Aarav Sharma" />

      <main className="flex-1 max-w-md w-full mx-auto px-4 py-6 flex flex-col gap-4">
        <h1 className="text-xl font-extrabold text-white tracking-tight">Play Area</h1>
        <p className="text-xs text-slate-400 -mt-2 mb-2">
          Casual practice and 1v1 asynchronous quiz duels.
        </p>

        <PlaceholderCard
          title="Play Modes & Quiz Duels"
          description="Challenge classmates to friendly 5-question duels. Matched with peers of equal skill, with zero penalty for losses and no negative points."
          phase="Coming in Phase 2 & 3"
          icon={Gamepad2}
          features={[
            'Practice Mode (skill warmup with anti-farming limits)',
            'Async 1v1 Quiz Duels with classmates',
            'Zero negative points: losing never takes away XP',
            'Anonymous/opt-out support in every play mode'
          ]}
        />
      </main>

      <BottomNav />
    </div>
  );
}
