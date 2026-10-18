'use client';

import React, { useState, useEffect } from 'react';
import { RankProgress } from '@/lib/ranks';
import { RankTier } from '@/types/database';
import { RankEmblem } from './RankEmblem';
import { xpThresholdForLevel, calculateRankProgress } from '@/lib/ranks';

interface RankProgressSectionProps {
  progress?: RankProgress | null;
  allTiers?: RankTier[];
  className?: string;
}

export const RankProgressSection: React.FC<RankProgressSectionProps> = ({
  progress,
  allTiers = [],
  className = '',
}) => {
  const safeProgress = progress || calculateRankProgress(0, allTiers.length > 0 ? allTiers : undefined);
  const {
    currentRank,
    nextRank,
    level,
    totalXp,
    levelsToNextRank,
    xpToNextRank,
    rankProgressPercent,
    maxRankProgressPercent,
    maxRank,
  } = safeProgress;

  const [animPercent, setAnimPercent] = useState(0);
  const [animMaxPercent, setAnimMaxPercent] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimPercent(rankProgressPercent);
      setAnimMaxPercent(maxRankProgressPercent);
    }, 150);
    return () => clearTimeout(timer);
  }, [rankProgressPercent, maxRankProgressPercent]);

  const maxRankMinXp = xpThresholdForLevel(maxRank.min_level);

  return (
    <div className={`rounded-3xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-md p-6 sm:p-8 text-white space-y-6 shadow-xl ${className}`}>
      {/* 1. Header & Clarifying distinction line */}
      <div className="border-b border-zinc-800 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-widest text-zinc-400 font-mono">
              Academic Rank Ladder
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-zinc-800 border border-zinc-700 text-zinc-200">
              Tier {currentRank.sort_order / 10} of 7
            </span>
          </div>
          <span className="text-xs font-mono text-zinc-400">
            Current: Level {level}
          </span>
        </div>

        {/* Critical UI clarity line */}
        <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
          <span className="text-white font-semibold">Rank</span> is your permanent lifetime mastery based on total XP. <span className="text-zinc-200 font-semibold">League</span> is your weekly competitive division based on this week's XP.
        </p>
      </div>

      {/* 2. Current Rank Showcase Card */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="relative p-5 rounded-2xl border border-zinc-700/80 bg-black/60 shadow-xl shadow-black/50 flex items-center justify-center shrink-0">
          <RankEmblem rank={currentRank} size="xl" showGlow />
        </div>

        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
            <h3 className="text-2xl font-black tracking-tight text-white">
              {currentRank.name}
            </h3>
            <span className="text-xs text-zinc-400 font-mono px-2.5 py-0.5 rounded-full bg-zinc-800/80 border border-zinc-700">
              Unlocked at L{currentRank.min_level}
            </span>
          </div>

          <p className="text-sm text-zinc-300 leading-relaxed max-w-xl">
            {currentRank.description}
          </p>

          <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs font-mono text-zinc-400">
            <span>Lifetime XP: <strong className="text-white">{totalXp.toLocaleString()} XP</strong></span>
            <span>•</span>
            <span>Current Level: <strong className="text-white">L{level}</strong></span>
          </div>
        </div>
      </div>

      {/* 3. Dual Progress Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Progress Bar 1: Next Rank Progress */}
        <div className="p-5 rounded-2xl bg-black/40 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-300 font-medium flex items-center gap-1.5">
              <span>Next Rank Progress</span>
              {nextRank && (
                <span className="font-semibold text-white">
                  ({nextRank.name})
                </span>
              )}
            </span>
            <span className="font-mono text-white font-bold">
              {rankProgressPercent}%
            </span>
          </div>

          {/* Progress bar fill */}
          <div className="h-3 w-full bg-zinc-800/80 rounded-full overflow-hidden p-0.5 border border-zinc-700">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out bg-white shadow-[0_0_12px_rgba(255,255,255,0.4)]"
              style={{
                width: `${animPercent}%`,
              }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
            {nextRank ? (
              <>
                <span>Target: Level {nextRank.min_level}</span>
                <span>{xpToNextRank.toLocaleString()} XP remaining</span>
              </>
            ) : (
              <span className="text-white font-semibold">
                ★ Maximum Rank Achieved!
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar 2: Max Rank Progress (Lifetime Journey) */}
        <div className="p-5 rounded-2xl bg-black/40 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-300 font-medium flex items-center gap-1.5">
              <span>Pinnacle Journey</span>
              <span className="font-semibold text-white">
                ({maxRank.name})
              </span>
            </span>
            <span className="font-mono text-white font-bold">
              {maxRankProgressPercent}%
            </span>
          </div>

          {/* Max Progress bar fill */}
          <div className="h-3 w-full bg-zinc-800/80 rounded-full overflow-hidden p-0.5 border border-zinc-700">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-zinc-400 to-white shadow-[0_0_12px_rgba(255,255,255,0.3)]"
              style={{
                width: `${animMaxPercent}%`,
              }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span>{totalXp.toLocaleString()} / {maxRankMinXp.toLocaleString()} XP</span>
            <span>Level 18+ Pinnacle</span>
          </div>
        </div>
      </div>

      {/* 4. Rank Ladder Strip: All 7 Ranks Preview */}
      {allTiers.length > 0 && (
        <div className="pt-4 border-t border-zinc-800">
          <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-mono mb-3">
            All Campus Ranks
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
            {allTiers.map((tier) => {
              const isCurrent = tier.slug === currentRank.slug;
              const isUnlocked = level >= tier.min_level;

              return (
                <div
                  key={tier.slug}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    isCurrent
                      ? 'border-white bg-zinc-800 text-white shadow-lg shadow-black/40'
                      : isUnlocked
                      ? 'border-zinc-800 bg-zinc-950/60 text-zinc-200'
                      : 'border-zinc-900 bg-black/40 text-zinc-500 opacity-50'
                  }`}
                  title={`${tier.name}: ${tier.description} (Requires Level ${tier.min_level})`}
                >
                  <div className="flex justify-center mb-1.5">
                    <RankEmblem rank={tier} size="sm" showGlow={isCurrent} />
                  </div>
                  <div className="text-xs font-bold truncate text-white">
                    {tier.name}
                  </div>
                  <div className="text-[10px] font-mono mt-0.5">
                    {isCurrent ? (
                      <span className="text-white font-bold">Current</span>
                    ) : isUnlocked ? (
                      <span className="text-zinc-300">Unlocked</span>
                    ) : (
                      <span className="text-zinc-500">L{tier.min_level}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
