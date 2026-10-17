'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  CampusId,
  TrackId,
  SubjectProgress,
  TimetableSession,
  INITIAL_SUBJECTS,
  INITIAL_TIMETABLE_TODAY,
  INITIAL_EXAMS,
  INITIAL_MISSED_LOG_ALERTS,
  calculateTrackWorstStatus,
} from '@/lib/course-progression-data';
import { CampusTrackHeader } from '@/components/progression/CampusTrackHeader';
import { MacroMetricsStrip } from '@/components/progression/MacroMetricsStrip';
import { SubjectProgressionTable } from '@/components/progression/SubjectProgressionTable';
import { ExamReadinessRadar } from '@/components/progression/ExamReadinessRadar';
import { QuickSessionLogModal } from '@/components/progression/QuickSessionLogModal';
import { AiRecoveryModal } from '@/components/progression/AiRecoveryModal';
import { ExportDataModal } from '@/components/progression/ExportDataModal';
import { SubjectLessonPlanDrawer } from '@/components/progression/SubjectLessonPlanDrawer';
import {
  Sparkles,
  Smartphone,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Layers,
  SlidersHorizontal,
  GraduationCap,
  FileCheck2,
} from 'lucide-react';

export default function HomePage() {
  const [selectedCampus, setSelectedCampus] = useState<CampusId>('HI-Tech');
  const [selectedTrack, setSelectedTrack] = useState<TrackId | 'all'>('all');
  const [subjects, setSubjects] = useState<SubjectProgress[]>(INITIAL_SUBJECTS);
  const [todaySessions, setTodaySessions] = useState<TimetableSession[]>(INITIAL_TIMETABLE_TODAY);
  const [missedAlerts] = useState(INITIAL_MISSED_LOG_ALERTS);

  // Modals state
  const [activeSessionToLog, setActiveSessionToLog] = useState<TimetableSession | null>(null);
  const [inspectedSubject, setInspectedSubject] = useState<SubjectProgress | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filter subjects by selected campus and track
  const campusSubjects = subjects.filter((s) => {
    const matchesCampus = s.campus === selectedCampus;
    const matchesTrack = selectedTrack === 'all' || s.track === selectedTrack;
    return matchesCampus && matchesTrack;
  });

  const campusAlerts = missedAlerts.filter((a) => a.campus === selectedCampus);

  const handleOpenQuickLogForSubject = (subjectId: string) => {
    const matched = todaySessions.find((s) => s.subjectId === subjectId);
    if (matched) {
      setActiveSessionToLog(matched);
    } else {
      // Create a temporary session object for quick logging
      const subj = subjects.find((s) => s.id === subjectId);
      if (subj) {
        setActiveSessionToLog({
          id: `sess-${Date.now()}`,
          subjectId: subj.id,
          subjectName: subj.name,
          subjectCode: subj.code,
          campus: subj.campus,
          track: subj.track,
          batch: subj.batch,
          facultyName: subj.facultyName,
          dayOfWeek: 'Monday',
          startTime: '10:00',
          endTime: '11:30',
          durationHours: 1.5,
          room: 'Seminar Hall',
          plannedUnit: 'Unit 3: Core Concepts',
          plannedTopic: subj.nextTopic,
          topicPlannedHours: 1.5,
          examScope: ['Mid-Term', 'PUT'],
          isLogged: false,
        });
      }
    }
  };

  const handleSaveSession = (loggedData: {
    sessionId: string;
    status: any;
    percentComplete: number;
    coveredContent: string;
    durationHours: number;
  }) => {
    // Update subject progress dynamically
    if (activeSessionToLog) {
      const addedHours = Number(((loggedData.durationHours * loggedData.percentComplete) / 100).toFixed(1));
      setSubjects((prev) =>
        prev.map((sub) => {
          if (sub.id === activeSessionToLog.subjectId) {
            const newCovered = Number((sub.coveredHours + addedHours).toFixed(1));
            const newRemaining = Math.max(0, Number((sub.plannedHours - newCovered).toFixed(1)));
            const newBuffer = (sub.availableHours - newRemaining) / (newRemaining || 1);
            const newStatus =
              newBuffer < 0 ? 'DANGER' : newBuffer < 0.15 ? 'TIGHT' : 'ON TRACK';

            return {
              ...sub,
              coveredHours: newCovered,
              remainingHours: newRemaining,
              bufferRatio: newBuffer,
              status: newCovered >= sub.plannedHours ? 'COMPLETE' : newStatus,
              topicsCovered: sub.topicsCovered + 1,
              lastLoggedAt: 'Just now',
            };
          }
          return sub;
        })
      );

      // Trigger Toast feedback
      setToastMessage(`✓ Logged: "${activeSessionToLog.subjectCode}" session confirmed in <60s! Syllabus pacing recalculated.`);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-[#07080B] text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-black">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-emerald-500 text-black font-semibold text-xs shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Campus & Track Header */}
      <CampusTrackHeader
        selectedCampus={selectedCampus}
        onSelectCampus={setSelectedCampus}
        selectedTrack={selectedTrack}
        onSelectTrack={setSelectedTrack}
        onOpenAiSummary={() => setIsAiModalOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
      />

      {/* Main Dashboard Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Hero Orientation Banner */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-white/[0.03] to-transparent border border-white/[0.08]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
                Semester 1 (2026-27)
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                Working Saturdays: 2nd & 4th
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {selectedCampus} Course Progression & Syllabus Velocity
            </h1>
            <p className="text-xs text-zinc-400 max-w-2xl">
              Real-time syllabus delivery tracking. Planned hours vs actual taught sessions,
              safety buffer ratios, and early warning exam readiness projections.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => {
                if (todaySessions.length > 0) {
                  setActiveSessionToLog(todaySessions[0]);
                }
              }}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-semibold text-xs flex items-center gap-2 shadow-lg shadow-sky-500/20 transition-all active:scale-95"
            >
              <Smartphone className="w-4 h-4" />
              <span>Simulate 60s Session Log</span>
            </button>
            <button
              onClick={() => setIsAiModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>AI Recovery Plan</span>
            </button>
          </div>
        </div>

        {/* 1. Macro Metrics Strip with Worst Subject Rollup */}
        <MacroMetricsStrip
          subjects={campusSubjects}
          campus={selectedCampus}
          missedLogsCount={campusAlerts.length}
        />

        {/* 2. Interactive Progression Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
              <span>Subject Pacing & Buffer Ratio Matrix</span>
              <span className="text-xs font-mono text-zinc-400 font-normal">
                ({campusSubjects.length} subjects in {selectedCampus})
              </span>
            </h2>
            <div className="text-[11px] font-mono text-zinc-400">
              Hour-weighted calculation
            </div>
          </div>

          <SubjectProgressionTable
            subjects={campusSubjects}
            onQuickLog={handleOpenQuickLogForSubject}
            onInspectSubject={(subj) => setInspectedSubject(subj)}
          />
        </div>

        {/* 3. Exam Readiness Radar */}
        <ExamReadinessRadar
          exams={INITIAL_EXAMS.filter((e) => e.campus === selectedCampus || selectedCampus === 'HI-Tech')}
          subjects={campusSubjects}
        />

        {/* 4. Three Dedicated Core Pillars Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pillar 1: Faculty */}
          <Link
            href="/faculty"
            className="p-5 rounded-2xl bg-[#090A0F] border border-white/[0.08] hover:border-sky-500/40 hover:bg-white/[0.02] transition-all group flex flex-col justify-between"
          >
            <div className="space-y-2">
              <span className="p-2 rounded-xl bg-sky-500/10 text-sky-400 inline-block border border-sky-500/20">
                <FileCheck2 className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-semibold text-white group-hover:text-sky-300 transition-colors">
                Faculty Daily Session Logging
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Log scheduled sessions in under 60 seconds from any phone. Pre-filled from timetable
                with instant auto-carryover of leftover topics.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs text-sky-400 font-medium">
              <span>Open Faculty Portal</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Pillar 2: Student */}
          <Link
            href="/student"
            className="p-5 rounded-2xl bg-[#090A0F] border border-white/[0.08] hover:border-purple-500/40 hover:bg-white/[0.02] transition-all group flex flex-col justify-between"
          >
            <div className="space-y-2">
              <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 inline-block border border-purple-500/20">
                <GraduationCap className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">
                Student Course Scope View
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Students see what was covered in each subject, upcoming exam syllabus scope,
                and what concepts are being taught next.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs text-purple-400 font-medium">
              <span>Open Student Scope</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Pillar 3: Admin Setup */}
          <Link
            href="/admin"
            className="p-5 rounded-2xl bg-[#090A0F] border border-white/[0.08] hover:border-emerald-500/40 hover:bg-white/[0.02] transition-all group flex flex-col justify-between"
          >
            <div className="space-y-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 inline-block border border-emerald-500/20">
                <SlidersHorizontal className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">
                Semester & Timetable Setup
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Admin configuration: working Saturdays (all / none / 2nd & 4th), holiday calendars,
                exam windows, timetable import, and 48h escalation alerts.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs text-emerald-400 font-medium">
              <span>Open Semester Architect</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/[0.06] bg-[#07080B] py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 font-mono">
          <div>
            MSOT Course Progression Platform • HI-Tech, Ratnam, RGIB & JUJ
          </div>
          <div className="flex items-center gap-4">
            <span>Pacing Rule: Worst-Subject Rollup</span>
            <span>•</span>
            <span>60s Mobile Logging</span>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      {activeSessionToLog && (
        <QuickSessionLogModal
          session={activeSessionToLog}
          isOpen={true}
          onClose={() => setActiveSessionToLog(null)}
          onSave={handleSaveSession}
        />
      )}

      {inspectedSubject && (
        <SubjectLessonPlanDrawer
          subject={inspectedSubject}
          onClose={() => setInspectedSubject(null)}
          onOpenQuickLog={handleOpenQuickLogForSubject}
        />
      )}

      <AiRecoveryModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        selectedCampus={selectedCampus}
      />

      <ExportDataModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        subjects={campusSubjects}
        campus={selectedCampus}
      />
    </div>
  );
}
