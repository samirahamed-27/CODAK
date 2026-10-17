import React from 'react';
import {
  SubjectProgress,
  CourseStatus,
  calculateTrackWorstStatus,
  CampusId,
} from '@/lib/course-progression-data';
import { StatusBadge } from './StatusBadge';
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  TrendingDown,
  TrendingUp,
  ShieldAlert,
  Calendar,
  Hourglass,
} from 'lucide-react';

interface MacroMetricsStripProps {
  subjects: SubjectProgress[];
  campus: CampusId;
  missedLogsCount: number;
}

export function MacroMetricsStrip({
  subjects,
  campus,
  missedLogsCount,
}: MacroMetricsStripProps) {
  // 1. Calculate Rolled-up Worst Status (MSOT Specification Rule)
  const worstStatus: CourseStatus = calculateTrackWorstStatus(subjects);

  // 2. Aggregate hours
  const totalPlannedHours = subjects.reduce((acc, s) => acc + s.plannedHours, 0);
  const totalCoveredHours = subjects.reduce((acc, s) => acc + s.coveredHours, 0);
  const totalRemainingHours = subjects.reduce((acc, s) => acc + s.remainingHours, 0);
  const totalAvailableHours = subjects.reduce((acc, s) => acc + s.availableHours, 0);
  const overallCoveragePct = totalPlannedHours > 0
    ? Math.round((totalCoveredHours / totalPlannedHours) * 100)
    : 0;

  // Average buffer ratio across active subjects
  const avgBuffer = subjects.length > 0
    ? subjects.reduce((acc, s) => acc + s.bufferRatio, 0) / subjects.length
    : 0;

  const dangerSubjects = subjects.filter((s) => s.status === 'DANGER');
  const tightSubjects = subjects.filter((s) => s.status === 'TIGHT');
  const onTrackSubjects = subjects.filter((s) => s.status === 'ON TRACK');

  return (
    <div className="space-y-4">
      {/* MSOT Specification Rule Highlight: Worst Subject Rollup Banner */}
      <div
        className={`p-4 rounded-2xl border transition-all ${
          worstStatus === 'DANGER'
            ? 'bg-rose-500/[0.07] border-rose-500/30'
            : worstStatus === 'TIGHT'
            ? 'bg-amber-500/[0.07] border-amber-500/30'
            : 'bg-emerald-500/[0.07] border-emerald-500/30'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`p-2 rounded-xl ${
                worstStatus === 'DANGER'
                  ? 'bg-rose-500/20 text-rose-400'
                  : worstStatus === 'TIGHT'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                  Track Rollup ({campus})
                </span>
                <StatusBadge status={worstStatus} size="sm" />
              </div>
              <p className="text-xs text-zinc-300 mt-0.5">
                {worstStatus === 'DANGER'
                  ? `Critical early warning: ${dangerSubjects.length} subject(s) are at risk of missing syllabus deadlines before exams.`
                  : worstStatus === 'TIGHT'
                  ? `Tight margin: ${tightSubjects.length} subject(s) have under 15% buffer before exam deadlines.`
                  : 'All subjects are pacing smoothly against the academic calendar with ample buffer.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
            <span className="text-zinc-500">Rule:</span>
            <span className="text-zinc-300">Worst Subject (Non-Averaged)</span>
          </div>
        </div>
      </div>

      {/* 4 Clean Minimalist Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Syllabus Delivery */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.07] relative overflow-hidden group hover:border-white/15 transition-all">
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center justify-between">
            <span>Syllabus Delivered</span>
            <CheckCircle className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white">
              {overallCoveragePct}%
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              {totalCoveredHours}h / {totalPlannedHours}h
            </span>
          </div>
          {/* Micro Progress Bar */}
          <div className="w-full bg-zinc-800/80 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-sky-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${overallCoveragePct}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Available Hours vs Remaining */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.07] relative overflow-hidden group hover:border-white/15 transition-all">
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center justify-between">
            <span>Hours Runway</span>
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white">
              {totalAvailableHours}h
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              avail / {totalRemainingHours}h needed
            </span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-2 flex items-center gap-1 font-mono">
            <span className="text-emerald-400">+{totalAvailableHours - totalRemainingHours}h</span> net safety buffer
          </div>
        </div>

        {/* Metric 3: Buffer Ratio Health */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.07] relative overflow-hidden group hover:border-white/15 transition-all">
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center justify-between">
            <span>Buffer Health</span>
            <Hourglass className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight ${
              avgBuffer < 0 ? 'text-rose-400' : avgBuffer < 0.15 ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {(avgBuffer * 100).toFixed(0)}%
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              avg buffer ratio
            </span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-2 font-mono">
            {dangerSubjects.length} in danger • {tightSubjects.length} tight • {onTrackSubjects.length} on track
          </div>
        </div>

        {/* Metric 4: Missed Logs & Escalations */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.07] relative overflow-hidden group hover:border-white/15 transition-all">
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center justify-between">
            <span>Log Compliance</span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight ${
              missedLogsCount > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              {missedLogsCount}
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              unlogged sessions
            </span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-2 font-mono">
            {missedLogsCount > 0 ? 'Escalations sent to Campus Mgr' : '100% faculty log compliance'}
          </div>
        </div>
      </div>
    </div>
  );
}
