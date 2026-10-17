'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { getFacultyAnalyticsAction } from '@/app/actions/faculty-analytics';
import { FacultyAnalyticsData } from '@/lib/faculty-analytics';
import {
  Users,
  Flame,
  Award,
  BookOpen,
  CheckSquare,
  AlertTriangle,
  TrendingUp,
  UserX,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

export default function FacultyDashboardPage() {
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FacultyAnalyticsData | null>(null);

  useEffect(() => {
    async function loadAnalytics() {
      setLoading(true);
      setError(null);
      const res = await getFacultyAnalyticsAction({
        batch: selectedBatch || undefined,
      });

      if (!res.success || !res.data) {
        setError(res.error || 'Failed to load faculty analytics.');
      } else {
        setData(res.data);
      }
      setLoading(false);
    }

    loadAnalytics();
  }, [selectedBatch]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 pb-16 text-slate-100">
      <Navbar role="faculty" userName="Faculty Staff" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 flex flex-col gap-8">
        {/* Top Header & Fast Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 border border-purple-500/20 text-purple-400 mb-2">
              <Users className="w-3.5 h-3.5" />
              Faculty Academic Intelligence
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Academic Engagement & Learning Analytics
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Verifiable telemetry from the immutable XP ledger, daily quiz submissions, and active streaks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/faculty/questions"
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white text-xs font-semibold transition-all"
            >
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>Question Review</span>
            </Link>
            <Link
              href="/faculty/award-xp"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 transition-all"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Award Student XP</span>
            </Link>
          </div>
        </div>

        {/* Batch Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Filter className="w-4 h-4 text-purple-400" />
            <span>Filter Cohort / Batch:</span>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
            >
              <option value="">All Batches (Campus-Wide)</option>
              {data?.availableBatches.map((b) => (
                <option key={`${b.department}-${b.yearOfStudy}`} value={`${b.department}-${b.yearOfStudy}`}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block text-sm mb-0.5">Access Restriction</strong>
              <span>{error}</span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
            <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
            <span className="text-xs">Compiling real-time student analytics...</span>
          </div>
        ) : data ? (
          <>
            {/* 4 Key Engagement Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: 7-Day Active Students */}
              <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">7-Day Active Students</span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-white">
                    {data.activeStudents7d}{' '}
                    <span className="text-xs font-normal text-slate-400">/ {data.totalStudents}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(data.activeRate7d, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-indigo-400">{data.activeRate7d}%</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Today Quiz Completion */}
              <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Today's Quiz Completion</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-white">
                    {data.dailyQuizCompletedCount}{' '}
                    <span className="text-xs font-normal text-slate-400">/ {data.totalStudents}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(data.dailyQuizCompletionRate, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-emerald-400">{data.dailyQuizCompletionRate}%</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Average Streak */}
              <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Average Streak</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Flame className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-white">
                    {data.averageStreak}{' '}
                    <span className="text-xs font-normal text-slate-400">Days</span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Strict Asia/Kolkata midnight streak logic
                  </span>
                </div>
              </div>

              {/* Card 4: Quiet Students Flagged */}
              <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Quiet Students (&gt;= 5d)</span>
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                    <UserX className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-rose-400">
                    {data.quietStudents.length}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    No XP activity in 5 or more days
                  </span>
                </div>
              </div>
            </div>

            {/* XP Volume Trend (7 Days) */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-400" />
                    7-Day XP Inflow Velocity
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Total learning points awarded across daily quizzes, duels, battles, and manual actions.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2 pt-4 border-t border-slate-800/80">
                {data.xpTrend.map((t) => {
                  const maxDayXp = Math.max(...data.xpTrend.map((d) => d.totalXp), 100);
                  const heightPercent = Math.max(Math.round((t.totalXp / maxDayXp) * 100), 8);

                  return (
                    <div key={t.date} className="flex flex-col items-center gap-2">
                      <div className="w-full h-28 bg-slate-950/80 rounded-xl flex items-end p-1.5 border border-slate-800/60">
                        <div
                          className="w-full bg-gradient-to-t from-purple-600 to-indigo-500 rounded-lg transition-all duration-500 flex items-center justify-center text-[10px] font-bold text-white shadow-md shadow-purple-600/20"
                          style={{ height: `${heightPercent}%` }}
                        >
                          {t.totalXp > 0 && <span className="opacity-90">{t.totalXp}</span>}
                        </div>
                      </div>
                      <span className="text-[10px] font-medium text-slate-400">
                        {t.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Deep-Dive Columns: Weak Topics & Quiet Students */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Top 3 Weak Topics */}
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-white">Priority Weak Topics</h2>
                        <span className="text-[11px] text-slate-400">
                          Lowest student accuracy across quiz answers
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                      Min 20 Answers Required
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed mt-2 mb-4">
                    Topics with fewer than 20 recorded submissions are excluded to prevent small-sample distortion.
                  </p>

                  {data.topWeakTopics.length === 0 ? (
                    <div className="py-8 px-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center flex flex-col items-center gap-2">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      <span className="text-xs font-semibold text-slate-300">
                        No critical weak topics detected
                      </span>
                      <p className="text-[11px] text-slate-500 max-w-xs">
                        All topics with at least 20 submissions currently have acceptable passing rates.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {data.topWeakTopics.map((topic, idx) => (
                        <div
                          key={topic.topic}
                          className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] flex items-center justify-center font-bold">
                                #{idx + 1}
                              </span>
                              {topic.topic}
                            </span>
                            <span className="text-xs font-extrabold text-rose-400">
                              {topic.correctRate}% Correct
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full"
                                style={{ width: `${topic.correctRate}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-slate-400">
                              {topic.correctAnswers} / {topic.totalAnswers} correct
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500">
                  Tip: Target these topics in next week's practice sets and live battles.
                </div>
              </div>

              {/* Right Column: Quiet Students Monitoring */}
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                        <UserX className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-white">Quiet & Disengaged Students</h2>
                        <span className="text-[11px] text-slate-400">
                          No learning activity in &gt;= 5 calendar days
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                      {data.quietStudents.length} Flagged
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed mt-2 mb-4">
                    Faculty-only view. Real student identities and roll numbers are shown to allow timely academic intervention.
                  </p>

                  {data.quietStudents.length === 0 ? (
                    <div className="py-8 px-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center flex flex-col items-center gap-2">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      <span className="text-xs font-semibold text-slate-300">
                        Excellent cohort engagement!
                      </span>
                      <p className="text-[11px] text-slate-500 max-w-xs">
                        Every student in this cohort has earned learning XP within the past 5 days.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                      {data.quietStudents.map((qs) => (
                        <div
                          key={qs.id}
                          className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-white">{qs.fullName}</div>
                            <div className="text-[11px] text-slate-400">
                              {qs.rollNo} • {qs.department} (Year {qs.yearOfStudy})
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-extrabold block">
                              {qs.daysInactive >= 999 ? 'Never Active' : `${qs.daysInactive}d Inactive`}
                            </span>
                            <span className="text-[10px] text-slate-500 mt-0.5 block">
                              {qs.lastActiveDate ? `Last: ${qs.lastActiveDate}` : 'No XP ledger records'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Intervention threshold: 5 days without XP
                  </span>
                  <Link
                    href="/faculty/award-xp"
                    className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    <span>Award Makeup XP</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
