'use client';

import React from 'react';
import { AI_CAMPUS_RECOVERY_INSIGHTS, CampusId } from '@/lib/course-progression-data';
import { X, Sparkles, AlertTriangle, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';

interface AiRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCampus: CampusId;
}

export function AiRecoveryModal({
  isOpen,
  onClose,
  selectedCampus,
}: AiRecoveryModalProps) {
  if (!isOpen) return null;

  const insights = AI_CAMPUS_RECOVERY_INSIGHTS.filter(
    (i) => i.campus === selectedCampus || selectedCampus === 'HI-Tech'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#090A0F] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between bg-sky-500/[0.03]">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
                <span>AI Weekly Pacing & Recovery Summary</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  {selectedCampus}
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Synthesized from daily session log notes, attendance records, and exam deadlines
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-start gap-3">
            <Zap className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <p className="text-zinc-300 leading-relaxed">
              Our syllabus synthesis engine evaluated <strong>14 session logs</strong> and identified{' '}
              <strong className="text-rose-400">deficit hours</strong> in key subjects. Below are the root
              causes extracted from faculty notes and recommended recovery schedules.
            </p>
          </div>

          <div className="space-y-3">
            {insights.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-white/15 transition-all space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-xs sm:text-sm">
                      {item.subject}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      ({item.faculty})
                    </span>
                  </div>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                    -{item.deficitHours}h Behind Plan
                  </span>
                </div>

                <div className="text-zinc-400 text-xs">
                  <strong className="text-zinc-300">Root Cause (from notes): </strong>
                  {item.rootCause}
                </div>

                <div className="p-3 rounded-lg bg-sky-500/[0.06] border border-sky-500/20 text-sky-200">
                  <strong className="text-sky-300 flex items-center gap-1 mb-1">
                    <ArrowRight className="w-3.5 h-3.5" /> Recommended Recovery Plan:
                  </strong>
                  <span>{item.recommendation}</span>
                </div>

                <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>{item.impact}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.08] bg-white/[0.01] flex items-center justify-between">
          <span className="text-[11px] text-zinc-500 font-mono">
            Generated weekly every Monday 08:00 AM
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
