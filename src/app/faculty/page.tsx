import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { PlaceholderCard } from '@/components/PlaceholderCard';
import { CheckSquare, Flag, Users, BookOpen } from 'lucide-react';

export default function FacultyDashboardPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 pb-12">
      <Navbar role="faculty" userName="Dr. Priya Raman" />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 flex flex-col gap-8">
        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 border border-purple-500/20 text-purple-400 mb-3">
            <Users className="w-3.5 h-3.5" />
            Faculty Operations Hub
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Academic Instructor Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Review student submissions, curate question banks, and audit flagged activity.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/faculty/questions"
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white text-xs font-semibold transition-all shrink-0"
              >
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span>Question Bank</span>
              </Link>
              <Link
                href="/faculty/award-xp"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 transition-all shrink-0"
              >
                <CheckSquare className="w-4 h-4" />
                <span>Award Student XP</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Faculty Workflows */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active Card: Quiz Question Bank */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between gap-5 hover:border-slate-700/80 transition-all">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 uppercase tracking-wider">
                  Phase 2 Active
                </span>
              </div>
              <h2 className="text-lg font-bold text-white">Question Bank & Review Queue</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Curate multiple-choice questions for CS101, batch import questions from CSV files, and review and approve questions for the daily quiz rotation.
              </p>
              <ul className="space-y-1.5 text-xs text-slate-300 mt-1">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  Upload questions via CSV with automated validation
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  Author custom concept questions manually
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  Review and approve pending questions
                </li>
              </ul>
            </div>

            <Link
              href="/faculty/questions"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
            >
              <span>Manage Questions</span>
              <BookOpen className="w-4 h-4" />
            </Link>
          </div>

          {/* Placeholder 2: Flagged XP */}
          <PlaceholderCard
            title="Flagged XP & Audit Queue"
            description="Human review queue for suspicious learning patterns. Golden Rule: Never auto-punish. All suspicious activities are flagged for faculty discretion."
            phase="Coming in Phase 4 & 5"
            icon={Flag}
            features={[
              'Anomalous rapid quiz completions (<5 seconds)',
              'Attendance geolocation discrepancies',
              'Duplicate action alerts across sessions',
              'Faculty manual override and void reason logger'
            ]}
          />
        </div>

        {/* Course Sessions Overview Card */}
        <section
          aria-label="Active courses"
          className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-400" />
              Active Course Streams (Computer Science)
            </h2>
            <span className="text-xs text-slate-400">Semester 1 • 2026</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-xs font-bold text-white block">CS101: Data Structures</span>
              <span className="text-[11px] text-slate-400">64 Enrolled Students</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-xs font-bold text-white block">CS102: Discrete Mathematics</span>
              <span className="text-[11px] text-slate-400">58 Enrolled Students</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-xs font-bold text-white block">CS103: Digital Electronics</span>
              <span className="text-[11px] text-slate-400">61 Enrolled Students</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
