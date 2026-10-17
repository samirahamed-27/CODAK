import React from 'react';
import { ExamWindow, SubjectProgress } from '@/lib/course-progression-data';
import { StatusBadge } from './StatusBadge';
import { Calendar, Target, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ExamReadinessRadarProps {
  exams: ExamWindow[];
  subjects: SubjectProgress[];
}

export function ExamReadinessRadar({ exams, subjects }: ExamReadinessRadarProps) {
  return (
    <div className="bg-[#090A0F] border border-white/[0.08] rounded-2xl p-5 shadow-2xl space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Target className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wide">
              Exam Readiness & Syllabus Scope Radar
            </h3>
            <p className="text-xs text-zinc-400">
              Hours needed vs in-scope topics covered before exam windows
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/10 text-zinc-400">
          Academic Calendar Pacing
        </span>
      </div>

      {/* Exam Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {exams.map((exam) => {
          const pct = Math.round((exam.coveredHours / exam.totalInScopeHours) * 100);
          const hoursNeeded = Math.max(0, exam.totalInScopeHours - exam.coveredHours);

          return (
            <div
              key={exam.id}
              className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/15 transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-sky-400">
                      {exam.type}
                    </span>
                    <h4 className="font-semibold text-white text-xs sm:text-sm mt-0.5">
                      {exam.name}
                    </h4>
                  </div>
                  <StatusBadge status={exam.status} size="sm" />
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono mt-2">
                  <Calendar className="w-3 h-3 text-zinc-500" />
                  <span>Starts: {exam.startDate}</span>
                  <span className="text-sky-300 font-semibold ml-auto">
                    {exam.daysRemaining} days left
                  </span>
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-400">Scope Delivered</span>
                  <span className="text-white font-bold">{pct}%</span>
                </div>
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      exam.status === 'DANGER'
                        ? 'bg-rose-500'
                        : exam.status === 'TIGHT'
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-zinc-500">
                  <span>{exam.coveredHours}h delivered</span>
                  <span>{hoursNeeded}h required</span>
                </div>
              </div>

              {/* Status Note */}
              <div className="pt-2 border-t border-white/[0.05] text-[11px] text-zinc-400 flex items-center justify-between">
                <span>Pacing Status:</span>
                <span
                  className={`font-mono font-medium ${
                    hoursNeeded > exam.daysRemaining * 1.5
                      ? 'text-rose-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {hoursNeeded > exam.daysRemaining * 1.5
                    ? '⚠️ Risk of syllabus spill'
                    : '✓ On schedule for exam'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
