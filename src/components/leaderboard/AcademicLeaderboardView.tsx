'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Building2,
  Users,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  Search,
  Filter,
  Sparkles,
  RefreshCw,
  Award,
  ChevronRight,
  GraduationCap,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  School,
  ArrowLeft,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import {
  getAcademicLeaderboardAction,
  AcademicLeaderboardResponse,
  CampusStandingItem,
  DepartmentAverageItem,
  StudentLeaderboardRow,
} from '@/app/actions/academic-leaderboard';

interface AcademicLeaderboardViewProps {
  role: 'faculty' | 'admin';
}

export function AcademicLeaderboardView({ role }: AcademicLeaderboardViewProps) {
  const [timeframe, setTimeframe] = useState<'all-time' | 'weekly'>('all-time');
  const [selectedCampusId, setSelectedCampusId] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'inter_campus' | 'intra_campus' | 'averages_matrix'>('inter_campus');

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AcademicLeaderboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (cId?: string, tf?: 'all-time' | 'weekly') => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAcademicLeaderboardAction({
        timeframe: tf || timeframe,
        campusId: cId || (selectedCampusId ? selectedCampusId : undefined),
      });

      if (!res.success) {
        setError(res.error || 'Failed to load leaderboard data.');
      } else {
        setData(res);
        if (!selectedCampusId && res.selectedCampusId) {
          setSelectedCampusId(res.selectedCampusId);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while loading leaderboards.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeframe]);

  const handleCampusChange = (cId: string) => {
    setSelectedCampusId(cId);
    setSelectedDept('all');
    setSelectedYear('all');
    fetchData(cId);
  };

  const handleTimeframeChange = (tf: 'all-time' | 'weekly') => {
    setTimeframe(tf);
    fetchData(undefined, tf);
  };

  // Unique departments for filter
  const availableDepts = useMemo(() => {
    if (!data?.intraCampus?.departmentAverages) return [];
    return data.intraCampus.departmentAverages.map((d) => d.department);
  }, [data]);

  // Filtered students inside selected campus
  const filteredStudents = useMemo(() => {
    if (!data?.intraCampus?.students) return [];
    return data.intraCampus.students.filter((s) => {
      if (selectedDept !== 'all' && s.department !== selectedDept) return false;
      if (selectedYear !== 'all' && s.yearOfStudy !== selectedYear) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.rollNo.toLowerCase().includes(q) ||
          s.department.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data, selectedDept, selectedYear, searchQuery]);

  const globalAvg = data?.globalBenchmark?.globalAverageXp ?? 0;
  const campusAvg = data?.intraCampus?.campusAverageXp ?? 0;

  return (
    <div className="min-h-screen flex flex-col bg-black pb-20 text-zinc-100">
      <Navbar role={role} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
        {/* Breadcrumb & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
          <div className="flex flex-col gap-2">
            <Link
              href={role === 'admin' ? '/admin' : '/faculty'}
              className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors w-fit"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to {role === 'admin' ? 'Admin Hub' : 'Faculty Dashboard'}</span>
            </Link>

            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-900 border border-zinc-800 text-zinc-300">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                Academic Comparison & Leaderboards
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono">
                {timeframe === 'all-time' ? 'All-Time Aggregate' : 'Current IST Week'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Campus Standings & Average Analytics
            </h1>
            <p className="text-sm text-zinc-400 max-w-3xl leading-relaxed">
              Compare average student velocity across institutions, analyze intra-campus departmental averages,
              and benchmark high-performing cohorts versus students requiring academic intervention.
            </p>
          </div>

          {/* Controls: Timeframe & Refresh */}
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <div className="inline-flex p-1 rounded-xl bg-zinc-900 border border-zinc-800">
              <button
                onClick={() => handleTimeframeChange('all-time')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  timeframe === 'all-time'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                All-Time
              </button>
              <button
                onClick={() => handleTimeframeChange('weekly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  timeframe === 'weekly'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Weekly IST
              </button>
            </div>

            <button
              onClick={() => fetchData()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/50 flex items-center gap-3 text-red-200 text-sm">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {/* Global Benchmark Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Cross-Campus Global Avg
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-white">{globalAvg}</span>
              <span className="text-xs text-zinc-400 font-medium">XP / student</span>
            </div>
            <span className="text-[11px] text-zinc-500 mt-1">
              Benchmark across {data?.globalBenchmark?.totalStudents ?? 0} registered students
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Highest Average Campus
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-white truncate max-w-[200px]">
                {data?.globalBenchmark?.highestAvgCampus?.name || 'N/A'}
              </span>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-semibold mt-1">
              {data?.globalBenchmark?.highestAvgCampus?.avg ?? 0} XP avg
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" />
              Lowest Average Campus
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-white truncate max-w-[200px]">
                {data?.globalBenchmark?.lowestAvgCampus?.name || 'N/A'}
              </span>
            </div>
            <span className="text-xs font-mono text-amber-400 font-semibold mt-1">
              {data?.globalBenchmark?.lowestAvgCampus?.avg ?? 0} XP avg
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Total Valid System XP
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-white">
                {data?.globalBenchmark?.totalXp.toLocaleString() ?? 0}
              </span>
              <span className="text-xs text-zinc-400 font-medium">XP</span>
            </div>
            <span className="text-[11px] text-zinc-500 mt-1">
              {data?.globalBenchmark?.activeStudents ?? 0} active students with points
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-800 gap-2">
          <button
            onClick={() => setActiveTab('inter_campus')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'inter_campus'
                ? 'border-white text-white bg-zinc-900/40'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Campus vs Campus (Standings & Averages)</span>
            <span className="ml-1 text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
              {data?.interCampusStandings.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('intra_campus')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'intra_campus'
                ? 'border-white text-white bg-zinc-900/40'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Inside Campus (Student & Batch Rankings)</span>
            <span className="ml-1 text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
              {data?.intraCampus?.students?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('averages_matrix')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'averages_matrix'
                ? 'border-white text-white bg-zinc-900/40'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Higher vs Lower Average Matrix</span>
          </button>
        </div>

        {/* TAB 1: INTER-CAMPUS STANDINGS */}
        {activeTab === 'inter_campus' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                <School className="w-4 h-4 text-zinc-400" />
                <span>
                  Rankings ordered by <strong className="text-white">Average XP per Student</strong> to ensure fair comparison regardless of campus size.
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Above System Avg ({`>${globalAvg} XP`})
                </span>
                <span className="flex items-center gap-1.5 text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Below System Avg ({`<${globalAvg} XP`})
                </span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950/80">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/60 text-zinc-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-4 px-4 w-16">Rank</th>
                    <th className="py-4 px-4">Campus Institution</th>
                    <th className="py-4 px-4 text-center">Registered</th>
                    <th className="py-4 px-4 text-center">Active</th>
                    <th className="py-4 px-4 text-right">Total XP</th>
                    <th className="py-4 px-4 text-right">Average XP / Student</th>
                    <th className="py-4 px-4 text-right">Vs. Global Avg</th>
                    <th className="py-4 px-4">Top Performer</th>
                    <th className="py-4 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {data?.interCampusStandings.map((campus) => {
                    const isTop1 = campus.rank === 1;
                    const isTop2 = campus.rank === 2;
                    const isTop3 = campus.rank === 3;
                    const isAbove = campus.averageXpPerStudent >= globalAvg;

                    return (
                      <tr
                        key={campus.campusId}
                        className={`hover:bg-zinc-900/50 transition-colors ${
                          campus.campusId === selectedCampusId ? 'bg-zinc-900/30' : ''
                        }`}
                      >
                        <td className="py-4 px-4 font-mono font-bold">
                          {isTop1 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-400 text-sm">
                              🥇
                            </span>
                          ) : isTop2 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-400/10 border border-zinc-400/30 text-zinc-300 text-sm">
                              🥈
                            </span>
                          ) : isTop3 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-700/10 border border-amber-700/30 text-amber-600 text-sm">
                              🥉
                            </span>
                          ) : (
                            <span className="text-zinc-500 pl-2">#{campus.rank}</span>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-white text-sm">{campus.name}</span>
                            <span className="text-zinc-400 text-[11px]">{campus.city || 'Campus Branch'}</span>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-center font-mono text-zinc-300">
                          {campus.totalStudents}
                        </td>

                        <td className="py-4 px-4 text-center font-mono text-zinc-300">
                          {campus.activeStudents}
                        </td>

                        <td className="py-4 px-4 text-right font-mono font-bold text-white">
                          {campus.totalXp.toLocaleString()} XP
                        </td>

                        <td className="py-4 px-4 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-mono text-sm font-black text-white">
                              {campus.averageXpPerStudent} XP
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              ({campus.averageXpPerActive} XP per active)
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                              isAbove
                                ? 'bg-emerald-950/40 border border-emerald-800/40 text-emerald-400'
                                : 'bg-amber-950/40 border border-amber-800/40 text-amber-400'
                            }`}
                          >
                            {isAbove ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3" />
                            )}
                            {campus.deltaFromGlobalAvg > 0 ? `+${campus.deltaFromGlobalAvg}%` : `${campus.deltaFromGlobalAvg}%`}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-zinc-200">{campus.topStudentName}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {campus.highestXp} XP peak
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedCampusId(campus.campusId);
                              setActiveTab('intra_campus');
                              fetchData(campus.campusId);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white transition-all"
                          >
                            <span>Inspect</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: INTRA-CAMPUS LEADERBOARD & BATCHES */}
        {activeTab === 'intra_campus' && (
          <div className="flex flex-col gap-6">
            {/* Campus Selector & Sub-filters */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Selected Campus
                  </label>
                  <select
                    value={selectedCampusId}
                    onChange={(e) => handleCampusChange(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs font-semibold focus:outline-none focus:border-zinc-700 min-w-[220px]"
                  >
                    {data?.allCampuses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Department / Batch
                  </label>
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs font-semibold focus:outline-none focus:border-zinc-700"
                  >
                    <option value="all">All Departments</option>
                    {availableDepts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Year of Study
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs font-semibold focus:outline-none focus:border-zinc-700"
                  >
                    <option value="all">All Years</option>
                    <option value={1}>Year 1</option>
                    <option value={2}>Year 2</option>
                    <option value={3}>Year 3</option>
                    <option value={4}>Year 4</option>
                  </select>
                </div>
              </div>

              {/* Search Box */}
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search student or roll no..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                />
              </div>
            </div>

            {/* Department Averages Quick Bar */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Department Performance vs Campus Average ({campusAvg} XP)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data?.intraCampus?.departmentAverages.map((dept) => {
                  const isHigh = dept.status === 'high_avg';
                  return (
                    <div
                      key={dept.department}
                      className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2 ${
                        isHigh
                          ? 'bg-emerald-950/20 border-emerald-800/40'
                          : 'bg-zinc-900/50 border-zinc-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white truncate max-w-[180px]">
                          {dept.department}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isHigh
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                          }`}
                        >
                          {isHigh ? 'High Average' : 'Core / Lower Avg'}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-zinc-400">
                          {dept.totalStudents} student{dept.totalStudents !== 1 ? 's' : ''} ({dept.activeStudents} active)
                        </span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-mono font-black text-sm text-white">
                            {dept.averageXp} XP
                          </span>
                          <span
                            className={`text-[10px] font-mono ${
                              dept.diffFromCampusAvg >= 0 ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          >
                            ({dept.diffFromCampusAvg >= 0 ? `+${dept.diffFromCampusAvg}` : dept.diffFromCampusAvg})
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Students Ranked Table */}
            <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950/80">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/60 text-zinc-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-4 px-4 w-16">Rank</th>
                    <th className="py-4 px-4">Student Name</th>
                    <th className="py-4 px-4">Roll No</th>
                    <th className="py-4 px-4">Department & Year</th>
                    <th className="py-4 px-4 text-center">Streak</th>
                    <th className="py-4 px-4">Level & Rank</th>
                    <th className="py-4 px-4 text-right">Total XP</th>
                    <th className="py-4 px-4 text-right">Vs. Campus Avg ({campusAvg} XP)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-zinc-500">
                        No students found matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => {
                      const isTop1 = student.rank === 1;
                      const isTop2 = student.rank === 2;
                      const isTop3 = student.rank === 3;
                      const isAbove = student.isAboveAverage;

                      return (
                        <tr key={student.studentId} className="hover:bg-zinc-900/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold">
                            {isTop1 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-400 text-sm">
                                🥇
                              </span>
                            ) : isTop2 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-400/10 border border-zinc-400/30 text-zinc-300 text-sm">
                                🥈
                              </span>
                            ) : isTop3 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-700/10 border border-amber-700/30 text-amber-600 text-sm">
                                🥉
                              </span>
                            ) : (
                              <span className="text-zinc-500 pl-2">#{student.rank}</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-bold text-white text-sm">{student.name}</span>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-zinc-400">
                            {student.rollNo}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="text-zinc-200 font-medium">{student.department}</span>
                              <span className="text-[10px] text-zinc-500">Year {student.yearOfStudy}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 font-mono font-bold text-xs text-orange-400">
                              <Flame className="w-3.5 h-3.5" />
                              {student.streak}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
                              style={{
                                color: student.rankTier.color,
                                borderColor: `${student.rankTier.color}40`,
                                backgroundColor: `${student.rankTier.color}15`,
                              }}
                            >
                              <span>Lv.{student.level}</span>
                              <span>·</span>
                              <span>{student.rankTier.name}</span>
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-black text-sm text-white">
                            {student.totalXp.toLocaleString()} XP
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                                isAbove
                                  ? 'bg-emerald-950/40 border border-emerald-800/40 text-emerald-400'
                                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
                              }`}
                            >
                              {isAbove ? (
                                <ArrowUpRight className="w-3 h-3" />
                              ) : (
                                <ArrowDownRight className="w-3 h-3" />
                              )}
                              {student.diffFromCampusAvg >= 0
                                ? `+${student.diffFromCampusAvg} Above`
                                : `${student.diffFromCampusAvg} Below`}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: HIGHER VS LOWER AVERAGE BENCHMARK MATRIX */}
        {activeTab === 'averages_matrix' && (
          <div className="flex flex-col gap-6">
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col gap-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-400" />
                Higher Average vs. Lower Average Matrix
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-4xl">
                This academic matrix categorizes cohorts and institutions into performance quadrants.
                Use this view to pinpoint high-velocity cohorts for recognition and identify cohorts falling
                below academic benchmarks for targeted faculty intervention.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Higher Average Quadrant */}
              <div className="p-6 rounded-2xl bg-emerald-950/15 border border-emerald-800/40 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-emerald-800/30 pb-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <TrendingUp className="w-4 h-4" />
                    <span>Higher Average Quadrant</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    &gt; Global Benchmark ({globalAvg} XP)
                  </span>
                </div>

                <p className="text-xs text-zinc-300">
                  Institutions and departments maintaining velocity above standard baseline.
                </p>

                <div className="flex flex-col gap-3">
                  {data?.interCampusStandings
                    .filter((c) => c.averageXpPerStudent >= globalAvg)
                    .map((c) => (
                      <div
                        key={c.campusId}
                        className="p-3.5 rounded-xl bg-black/40 border border-emerald-900/30 flex items-center justify-between"
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-white text-xs">{c.name}</span>
                          <span className="text-[11px] text-zinc-400">
                            {c.totalStudents} students · Top: {c.topStudentName} ({c.highestXp} XP)
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="font-mono font-black text-sm text-emerald-400">
                            {c.averageXpPerStudent} XP avg
                          </span>
                          <span className="text-[10px] text-emerald-500 font-mono">
                            +{c.deltaFromGlobalAvg}% above avg
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Lower Average Quadrant */}
              <div className="p-6 rounded-2xl bg-amber-950/15 border border-amber-800/40 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-amber-800/30 pb-3">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <TrendingDown className="w-4 h-4" />
                    <span>Lower Average / Growth Quadrant</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    &lt; Global Benchmark ({globalAvg} XP)
                  </span>
                </div>

                <p className="text-xs text-zinc-300">
                  Cohorts currently trailing system baseline. Recommend deploying daily practice quests or faculty-awarded bonus incentives.
                </p>

                <div className="flex flex-col gap-3">
                  {data?.interCampusStandings
                    .filter((c) => c.averageXpPerStudent < globalAvg)
                    .map((c) => (
                      <div
                        key={c.campusId}
                        className="p-3.5 rounded-xl bg-black/40 border border-amber-900/30 flex items-center justify-between"
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-white text-xs">{c.name}</span>
                          <span className="text-[11px] text-zinc-400">
                            {c.totalStudents} students · {c.activeStudents} active
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="font-mono font-black text-sm text-amber-400">
                            {c.averageXpPerStudent} XP avg
                          </span>
                          <span className="text-[10px] text-amber-500 font-mono">
                            {c.deltaFromGlobalAvg}% below avg
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
