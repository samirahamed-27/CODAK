import React from 'react';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import { PlaceholderCard } from '@/components/PlaceholderCard';
import { BookOpen } from 'lucide-react';
import Shuffle from '@/components/Shuffle';

export default function StudentLearnPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#07080B] game-bg-grid pb-20">
      <Navbar role="student" userName="Aarav Sharma" />

      <main className="flex-1 max-w-md w-full mx-auto px-4 py-6 flex flex-col gap-4">
        <Shuffle
          text="LEARN AREA"
          tag="h1"
          effect="slide"
          duration={0.35}
          stagger={0.03}
          triggerOnHover={true}
          color="#FFFFFF"
          accentColor="#7DD3FC"
          style={{ fontSize: '1.25rem', letterSpacing: '0.05em' }}
        />
        <p className="text-xs text-slate-400 -mt-2 mb-2">
          Daily curriculum, concept quizzes, and verifiable academic quests.
        </p>

        <PlaceholderCard
          title="Learn Hub & Practice Engine"
          description="A dedicated space to master concepts with instant step-by-step explanations, daily question banks, and progress milestones."
          phase="Coming in Phase 2 & 3"
          icon={BookOpen}
          features={[
            'Daily Concept Quiz (CSV Question Bank integration)',
            'Topic Practice with detailed explanations',
            'Academic Quests with ledger-backed XP rewards',
            'Streak Freeze and recovery rules'
          ]}
        />
      </main>

      <BottomNav />
    </div>
  );
}
