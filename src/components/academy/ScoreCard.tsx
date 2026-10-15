'use client';

import React, { useState, useEffect } from 'react';
import { Star, BarChart3 } from 'lucide-react';
import { SubjectScore, initialSubjectScores } from '@/data/studentDashboardData';
import Shuffle from '@/components/Shuffle';

interface ScoreCardProps {
  scores?: SubjectScore[];
}

export function ScoreCard({ scores = initialSubjectScores }: ScoreCardProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<{
    subject: string;
    type: 'Class Average' | 'Yours';
    value: number;
    beatsAverage?: boolean;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    // Trigger bar fill animation shortly after mounting
    const timer = setTimeout(() => setIsLoaded(true), 120);
    return () => clearTimeout(timer);
  }, []);

  const yTicks = [100, 75, 50, 25, 0];

  return (
    <article
      aria-label="Student Subject Performance Score Chart"
      className="game-card p-6 flex flex-col justify-between relative animate-card-pop"
    >
      {/* Header: Title & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <span className="font-pixel text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            ACADEMIC PERFORMANCE
          </span>
          <div className="flex items-center gap-2">
            <Shuffle
              text="Score"
              tag="h2"
              effect="slide"
              duration={0.35}
              stagger={0.03}
              triggerOnHover={true}
              color="#FFFFFF"
              accentColor="#7DD3FC"
              style={{ fontSize: '1.25rem', letterSpacing: '0.04em' }}
            />
            <BarChart3 className="w-5 h-5 text-sky-400" />
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#3A5A99] inline-block" />
            <span className="text-[#A9B8D6] text-[11px]">Class average</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#7CC4FF] shadow-[0_0_8px_rgba(124,196,255,0.45)] inline-block" />
            <span className="text-white font-semibold text-[11px]">Yours</span>
          </div>
        </div>
      </div>

      {/* Chart Area with Gridlines (#2A3F73), Axes, Arrows, and Grouped Bars */}
      <div className="relative my-2 w-full overflow-x-auto pb-2">
        {/* Floating Tooltip (bg #06080F, border #1E3A78, white text, value in orange #FFB27A) */}
        {activeTooltip && (
          <div
            role="tooltip"
            className="absolute z-50 pointer-events-none px-3 py-1.5 rounded-xl bg-[#06080F] border border-[#1E3A78] shadow-[0_4px_16px_rgba(0,0,0,0.85)] text-xs whitespace-nowrap animate-card-pop -translate-x-1/2 -translate-y-12"
            style={{ left: `${activeTooltip.x}px`, top: `${activeTooltip.y}px` }}
          >
            <div className="font-bold text-white font-body">
              {activeTooltip.subject}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] mt-0.5">
              <span
                className={`font-semibold ${
                  activeTooltip.type === 'Yours'
                    ? 'text-[#7CC4FF]'
                    : 'text-[#A9B8D6]'
                }`}
              >
                {activeTooltip.type}:
              </span>
              <span className="font-pixel font-bold text-[#FFB27A]">
                {activeTooltip.value}%
              </span>
              {activeTooltip.beatsAverage && (
                <span className="text-[#FFB27A]">⭐ (+Above Avg)</span>
              )}
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#06080F] border-r border-b border-[#1E3A78] rotate-45" />
          </div>
        )}

        <div className="min-w-[460px] h-60 flex">
          {/* Y-Axis Column (Ticks + Labels + Upward Arrow in #7CC4FF) */}
          <div className="w-12 h-full flex flex-col justify-between items-end pr-2 py-2 text-[10px] font-pixel text-[#A9B8D6] relative border-r-2 border-[#2A3F73]">
            {/* Y-Axis Arrow on Top */}
            <div
              className="absolute -top-2 -right-[5px] w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[8px] border-b-[#7CC4FF]"
              title="Score axis (0 to 100%)"
              aria-hidden="true"
            />

            {yTicks.map((tick) => (
              <div key={tick} className="flex items-center gap-1 leading-none">
                <span>{tick}</span>
                <span className="w-1 h-[1px] bg-[#2A3F73]" />
              </div>
            ))}
          </div>

          {/* Main Chart Canvas: Horizontal Gridlines (#2A3F73) + Grouped Bars */}
          <div className="flex-1 h-full relative pl-4 pr-6 flex flex-col justify-end">
            {/* Horizontal Gridlines in #2A3F73 */}
            <div className="absolute inset-0 pl-4 pr-6 flex flex-col justify-between py-2 pointer-events-none">
              {yTicks.map((tick) => (
                <div
                  key={tick}
                  className="w-full border-b border-[#2A3F73]/50 h-0"
                />
              ))}
            </div>

            {/* X-Axis Horizontal Line in #2A3F73 + Right Arrow in #7CC4FF */}
            <div
              className="absolute bottom-6 left-0 right-2 border-b-2 border-[#2A3F73]"
              aria-hidden="true"
            >
              <div className="absolute -right-2 -top-[3px] w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[8px] border-l-[#7CC4FF]" />
            </div>

            {/* Grouped Bars Container */}
            <div className="w-full h-44 flex items-end justify-around relative z-10">
              {scores.map((item) => {
                const beatsAvg = item.studentScore > item.classAverage;

                return (
                  <div
                    key={item.id}
                    className="flex flex-col items-center group/group h-full justify-end px-2"
                  >
                    {/* Star Badge if student beats class average (Pastel Orange #FFB27A) */}
                    <div className="h-6 flex items-center justify-center mb-1">
                      {beatsAvg && (
                        <div
                          className="flex items-center justify-center text-[#FFB27A] animate-bounce"
                          title={`Above class average by ${
                            item.studentScore - item.classAverage
                          }%!`}
                        >
                          <Star className="w-4 h-4 fill-[#FFB27A] text-[#FFB27A] drop-shadow-[0_0_6px_rgba(255,178,122,0.6)]" />
                        </div>
                      )}
                    </div>

                    {/* Group of Two Bars */}
                    <div className="flex items-end gap-1.5 h-36">
                      {/* Bar 1: Class Average (Muted Blue #3A5A99) */}
                      <button
                        type="button"
                        aria-label={`${item.subject}: Class Average ${item.classAverage}%`}
                        onMouseEnter={(e) => {
                          setActiveTooltip({
                            subject: item.subject,
                            type: 'Class Average',
                            value: item.classAverage,
                            x: e.currentTarget.offsetLeft + 12,
                            y: e.currentTarget.offsetTop - 10,
                          });
                        }}
                        onMouseLeave={() => setActiveTooltip(null)}
                        onFocus={(e) => {
                          setActiveTooltip({
                            subject: item.subject,
                            type: 'Class Average',
                            value: item.classAverage,
                            x: e.currentTarget.offsetLeft + 12,
                            y: e.currentTarget.offsetTop - 10,
                          });
                        }}
                        onBlur={() => setActiveTooltip(null)}
                        className="w-5 sm:w-6 bg-[#3A5A99] hover:bg-[#4B6FA8] rounded-t-lg transition-all duration-700 ease-out focus:outline-none focus:ring-1 focus:ring-white"
                        style={{
                          height: isLoaded ? `${item.classAverage}%` : '0%',
                        }}
                      />

                      {/* Bar 2: Yours (Light Blue #7CC4FF with soft glow) */}
                      <button
                        type="button"
                        aria-label={`${item.subject}: Your Score ${item.studentScore}%`}
                        onMouseEnter={(e) => {
                          setActiveTooltip({
                            subject: item.subject,
                            type: 'Yours',
                            value: item.studentScore,
                            beatsAverage: beatsAvg,
                            x: e.currentTarget.offsetLeft + 12,
                            y: e.currentTarget.offsetTop - 10,
                          });
                        }}
                        onMouseLeave={() => setActiveTooltip(null)}
                        onFocus={(e) => {
                          setActiveTooltip({
                            subject: item.subject,
                            type: 'Yours',
                            value: item.studentScore,
                            beatsAverage: beatsAvg,
                            x: e.currentTarget.offsetLeft + 12,
                            y: e.currentTarget.offsetTop - 10,
                          });
                        }}
                        onBlur={() => setActiveTooltip(null)}
                        className="w-5 sm:w-6 bg-[#7CC4FF] hover:bg-[#96D2FF] rounded-t-lg transition-all duration-700 ease-out shadow-[0_0_12px_rgba(124,196,255,0.45)] focus:outline-none focus:ring-2 focus:ring-white"
                        style={{
                          height: isLoaded ? `${item.studentScore}%` : '0%',
                        }}
                      />
                    </div>

                    {/* X-Axis Subject Label (#A9B8D6) */}
                    <div className="mt-3 text-center">
                      <span
                        className="text-[11px] font-bold text-[#A9B8D6] block truncate max-w-[80px]"
                        title={item.subject}
                      >
                        {item.shortCode}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-3 border-t border-[#1E3A78]/70 flex flex-wrap items-center justify-between text-xs text-[#6C7FAD]">
        <span>Class percentile: Top 5%</span>
        <span className="text-[11px] font-pixel text-[#FFB27A]">
          4 / 5 SUBJECTS BEATING AVERAGE
        </span>
      </div>
    </article>
  );
}
