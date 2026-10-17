'use client';

import React, { useState } from 'react';
import { SubjectProgress, CourseStatus } from '@/lib/course-progression-data';
import { StatusBadge } from './StatusBadge';
import {
  Search,
  Filter,
  ArrowUpDown,
  BookOpen,
  Calendar,
  Clock,
  Sparkles,
  ChevronRight,
  User,
  PlusCircle,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

interface SubjectProgressionTableProps {
  subjects: SubjectProgress[];
  onQuickLog: (subjectId: string) => void;
  onInspectSubject?: (subject: SubjectProgress) => void;
}

export function SubjectProgressionTable({
  subjects,
  onQuickLog,
  onInspectSubject,
}: SubjectProgressionTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | CourseStatus>('ALL');

  const filteredSubjects = subjects.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.facultyName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-[#090A0F] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl">
      {/* Table Filter Toolbar */}
      <div className="p-4 border-b border-white/[0.06] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/[0.01]">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search subjects, codes, or faculty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-sky-400 transition-colors"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 sm:pb-0 scrollbar-none">
          <span className="text-[10px] font-mono uppercase text-zinc-500 mr-1 hidden sm:inline">
            Status:
          </span>
          {(['ALL', 'ON TRACK', 'TIGHT', 'DANGER'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all ${
                statusFilter === st
                  ? 'bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/30'
                  : 'bg-white/[0.02] text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Table Data */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/[0.08] bg-white/[0.02] text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              <th className="py-3 px-4">Subject & Code</th>
              <th className="py-3 px-4">Faculty & Batch</th>
              <th className="py-3 px-4">Delivery Progress</th>
              <th className="py-3 px-4">Hours Ratio</th>
              <th className="py-3 px-4">Buffer Ratio</th>
              <th className="py-3 px-4">Pace Delta</th>
              <th className="py-3 px-4">Course Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {filteredSubjects.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-zinc-500">
                  No subjects match the selected filters.
                </td>
              </tr>
            ) : (
              filteredSubjects.map((subject) => {
                const pct = Math.round((subject.coveredHours / subject.plannedHours) * 100);
                const bufferPct = Math.round(subject.bufferRatio * 100);

                return (
                  <tr
                    key={subject.id}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    {/* Subject info */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white tracking-wide flex items-center gap-1.5">
                        <span>{subject.name}</span>
                      </div>
                      <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-2 mt-0.5">
                        <span className="text-sky-400 font-medium">{subject.code}</span>
                        <span>•</span>
                        <span className="capitalize">{subject.track} Track</span>
                        <span>•</span>
                        <span>{subject.campus}</span>
                      </div>
                    </td>

                    {/* Faculty */}
                    <td className="py-3.5 px-4">
                      <div className="text-zinc-200 flex items-center gap-1">
                        <User className="w-3 h-3 text-zinc-500" />
                        <span>{subject.facultyName}</span>
                      </div>
                      <div className="text-[11px] font-mono text-zinc-500 mt-0.5">
                        {subject.batch}
                      </div>
                    </td>

                    {/* Progress Bar & Hours */}
                    <td className="py-3.5 px-4 min-w-[160px]">
                      <div className="flex items-center justify-between font-mono text-[11px] mb-1">
                        <span className="text-white font-bold">{pct}%</span>
                        <span className="text-zinc-400">
                          {subject.coveredHours}h / {subject.plannedHours}h
                        </span>
                      </div>
                      <div className="w-full bg-zinc-800/80 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            subject.status === 'DANGER'
                              ? 'bg-rose-500'
                              : subject.status === 'TIGHT'
                              ? 'bg-amber-400'
                              : 'bg-sky-400'
                          }`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-1 font-mono">
                        {subject.topicsCovered} of {subject.topicsTotal} topics covered
                      </div>
                    </td>

                    {/* Hours Runway */}
                    <td className="py-3.5 px-4 font-mono">
                      <div className="text-zinc-200">
                        <span className="text-white font-medium">{subject.availableHours}h</span> avail
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        {subject.remainingHours}h remaining
                      </div>
                    </td>

                    {/* Buffer Ratio */}
                    <td className="py-3.5 px-4 font-mono">
                      <div
                        className={`font-bold text-xs ${
                          bufferPct < 0
                            ? 'text-rose-400'
                            : bufferPct < 15
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {bufferPct > 0 ? `+${bufferPct}%` : `${bufferPct}%`}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        {subject.bufferRatio < 0 ? 'Deficit' : 'Safety buffer'}
                      </div>
                    </td>

                    {/* Pace vs Plan */}
                    <td className="py-3.5 px-4 font-mono">
                      <div
                        className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md ${
                          subject.paceDeltaHours < 0
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {subject.paceDeltaHours < 0 ? (
                          <>
                            <TrendingDown className="w-3 h-3" />
                            <span>{subject.paceDeltaHours}h behind</span>
                          </>
                        ) : (
                          <>
                            <TrendingUp className="w-3 h-3" />
                            <span>+{subject.paceDeltaHours}h ahead</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      <StatusBadge status={subject.status} size="sm" />
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onQuickLog(subject.id)}
                          className="px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[11px] font-medium transition-all"
                          title="Quick 60s Session Log"
                        >
                          Log Session
                        </button>
                        {onInspectSubject && (
                          <button
                            onClick={() => onInspectSubject(subject)}
                            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                            title="Inspect Syllabus & Lesson Plan"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className="p-3.5 border-t border-white/[0.06] bg-white/[0.01] flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-zinc-500 gap-2">
        <div>
          Showing {filteredSubjects.length} of {subjects.length} subjects • Tracked by planned teaching hours
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>&gt;15% buffer</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>0-15% buffer</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>&lt;0% deficit</span>
          </span>
        </div>
      </div>
    </div>
  );
}
