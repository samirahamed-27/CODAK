'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  SubjectProgress,
  INITIAL_SUBJECTS,
  INITIAL_EXAMS,
} from '@/lib/course-progression-data';
import { StatusBadge } from '@/components/progression/StatusBadge';
import {
  GraduationCap,
  BookOpen,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
} from 'lucide-react';

export default function StudentScopePage() {
  const [selectedBatch, setSelectedBatch] = useState('2026-Batch-A');
  const subjects = INITIAL_SUBJECTS.filter((s) => s.campus === 'HI-Tech');
  const exams = INITIAL_EXAMS;

  return (
    <div className="min-h-screen bg-[#07080B] text-slate-100 flex flex-col font-sans">
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
            <span className="text-xs font-semibold text-white">Student Course & Exam Scope</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-mono px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
              Batch: 2026-Batch-A
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8 flex-1 w-full">
        {/* Banner */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-purple-400">
              <GraduationCap className="w-4 h-4" />
              <span>STUDENT SYLLABUS TRANSPARENCY</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
              What was covered & what is coming next
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Live syllabus progress for your enrolled subjects and exact topic scope for upcoming exams.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-300 bg-black/40 p-2.5 rounded-xl border border-white/5">
            <Calendar className="w-4 h-4 text-purple-400" />
            <span>Next Exam: Mid-Term (in 14 days)</span>
          </div>
        </div>

        {/* Upcoming Exam Scope Radar for Students */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-400" />
            <span>Upcoming Exam Windows & Syllabus Scope</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="p-4 rounded-2xl bg-[#090A0F] border border-white/[0.08] space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-sky-400">
                      {exam.type}
                    </span>
                    <h3 className="font-semibold text-white text-sm mt-0.5">
                      {exam.name}
                    </h3>
                  </div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-300">
                    {exam.daysRemaining} days left
                  </span>
                </div>
                <div className="text-xs font-mono text-zinc-400">
                  <div>Scope: {exam.totalInScopeHours} hours of curriculum</div>
                  <div className="text-emerald-400 mt-0.5">{exam.coveredHours} hours taught in class</div>
                </div>
                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-sky-400 h-full rounded-full"
                    style={{ width: `${Math.round((exam.coveredHours / exam.totalInScopeHours) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Enrolled Subjects Syllabus Breakdown */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-sky-400" />
            <span>Enrolled Subjects & Pacing Status</span>
          </h2>

          <div className="space-y-3">
            {subjects.map((s) => {
              const pct = Math.round((s.coveredHours / s.plannedHours) * 100);
              return (
                <div
                  key={s.id}
                  className="p-5 rounded-2xl bg-[#090A0F] border border-white/[0.08] hover:border-white/15 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-sky-400">{s.code}</span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-xs text-zinc-400">{s.facultyName}</span>
                      </div>
                      <h3 className="font-semibold text-white text-base mt-0.5">
                        {s.name}
                      </h3>
                    </div>
                    <StatusBadge status={s.status} size="sm" />
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-zinc-400">Overall Syllabus Covered</span>
                      <span className="text-white font-bold">{pct}% ({s.coveredHours}h / {s.plannedHours}h)</span>
                    </div>
                    <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${s.status === 'DANGER' ? 'bg-rose-500' : 'bg-sky-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* What was covered vs what is coming next */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[10px] uppercase font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Last Session Covered</span>
                      </div>
                      <p className="text-zinc-200">
                        {s.topicsCovered} topics covered • Last logged {s.lastLoggedAt}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-1">
                      <div className="flex items-center gap-1.5 text-sky-400 font-mono text-[10px] uppercase font-semibold">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Coming Up Next in Class</span>
                      </div>
                      <p className="text-zinc-200 font-medium">
                        {s.nextTopic}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
