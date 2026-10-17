'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import { createClient } from '@/lib/supabase/client';
import { levelFromXp, LevelProgress } from '@/lib/levels';
import { XpEvent } from '@/types/database';
import { ShieldCheck, EyeOff, Award, Sparkles, TrendingUp, History, Clock } from 'lucide-react';
import Aurora from '@/components/Aurora';
import { BadgeTile } from '@/components/ui/game-elements';
import { getStudentBadgesAction, StudentBadgeDisplay } from '@/app/actions/badges';
import { updateAnonymousPreferenceAction } from '@/app/actions/leaderboard';

export default function StudentProfilePage() {
  const supabase = createClient();

  const [studentName, setStudentName] = useState('Student');
  const [rollNo, setRollNo] = useState('CS-2026-042');
  const [department, setDepartment] = useState('Computer Science');
  const [yearOfStudy, setYearOfStudy] = useState(1);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [totalXp, setTotalXp] = useState(0);
  const [levelInfo, setLevelInfo] = useState<LevelProgress>(levelFromXp(0));
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
        // Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile) {
          setStudentName(profile.full_name);
          setIsAnonymous(profile.is_anonymous);
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
        <Navbar role="student" userName={studentName} />

        <main className="flex-1 max-w-md w-full mx-auto px-4 py-6 flex flex-col gap-6">
          {/* Profile Card */}
          <section
            aria-label="Student profile card"
            className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 text-center shadow-xl backdrop-blur-xl"
          >
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 mx-auto flex items-center justify-center text-3xl shadow-xl shadow-indigo-500/25 mb-4">
            👨‍🎓
          </div>
          <h1 className="text-xl font-bold text-white mb-1">{studentName}</h1>
          <p className="text-xs text-indigo-400 font-semibold mb-4">
            {rollNo} • Year {yearOfStudy}
          </p>

          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-800 text-left">
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-medium">Department</span>
              <span className="text-xs text-slate-300 font-semibold">{department}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-medium">Timezone</span>
              <span className="text-xs text-slate-300 font-semibold">Asia/Kolkata</span>
            </div>
          </div>
        </section>

        {/* Level & XP Progress Card */}
        <section
          aria-label="Level progress"
          className="p-6 rounded-3xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/30 shadow-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 block mb-0.5">
                Current Standing
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">Level {levelInfo.level}</span>
                <span className="text-xs font-semibold text-slate-400">Scholar</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-0.5">
                Total Ledger XP
              </span>
              <span className="text-xl font-black text-indigo-300 flex items-center gap-1 justify-end">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                {totalXp} XP
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
              <span>{levelInfo.xpIntoLevel} / {levelInfo.xpForNextLevel} XP</span>
              <span className="text-indigo-400 font-bold">{levelInfo.progressPercent}%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-950 border border-slate-800 p-0.5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                style={{ width: `${levelInfo.progressPercent}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 text-right">
              {levelInfo.xpForNextLevel - levelInfo.xpIntoLevel} XP to Level {levelInfo.level + 1}
            </p>
          </div>
        </section>

        {/* Badges Showcase (Earned and Locked Badges) */}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {badges.map((badge) => (
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
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Voided
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono truncate max-w-[200px]">
                        {event.reference_id}
                      </div>
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
      </main>

      <BottomNav />
    </div>
  </div>
  );
}
