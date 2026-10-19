'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { getFacultyAnalyticsAction } from '@/app/actions/faculty-analytics';
import { FacultyAnalyticsData } from '@/lib/faculty-analytics';
import {
  getStudentDirectoryAction,
  StudentRosterItem,
} from '@/app/actions/roster';
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
  ShieldAlert,
  Building2,
  Trophy,
  Search,
  RefreshCw,
  GraduationCap,
} from 'lucide-react';
import { RankChip } from '@/components/ranks/RankChip';
import clsx from 'clsx';

export default function FacultyDashboardPage() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'students'>('analytics');
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [selectedCampus, setSelectedCampus] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FacultyAnalyticsData | null>(null);

  // Student Directory State
  const [students, setStudents] = useState<StudentRosterItem[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentsLoading, setStudentsLoading] = useState(true);

  const loadStudents = useCallback(async (campusId?: string, search?: string) => {
    setStudentsLoading(true);
    const res = await getStudentDirectoryAction({
      campusId: campusId !== undefined ? campusId : selectedCampus,
      search: search !== undefined ? search : studentSearch,
    });
    if (res.success) {
      setStudents(res.students);
    }
    setStudentsLoading(false);
  }, [selectedCampus, studentSearch]);

  useEffect(() => {
    async function loadAnalytics() {
      setLoading(true);
      setError(null);
      const res = await getFacultyAnalyticsAction({
        batch: selectedBatch || undefined,
        campusId: selectedCampus || undefined,
      });

      if (!res.success || !res.data) {
        setError(res.error || 'Failed to load faculty analytics.');
      } else {
        setData(res.data);
        if (!selectedCampus && res.data.selectedCampusId) {
          setSelectedCampus(res.data.selectedCampusId);
        }
      }
      setLoading(false);
    }

    loadAnalytics();
  }, [selectedBatch, selectedCampus]);

  useEffect(() => {
    loadStudents(selectedCampus, studentSearch);
  }, [selectedCampus]);

  const handleSearchStudents = (e: React.FormEvent) => {
    e.preventDefault();
    loadStudents(selectedCampus, studentSearch);
  };

  return (
    <div className="min-h-screen flex flex-col bg-black pb-16 text-zinc-100">
      <Navbar role="faculty" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 flex flex-col gap-8">
        {/* Top Header & Fast Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/20 text-white mb-2">
              <Users className="w-3.5 h-3.5" />
              Faculty Academic Intelligence
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Academic Engagement & Learning Analytics
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Verifiable telemetry from the immutable XP ledger, daily quiz submissions, and active streaks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/faculty/leaderboard"
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-white text-xs font-semibold transition-all"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Campus Standings</span>
            </Link>
            <Link
              href="/faculty/flags"
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-white text-xs font-semibold transition-all"
            >
              <ShieldAlert className="w-4 h-4 text-white" />
              <span>Integrity Flags</span>
            </Link>
            <Link
              href="/faculty/questions"
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-white text-xs font-semibold transition-all"
            >
              <BookOpen className="w-4 h-4 text-white" />
              <span>Question Review</span>
            </Link>
            <Link
              href="/faculty/competitions"
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold transition-all"
            >
              <Trophy className="w-4 h-4 text-purple-400" />
              <span>HackerRank Contests</span>
            </Link>
            <Link
              href="/faculty/award-xp"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold shadow-lg shadow-white/10 transition-all"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Award Student XP</span>
            </Link>
          </div>
        </div>

        {/* Tab Selector & Filter Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tab Selector */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#0c0c0e] border border-white/15 w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all',
                activeTab === 'analytics'
                  ? 'bg-white text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              )}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Cohort Analytics</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('students')}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all',
                activeTab === 'students'
                  ? 'bg-white text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              )}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Student Directory ({students.length})</span>
            </button>
          </div>

          {/* Filter Bar (Campus & Batch) */}
          <div className="flex flex-wrap items-center gap-3 p-2 rounded-2xl bg-[#0c0c0e] border border-white/15">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 px-1">
              <Filter className="w-3.5 h-3.5 text-white" />
              <span>Filter:</span>
            </div>

            {/* Campus Filter */}
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-zinc-400" />
              <select
                value={selectedCampus}
                onChange={(e) => setSelectedCampus(e.target.value)}
                className="px-3.5 py-1.5 rounded-xl bg-black border border-white/15 text-xs text-white focus:outline-none focus:border-white"
              >
                <option value="all">All Campuses</option>
                {data?.availableCampuses.map((c) => (
                  <option key={c.id} value={c.id} className="bg-black text-white">
                    {c.name} {c.city ? `(${c.city})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Batch Filter - for analytics */}
            {activeTab === 'analytics' && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="px-3.5 py-1.5 rounded-xl bg-black border border-white/15 text-xs text-white focus:outline-none focus:border-white"
                >
                  <option value="">All Batches</option>
                  {data?.availableBatches.map((b) => (
                    <option key={b.label} value={b.label} className="bg-black text-white">
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-white/10 border border-white/20 text-zinc-200 text-xs flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-white shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block text-sm mb-0.5">Analytics Warning</strong>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 1: COHORT ANALYTICS                                              */}
        {/* ==================================================================== */}
        {activeTab === 'analytics' && (
          <>
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-500">
                <div className="w-8 h-8 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span className="text-xs">Compiling real-time student analytics...</span>
              </div>
            ) : data ? (
              <>
                {/* 4 Key Engagement Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1: 7-Day Active Students */}
                  <div className="p-5 rounded-2xl bg-[#0c0c0e] border border-white/15 hover:border-white/30 transition-all flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-400">7-Day Active Students</span>
                      <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                        <Users className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-white">
                        {data.activeStudents7d}{' '}
                        <span className="text-xs font-normal text-zinc-400">/ {data.totalStudents}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full bg-white rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                            style={{ width: `${Math.min(data.activeRate7d, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-white">{data.activeRate7d}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Today Quiz Completion */}
                  <div className="p-5 rounded-2xl bg-[#0c0c0e] border border-white/15 hover:border-white/30 transition-all flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-400">Today&apos;s Quiz Completion</span>
                      <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-white">
                        {data.dailyQuizCompletedCount}{' '}
                        <span className="text-xs font-normal text-zinc-400">/ {data.totalStudents}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full bg-white rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                            style={{ width: `${Math.min(data.dailyQuizCompletionRate, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-white">{data.dailyQuizCompletionRate}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Average Streak */}
                  <div className="p-5 rounded-2xl bg-[#0c0c0e] border border-white/15 hover:border-white/30 transition-all flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-400">Average Streak</span>
                      <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                        <Flame className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-white">
                        {data.averageStreak}{' '}
                        <span className="text-xs font-normal text-zinc-400">Days</span>
                      </div>
                      <span className="text-[11px] text-zinc-400 mt-1 block">
                        Strict Asia/Kolkata midnight streak logic
                      </span>
                    </div>
                  </div>

                  {/* Card 4: Quiet Students Flagged */}
                  <div className="p-5 rounded-2xl bg-[#0c0c0e] border border-white/15 hover:border-white/30 transition-all flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-400">Quiet Students (&gt;= 5d)</span>
                      <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                        <UserX className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-white">
                        {data.quietStudents.length}
                      </div>
                      <span className="text-[11px] text-zinc-400 mt-1 block">
                        No XP activity in 5 or more days
                      </span>
                    </div>
                  </div>
                </div>

                {/* XP Volume Trend (7 Days) */}
                <div className="p-6 rounded-3xl bg-[#0c0c0e] border border-white/15">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-white" />
                      <h2 className="text-sm font-bold text-white">7-Day XP Volume Trend</h2>
                    </div>
                    <span className="text-[11px] text-zinc-400">Aggregated daily XP earned across cohort</span>
                  </div>

                  <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end pt-4 h-36">
                    {data.xpTrend.map((t) => {
                      const maxDayXp = Math.max(...data.xpTrend.map((d) => d.totalXp), 100);
                      const heightPercent = Math.max(Math.round((t.totalXp / maxDayXp) * 100), 8);

                      return (
                        <div key={t.date} className="flex flex-col items-center gap-2">
                          <div className="w-full h-28 bg-black/80 rounded-xl flex items-end p-1.5 border border-white/10">
                            <div
                              className="w-full bg-gradient-to-t from-zinc-600 via-zinc-400 to-white rounded-lg transition-all duration-500 flex items-center justify-center text-[10px] font-bold text-black shadow-md"
                              style={{ height: `${heightPercent}%` }}
                            >
                              {t.totalXp > 0 && <span className="opacity-90">{t.totalXp}</span>}
                            </div>
                          </div>
                          <span className="text-[10px] font-medium text-zinc-400">
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
                  <div className="p-6 rounded-3xl bg-[#0c0c0e] border border-white/15 flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                          <div>
                            <h2 className="text-sm font-bold text-white">Priority Weak Topics</h2>
                            <span className="text-[11px] text-zinc-400">
                              Lowest student accuracy across quiz answers
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-400 border border-white/10">
                          Min 20 Answers Required
                        </span>
                      </div>

                      <p className="text-xs text-zinc-400 leading-relaxed mt-2 mb-4">
                        Topics with fewer than 20 recorded submissions are excluded to prevent small-sample distortion.
                      </p>

                      {data.topWeakTopics.length === 0 ? (
                        <div className="py-8 px-4 rounded-2xl bg-black/60 border border-white/10 text-center flex flex-col items-center gap-2">
                          <CheckCircle2 className="w-6 h-6 text-white" />
                          <span className="text-xs font-semibold text-zinc-300">
                            No critical weak topics detected
                          </span>
                          <p className="text-[11px] text-zinc-500 max-w-xs">
                            All topics with at least 20 submissions currently have acceptable passing rates.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {data.topWeakTopics.map((topic, idx) => (
                            <div
                              key={topic.topic}
                              className="p-4 rounded-2xl bg-black/80 border border-white/10 flex flex-col gap-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-white flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-white/20 text-white text-[10px] flex items-center justify-center font-bold">
                                    #{idx + 1}
                                  </span>
                                  {topic.topic}
                                </span>
                                <span className="text-xs font-extrabold text-white">
                                  {topic.correctRate}% Correct
                                </span>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-zinc-500 to-white rounded-full"
                                    style={{ width: `${topic.correctRate}%` }}
                                  />
                                </div>
                                <span className="text-[11px] text-zinc-400">
                                  {topic.correctAnswers} / {topic.totalAnswers} correct
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-white/10 text-[11px] text-zinc-500">
                      Tip: Target these topics in next week&apos;s practice sets and live battles.
                    </div>
                  </div>

                  {/* Right Column: Quiet Students Monitoring */}
                  <div className="p-6 rounded-3xl bg-[#0c0c0e] border border-white/15 flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                            <UserX className="w-4 h-4" />
                          </div>
                          <div>
                            <h2 className="text-sm font-bold text-white">Quiet & Disengaged Students</h2>
                            <span className="text-[11px] text-zinc-400">
                              No learning activity in &gt;= 5 calendar days
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/20 font-bold">
                          {data.quietStudents.length} Flagged
                        </span>
                      </div>

                      <p className="text-xs text-zinc-400 leading-relaxed mt-2 mb-4">
                        Faculty-only view. Real student identities and roll numbers are shown to allow timely academic intervention.
                      </p>

                      {data.quietStudents.length === 0 ? (
                        <div className="py-8 px-4 rounded-2xl bg-black/60 border border-white/10 text-center flex flex-col items-center gap-2">
                          <CheckCircle2 className="w-6 h-6 text-white" />
                          <span className="text-xs font-semibold text-zinc-300">
                            Excellent cohort engagement!
                          </span>
                          <p className="text-[11px] text-zinc-500 max-w-xs">
                            Every student in this cohort has earned learning XP within the past 5 days.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                          {data.quietStudents.map((qs) => (
                            <div
                              key={qs.id}
                              className="p-3 rounded-xl bg-black/80 border border-white/10 flex items-center justify-between text-xs"
                            >
                              <div>
                                <div className="font-bold text-white flex items-center gap-2">
                                  <span>{qs.fullName}</span>
                                  {qs.campusName && (
                                    <span className="text-[10px] font-sans font-medium text-zinc-300 bg-white/10 px-2 py-0.5 rounded border border-white/20">
                                      {qs.campusName}
                                    </span>
                                  )}
                                  {qs.rankTier && (
                                    <RankChip rank={qs.rankTier} level={qs.level} size="xs" />
                                  )}
                                </div>
                                <div className="text-[11px] text-zinc-400">
                                  {qs.rollNo} • {qs.department} (Year {qs.yearOfStudy})
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="px-2 py-0.5 rounded-md bg-white/10 text-white border border-white/20 text-[10px] font-extrabold block">
                                  {qs.daysInactive >= 999 ? 'Never Active' : `${qs.daysInactive}d Inactive`}
                                </span>
                                <span className="text-[10px] text-zinc-500 mt-0.5 block">
                                  {qs.lastActiveDate ? `Last: ${qs.lastActiveDate}` : 'No XP ledger records'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                      <span className="text-[11px] text-zinc-500">
                        Intervention threshold: 5 days without XP
                      </span>
                      <Link
                        href="/faculty/award-xp"
                        className="text-xs font-bold text-white hover:underline flex items-center gap-1"
                      >
                        <span>Award Makeup XP</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </>
        )}

        {/* ==================================================================== */}
        {/* TAB 2: STUDENT DIRECTORY                                             */}
        {/* ==================================================================== */}
        {activeTab === 'students' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#0c0c0e] border border-white/15">
              <form onSubmit={handleSearchStudents} className="flex-1 flex items-center gap-2 max-w-md">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search by student name, roll number, department..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-black border border-white/15 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all shrink-0"
                >
                  Search
                </button>
              </form>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Link
                  href="/faculty/award-xp"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition-all"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Award XP</span>
                </Link>
                <button
                  type="button"
                  onClick={() => loadStudents(selectedCampus, studentSearch)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs text-zinc-300 hover:text-white transition-all"
                >
                  <RefreshCw className={clsx('w-3.5 h-3.5', studentsLoading && 'animate-spin')} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Students Table */}
            <div className="rounded-2xl bg-[#0c0c0e] border border-white/15 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black/90 text-zinc-400 uppercase text-[10px] font-mono tracking-wider border-b border-white/10">
                    <tr>
                      <th className="py-3 px-4">Rank #</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Roll Number</th>
                      <th className="py-3 px-4">Department & Year</th>
                      <th className="py-3 px-4">Campus</th>
                      <th className="py-3 px-4">Rank Tier</th>
                      <th className="py-3 px-4">Streak</th>
                      <th className="py-3 px-4 text-right">Lifetime XP</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {studentsLoading ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-zinc-500">
                          <div className="w-6 h-6 rounded-full border-2 border-white border-t-transparent animate-spin mx-auto mb-2" />
                          <span>Loading student roster...</span>
                        </td>
                      </tr>
                    ) : students.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-zinc-500">
                          No students found matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      students.map((st, idx) => (
                        <tr key={st.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-zinc-400">
                            #{idx + 1}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white text-sm">{st.fullName}</div>
                            <div className="text-[11px] text-zinc-500 font-mono">{st.email}</div>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-medium text-zinc-300">
                            {st.rollNo}
                          </td>
                          <td className="py-3.5 px-4 text-zinc-300">
                            <div>{st.department}</div>
                            <div className="text-[10px] text-zinc-500">Year {st.yearOfStudy}</div>
                          </td>
                          <td className="py-3.5 px-4 text-zinc-400 text-xs">
                            {st.campusName}
                          </td>
                          <td className="py-3.5 px-4">
                            <RankChip level={st.level} size="xs" showLevel />
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1 font-mono font-semibold text-zinc-300">
                              <Flame className="w-3.5 h-3.5 text-white fill-white" />
                              <span>{st.currentStreak}d</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-extrabold text-white text-sm">
                            {st.totalXp.toLocaleString()} XP
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <Link
                              href="/faculty/award-xp"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold transition-all border border-white/20"
                            >
                              <CheckSquare className="w-3 h-3" />
                              <span>Award XP</span>
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
