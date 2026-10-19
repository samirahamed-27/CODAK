'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Zap, Flame } from 'lucide-react';
import { getHeatmapColorLevel } from '@/data/studentDashboardData';
import { AnimatedCounter } from './AnimatedCounter';
import Shuffle from '@/components/Shuffle';

interface WorkReportCardProps {
  activityData?: Record<string, number>;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function WorkReportCard({ activityData = {} }: WorkReportCardProps) {
  // Current real month/year from system, populated in useEffect for Next.js prerender compliance
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date(2026, 9, 1));
  const [todayStr, setTodayStr] = useState<string>('');
  const [hoveredDay, setHoveredDay] = useState<{
    dateStr: string;
    dayNum: number;
    weekdayName: string;
    xp: number;
  } | null>(null);

  useEffect(() => {
    const now = new Date();
    setCurrentDate(now);
    const yr = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const da = String(now.getDate()).padStart(2, '0');
    setTodayStr(`${yr}-${mo}-${da}`);
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigate months
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Compute calendar days
  const { calendarCells, monthlyTotalXp, bestMonthlyStreak } = useMemo(() => {
    // Number of days in current month
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    // First day of month (0 = Sun, 1 = Mon ... 6 = Sat)
    const firstDayIndex = new Date(year, month, 1).getDay();
    // Shift so Monday is index 0 (0: Mon, 1: Tue, ..., 6: Sun)
    const startOffset = (firstDayIndex + 6) % 7;

    const cells: Array<{
      dayNum: number | null;
      dateStr: string;
      xp: number;
      isToday: boolean;
      weekdayName: string;
    }> = [];

    // Prepend empty slots before 1st of month
    for (let i = 0; i < startOffset; i++) {
      cells.push({
        dayNum: null,
        dateStr: '',
        xp: 0,
        isToday: false,
        weekdayName: '',
      });
    }

    let totalXp = 0;
    let currentStreak = 0;
    let maxStreak = 0;

    // Actual days of month
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const formattedMonth = String(month + 1).padStart(2, '0');
      const formattedDay = String(day).padStart(2, '0');
      const dateStr = `${year}-${formattedMonth}-${formattedDay}`;

      const dateObj = new Date(year, month, day);
      const weekdayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

      const xp = activityData[dateStr] || 0;
      totalXp += xp;

      if (xp > 0) {
        currentStreak++;
        if (currentStreak > maxStreak) maxStreak = currentStreak;
      } else {
        currentStreak = 0;
      }

      // Check if today matches todayStr
      const isToday = dateStr === todayStr;

      cells.push({
        dayNum: day,
        dateStr,
        xp,
        isToday,
        weekdayName,
      });
    }

    return {
      calendarCells: cells,
      monthlyTotalXp: totalXp,
      bestMonthlyStreak: maxStreak,
    };
  }, [year, month, activityData]);

  return (
    <article
      aria-label="Student Work Report and Heatmap"
      className="game-card p-6 flex flex-col justify-between relative overflow-visible animate-card-pop"
    >
      {/* Header: Title and Month Chip with Prev/Next Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400 block mb-0.5">
            Activity Heatmap
          </span>
          <Shuffle
            text="Work Report"
            tag="h2"
            effect="slide"
            duration={0.35}
            stagger={0.03}
            triggerOnHover={true}
            color="#FFFFFF"
            accentColor="#A1A1AA"
            style={{ fontSize: '1.15rem', letterSpacing: '0.02em', fontWeight: 600 }}
          />
        </div>

        {/* Month Selector Chip */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-white/[0.03] border border-white/[0.08]">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <span className="font-mono text-xs font-semibold text-zinc-200 px-2 min-w-[110px] text-center select-none">
            {MONTH_NAMES[month]} {year}
          </span>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Relative container for Heatmap Grid + Floating Tooltip */}
      <div className="relative my-2">
        {/* Floating Tooltip - Duotone B&W */}
        {hoveredDay && (
          <div
            role="tooltip"
            className="absolute -top-11 left-1/2 -translate-x-1/2 z-50 pointer-events-none px-3 py-1.5 rounded-xl bg-black border border-white/20 shadow-[0_4px_16px_rgba(0,0,0,0.95)] text-xs whitespace-nowrap animate-card-pop"
          >
            <span className="font-semibold text-white">
              {hoveredDay.weekdayName}, {hoveredDay.dayNum}{' '}
              {MONTH_NAMES[month].slice(0, 3)}:
            </span>{' '}
            {hoveredDay.xp > 0 ? (
              <span className="font-bold text-white font-pixel">
                +{hoveredDay.xp} XP
              </span>
            ) : (
              <span className="text-zinc-500">No quest completed</span>
            )}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black border-r border-b border-white/20 rotate-45" />
          </div>
        )}

        {/* Weekday Column Headers (M T W T F S S) */}
        <div className="grid grid-cols-7 gap-2 mb-2 text-center">
          {WEEKDAY_HEADERS.map((dayLabel, idx) => (
            <div
              key={idx}
              className="text-[11px] font-pixel font-bold text-zinc-400"
            >
              {dayLabel}
            </div>
          ))}
        </div>

        {/* Calendar Squares Grid */}
        <div className="grid grid-cols-7 gap-2">
          {calendarCells.map((cell, index) => {
            if (cell.dayNum === null) {
              return (
                <div
                  key={`empty-${index}`}
                  className="w-full aspect-square rounded-lg opacity-0 pointer-events-none"
                  aria-hidden="true"
                />
              );
            }

            const { color, hasGlow, level } = getHeatmapColorLevel(cell.xp);
            const todayOutlineClass = 'ring-2 ring-white ring-offset-2 ring-offset-black';

            // Text contrast: black on bright white/silver (levels 3 and 4), crisp light on dark
            const textColor = level >= 3 ? '#000000' : '#d4d4d8';

            return (
              <button
                key={cell.dateStr}
                type="button"
                onMouseEnter={() =>
                  setHoveredDay({
                    dateStr: cell.dateStr,
                    dayNum: cell.dayNum!,
                    weekdayName: cell.weekdayName,
                    xp: cell.xp,
                  })
                }
                onMouseLeave={() => setHoveredDay(null)}
                onFocus={() =>
                  setHoveredDay({
                    dateStr: cell.dateStr,
                    dayNum: cell.dayNum!,
                    weekdayName: cell.weekdayName,
                    xp: cell.xp,
                  })
                }
                onBlur={() => setHoveredDay(null)}
                aria-label={`${cell.weekdayName}, ${cell.dayNum} ${MONTH_NAMES[month]}: ${
                  cell.xp > 0 ? cell.xp + ' XP' : 'No XP'
                }`}
                className={`w-full aspect-square rounded-lg flex items-center justify-center text-[10px] font-pixel font-bold transition-all relative ${
                  cell.isToday ? todayOutlineClass : ''
                } hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white`}
                style={{
                  backgroundColor: color,
                  color: textColor,
                  boxShadow: hasGlow ? '0 0 12px rgba(255, 255, 255, 0.45)' : undefined,
                }}
              >
                <span>{cell.dayNum}</span>
                {cell.isToday && (
                  <span
                    className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-white shadow-[0_0_6px_#ffffff]"
                    title="Today"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Heatmap Footer: Legend & Monthly Stats */}
      <div className="mt-4 pt-2.5 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Legend */}
        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <span className="text-zinc-500">Less</span>
          <div className="w-3 h-3 rounded-sm bg-[#121214] border border-white/10" title="0 XP" />
          <div className="w-3 h-3 rounded-sm bg-[#27272a]" title="1 - 40 XP" />
          <div className="w-3 h-3 rounded-sm bg-[#52525b]" title="41 - 80 XP" />
          <div className="w-3 h-3 rounded-sm bg-[#a1a1aa]" title="81 - 120 XP" />
          <div className="w-3 h-3 rounded-sm bg-[#ffffff]" title="121+ XP" />
          <span className="text-white">More</span>
        </div>

        {/* Monthly Summary Badges */}
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <div className="flex items-center gap-1 text-zinc-400">
            <Zap className="w-3.5 h-3.5 text-white" />
            <span>XP:</span>
            <span className="font-bold text-white">
              <AnimatedCounter value={monthlyTotalXp} />
            </span>
          </div>

          <div className="flex items-center gap-1 text-zinc-300">
            <Flame className="w-3.5 h-3.5 fill-white text-white" />
            <span>Best:</span>
            <span className="font-bold text-white">
              {bestMonthlyStreak}d
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
