'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import {
  ShieldCheck,
  Sliders,
  Database,
  KeyRound,
  Users,
  GraduationCap,
  Flame,
  Search,
  Award,
  Building,
  CheckCircle2,
  RefreshCw,
  Trophy,
} from 'lucide-react';
import {
  getStudentDirectoryAction,
  getFacultyDirectoryAction,
  StudentRosterItem,
  FacultyRosterItem,
} from '@/app/actions/roster';
import { RankChip } from '@/components/ranks/RankChip';
import clsx from 'clsx';

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<'students' | 'faculty' | 'modules'>('students');

  // Student Directory State
  const [students, setStudents] = useState<StudentRosterItem[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentsLoading, setStudentsLoading] = useState(true);

  // Faculty Directory State
  const [faculty, setFaculty] = useState<FacultyRosterItem[]>([]);
  const [facultySearch, setFacultySearch] = useState('');
  const [facultyLoading, setFacultyLoading] = useState(true);

  async function loadStudents() {
    setStudentsLoading(true);
    const res = await getStudentDirectoryAction({ search: studentSearch });
    if (res.success) {
      setStudents(res.students);
    }
    setStudentsLoading(false);
  }

  async function loadFaculty() {
    setFacultyLoading(true);
    const res = await getFacultyDirectoryAction({ search: facultySearch });
    if (res.success) {
      setFaculty(res.faculty);
    }
    setFacultyLoading(false);
  }

  useEffect(() => {
    loadStudents();
    loadFaculty();
  }, []);

  const handleSearchStudents = (e: React.FormEvent) => {
    e.preventDefault();
    loadStudents();
  };

  const handleSearchFaculty = (e: React.FormEvent) => {
    e.preventDefault();
    loadFaculty();
  };

  return (
    <div className="min-h-screen flex flex-col bg-black pb-16 text-zinc-100">
      <Navbar role="admin" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/20 text-white mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Campus Platform Administration</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Institutional Admin Hub
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Live student directory with XP rankings, faculty roster with access key tracking, and rule engine controls.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/leaderboard"
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-white text-xs font-semibold transition-all shrink-0"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Campus Standings</span>
            </Link>
            <Link
              href="/admin/invites"
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-white text-xs font-semibold transition-all shrink-0"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Staff Invites</span>
            </Link>
            <Link
              href="/faculty/award-xp"
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-white text-xs font-semibold transition-all shrink-0"
            >
              <span>Award XP</span>
            </Link>
            <Link
              href="/admin/rules"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold shadow-lg shadow-white/10 transition-all shrink-0"
            >
              <Sliders className="w-4 h-4" />
              <span>Manage XP Rules</span>
            </Link>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#0c0c0e] border border-white/15 w-fit">
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
          <button
            type="button"
            onClick={() => setActiveTab('faculty')}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all',
              activeTab === 'faculty'
                ? 'bg-white text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            <Users className="w-4 h-4" />
            <span>Faculty & Staff ({faculty.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('modules')}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all',
              activeTab === 'modules'
                ? 'bg-white text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            <Sliders className="w-4 h-4" />
            <span>System Modules</span>
          </button>
        </div>

        {/* ==================================================================== */}
        {/* TAB 1: STUDENT DIRECTORY                                             */}
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

              <button
                type="button"
                onClick={loadStudents}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs text-zinc-300 hover:text-white transition-all self-end sm:self-auto"
              >
                <RefreshCw className={clsx('w-3.5 h-3.5', studentsLoading && 'animate-spin')} />
                <span>Refresh</span>
              </button>
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {studentsLoading ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-zinc-500">
                          <div className="w-6 h-6 rounded-full border-2 border-white border-t-transparent animate-spin mx-auto mb-2" />
                          <span>Loading student roster...</span>
                        </td>
                      </tr>
                    ) : students.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-zinc-500">
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
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 2: FACULTY & STAFF DIRECTORY                                     */}
        {/* ==================================================================== */}
        {activeTab === 'faculty' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#0c0c0e] border border-white/15">
              <form onSubmit={handleSearchFaculty} className="flex-1 flex items-center gap-2 max-w-md">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={facultySearch}
                    onChange={(e) => setFacultySearch(e.target.value)}
                    placeholder="Search staff by name, email, department, designation..."
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

              <button
                type="button"
                onClick={loadFaculty}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs text-zinc-300 hover:text-white transition-all self-end sm:self-auto"
              >
                <RefreshCw className={clsx('w-3.5 h-3.5', facultyLoading && 'animate-spin')} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Faculty Table */}
            <div className="rounded-2xl bg-[#0c0c0e] border border-white/15 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black/90 text-zinc-400 uppercase text-[10px] font-mono tracking-wider border-b border-white/10">
                    <tr>
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">System Role</th>
                      <th className="py-3 px-4">Department & Designation</th>
                      <th className="py-3 px-4">Campus</th>
                      <th className="py-3 px-4">Access Key / Invite Redeemed</th>
                      <th className="py-3 px-4 text-right">Registered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {facultyLoading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-zinc-500">
                          <div className="w-6 h-6 rounded-full border-2 border-white border-t-transparent animate-spin mx-auto mb-2" />
                          <span>Loading staff roster...</span>
                        </td>
                      </tr>
                    ) : faculty.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-zinc-500">
                          No faculty or staff found.
                        </td>
                      </tr>
                    ) : (
                      faculty.map((f) => (
                        <tr key={f.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white text-sm">{f.fullName}</div>
                            <div className="text-[11px] text-zinc-500 font-mono">{f.email}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={clsx(
                                'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                                f.role === 'admin'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              )}
                            >
                              {f.role}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-white">{f.designation}</div>
                            <div className="text-[11px] text-zinc-400">{f.department}</div>
                          </td>
                          <td className="py-3.5 px-4 text-zinc-300">
                            {f.campusName}
                          </td>
                          <td className="py-3.5 px-4">
                            {f.redeemedInvite ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium font-mono">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  <span>{f.redeemedInvite.note || `${f.redeemedInvite.role.toUpperCase()} Invite Code`}</span>
                                </span>
                                <div className="text-[10px] text-zinc-500">
                                  Accepted: {new Date(f.redeemedInvite.redeemedAt).toLocaleDateString()}
                                </div>
                              </div>
                            ) : (
                              <span className="text-zinc-500 text-xs font-mono">
                                System Default / Provisioned
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right text-zinc-400 font-mono text-xs">
                            {new Date(f.createdAt).toLocaleDateString()}
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

        {/* ==================================================================== */}
        {/* TAB 3: SYSTEM MODULES & XP RULES SEED                                */}
        {/* ==================================================================== */}
        {activeTab === 'modules' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Module 1: Live XP Rule Engine Manager */}
              <div className="p-6 rounded-2xl bg-[#0c0c0e] border border-white/15 hover:border-white/30 transition-all shadow-xl flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                      <Sliders className="w-5 h-5" />
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 border border-white/20 text-white">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      Live • Operational
                    </span>
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      XP Rule Engine Manager
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      Control point values, base XP, extra XP, and daily frequency limits directly in the `xp_rules` database table without deploying code.
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
                      Active System Capabilities:
                    </span>
                    <ul className="space-y-1.5 text-xs text-zinc-300">
                      <li className="flex items-center gap-2">
                        <span className="text-white font-bold">✓</span>
                        <span>Live point configuration (Base XP, extra XP)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-white font-bold">✓</span>
                        <span>Daily limit caps (PEER_HELP, QUIZ, ASSIGNMENT)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-white font-bold">✓</span>
                        <span>Enable / disable individual rules on the fly</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="pt-6">
                  <Link
                    href="/admin/rules"
                    className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold shadow-lg shadow-white/10 transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <span>Configure XP Rules</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>

              {/* Module 2: Live Ledger Audit & Security */}
              <div className="p-6 rounded-2xl bg-[#0c0c0e] border border-white/15 hover:border-white/30 transition-all shadow-xl flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                      <Database className="w-5 h-5" />
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 border border-white/20 text-white">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      Live • Operational
                    </span>
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      Ledger Audit & Security Hub
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      Monitor the immutable `xp_events` ledger, verify UNIQUE constraints preventing duplicate payouts, and review automated anti-gaming flags.
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
                      Active Security Controls:
                    </span>
                    <ul className="space-y-1.5 text-xs text-zinc-300">
                      <li className="flex items-center gap-2">
                        <span className="text-white font-bold">✓</span>
                        <span>Ledger sum vs cached points reconciliation</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-white font-bold">✓</span>
                        <span>Detection and rejection of automated double-taps</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-white font-bold">✓</span>
                        <span>Anti-gaming heuristics and rate limit alerts</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="pt-6">
                  <Link
                    href="/admin/audit"
                    className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold shadow-lg shadow-white/10 transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <span>Open Ledger Audit Hub</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>

              {/* Module 3: Staff Invites & Access Codes */}
              <div className="p-6 rounded-2xl bg-[#0c0c0e] border border-white/15 hover:border-white/30 transition-all shadow-xl flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active • Protected
                    </span>
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      Staff Invites & Access Codes
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      Generate cryptographically secure one-time invite codes for Faculty and Administrator onboarding without public role selection.
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
                      Staff Access Controls:
                    </span>
                    <ul className="space-y-1.5 text-xs text-zinc-300">
                      <li className="flex items-center gap-2">
                        <span className="text-white font-bold">✓</span>
                        <span>Generate Faculty & Admin invite codes</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-white font-bold">✓</span>
                        <span>See which staff member redeemed which key</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-white font-bold">✓</span>
                        <span>Track redemptions & revoke active codes</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="pt-6">
                  <Link
                    href="/admin/invites"
                    className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold shadow-lg shadow-white/10 transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <span>Manage Staff Invites</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Core Rules Seed Preview Table */}
            <section
              aria-label="Configured XP rules"
              className="p-6 rounded-2xl bg-[#0c0c0e] border border-white/15"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                  <Database className="w-4 h-4 text-white" />
                  <span>Initial XP Rules Table (`xp_rules` Database State)</span>
                </h2>
                <span className="text-[11px] text-white bg-white/10 px-2.5 py-0.5 rounded-full border border-white/20 font-semibold">
                  Active in DB
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="text-[11px] uppercase bg-black/80 text-zinc-400 border-b border-white/10">
                    <tr>
                      <th className="py-2.5 px-3">Action Type</th>
                      <th className="py-2.5 px-3">Base XP</th>
                      <th className="py-2.5 px-3">Extra XP</th>
                      <th className="py-2.5 px-3">Daily Limit</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    <tr>
                      <td className="py-2 px-3 font-medium text-white">ATTENDANCE</td>
                      <td className="py-2 px-3 text-white font-semibold">10</td>
                      <td className="py-2 px-3">0</td>
                      <td className="py-2 px-3 text-zinc-400">None</td>
                      <td className="py-2 px-3 text-white">Active</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium text-white">DAILY_QUIZ</td>
                      <td className="py-2 px-3 text-white font-semibold">15</td>
                      <td className="py-2 px-3 text-zinc-300 font-semibold">+5/correct</td>
                      <td className="py-2 px-3 text-zinc-300 font-semibold">1 / day</td>
                      <td className="py-2 px-3 text-white">Active</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium text-white">PEER_HELP</td>
                      <td className="py-2 px-3 text-white font-semibold">15</td>
                      <td className="py-2 px-3">0</td>
                      <td className="py-2 px-3 text-zinc-300 font-semibold">3 / day</td>
                      <td className="py-2 px-3 text-white">Active</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium text-white">ASSIGNMENT_ON_TIME</td>
                      <td className="py-2 px-3 text-white font-semibold">20</td>
                      <td className="py-2 px-3">0</td>
                      <td className="py-2 px-3 text-zinc-400">None</td>
                      <td className="py-2 px-3 text-white">Active</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium text-white">CLUB_ACTIVITY</td>
                      <td className="py-2 px-3 text-white font-semibold">25</td>
                      <td className="py-2 px-3">0</td>
                      <td className="py-2 px-3 text-zinc-400">None</td>
                      <td className="py-2 px-3 text-white">Active</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium text-white">STREAK_7_BONUS</td>
                      <td className="py-2 px-3 text-white font-semibold">50</td>
                      <td className="py-2 px-3">0</td>
                      <td className="py-2 px-3 text-zinc-400">None</td>
                      <td className="py-2 px-3 text-white">Active</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
