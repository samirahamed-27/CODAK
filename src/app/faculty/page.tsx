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
            <Link
              href="/faculty/award-xp"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 transition-all shrink-0"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Award Student XP</span>
            </Link>
          </div>
        </div>

        {/* Placeholders for Faculty Workflows */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Placeholder 1: Quiz questions to review */}
          <PlaceholderCard
            title="Quiz Questions to Review"
            description="Review and approve student-submitted concept quiz questions and CSV imports before they enter the daily learning rotation."
            phase="Coming in Phase 2 & 4"
            icon={CheckSquare}
            features={[
              'Inspect CSV question bank uploads',
              'Verify accuracy of concept explanations',
              'Tag questions by subject (DSA, OS, DBMS)',
              'One-click approval to publish into daily quiz'
            ]}
          />

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
