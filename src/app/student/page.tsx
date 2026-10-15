'use client';

import React, { useState } from 'react';
import { AcademySidebar } from '@/components/academy/AcademySidebar';
import { AcademyHeader } from '@/components/academy/AcademyHeader';
import { ProfileCard } from '@/components/academy/ProfileCard';
import { WorkReportCard } from '@/components/academy/WorkReportCard';
import { ToDoCard } from '@/components/academy/ToDoCard';
import { DeadlinesCard } from '@/components/academy/DeadlinesCard';
import { ScoreCard } from '@/components/academy/ScoreCard';
import { initialStudentProfile, StudentProfile } from '@/data/studentDashboardData';
import { levelFromXp } from '@/lib/levels';

export default function StudentDashboardPage() {
  const [profile, setProfile] = useState<StudentProfile>(initialStudentProfile);

  // Dynamic XP reward handler (e.g. completing a quest adds +10 XP)
  const handleQuestCompleted = (xpEarned: number) => {
    setProfile((prev) => {
      const newTotalXp = prev.totalXp + xpEarned;
      const newLevel = levelFromXp(newTotalXp).level;
      return {
        ...prev,
        totalXp: newTotalXp,
        level: newLevel,
      };
    });
  };

  const handleUpdateAvatar = (newUrl: string | null) => {
    setProfile((prev) => ({
      ...prev,
      avatarUrl: newUrl,
    }));
  };

  return (
    <div className="min-h-screen bg-[#06080F] game-bg-grid text-white flex flex-col lg:flex-row font-body selection:bg-[#7CC4FF] selection:text-[#06080F]">
      {/* 1. Left Fixed Sidebar (~18% width on desktop, drawer on mobile) */}
      <AcademySidebar totalXp={profile.totalXp} />

      {/* 2. Main Dashboard Area */}
      <div className="flex-1 lg:ml-[18%] min-h-screen flex flex-col pt-16 lg:pt-0">
        <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
          {/* Main Top Header */}
          <AcademyHeader profile={profile} />

          {/* ROW 1: Three Cards (Profile Pic, Work Report [widest], To do) */}
          <section
            aria-label="Student Overview and Daily Quests"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-stretch"
          >
            {/* Card 1: Profile Pic Card (Left, 3 cols) */}
            <div className="lg:col-span-3 flex flex-col">
              <ProfileCard
                profile={profile}
                onUpdateAvatar={handleUpdateAvatar}
              />
            </div>

            {/* Card 2: Work Report Card (Middle, Widest, 5 cols) */}
            <div className="lg:col-span-5 flex flex-col">
              <WorkReportCard />
            </div>

            {/* Card 3: To do Card (Right, 4 cols) */}
            <div className="md:col-span-2 lg:col-span-4 flex flex-col">
              <ToDoCard onQuestCompleted={handleQuestCompleted} />
            </div>
          </section>

          {/* ROW 2: Two Cards (Summary/deadlines [narrower], Score [wider]) */}
          <section
            aria-label="Coursework and Academic Performance"
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch pb-10"
          >
            {/* Card 4: Summary/deadlines Card (Left, Narrower, 4 cols) */}
            <div className="lg:col-span-4 flex flex-col">
              <DeadlinesCard />
            </div>

            {/* Card 5: Score Card (Right, Wider, 8 cols) */}
            <div className="lg:col-span-8 flex flex-col">
              <ScoreCard />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
