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
import { getStudentDashboardDataAction } from '@/app/actions/student-dashboard';
import { CelebrationManager, triggerCelebrationCheck } from '@/components/animations/CelebrationManager';
import { createClient } from '@/lib/supabase/client';

export default function StudentDashboardPage() {
  const [profile, setProfile] = useState<StudentProfile>(initialStudentProfile);
  const [activityCalendar, setActivityCalendar] = useState<Record<string, number> | undefined>(undefined);
  const [streakInfo, setStreakInfo] = useState<{
    currentStreak: number;
    longestStreak: number;
    freezeDaysRemaining: number;
    lastQuizDate: string | null;
    isTodayCompleted: boolean;
    maxDailyQuizXp: number;
    loading: boolean;
  }>({
    currentStreak: 0,
    longestStreak: 0,
    freezeDaysRemaining: 2,
    lastQuizDate: null,
    isTodayCompleted: false,
    maxDailyQuizXp: 40,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;

    // Load real student profile, ledger XP, and academic info
    getStudentDashboardDataAction().then(async (res) => {
      if (!mounted) return;
      if (res.success && res.authenticated) {
        setProfile(res.profile);
        if (res.activityCalendar && Object.keys(res.activityCalendar).length > 0) {
          setActivityCalendar(res.activityCalendar);
        }
      } else {
        // Resilient client-side auth fallback
        try {
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user && mounted) {
            const { data: prof } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', user.id)
              .maybeSingle();

            const { data: stud } = await supabase
              .from('students')
              .select('department, roll_no')
              .eq('id', user.id)
              .maybeSingle();

            const fallbackName =
              prof?.full_name ||
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.email?.split('@')[0] ||
              'Student';

            setProfile((prev) => ({
              ...prev,
              id: user.id,
              name: fallbackName,
              avatarUrl: prof?.avatar_url || prev.avatarUrl,
              rank: stud?.department ? `#1 in ${stud.department}` : prev.rank,
            }));
          }
        } catch {
          // Keep current state
        }
      }
    });

    // Load real streak information
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
    // Check celebration after quest XP
    triggerCelebrationCheck();
  };

  const handleUpdateAvatar = (newUrl: string | null) => {
    setProfile((prev) => ({
      ...prev,
      avatarUrl: newUrl,
    }));
  };

  return (
    <div className="min-h-screen bg-black game-bg-grid text-white flex flex-col font-body selection:bg-white selection:text-black">
      {/* Level-Up & Rank-Up Celebration Manager */}
      <CelebrationManager />
      {/* Sleek Floating Menu Button */}
      <AcademySidebar totalXp={profile.totalXp} />

      {/* Main Dashboard Area */}
      <div className="flex-1 w-full min-h-screen flex flex-col">
        <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 lg:pl-32 flex flex-col gap-6">
          {/* Main Top Header */}
          <AcademyHeader profile={profile} />

          {/* Minimalist Hero: Today's Daily Quiz & Streak Card */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-white/15 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5 transition-all">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 border transition-colors bg-white/10 border-white/20 text-white"
              >
                {streakInfo.isTodayCompleted ? (
                  <CheckCircle2 className="w-6 h-6 text-white" />
                ) : (
                  <Flame className="w-6 h-6 fill-white text-white" />
                )}
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border bg-white/10 border-white/20 text-white"
                  >
                    {streakInfo.isTodayCompleted ? 'Completed Today' : 'Daily Challenge'}
                  </span>
                  <span className="text-[11px] text-zinc-500 font-mono">CS101</span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {streakInfo.isTodayCompleted
                    ? "Today's Daily Quiz Completed"
                    : "Today's Daily Practice Quiz"}
                </h2>
                <p className="text-xs text-zinc-400 max-w-xl">
                  {streakInfo.isTodayCompleted
                    ? 'Great job! You claimed today’s XP and maintained your streak. Feel free to practice more.'
                    : `Answer 5 concept questions to reinforce key topics, earn up to ${streakInfo.maxDailyQuizXp || 40} XP, and keep your streak alive.`}
                </p>
              </div>
            </div>

            {/* Streak Counter & CTA Actions */}
            <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs font-mono">
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <Flame className="w-3.5 h-3.5 fill-white text-white" />
                  <span className="font-semibold">
                    {streakInfo.loading
                      ? '...'
                      : streakInfo.currentStreak > 0
                      ? `${streakInfo.currentStreak}d Streak`
                      : '0d Streak'}
                  </span>
                </div>
                <span className="text-zinc-600">•</span>
                <div className="flex items-center gap-1 text-zinc-300">
                  <Snowflake className="w-3 h-3 text-white" />
                  <span>
                    {streakInfo.loading
                      ? '...'
                      : `${streakInfo.freezeDaysRemaining} Freezes`}
                  </span>
                </div>
              </div>

              <Link
                href="/student/learn"
                className={`flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                  streakInfo.isTodayCompleted
                    ? 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                    : 'bg-white hover:bg-zinc-200 text-black shadow-md shadow-white/20'
                }`}
              >
                <span>
                  {streakInfo.isTodayCompleted
                    ? 'Practice Mode'
                    : 'Start Quiz'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
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
              <WorkReportCard activityData={activityCalendar} />
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
