'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import { createClient } from '@/lib/supabase/client';
import { levelFromXp, LevelProgress } from '@/lib/levels';
import { XpEvent } from '@/types/database';
import { ShieldCheck, EyeOff, Award, Sparkles, TrendingUp, History, Clock, LogOut } from 'lucide-react';
import Aurora from '@/components/Aurora';
import { BadgeTile } from '@/components/ui/game-elements';
import { getStudentBadgesAction, StudentBadgeDisplay } from '@/app/actions/badges';
import { updateAnonymousPreferenceAction } from '@/app/actions/leaderboard';
import { formatCampusDisplayName } from '@/lib/campus';
import { RankChip } from '@/components/ranks/RankChip';
import { RankProgressSection } from '@/components/ranks/RankProgressSection';
import { getMyRankProgressAction, getRankTiersAction } from '@/app/actions/ranks';
import { RankTier } from '@/types/database';
import { RankProgress } from '@/lib/ranks';
import { CelebrationManager } from '@/components/animations/CelebrationManager';

export default function StudentProfilePage() {
  const supabase = createClient();

  const [studentName, setStudentName] = useState('Student');
  const [rollNo, setRollNo] = useState('CS-2026-042');
  const [department, setDepartment] = useState('Computer Science');
  const [yearOfStudy, setYearOfStudy] = useState(1);
  const [campusName, setCampusName] = useState('Unassigned');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [totalXp, setTotalXp] = useState(0);
  const [levelInfo, setLevelInfo] = useState<LevelProgress>(levelFromXp(0));
  const [rankProgress, setRankProgress] = useState<RankProgress | null>(null);
  const [allTiers, setAllTiers] = useState<RankTier[]>([]);
  const [events, setEvents] = useState<XpEvent[]>([]);
  const [badges, setBadges] = useState<StudentBadgeDisplay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStudentData() {
      setLoading(true);

      // 1. Get current logged-in user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let studentId = user?.id;

      if (user) {
        // Fetch profile with campus relation
        const { data: profile } = await supabase
          .from('profiles')
          .select('*, campuses(*)')
          .eq('id', user.id)
          .single();

        if (profile) {
          setStudentName(profile.full_name);
          setIsAnonymous(profile.is_anonymous);
          setCampusName(formatCampusDisplayName(profile.campuses as any, profile.campus_other_name));
        }

        // Fetch student record
        const { data: studentRecord } = await supabase
          .from('students')
          .select('*')
          .eq('id', user.id)
          .single();

        if (studentRecord) {
          setRollNo(studentRecord.roll_no);
          setDepartment(studentRecord.department);
          setYearOfStudy(studentRecord.year_of_study);
        }
      }

      // If in demo mode or not logged in, fallback to demo student ID
      if (!studentId) {
        const { data: demoStudent } = await supabase
          .from('students')
          .select('id, roll_no, department, profiles(full_name, is_anonymous)')
          .limit(1)
          .single();

        if (demoStudent) {
          studentId = demoStudent.id;
          setRollNo(demoStudent.roll_no);
          setDepartment(demoStudent.department);
          setStudentName((demoStudent as any).profiles?.full_name || 'Aarav Sharma');
        }
      }

      if (studentId) {
        // Fetch ledger events (RLS isolates this strictly to student's own rows)
        const { data: eventsData } = await supabase
          .from('xp_events')
          .select('*')
          .eq('student_id', studentId)
          .order('created_at', { ascending: false });

        if (eventsData) {
          const rows = eventsData as XpEvent[];
          setEvents(rows);

          // Calculate total from valid ledger rows
          const sum = rows
            .filter((e) => e.status === 'valid')
            .reduce((acc, curr) => acc + curr.xp_amount, 0);

          setTotalXp(sum);
          setLevelInfo(levelFromXp(sum));
        }

        // Fetch student badges (earned and locked)
        try {
          const badgeRes = await getStudentBadgesAction(studentId);
          if (badgeRes.success) {
            setBadges(badgeRes.badges);
          }
        } catch (e) {
          console.error('Error fetching badges in profile:', e);
        }

        // Fetch rank progress and tiers
        try {
          const [rankRes, tiersRes] = await Promise.all([
            getMyRankProgressAction(studentId),
            getRankTiersAction(),
          ]);
          if (rankRes.success && rankRes.progress) {
            setRankProgress(rankRes.progress);
          }
          if (tiersRes.success && tiersRes.tiers) {
            setAllTiers(tiersRes.tiers);
          }
        } catch (e) {
          console.error('Error fetching rank progress in profile:', e);
        }
      }

      setLoading(false);
    }

    fetchStudentData();
  }, []);

  const handleToggleAnonymous = async () => {
    const nextVal = !isAnonymous;
    setIsAnonymous(nextVal);
    try {
      await updateAnonymousPreferenceAction(nextVal);
    } catch (e) {
      console.error('Failed to update anonymous preference:', e);
      setIsAnonymous(!nextVal);
    }
  };

  const formatActionName = (action: string) => {
    return action
      .split('_')
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <div className="min-h-screen flex flex-col relative pb-24 overflow-x-hidden bg-transparent">
      {/* Ambient WebGL Aurora Background for Profile Page */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black/80">
        <Aurora
          colorStops={['#ffffff', '#27272a', '#09090b']}
          amplitude={1.1}
          blend={0.5}
          height={0.55}
          speed={0.9}
          glow={0.6}
          scale={1}
          brightness={1}
          layers={1}
          direction="top"
          mouseInteraction={true}
        />
      </div>

      <div className="relative z-10 flex-1 flex flex-col w-full">
        {/* Celebration Manager for Level-Up and Rank-Up */}
        <CelebrationManager />

        <Navbar role="student" userName={studentName} />

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
          {/* Wide & Clean Profile Overview Card */}
          <section
            aria-label="Student profile overview"
            className="p-6 sm:p-8 rounded-3xl bg-zinc-900/60 border border-zinc-800 shadow-2xl backdrop-blur-xl relative overflow-hidden"
          >
            <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 sm:gap-8">
              {/* Avatar & Student Details */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6 text-center sm:text-left">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-zinc-700 via-zinc-800 to-zinc-950 border border-zinc-600/80 p-1 shadow-2xl shadow-black/60 flex items-center justify-center text-4xl shrink-0">
                  <div className="w-full h-full rounded-2xl bg-zinc-900/90 flex items-center justify-center">
                    👨‍🎓
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{studentName}</h1>
                    <RankChip rank={rankProgress?.currentRank} level={levelInfo.level} size="sm" showLevel />
                  </div>
                  <p className="text-xs font-mono text-zinc-400">
                    Roll No: <span className="text-white font-medium">{rollNo}</span> • Year {yearOfStudy} • {department}
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2 text-xs text-zinc-400">
                    <div className="px-3 py-1.5 rounded-xl bg-black/50 border border-zinc-800 flex items-center gap-2">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">Campus</span>
                      <span className="text-white font-medium truncate max-w-[220px]" title={campusName}>{campusName}</span>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-black/50 border border-zinc-800 flex items-center gap-2">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">Timezone</span>
                      <span className="text-zinc-300 font-medium">Asia/Kolkata</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="shrink-0 flex items-center gap-3 self-center md:self-start">
                <a
                  href="/api/auth/signout"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 hover:border-zinc-500 text-xs font-semibold transition-all active:scale-[0.98] shadow-sm cursor-target"
                  data-cursor-label="Log out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log out</span>
                </a>
              </div>
            </div>
          </section>

          {/* Rank Progression Section (Lifetime Rank Ladder & Max Rank Progress) */}
          <RankProgressSection progress={rankProgress} allTiers={allTiers} />

          {/* Badges Showcase (Earned and Locked Badges Grouped by Rank & Milestones) */}
          <section
            aria-label="Student Badges"
            className="p-6 sm:p-8 rounded-3xl bg-zinc-900/80 border border-zinc-800 shadow-xl"
          >
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <Award className="w-5 h-5 text-white" />
                <h2 className="text-base font-bold text-white">Badges & Achievements</h2>
              </div>
              <span className="text-xs text-zinc-300 font-mono font-semibold px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700">
                {badges.filter((b) => b.isEarned).length} / {badges.length} Unlocked
              </span>
            </div>

            {badges.length === 0 ? (
              <p className="text-xs text-zinc-500 py-3">Loading badge milestones...</p>
            ) : (
              <div className="space-y-8">
                {/* Group 1: Academic Rank Badges */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                      <span>Academic Rank Badges</span>
                    </h3>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {badges.filter((b) => b.category === 'RANK' && b.isEarned).length} / {badges.filter((b) => b.category === 'RANK').length} Unlocked
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {badges
                      .filter((b) => b.category === 'RANK')
                      .sort((a, b) => ((a.criteria as any)?.min_level || 0) - ((b.criteria as any)?.min_level || 0))
                      .map((badge) => (
                        <BadgeTile
                          key={badge.code}
                          code={badge.code}
                          name={badge.name}
                          description={badge.description}
                          category={badge.category}
                          isEarned={badge.isEarned}
                          earnedAt={badge.earnedAt}
                          howToEarn={badge.howToEarn}
                        />
                      ))}
                  </div>
                </div>

                {/* Group 2: Learning Milestones & Achievements */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                      <span>Learning Milestones & Quests</span>
                    </h3>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {badges.filter((b) => b.category !== 'RANK' && b.isEarned).length} / {badges.filter((b) => b.category !== 'RANK').length} Unlocked
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {badges
                      .filter((b) => b.category !== 'RANK')
                      .map((badge) => (
                        <BadgeTile
                          key={badge.code}
                          code={badge.code}
                          name={badge.name}
                          description={badge.description}
                          category={badge.category}
                          isEarned={badge.isEarned}
                          earnedAt={badge.earnedAt}
                          howToEarn={badge.howToEarn}
                        />
                      ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Personal XP History Ledger Feed */}
          <section
            aria-label="Personal XP History"
            className="p-6 sm:p-8 rounded-3xl bg-zinc-900/80 border border-zinc-800 shadow-xl"
          >
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <History className="w-5 h-5 text-white" />
                <h2 className="text-base font-bold text-white">XP History Ledger</h2>
              </div>
              <span className="text-xs text-zinc-400 font-mono px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700">
                {events.length} {events.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>

            {loading ? (
              <p className="text-xs text-zinc-500 py-4">Reading ledger events...</p>
            ) : events.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-zinc-800 rounded-2xl">
                <Clock className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-sm text-zinc-400 font-medium">No learning activities recorded yet.</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Complete daily quizzes or attend lectures to earn XP!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => {
                  const isValid = event.status === 'valid';
                  return (
                    <div
                      key={event.id}
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                        isValid
                          ? 'bg-black/60 border-zinc-800 hover:border-zinc-700'
                          : 'bg-zinc-950/60 border-zinc-800 opacity-70'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-zinc-200">
                            {formatActionName(event.action_type)}
                          </span>
                          {!isValid && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                              Adjusted
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-500 font-mono truncate max-w-[280px]">
                          {event.reference_id}
                        </div>
                        {!isValid && (
                          <div className="text-xs text-zinc-400 font-medium mt-1">
                            XP adjusted by faculty: {event.void_reason || 'Administrative adjustment'}
                          </div>
                        )}
                        <div className="text-xs text-zinc-400 mt-1">
                          {new Date(event.created_at).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'Asia/Kolkata',
                          })}
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-base font-black font-mono ${
                            isValid ? 'text-white' : 'text-zinc-500 line-through'
                          }`}
                        >
                          +{event.xp_amount} XP
                        </span>
                        {!isValid && (
                          <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
                            Adjusted
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Privacy & Session Settings (2-Column Grid on Wide Screens) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Server-Enforced Anonymous Mode Toggle */}
            <section
              aria-label="Anonymous mode toggle"
              className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between gap-4 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white">
                    <EyeOff className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">Anonymous Mode</h2>
                    <p className="text-xs text-zinc-400">Opt out of public leaderboard names</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleAnonymous}
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${
                    isAnonymous ? 'bg-white' : 'bg-zinc-800'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full transition-transform ${
                      isAnonymous ? 'bg-black translate-x-6' : 'bg-zinc-400 translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/60 border border-zinc-800 text-xs text-zinc-400 leading-relaxed">
                <strong className="text-zinc-200 block mb-0.5">Server-Enforced Privacy:</strong>
                When enabled, your name is replaced by a fun avatar on the server before reaching any API responses. Faculty and admins can always see your real identity.
              </div>
            </section>

            {/* Account Session & Log out */}
            <section
              aria-label="Account session actions"
              className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between gap-4 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white">Active Session</h2>
                  <p className="text-xs text-zinc-400">Signed in as {studentName}</p>
                </div>

                <a
                  href="/api/auth/signout"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 transition-all active:scale-95 cursor-target"
                  data-cursor-label="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </a>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/60 border border-zinc-800 text-xs text-zinc-400 leading-relaxed font-mono">
                Security status: Authenticated • Session active on this device.
              </div>
            </section>
          </div>
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
