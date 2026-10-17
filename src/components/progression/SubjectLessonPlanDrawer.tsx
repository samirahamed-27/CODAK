'use client';

import React from 'react';
import { SubjectProgress } from '@/lib/course-progression-data';
import { StatusBadge } from './StatusBadge';
import {
  X,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Layers,
} from 'lucide-react';

interface SubjectLessonPlanDrawerProps {
  subject: SubjectProgress | null;
  onClose: () => void;
  onOpenQuickLog: (subjectId: string) => void;
}

export function SubjectLessonPlanDrawer({
  subject,
  onClose,
  onOpenQuickLog,
}: SubjectLessonPlanDrawerProps) {
  if (!subject) return null;

  // Mocked granular lesson plan topics for the subject
  const sampleTopics = [
    {
      unit: 'Unit 1: Fundamentals & Primitives',
      topics: [
        { name: 'Core Foundations & Distributed State', hours: 2, status: 'Completed', scope: 'Sessionals' },
        { name: 'Consensus Guarantees & Network Asynchrony', hours: 2, status: 'Completed', scope: 'Sessionals' },
        { name: 'RPC Architecture & Serialization Overhead', hours: 2, status: 'Completed', scope: 'Sessionals' },
      ],
    },
    {
      unit: 'Unit 2: Replication & Fault Tolerance',
      topics: [
        { name: 'Primary-Backup Replication Protocols', hours: 3, status: 'Completed', scope: 'Mid-Term' },
        { name: 'Quorum Systems & Byzantine Fault Tolerances', hours: 2.5, status: 'Completed', scope: 'Mid-Term' },
        { name: 'Vector Clocks & Distributed Ordering', hours: 2.5, status: 'Completed', scope: 'Mid-Term' },
      ],
    },
    {
      unit: 'Unit 3: Consensus & Storage Systems',
      topics: [
        { name: 'Paxos Protocol Mechanics & Invariants', hours: 3, status: 'Completed', scope: 'Mid-Term' },
        { name: subject.nextTopic, hours: 2.5, status: 'In Progress', scope: 'Mid-Term' },
        { name: 'LSM Trees & Distributed Append-Only Logs', hours: 3, status: 'Pending', scope: 'PUT' },
      ],
    },
    {
      unit: 'Unit 4: Production Observability & Sharding',
      topics: [
        { name: 'Consistent Hashing Rings & Virtual Nodes', hours: 3, status: 'Pending', scope: 'End-Term' },
        { name: 'Distributed Tracing & OpenTelemetry Spans', hours: 2.5, status: 'Pending', scope: 'End-Term' },
        { name: 'Chaos Engineering & Resiliency Testing', hours: 2.5, status: 'Pending', scope: 'End-Term' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[#090A0F] border-l border-white/10 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-start justify-between bg-white/[0.02]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-sky-400 font-bold">
                {subject.code}
              </span>
              <StatusBadge status={subject.status} size="sm" />
            </div>
            <h3 className="text-base font-bold text-white tracking-wide">
              {subject.name}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {subject.facultyName} • {subject.batch} ({subject.campus})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pacing Snapshot Strip */}
        <div className="grid grid-cols-3 gap-2 p-4 border-b border-white/[0.06] bg-white/[0.01] text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-[10px] text-zinc-500 uppercase">Coverage</span>
            <div className="font-bold text-white text-sm mt-0.5">
              {Math.round((subject.coveredHours / subject.plannedHours) * 100)}%
            </div>
            <div className="text-[10px] text-zinc-400">{subject.coveredHours}h / {subject.plannedHours}h</div>
          </div>
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-[10px] text-zinc-500 uppercase">Buffer Ratio</span>
            <div className={`font-bold text-sm mt-0.5 ${subject.bufferRatio < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {(subject.bufferRatio * 100).toFixed(0)}%
            </div>
            <div className="text-[10px] text-zinc-400">{subject.availableHours}h avail</div>
          </div>
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-[10px] text-zinc-500 uppercase">Next Exam</span>
            <div className="font-bold text-sky-400 text-sm mt-0.5">
              {subject.nextExamDaysLeft}d left
            </div>
            <div className="text-[10px] text-zinc-400">{subject.nextExamName}</div>
          </div>
        </div>

        {/* Scrollable Lesson Plan Units */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="font-mono uppercase text-[11px] tracking-wider text-zinc-300 font-semibold">
              Syllabus Units & Planned Teaching Hours
            </span>
            <span className="text-[11px] font-mono">
              {subject.unitsCompleted} / {subject.unitsTotal} units finished
            </span>
          </div>

          {sampleTopics.map((u, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2.5"
            >
              <div className="font-semibold text-white text-xs flex items-center justify-between">
                <span>{u.unit}</span>
              </div>

              <div className="space-y-1.5">
                {u.topics.map((t, tIdx) => (
                  <div
                    key={tIdx}
                    className="p-2 rounded-lg bg-black/30 border border-white/5 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          t.status === 'Completed'
                            ? 'bg-emerald-400'
                            : t.status === 'In Progress'
                            ? 'bg-amber-400 animate-pulse'
                            : 'bg-zinc-600'
                        }`}
                      />
                      <span className="text-zinc-200">{t.name}</span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[10px] shrink-0">
                      <span className="text-zinc-400">{t.hours}h</span>
                      <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-sky-300">
                        {t.scope}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.08] bg-white/[0.01] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-white/10 text-zinc-400 hover:text-white text-xs"
          >
            Close
          </button>
          <button
            onClick={() => {
              onClose();
              onOpenQuickLog(subject.id);
            }}
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-semibold text-xs transition-colors flex items-center gap-1.5"
          >
            <span>Log Daily Session (&lt;60s)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
