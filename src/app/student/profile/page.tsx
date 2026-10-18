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
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#07080b]/75">
        <Aurora
          colorStops={['#2c0fa1', '#104572', '#2284c1']}
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

        <main className="flex-1 max-w-md w-full mx-auto px-4 py-6 flex flex-col gap-6">
          {/* Profile Card */}
          <section
            aria-label="Student profile card"
            className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 text-center shadow-xl backdrop-blur-xl relative"
          >
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 mx-auto flex items-center justify-center text-3xl shadow-xl shadow-indigo-500/25 mb-4">
            👨‍🎓
          </div>
          <h1 className="text-xl font-bold text-white mb-1">{studentName}</h1>
          <div className="flex items-center justify-center gap-2 mb-2">
            <RankChip rank={rankProgress?.currentRank} level={levelInfo.level} size="sm" showLevel />
          </div>
          <p className="text-xs text-indigo-400 font-semibold mb-4">
            {rollNo} • Year {yearOfStudy}
          </p>

          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-800 text-left mb-4">
            <div className="col-span-2">
              <span className="text-[10px] text-slate-500 uppercase block font-medium">Campus</span>
              <span className="text-xs text-white font-semibold truncate block" title={campusName}>{campusName}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-medium">Department</span>
              <span className="text-xs text-slate-300 font-semibold">{department}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-medium">Timezone</span>
              <span className="text-xs text-slate-300 font-semibold">Asia/Kolkata</span>
            </div>
          </div>

          <a
            href="/api/auth/signout"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-white border border-rose-500/25 hover:border-rose-500/40 text-xs font-semibold transition-all active:scale-[0.98] shadow-sm cursor-target"
            data-cursor-label="Log out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log out</span>
          </a>
        </section>

        {/* Rank Progression Section (Lifetime Rank Ladder & Max Rank Progress) */}
        <RankProgressSection progress={rankProgress} allTiers={allTiers} />

        {/* Badges Showcase (Earned and Locked Badges Grouped by Rank & Milestones) */}
        <section
          aria-label="Student Badges"
          className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white">Badges & Achievements</h2>
            </div>
            <span className="text-[11px] text-amber-400/90 font-semibold">
              {badges.filter((b) => b.isEarned).length} / {badges.length} Unlocked
            </span>
          </div>

          {badges.length === 0 ? (
            <p className="text-xs text-slate-500 py-3">Loading badge milestones...</p>
          ) : (
            <div className="space-y-6">
              {/* Group 1: Academic Rank Badges */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                    <span>Academic Rank Badges</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {badges.filter((b) => b.category === 'RANK' && b.isEarned).length} / {badges.filter((b) => b.category === 'RANK').length} Unlocked
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <span>Learning Milestones & Quests</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {badges.filter((b) => b.category !== 'RANK' && b.isEarned).length} / {badges.filter((b) => b.category !== 'RANK').length} Unlocked
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-bold text-white">XP History Ledger</h2>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              {events.length} {events.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          {loading ? (
            <p className="text-xs text-slate-500 py-4">Reading ledger events...</p>
          ) : events.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-slate-800 rounded-2xl">
              <Clock className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-medium">No learning activities recorded yet.</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
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
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                      isValid
                        ? 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                        : 'bg-rose-950/20 border-rose-900/30 opacity-70'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-200">
                          {formatActionName(event.action_type)}
                        </span>
                        {!isValid && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Adjusted
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono truncate max-w-[200px]">
                        {event.reference_id}
                      </div>
                      {!isValid && (
                        <div className="text-[11px] text-amber-300/90 font-medium mt-1">
                          XP adjusted by faculty: {event.void_reason || 'Administrative adjustment'}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400 mt-0.5">
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
                        className={`text-sm font-black font-mono ${
                          isValid ? 'text-emerald-400' : 'text-slate-500 line-through'
                        }`}
                      >
                        +{event.xp_amount} XP
                      </span>
                      {!isValid && (
                        <div className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">
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

        {/* Server-Enforced Anonymous Mode Toggle */}
        <section
          aria-label="Anonymous mode toggle"
          className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                <EyeOff className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Anonymous Mode</h2>
                <p className="text-[11px] text-slate-400">Opt out of public leaderboard names</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleAnonymous}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${
                isAnonymous ? 'bg-indigo-600' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  isAnonymous ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
            <strong className="text-slate-300 block mb-0.5">Server-Enforced Privacy:</strong>
            When enabled, your name is replaced by a fun avatar on the server before reaching any API responses. Faculty and admins can always see your real identity.
          </div>
        </section>

        {/* Account Session & Log out */}
        <section
          aria-label="Account session actions"
          className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between"
        >
          <div>
            <h2 className="text-sm font-bold text-white">Active Session</h2>
            <p className="text-[11px] text-slate-400">Signed in as {studentName}</p>
          </div>

          <a
            href="/api/auth/signout"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 hover:border-rose-500/40 transition-all active:scale-95 cursor-target"
            data-cursor-label="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log out</span>
          </a>
        </section>
      </main>

      <BottomNav />
    </div>
  </div>
  );
}
