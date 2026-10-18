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
    const timer = setTimeout(() => setIsLoaded(true), 120);
    return () => clearTimeout(timer);
  }, []);

  const yTicks = [100, 75, 50, 25, 0];

  return (
    <article
      aria-label="Student Subject Performance Score Chart"
      className="game-card p-5 flex flex-col justify-between relative h-full"
    >
      {/* Header: Title & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 text-xs">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400 block mb-0.5">
            Academic Performance
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
              accentColor="#A1A1AA"
              style={{ fontSize: '1.15rem', letterSpacing: '0.02em', fontWeight: 600 }}
            />
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-zinc-700 inline-block" />
            <span className="text-zinc-400">Class Average</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-white inline-block" />
            <span className="text-white font-medium">Yours</span>
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="relative my-2 w-full overflow-x-auto pb-1">
        {/* Floating Tooltip */}
        {activeTooltip && (
          <div
            role="tooltip"
            className="absolute z-50 pointer-events-none px-3 py-1.5 rounded-xl bg-zinc-950 border border-white/20 shadow-2xl text-xs whitespace-nowrap -translate-x-1/2 -translate-y-12"
            style={{ left: `${activeTooltip.x}px`, top: `${activeTooltip.y}px` }}
          >
            <div className="font-semibold text-white">
              {activeTooltip.subject}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono mt-0.5">
              <span className={activeTooltip.type === 'Yours' ? 'text-white' : 'text-zinc-400'}>
                {activeTooltip.type}:
              </span>
              <span className="font-bold text-white">
                {activeTooltip.value}%
              </span>
              {activeTooltip.beatsAverage && (
                <span className="text-white text-[10px]">★ Above Avg</span>
              )}
            </div>
          </div>
        )}

        <div className="min-w-[460px] h-60 flex">
          {/* Y-Axis Column */}
          <div className="w-10 h-full flex flex-col justify-between items-end pr-2 py-2 text-[10px] font-mono text-zinc-500 relative border-r border-white/10">
            {yTicks.map((tick) => (
              <div key={tick} className="flex items-center gap-1 leading-none">
                <span>{tick}</span>
              </div>
            ))}
          </div>

          {/* Main Chart Canvas */}
          <div className="flex-1 h-full relative pl-4 pr-6 flex flex-col justify-end">
            {/* Horizontal Gridlines */}
            <div className="absolute inset-0 pl-4 pr-6 flex flex-col justify-between py-2 pointer-events-none">
              {yTicks.map((tick) => (
                <div
                  key={tick}
                  className="w-full border-b border-white/[0.04] h-0"
                />
              ))}
            </div>

            {/* X-Axis Horizontal Line */}
            <div
              className="absolute bottom-6 left-0 right-2 border-b border-white/10"
              aria-hidden="true"
            />

            {/* Grouped Bars Container */}
            <div className="w-full h-44 flex items-end justify-around relative z-10">
              {scores.map((item) => {
                const beatsAvg = item.studentScore > item.classAverage;

                return (
                  <div
                    key={item.id}
                    className="flex flex-col items-center group/group h-full justify-end px-2"
                  >
                    {/* Star Badge */}
                    <div className="h-5 flex items-center justify-center mb-1">
                      {beatsAvg && (
                        <div
                          className="flex items-center justify-center text-white"
                          title={`Above class average by ${item.studentScore - item.classAverage}%`}
                        >
                          <Star className="w-3.5 h-3.5 fill-white text-white" />
                        </div>
                      )}
                    </div>

                    {/* Group of Two Bars */}
                    <div className="flex items-end gap-1.5 h-36">
                      {/* Bar 1: Class Average */}
                      <button
                        type="button"
                        aria-label={`${item.subject}: Class Average ${item.classAverage}%`}
                        onMouseEnter={(e) => {
                          setActiveTooltip({
                            subject: item.subject,
                            type: 'Class Average',
                            value: item.classAverage,
                            x: e.currentTarget.offsetLeft + 10,
                            y: e.currentTarget.offsetTop - 10,
                          });
                        }}
                        onMouseLeave={() => setActiveTooltip(null)}
                        onFocus={(e) => {
                          setActiveTooltip({
                            subject: item.subject,
                            type: 'Class Average',
                            value: item.classAverage,
                            x: e.currentTarget.offsetLeft + 10,
                            y: e.currentTarget.offsetTop - 10,
                          });
                        }}
                        onBlur={() => setActiveTooltip(null)}
                        className="w-4 sm:w-5 bg-zinc-700/80 hover:bg-zinc-600 rounded-t transition-all duration-700 ease-out focus:outline-none"
                        style={{
                          height: isLoaded ? `${item.classAverage}%` : '0%',
                        }}
                      />

                      {/* Bar 2: Yours */}
                      <button
                        type="button"
                        aria-label={`${item.subject}: Your Score ${item.studentScore}%`}
                        onMouseEnter={(e) => {
                          setActiveTooltip({
                            subject: item.subject,
                            type: 'Yours',
                            value: item.studentScore,
                            beatsAverage: beatsAvg,
                            x: e.currentTarget.offsetLeft + 10,
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
                            x: e.currentTarget.offsetLeft + 10,
                            y: e.currentTarget.offsetTop - 10,
                          });
                        }}
                        onBlur={() => setActiveTooltip(null)}
                        className="w-4 sm:w-5 bg-white hover:bg-zinc-200 rounded-t transition-all duration-700 ease-out shadow-sm shadow-white/30 focus:outline-none"
                        style={{
                          height: isLoaded ? `${item.studentScore}%` : '0%',
                        }}
                      />
                    </div>

                    {/* X-Axis Subject Label */}
                    <div className="mt-3 text-center">
                      <span
                        className="text-[10px] font-mono font-medium text-zinc-400 block truncate max-w-[70px]"
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
      <div className="pt-2.5 border-t border-white/[0.06] flex flex-wrap items-center justify-between text-[11px] font-mono text-zinc-500">
        <span>Class percentile: Top 5%</span>
        <span className="text-white font-semibold">
          4 / 5 SUBJECTS ABOVE AVERAGE
        </span>
      </div>
    </article>
  );
}
