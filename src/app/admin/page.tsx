'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  CampusId,
  WorkingSaturdayRule,
  INITIAL_MISSED_LOG_ALERTS,
  CAMPUSES,
} from '@/lib/course-progression-data';
import {
  SlidersHorizontal,
  Calendar,
  Clock,
  ShieldAlert,
  Upload,
  CheckCircle2,
  Building2,
  Bell,
  Send,
  FileSpreadsheet,
} from 'lucide-react';

export default function AdminSemesterSetupPage() {
  const [selectedCampus, setSelectedCampus] = useState<CampusId>('HI-Tech');
  const [semesterStart, setSemesterStart] = useState('2026-08-01');
  const [semesterEnd, setSemesterEnd] = useState('2026-12-31');
  const [saturdayRule, setSaturdayRule] = useState<WorkingSaturdayRule>('2nd_and_4th');
  const [alerts, setAlerts] = useState(INITIAL_MISSED_LOG_ALERTS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSendReminder = (id: string, facultyName: string) => {
    setToastMessage(`✓ Automated SMS / WhatsApp reminder dispatched to ${facultyName}.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleEscalateToManager = (id: string, campus: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, escalatedToCampusManager: true } : a))
    );
    setToastMessage(`🚨 48-Hour Escalation dispatched to ${campus} Campus Manager.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="min-h-screen bg-[#07080B] text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-sky-500 text-black font-semibold text-xs shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom duration-300">
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
            <span className="text-xs font-semibold text-white">Academic Calendar & Timetable Setup</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-mono px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              Admin Control Center
            </span>
          </div>
        </div>
      </header>

      {/* Main Form & Setup Panels */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8 flex-1 w-full">
        {/* Banner */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
              <SlidersHorizontal className="w-4 h-4" />
              <span>SEMESTER & CALENDAR ARCHITECT</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
              Campus Academic Calendar & Schedule Setup
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Set working Saturday rules, holidays, exam windows, and monitor 48-hour missed log escalations.
            </p>
          </div>
        </div>

        {/* 1. Semester Configuration Form */}
        <div className="p-6 rounded-2xl bg-[#090A0F] border border-white/[0.08] space-y-5">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-400" />
            <span>1. Semester Academic Window ({selectedCampus})</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Target Campus</label>
              <select
                value={selectedCampus}
                onChange={(e) => setSelectedCampus(e.target.value as CampusId)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-sky-400"
              >
                {CAMPUSES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Semester Start Date</label>
              <input
                type="date"
                value={semesterStart}
                onChange={(e) => setSemesterStart(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-sky-400"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Semester End Date</label>
              <input
                type="date"
                value={semesterEnd}
                onChange={(e) => setSemesterEnd(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-sky-400"
              />
            </div>
          </div>

          {/* Working Saturdays Rule (From Brief: all / none / 2nd & 4th) */}
          <div>
            <label className="block text-xs text-zinc-300 font-medium mb-2">
              Working Saturdays Rule (Auto-calculates available teaching hours)
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: '2nd_and_4th', label: '2nd & 4th Saturday', desc: 'Standard MSOT university schedule' },
                { id: 'all', label: 'All Saturdays Working', desc: 'Accelerated batch track' },
                { id: 'none', label: 'No Saturdays Working', desc: 'Strict 5-day weekday schedule' },
              ].map((rule) => (
                <button
                  key={rule.id}
                  type="button"
                  onClick={() => setSaturdayRule(rule.id as WorkingSaturdayRule)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    saturdayRule === rule.id
                      ? 'bg-sky-500/15 border-sky-400 text-white'
                      : 'bg-white/[0.02] border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="font-semibold text-xs text-white">{rule.label}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">{rule.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Exam Windows Setup */}
          <div className="pt-2 border-t border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300">
                Exam Milestones & Scope Freeze Windows
              </span>
              <span className="text-[11px] font-mono text-zinc-500">
                Sessionals, Mid-term, PUT, End-term
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-sky-400 font-bold">Sessionals</div>
                <div className="text-zinc-400 text-[11px] mt-1">Sep 15 - Sep 20</div>
                <div className="text-[10px] text-emerald-400 mt-1">Completed</div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-amber-400 font-bold">Mid-Term Exam</div>
                <div className="text-zinc-400 text-[11px] mt-1">Nov 02 - Nov 09</div>
                <div className="text-[10px] text-amber-300 mt-1">Active Pacing</div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-purple-400 font-bold">PUT (Pre-University)</div>
                <div className="text-zinc-400 text-[11px] mt-1">Nov 28 - Dec 05</div>
                <div className="text-[10px] text-zinc-500 mt-1">Scheduled</div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-cyan-400 font-bold">End-Term Finals</div>
                <div className="text-zinc-400 text-[11px] mt-1">Dec 18 - Dec 30</div>
                <div className="text-[10px] text-zinc-500 mt-1">Scheduled</div>
              </div>
            </div>
          </div>

          {/* CSV / Excel Import from Brief */}
          <div className="pt-3 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Import semester calendar, holidays, and timetable from CSV/Excel</span>
            </div>
            <button
              onClick={() => {
                setToastMessage('✓ Sample Semester CSV & Timetable loaded for HI-Tech batch!');
                setTimeout(() => setToastMessage(null), 3000);
              }}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs flex items-center gap-2 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import CSV / Excel</span>
            </button>
          </div>
        </div>

        {/* 2. Missed-Log Alerts & Campus Manager Escalation (From Brief) */}
        <div className="p-6 rounded-2xl bg-[#090A0F] border border-white/[0.08] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <ShieldAlert className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Missed-Log Alerts & Campus Manager Escalations
                </h2>
                <p className="text-xs text-zinc-400">
                  Brief rule: End-of-day reminder to faculty; &gt;48 hours unlogged escalates to Campus Manager.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-rose-400 font-bold">
              {alerts.length} Pending Actions
            </span>
          </div>

          <div className="divide-y divide-white/[0.05]">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{alert.facultyName}</span>
                    <span className="text-zinc-500">•</span>
                    <span className="font-mono text-sky-400">{alert.subjectName}</span>
                    <span className="text-zinc-500">•</span>
                    <span className="text-zinc-400 font-mono">{alert.campus} ({alert.batch})</span>
                  </div>
                  <div className="text-[11px] font-mono text-zinc-400 mt-1 flex items-center gap-2">
                    <span>Date: {alert.sessionDate}</span>
                    <span>Slot: {alert.timeSlot}</span>
                    <span className="text-rose-400 font-bold">
                      ({alert.hoursElapsed} hours unlogged)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSendReminder(alert.id, alert.facultyName)}
                    className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-zinc-200 text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Send className="w-3 h-3 text-sky-400" />
                    <span>Send Faculty Reminder</span>
                  </button>

                  <button
                    onClick={() => handleEscalateToManager(alert.id, alert.campus)}
                    disabled={alert.escalatedToCampusManager}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                      alert.escalatedToCampusManager
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 cursor-default'
                        : 'bg-rose-500 hover:bg-rose-400 text-black font-semibold'
                    }`}
                  >
                    <ShieldAlert className="w-3 h-3" />
                    <span>
                      {alert.escalatedToCampusManager
                        ? 'Escalated to Campus Mgr'
                        : 'Trigger 48h Escalation'}
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
