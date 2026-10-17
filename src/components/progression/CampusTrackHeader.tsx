'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CampusId,
  TrackId,
  CAMPUSES,
  TRACKS,
} from '@/lib/course-progression-data';
import {
  Building2,
  Layers,
  Sparkles,
  Download,
  CalendarDays,
  UserCheck,
  GraduationCap,
  SlidersHorizontal,
} from 'lucide-react';

interface CampusTrackHeaderProps {
  selectedCampus: CampusId;
  onSelectCampus: (campus: CampusId) => void;
  selectedTrack: TrackId | 'all';
  onSelectTrack: (track: TrackId | 'all') => void;
  onOpenAiSummary?: () => void;
  onOpenExport?: () => void;
}

export function CampusTrackHeader({
  selectedCampus,
  onSelectCampus,
  selectedTrack,
  onSelectTrack,
  onOpenAiSummary,
  onOpenExport,
}: CampusTrackHeaderProps) {
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Executive Dashboard', icon: <Layers className="w-3.5 h-3.5" /> },
    { href: '/faculty', label: 'Faculty Fast-Log', icon: <UserCheck className="w-3.5 h-3.5" /> },
    { href: '/student', label: 'Student Scope', icon: <GraduationCap className="w-3.5 h-3.5" /> },
    { href: '/admin', label: 'Semester Setup', icon: <SlidersHorizontal className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="w-full border-b border-white/[0.08] bg-[#07080B]/90 backdrop-blur-xl sticky top-0 z-40">
      {/* Top Branding & Main Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center font-mono font-bold text-sky-400 text-sm shadow-inner">
            M
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white tracking-tight text-sm sm:text-base">
                MSOT Course Progression
              </span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                Live Velocity
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Syllabus pacing, buffer ratios, & exam readiness tracker
            </p>
          </div>
        </div>

        {/* Campus & Track Switchers */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Campus Selector */}
          <div className="flex items-center rounded-xl bg-white/[0.03] border border-white/[0.08] p-1 text-xs">
            <Building2 className="w-3.5 h-3.5 text-zinc-400 ml-2 mr-1" />
            {CAMPUSES.map((c) => {
              const active = selectedCampus === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => onSelectCampus(c.id)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all text-[11px] ${
                    active
                      ? 'bg-sky-500 text-black font-semibold shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                  title={`${c.name} (${c.location})`}
                >
                  {c.id}
                </button>
              );
            })}
          </div>

          {/* Track Switcher */}
          <div className="flex items-center rounded-xl bg-white/[0.03] border border-white/[0.08] p-1 text-xs">
            <button
              onClick={() => onSelectTrack('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                selectedTrack === 'all'
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All Tracks
            </button>
            <button
              onClick={() => onSelectTrack('mirai')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                selectedTrack === 'mirai'
                  ? 'bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Mirai
            </button>
            <button
              onClick={() => onSelectTrack('university')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                selectedTrack === 'university'
                  ? 'bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              University
            </button>
          </div>

          {/* AI Insights & Export Buttons */}
          <div className="flex items-center gap-1.5 ml-auto md:ml-0">
            {onOpenAiSummary && (
              <button
                onClick={onOpenAiSummary}
                className="px-2.5 py-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 text-[11px] font-medium flex items-center gap-1.5 transition-all"
                title="AI weekly recovery recommendations"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">AI Summary</span>
              </button>
            )}

            {onOpenExport && (
              <button
                onClick={onOpenExport}
                className="px-2.5 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] text-zinc-300 hover:text-white hover:bg-white/10 text-[11px] font-medium flex items-center gap-1.5 transition-all"
                title="Export semester data to CSV / Sheets"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Role Navigation Strip */}
      <div className="border-t border-white/[0.04] bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'text-sky-400 bg-sky-500/10 border border-sky-500/20'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
                }`}
              >
                {link.icon}
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
