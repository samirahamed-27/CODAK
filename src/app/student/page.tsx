'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Flame, Snowflake, ArrowRight, CheckCircle2 } from 'lucide-react';
import { AcademySidebar } from '@/components/academy/AcademySidebar';
import { AcademyHeader } from '@/components/academy/AcademyHeader';
import { ProfileCard } from '@/components/academy/ProfileCard';
import { WorkReportCard } from '@/components/academy/WorkReportCard';
import { ToDoCard } from '@/components/academy/ToDoCard';
import { DeadlinesCard } from '@/components/academy/DeadlinesCard';
import { ScoreCard } from '@/components/academy/ScoreCard';
import { initialStudentProfile, StudentProfile } from '@/data/studentDashboardData';
import { levelFromXp } from '@/lib/levels';
import { getStudentStreakAction } from '@/app/actions/quiz';

export default function StudentDashboardPage() {
  const [profile, setProfile] = useState<StudentProfile>(initialStudentProfile);
  const [streakInfo, setStreakInfo] = useState<{
    currentStreak: number;
    longestStreak: number;
    freezeDaysRemaining: number;
    lastQuizDate: string | null;
    isTodayCompleted: boolean;
    loading: boolean;
  }>({
    currentStreak: 0,
    longestStreak: 0,
    freezeDaysRemaining: 2,
    lastQuizDate: null,
    isTodayCompleted: false,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;
    getStudentStreakAction().then((data) => {
      if (mounted) {
        setStreakInfo({
          ...data,
          loading: false,
        });
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

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
    <div className="min-h-screen bg-[#07080B] game-bg-grid text-white flex flex-col font-body selection:bg-sky-400 selection:text-[#07080B]">
      {/* Sleek Floating Menu Button */}
      <AcademySidebar totalXp={profile.totalXp} />

      {/* Main Dashboard Area */}
      <div className="flex-1 w-full min-h-screen flex flex-col">
        <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 lg:pl-32 flex flex-col gap-6">
          {/* Main Top Header */}
          <AcademyHeader profile={profile} />

          {/* PHASE 2 HERO: Today's Daily Quiz & Streak Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div className="flex items-center gap-5 z-10">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 ${
                  streakInfo.isTodayCompleted
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/25'
                    : 'bg-gradient-to-br from-amber-500 to-rose-500 shadow-rose-500/25'
                }`}
              >
                {streakInfo.isTodayCompleted ? (
                  <CheckCircle2 className="w-8 h-8 text-white" />
                ) : (
                  <Flame className="w-8 h-8 animate-pulse text-amber-200" />
                )}
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      streakInfo.isTodayCompleted
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                        : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                    }`}
                  >
                    {streakInfo.isTodayCompleted ? 'Completed for Today' : 'Daily Study Routine'}
                  </span>
                  <span className="text-xs text-slate-400">Asia/Kolkata Calendar</span>
                </div>
                <h2 className="text-xl font-extrabold text-white tracking-tight">
                  {streakInfo.isTodayCompleted
                    ? "Today's Daily Quiz Completed! (CS101)"
                    : "Today's Daily Quiz (CS101)"}
                </h2>
                <p className="text-xs text-slate-300 max-w-lg">
                  {streakInfo.isTodayCompleted
                    ? 'Awesome job! You earned your daily quiz XP and maintained your streak. Feel free to practice more to sharpen your skills.'
                    : 'Answer 5 concept questions to reinforce your learning, earn +15 to +40 XP towards your level, and extend your study streak.'}
                </p>
              </div>
            </div>

            {/* Streak Counter & CTA Actions */}
            <div className="flex items-center gap-3 w-full md:w-auto shrink-0 z-10">
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <Flame className="w-4 h-4 text-rose-500 fill-rose-500" />
                  <span>
                    {streakInfo.loading
                      ? '...'
                      : streakInfo.currentStreak > 0
                      ? `${streakInfo.currentStreak} Day Streak`
                      : '0 Day Streak'}
                  </span>
                </div>
                <span className="text-slate-600">|</span>
                <div className="flex items-center gap-1 text-cyan-300">
                  <Snowflake className="w-3.5 h-3.5 text-cyan-400" />
                  <span>
                    {streakInfo.loading
                      ? '...'
                      : `${streakInfo.freezeDaysRemaining} Freezes Left`}
                  </span>
                </div>
              </div>

              <Link
                href="/student/play"
                className={`flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-white text-xs font-extrabold shadow-lg transition-all hover:scale-[1.02] ${
                  streakInfo.isTodayCompleted
                    ? 'bg-slate-800 hover:bg-slate-700 border border-slate-700 shadow-slate-900/50'
                    : 'bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 shadow-rose-500/25'
                }`}
              >
                <span>{streakInfo.isTodayCompleted ? 'Practice Mode' : "Start Today's Quiz"}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

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
