'use client';

import React, { useState } from 'react';
import {
  TimetableSession,
  SessionStatus,
  SubjectProgress,
} from '@/lib/course-progression-data';
import {
  X,
  Check,
  Clock,
  BookOpen,
  Calendar,
  AlertCircle,
  Sparkles,
  FileCheck2,
  ChevronRight,
  Smartphone,
} from 'lucide-react';

interface QuickSessionLogModalProps {
  session: TimetableSession;
  isOpen: boolean;
  onClose: () => void;
  onSave: (loggedData: {
    sessionId: string;
    status: SessionStatus;
    percentComplete: number;
    coveredContent: string;
    leftoverTopic: string;
    carryForwardTopic: string;
    homeworkStatus: 'Assigned' | 'None' | 'Reviewed';
    notes: string;
    durationHours: number;
  }) => void;
}

export function QuickSessionLogModal({
  session,
  isOpen,
  onClose,
  onSave,
}: QuickSessionLogModalProps) {
  const [status, setStatus] = useState<SessionStatus>('Completed');
  const [percentComplete, setPercentComplete] = useState<number>(100);
  const [coveredContent, setCoveredContent] = useState<string>(session.plannedTopic);
  const [leftoverTopic, setLeftoverTopic] = useState<string>('');
  const [carryForwardTopic, setCarryForwardTopic] = useState<string>('Next Scheduled Lecture');
  const [homeworkStatus, setHomeworkStatus] = useState<'Assigned' | 'None' | 'Reviewed'>('Assigned');
  const [notes, setNotes] = useState<string>('Session conducted smoothly. Core concepts verified through interactive class lab.');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleStatusChange = (newStatus: SessionStatus) => {
    setStatus(newStatus);
    if (newStatus === 'Completed') {
      setPercentComplete(100);
      setLeftoverTopic('');
    } else if (newStatus === 'In Progress') {
      setPercentComplete(70);
      setLeftoverTopic('Remaining 30% to be carried forward');
    } else if (newStatus === 'Skipped' || newStatus === 'Cancelled') {
      setPercentComplete(0);
      setLeftoverTopic(session.plannedTopic);
    }
  };

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      onSave({
        sessionId: session.id,
        status,
        percentComplete,
        coveredContent,
        leftoverTopic,
        carryForwardTopic,
        homeworkStatus,
        notes,
        durationHours: session.durationHours,
      });
      setSubmitted(false);
      onClose();
    }, 400);
  };

  const statuses: { value: SessionStatus; label: string; desc: string }[] = [
    { value: 'Completed', label: 'Completed', desc: '100% planned topic covered' },
    { value: 'In Progress', label: 'In Progress', desc: 'Partially covered' },
    { value: 'Merged', label: 'Merged', desc: 'Combined with prior session' },
    { value: 'Skipped', label: 'Skipped', desc: 'Postponed / Makeup needed' },
    { value: 'Cancelled', label: 'Cancelled', desc: 'Holiday / Campus event' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#090A0F] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Strip */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Smartphone className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white tracking-wide">
                  60-Second Daily Session Log
                </h3>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Pre-filled
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {session.subjectName} ({session.subjectCode}) • {session.batch}
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

        {/* Modal Scrollable Body */}
        <form onSubmit={handleQuickSubmit} className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* Timetable context banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-zinc-300">
            <div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Slot</div>
              <div className="font-medium text-white flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3 text-sky-400" />
                {session.startTime} - {session.endTime}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Planned Hours</div>
              <div className="font-medium text-white mt-0.5">{session.durationHours} hrs</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Room</div>
              <div className="font-medium text-white mt-0.5 truncate">{session.room}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Exam Scope</div>
              <div className="font-medium text-sky-300 mt-0.5 truncate">{session.examScope.join(', ')}</div>
            </div>
          </div>

          {/* 1. Fast Status Picker */}
          <div>
            <label className="block text-zinc-300 font-medium mb-2 flex items-center justify-between">
              <span>1. Session Delivery Status</span>
              <span className="text-[10px] text-zinc-500">Tap to toggle</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {statuses.map((item) => {
                const isSelected = status === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => handleStatusChange(item.value)}
                    className={`p-2.5 rounded-xl border text-left transition-all relative ${
                      isSelected
                        ? 'bg-sky-500/15 border-sky-400 text-white shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                        : 'bg-white/[0.02] border-white/[0.07] text-zinc-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <div className="font-semibold text-xs flex items-center justify-between">
                      <span>{item.label}</span>
                      {isSelected && <Check className="w-3 h-3 text-sky-400" />}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">{item.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Completion Percentage Slider */}
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-zinc-200">2. Syllabus Completion</span>
              <span className="font-mono font-bold text-sky-400 text-sm">
                {percentComplete}% Complete
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={percentComplete}
              onChange={(e) => setPercentComplete(Number(e.target.value))}
              className="w-full accent-sky-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-zinc-500">
              <span>0% (Cancelled/Skipped)</span>
              <span>50% (Halfway)</span>
              <span>100% (Fully Delivered)</span>
            </div>
          </div>

          {/* 3. Pre-filled Topic & Leftover Carry Forward */}
          <div className="space-y-3">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">
                3. Content Delivered (Pre-filled from syllabus)
              </label>
              <input
                type="text"
                value={coveredContent}
                onChange={(e) => setCoveredContent(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-sky-400 text-xs"
              />
            </div>

            {percentComplete < 100 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2">
                <div className="flex items-center gap-1.5 text-amber-300 font-medium text-xs">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Unfinished / Leftover Topic</span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. Decoder self-attention mathematical formulation"
                  value={leftoverTopic}
                  onChange={(e) => setLeftoverTopic(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-amber-500/30 text-amber-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400 text-xs"
                />
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-zinc-400">Carry Forward to:</span>
                  <select
                    value={carryForwardTopic}
                    onChange={(e) => setCarryForwardTopic(e.target.value)}
                    className="bg-zinc-900 border border-white/10 text-white rounded px-2 py-1 text-[11px] focus:outline-none"
                  >
                    <option value="Next Scheduled Lecture">Next Scheduled Lecture</option>
                    <option value="Weekend Makeup Hour">Weekend Makeup Hour</option>
                    <option value="Self-Study Lab Module">Self-Study Lab Module</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* 4. Homework & Classwork Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-300 font-medium mb-1.5">
                4. Classwork / Homework
              </label>
              <div className="flex gap-2">
                {(['Assigned', 'None', 'Reviewed'] as const).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHomeworkStatus(h)}
                    className={`flex-1 py-1.5 rounded-lg border text-center transition-all ${
                      homeworkStatus === h
                        ? 'bg-sky-500/20 border-sky-400 text-white font-medium'
                        : 'bg-white/[0.02] border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1.5">
                Faculty Notes / Reason for Pacing
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Brief observation or reason..."
                className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-sky-400 text-xs"
              />
            </div>
          </div>

          {/* Footer Submit Action (<60s pledge) */}
          <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between">
            <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>Auto-updates syllabus calendar & buffer ratio</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl border border-white/10 text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitted}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-semibold flex items-center gap-1.5 shadow-lg shadow-sky-500/20 transition-all active:scale-95"
              >
                {submitted ? (
                  <>
                    <Check className="w-4 h-4 animate-bounce" />
                    <span>Logged!</span>
                  </>
                ) : (
                  <>
                    <FileCheck2 className="w-4 h-4" />
                    <span>Confirm & Log (&lt;60s)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
