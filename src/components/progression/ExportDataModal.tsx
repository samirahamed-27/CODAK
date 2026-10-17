'use client';

import React, { useState } from 'react';
import { SubjectProgress, CampusId } from '@/lib/course-progression-data';
import { X, Download, FileSpreadsheet, Copy, Check } from 'lucide-react';

interface ExportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: SubjectProgress[];
  campus: CampusId;
}

export function ExportDataModal({
  isOpen,
  onClose,
  subjects,
  campus,
}: ExportDataModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const generateCsv = () => {
    const headers = [
      'Campus',
      'Track',
      'Subject Code',
      'Subject Name',
      'Faculty',
      'Batch',
      'Planned Hours',
      'Covered Hours',
      'Remaining Hours',
      'Available Hours',
      'Buffer Ratio (%)',
      'Course Status',
      'Pace Delta (Hours)',
      'Next Exam',
      'Exam Days Left',
    ];

    const rows = subjects.map((s) => [
      `"${s.campus}"`,
      `"${s.track}"`,
      `"${s.code}"`,
      `"${s.name}"`,
      `"${s.facultyName}"`,
      `"${s.batch}"`,
      s.plannedHours,
      s.coveredHours,
      s.remainingHours,
      s.availableHours,
      Math.round(s.bufferRatio * 100),
      `"${s.status}"`,
      s.paceDeltaHours,
      `"${s.nextExamName}"`,
      s.nextExamDaysLeft,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  };

  const handleDownloadCsv = () => {
    const csvContent = generateCsv();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `msot_course_progression_${campus.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopySheetsFormat = () => {
    const csvContent = generateCsv();
    navigator.clipboard.writeText(csvContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#090A0F] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FileSpreadsheet className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wide">
                Export Progression Data ({campus})
              </h3>
              <p className="text-xs text-zinc-400">
                Compatible with MSOT Excel Tracker and Google Sheets
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

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-zinc-300">
            Export includes all <strong>{subjects.length} subjects</strong>, faculty lecture pacing,
            buffer ratios, and exam deadline projections for {campus}.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleDownloadCsv}
              className="p-4 rounded-xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-200 flex flex-col items-center justify-center gap-2 transition-all group"
            >
              <Download className="w-6 h-6 text-sky-400 group-hover:scale-110 transition-transform" />
              <span className="font-semibold text-white">Download CSV</span>
              <span className="text-[10px] text-zinc-400">Direct spreadsheet file</span>
            </button>

            <button
              onClick={handleCopySheetsFormat}
              className="p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] text-zinc-200 flex flex-col items-center justify-center gap-2 transition-all group"
            >
              {copied ? (
                <Check className="w-6 h-6 text-emerald-400" />
              ) : (
                <Copy className="w-6 h-6 text-zinc-400 group-hover:scale-110 transition-transform" />
              )}
              <span className="font-semibold text-white">
                {copied ? 'Copied to Clipboard!' : 'Copy for Google Sheets'}
              </span>
              <span className="text-[10px] text-zinc-400">Paste directly into Sheet</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.08] bg-white/[0.01] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
