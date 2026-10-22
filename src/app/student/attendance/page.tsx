'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import {
  getStudentAttendanceHistoryAction,
  SubjectAttendanceBreakdown,
  AttendanceHistoryItem,
} from '@/app/actions/attendance';
import { getStudentClubHistoryAction } from '@/app/actions/clubs';
import {
  CalendarCheck2,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ArrowLeft,
  BookOpen,
  Award,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export default function StudentAttendancePage() {
  const [loading, setLoading] = useState(true);
  const [overallPercentage, setOverallPercentage] = useState(100);
  const [totalXp, setTotalXp] = useState(0);
  const [totalClubXp, setTotalClubXp] = useState(0);
  const [subjectBreakdowns, setSubjectBreakdowns] = useState<SubjectAttendanceBreakdown[]>([]);
  const [history, setHistory] = useState<AttendanceHistoryItem[]>([]);
  const [clubActivities, setClubActivities] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [attRes, clubRes] = await Promise.all([
        getStudentAttendanceHistoryAction(),
        getStudentClubHistoryAction(),
      ]);

      if (attRes.success) {
        setOverallPercentage(attRes.overallPercentage);
        setTotalXp(attRes.totalAttendanceXp);
        setSubjectBreakdowns(attRes.subjectBreakdowns);
        setHistory(attRes.history);
      } else {
        setError(attRes.error || 'Failed to load attendance history.');
      }

      if (clubRes.success) {
        setTotalClubXp(clubRes.totalClubXp);
        setClubActivities(clubRes.activities);
      }
      setLoading(false);
    }
    loadData();
  }, []);


  const totalClasses = history.length;
  const attendedClasses = history.filter((h) => h.status === 'present').length;

  const getStatusColor = (percentage: number) => {
    if (percentage >= 85) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (percentage >= 75) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  const getBarColor = (percentage: number) => {
    if (percentage >= 85) return 'bg-emerald-500';
    if (percentage >= 75) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-zinc-100 flex flex-col font-sans selection:bg-purple-500/30">
      <Navbar role="student" />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Breadcrumb */}
        <div className="mb-8">
          <Link
            href="/student"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Student Dashboard
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                <CalendarCheck2 className="w-8 h-8 text-purple-400" />
                Attendance & Academic Progression
              </h1>
              <p className="text-zinc-400 text-sm mt-1">
                Verified lecture attendance and earned XP records. Minimum recommended attendance is 75%.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-zinc-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Faculty Verified Ledger
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl mb-6 bg-rose-950/60 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-zinc-400">
            <RefreshCw className="w-8 h-8 animate-spin text-purple-500 mb-3" />
            <p className="text-sm">Fetching your attendance ledger...</p>
          </div>
        ) : (
          <>
            {/* Top Stat Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              {/* Overall Percentage Card */}
              <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">
                  <span>Overall Attendance</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusColor(overallPercentage)}`}>
                    {overallPercentage >= 75 ? 'Good Standing' : 'Below 75%'}
                  </span>
                </div>
                <div className="flex items-baseline gap-3 my-2">
                  <span className="text-5xl font-black text-white tracking-tight">
                    {overallPercentage}%
                  </span>
                  <span className="text-xs text-zinc-400">
                    ({attendedClasses}/{totalClasses} sessions)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-black/60 overflow-hidden p-0.5 mt-4">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${getBarColor(overallPercentage)}`}
                    style={{ width: `${overallPercentage}%` }}
                  />
                </div>
              </div>

              {/* Attendance XP Card */}
              <div className="bg-gradient-to-br from-purple-950/40 via-zinc-900/80 to-zinc-900/80 border border-purple-500/30 rounded-2xl p-6 backdrop-blur-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-semibold text-purple-300 uppercase tracking-wider mb-4">
                  <span>Attendance XP</span>
                  <Zap className="w-4 h-4 text-purple-400 fill-purple-400" />
                </div>
                <div className="flex items-baseline gap-2 my-2">
                  <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 tracking-tight">
                    +{totalXp}
                  </span>
                  <span className="text-xs font-semibold text-purple-300">XP</span>
                </div>
                <p className="text-xs text-zinc-400 mt-2">
                  +5 XP per verified lecture session attended.
                </p>
              </div>

              {/* Club Activities XP Card */}
              <div className="bg-gradient-to-br from-indigo-950/40 via-zinc-900/80 to-zinc-900/80 border border-indigo-500/30 rounded-2xl p-6 backdrop-blur-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-4">
                  <span>Club Activity XP</span>
                  <Award className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="flex items-baseline gap-2 my-2">
                  <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 tracking-tight">
                    +{totalClubXp}
                  </span>
                  <span className="text-xs font-semibold text-indigo-300">XP</span>
                </div>
                <p className="text-xs text-zinc-400 mt-2">
                  +15 XP per verified club session, workshop, or hackathon.
                </p>
              </div>

              {/* Standing Advisory */}
              <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-6 backdrop-blur-sm flex flex-col justify-between">
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Academic Criteria
                </div>
                {overallPercentage >= 85 ? (
                  <div>
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-1">
                      <CheckCircle2 className="w-4 h-4 shrink-0" /> Excellent Standing
                    </div>
                    <p className="text-xs text-zinc-400">
                      Well above 85% honor band. Keep it up for semester rewards!
                    </p>
                  </div>
                ) : overallPercentage >= 75 ? (
                  <div>
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-1">
                      <Sparkles className="w-4 h-4 shrink-0" /> Good Standing
                    </div>
                    <p className="text-xs text-zinc-400">
                      Meets minimum 75% attendance threshold for exams.
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 text-rose-400 font-bold text-sm mb-1">
                      <AlertTriangle className="w-4 h-4 shrink-0" /> Attendance Warning
                    </div>
                    <p className="text-xs text-zinc-400">
                      Below 75%. Please attend upcoming lectures to regain eligibility.
                    </p>
                  </div>
                )}
                <div className="text-[11px] text-zinc-500 pt-3 border-t border-white/5 mt-4">
                  Ledger verified by faculty
                </div>
              </div>
            </div>

            {/* Per-Subject Breakdown Cards */}
            <div className="mb-10">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-400" /> Course-Wise Attendance
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subjectBreakdowns.length === 0 ? (
                  <p className="text-xs text-zinc-500">No course enrollments found.</p>
                ) : (
                  subjectBreakdowns.map((subj) => (
                    <div
                      key={subj.subjectId}
                      className="bg-zinc-900/60 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs font-bold text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-md border border-purple-500/20">
                          {subj.subjectCode}
                        </span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full border ${getStatusColor(
                            subj.percentage
                          )}`}
                        >
                          {subj.percentage}%
                        </span>
                      </div>
                      <div className="font-semibold text-white text-sm mb-3">{subj.subjectName}</div>
                      <div className="w-full h-2 rounded-full bg-black/60 overflow-hidden p-0.5 mb-2">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${getBarColor(
                            subj.percentage
                          )}`}
                          style={{ width: `${subj.percentage}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-zinc-400 flex items-center justify-between">
                        <span>Attended: {subj.attendedSessions}</span>
                        <span>Total Sessions: {subj.totalSessions}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Attendance Activity Ledger */}
            <div>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-400" /> Verified Attendance History
              </h2>

              {history.length === 0 ? (
                <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-8 text-center text-zinc-400 text-sm">
                  No attendance records recorded yet. Your attendance history will appear here once faculty records your classes.
                </div>
              ) : (
                <div className="bg-zinc-900/60 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-950/70 text-xs text-zinc-400 uppercase tracking-wider border-b border-white/10">
                        <tr>
                          <th className="px-6 py-3.5 font-semibold">Date</th>
                          <th className="px-6 py-3.5 font-semibold">Subject</th>
                          <th className="px-6 py-3.5 font-semibold">Lecture Topic</th>
                          <th className="px-6 py-3.5 font-semibold">Status</th>
                          <th className="px-6 py-3.5 font-semibold">XP Credited</th>
                          <th className="px-6 py-3.5 font-semibold">Verified By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {history.map((record) => {
                          const isPresent = record.status === 'present';
                          const isAbsent = record.status === 'absent';

                          return (
                            <tr key={record.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="px-6 py-4 font-mono text-xs text-zinc-300">
                                {record.sessionDate}
                              </td>
                              <td className="px-6 py-4">
                                <span className="font-semibold text-white">{record.subjectCode}</span>
                                <span className="block text-xs text-zinc-500">{record.subjectName}</span>
                              </td>
                              <td className="px-6 py-4 text-xs text-zinc-300">
                                {record.topic || 'General Lecture'}
                                {record.overrideReason && (
                                  <span className="block text-[11px] text-zinc-500 italic mt-0.5">
                                    Note: {record.overrideReason}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {isPresent ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Present
                                  </span>
                                ) : isAbsent ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                    <XCircle className="w-3.5 h-3.5" /> Absent
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                                    Excused
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {isPresent ? (
                                  <span className="font-semibold text-emerald-400 text-xs flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" /> +{record.xpAwarded} XP
                                  </span>
                                ) : (
                                  <span className="text-zinc-500 text-xs">0 XP</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-xs text-zinc-400">
                                {record.verifierName}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Verified Club Activities Section */}
            <div className="mt-10">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-400" /> Verified Club Activities & Events
              </h2>

              {clubActivities.length === 0 ? (
                <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-8 text-center text-zinc-400 text-sm">
                  No verified club activities recorded yet. Participate in authorized technical workshops, coding bootcamps, and club hackathons to earn +15 XP each!
                </div>
              ) : (
                <div className="bg-zinc-900/60 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-950/70 text-xs text-zinc-400 uppercase tracking-wider border-b border-white/10">
                        <tr>
                          <th className="px-6 py-3.5 font-semibold">Date</th>
                          <th className="px-6 py-3.5 font-semibold">Club</th>
                          <th className="px-6 py-3.5 font-semibold">Activity</th>
                          <th className="px-6 py-3.5 font-semibold">Status</th>
                          <th className="px-6 py-3.5 font-semibold">XP Earned</th>
                          <th className="px-6 py-3.5 font-semibold">Verified By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {clubActivities.map((act) => (
                          <tr key={act.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-6 py-4 font-mono text-xs text-zinc-300">
                              {act.activityDate}
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 mr-2">
                                {act.clubCode}
                              </span>
                              <span className="text-xs text-zinc-300">{act.clubName}</span>
                            </td>
                            <td className="px-6 py-4 text-xs font-medium text-white">
                              {act.activityTitle}
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-semibold text-indigo-400 text-xs flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> +{act.xpAwarded} XP
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs text-zinc-400">
                              {act.verifiedBy}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
