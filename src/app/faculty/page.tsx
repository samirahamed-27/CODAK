'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  TimetableSession,
  INITIAL_TIMETABLE_TODAY,
  INITIAL_SUBJECTS,
  SessionStatus,
} from '@/lib/course-progression-data';
import { QuickSessionLogModal } from '@/components/progression/QuickSessionLogModal';
import {
  Smartphone,
  CheckCircle2,
  Clock,
  BookOpen,
  Calendar,
  AlertTriangle,
  Upload,
  UserCheck,
  CreditCard,
  ArrowRight,
  Filter,
  Layers,
} from 'lucide-react';

export default function FacultyPortalPage() {
  const [sessions, setSessions] = useState<TimetableSession[]>(INITIAL_TIMETABLE_TODAY);
  const [activeSessionToLog, setActiveSessionToLog] = useState<TimetableSession | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Visiting Faculty Honorarium state
  const visitingFacultyRecords = [
    { name: 'Dr. Vikram Rao', month: 'October 2026', plannedHours: 16, takenHours: 18, ratePerHour: 2500 },
    { name: 'Er. Rajesh Kothari', month: 'October 2026', plannedHours: 12, takenHours: 12, ratePerHour: 2200 },
    { name: 'Prof. Alok Bansal', month: 'October 2026', plannedHours: 15, takenHours: 13, ratePerHour: 2000 },
  ];

  const handleSaveSession = (loggedData: {
    sessionId: string;
    status: SessionStatus;
    percentComplete: number;
    coveredContent: string;
    leftoverTopic: string;
    carryForwardTopic: string;
    homeworkStatus: string;
    notes: string;
    durationHours: number;
  }) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === loggedData.sessionId) {
          return {
            ...s,
            isLogged: true,
            loggedStatus: loggedData.status,
            loggedPercent: loggedData.percentComplete,
            coveredSummary: loggedData.coveredContent,
            leftoverTopic: loggedData.leftoverTopic,
            notes: loggedData.notes,
          };
        }
        return s;
      })
    );

    setToastMessage(`✓ Logged in 42 seconds! Status: ${loggedData.status} (${loggedData.percentComplete}%).`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="min-h-screen bg-[#07080B] text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-emerald-500 text-black font-semibold text-xs shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="border-b border-white/[0.08] bg-[#090A0F]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
            >
              ← Back to Executive Hub
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="text-xs font-semibold text-white">Faculty Daily Session Portal</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Mobile Optimized (&lt;60s)
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8 flex-1 w-full">
        {/* Banner */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-sky-400">
              <Smartphone className="w-4 h-4" />
              <span>FACULTY DAILY LOGGING INTERFACE</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
              Today's Scheduled Teaching Sessions
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Every class is pre-filled from your batch timetable. Confirm topics covered or adjust carry-over in under 60 seconds.
            </p>
          </div>
          <div className="text-xs font-mono text-zinc-400 p-2.5 rounded-xl bg-black/40 border border-white/5">
            <div>Logged: {sessions.filter((s) => s.isLogged).length} / {sessions.length} sessions</div>
            <div className="text-[10px] text-emerald-400 mt-0.5">Auto-shifts calendar on changes</div>
          </div>
        </div>

        {/* Today's Classes List (The <60s mobile logging cards) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white tracking-wide">
              Your Scheduled Sessions for Today
            </h2>
            <span className="text-xs font-mono text-zinc-500">
              Auto-synced with Academic Calendar
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.map((session) => {
              return (
                <div
                  key={session.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    session.isLogged
                      ? 'bg-emerald-500/[0.03] border-emerald-500/20'
                      : 'bg-[#090A0F] border-white/[0.08] hover:border-sky-500/30 shadow-lg'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-sky-400">
                          {session.subjectCode}
                        </span>
                        <span className="text-[10px] font-mono uppercase px-2 py-0.2 rounded-full bg-white/5 text-zinc-400">
                          {session.campus} • {session.batch}
                        </span>
                      </div>
                      <h3 className="font-semibold text-white text-sm mt-1">
                        {session.subjectName}
                      </h3>
                      <p className="text-xs text-zinc-400">
                        {session.facultyName} • {session.room}
                      </p>
                    </div>

                    <span
                      className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border ${
                        session.isLogged
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-semibold'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {session.isLogged ? session.loggedStatus : 'Pending Log'}
                    </span>
                  </div>

                  {/* Scheduled Slot */}
                  <div className="grid grid-cols-2 gap-2 mt-3.5 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs font-mono">
                    <div className="flex items-center gap-1.5 text-zinc-300">
                      <Clock className="w-3.5 h-3.5 text-sky-400" />
                      <span>{session.startTime} - {session.endTime}</span>
                    </div>
                    <div className="text-right text-zinc-400">
                      Planned: {session.durationHours} hrs
                    </div>
                  </div>

                  {/* Pre-filled Planned Topic */}
                  <div className="mt-3 text-xs">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono">Planned Topic:</span>
                    <p className="text-zinc-200 font-medium mt-0.5">
                      {session.plannedTopic}
                    </p>
                  </div>

                  {session.isLogged && (
                    <div className="mt-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs text-zinc-400 space-y-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span>Covered: {session.loggedPercent}%</span>
                        <span className="text-emerald-400">Logged on Mobile</span>
                      </div>
                      {session.leftoverTopic && (
                        <div className="text-amber-400 text-[11px]">
                          Leftover: {session.leftoverTopic}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="mt-4 pt-3 border-t border-white/[0.06] flex justify-end">
                    <button
                      onClick={() => setActiveSessionToLog(session)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        session.isLogged
                          ? 'bg-white/10 hover:bg-white/20 text-white'
                          : 'bg-sky-500 hover:bg-sky-400 text-black shadow-md shadow-sky-500/20'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>{session.isLogged ? 'Edit Session Log' : 'Confirm & Log (<60s)'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Visiting Faculty Lecture Count & Honorarium Section (From Brief) */}
        <div className="p-5 rounded-2xl bg-[#090A0F] border border-white/[0.08] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CreditCard className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Visiting Faculty Lecture Count & Honorarium Export
                </h3>
                <p className="text-xs text-zinc-400">
                  Planned vs taken hours per month with calculated honorarium payouts
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-zinc-400">Month: Oct 2026</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02] text-zinc-400 text-[11px] uppercase">
                  <th className="py-2.5 px-3">Faculty Name</th>
                  <th className="py-2.5 px-3">Planned Lectures</th>
                  <th className="py-2.5 px-3">Taken Lectures</th>
                  <th className="py-2.5 px-3">Rate / Hour</th>
                  <th className="py-2.5 px-3">Gross Honorarium</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {visitingFacultyRecords.map((rec, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3 text-white font-medium">{rec.name}</td>
                    <td className="py-3 px-3 text-zinc-400">{rec.plannedHours} hrs</td>
                    <td className="py-3 px-3 text-sky-400 font-bold">{rec.takenHours} hrs</td>
                    <td className="py-3 px-3 text-zinc-400">₹{rec.ratePerHour.toLocaleString()}</td>
                    <td className="py-3 px-3 text-emerald-400 font-bold">
                      ₹{(rec.takenHours * rec.ratePerHour).toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Verified by EOD Log
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Session Logger Modal */}
      {activeSessionToLog && (
        <QuickSessionLogModal
          session={activeSessionToLog}
          isOpen={true}
          onClose={() => setActiveSessionToLog(null)}
          onSave={handleSaveSession}
        />
      )}
    </div>
  );
}
