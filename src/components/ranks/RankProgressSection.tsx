import React from 'react';
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

  const maxRankMinXp = xpThresholdForLevel(maxRank.min_level);

  return (
    <div className={`rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-5 sm:p-6 text-white space-y-6 ${className}`}>
      {/* 1. Header & Clarifying distinction line */}
      <div className="border-b border-white/10 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-widest text-slate-400 font-mono">
              Academic Rank Ladder
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase"
              style={{
                backgroundColor: `${currentRank.color}20`,
                borderColor: `${currentRank.color}50`,
                borderWidth: '1px',
                color: currentRank.color,
              }}
            >
              Tier {currentRank.sort_order / 10} of 7
            </span>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Current: Level {level}
          </span>
        </div>

        {/* Critical UI clarity line */}
        <p className="mt-2 text-xs text-slate-400 leading-relaxed">
          <span className="text-sky-400 font-medium">Rank</span> is your permanent lifetime mastery based on total XP. <span className="text-amber-400 font-medium">League</span> is your weekly competitive division based on this week's XP.
        </p>
      </div>

      {/* 2. Current Rank Showcase Card */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div
          className="relative p-4 rounded-2xl border border-white/10 flex items-center justify-center shrink-0"
          style={{
            backgroundColor: `${currentRank.color}10`,
            boxShadow: `0 0 25px ${currentRank.color}20`,
          }}
        >
          <RankEmblem rank={currentRank} size="xl" showGlow />
        </div>

        <div className="flex-1 text-center sm:text-left space-y-1.5">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h3
              className="text-2xl font-black tracking-tight"
              style={{ color: currentRank.color }}
            >
              {currentRank.name}
            </h3>
            <span className="text-xs text-slate-400 font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10">
              Unlocked at L{currentRank.min_level}
            </span>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
            {currentRank.description}
          </p>

          <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs font-mono text-slate-400">
            <span>Lifetime XP: <strong className="text-white">{totalXp.toLocaleString()} XP</strong></span>
            <span>•</span>
            <span>Current Level: <strong className="text-white">L{level}</strong></span>
          </div>
        </div>
      </div>

      {/* 3. Dual Progress Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Progress Bar 1: Next Rank Progress */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <span>Next Rank Progress</span>
              {nextRank && (
                <span style={{ color: nextRank.color }} className="font-semibold">
                  ({nextRank.name})
                </span>
              )}
            </span>
            <span className="font-mono text-slate-300 font-semibold">
              {rankProgressPercent}%
            </span>
          </div>

          {/* Progress bar fill */}
          <div className="h-3 w-full bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-white/10">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${rankProgressPercent}%`,
                background: nextRank
                  ? `linear-gradient(90deg, ${currentRank.color}, ${nextRank.color})`
                  : currentRank.color,
                boxShadow: `0 0 10px ${nextRank?.color || currentRank.color}40`,
              }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            {nextRank ? (
              <>
                <span>Target: Level {nextRank.min_level}</span>
                <span>{xpToNextRank.toLocaleString()} XP remaining</span>
              </>
            ) : (
              <span className="text-purple-400 font-semibold">
                ★ Maximum Rank Achieved!
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar 2: Max Rank Progress (Lifetime Journey) */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <span>Pinnacle Journey</span>
              <span style={{ color: maxRank.color }} className="font-semibold">
                ({maxRank.name})
              </span>
            </span>
            <span className="font-mono text-slate-300 font-semibold">
              {maxRankProgressPercent}%
            </span>
          </div>

          {/* Max Progress bar fill */}
          <div className="h-3 w-full bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-white/10">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${maxRankProgressPercent}%`,
                background: `linear-gradient(90deg, #38BDF8, #818CF8, #A855F7)`,
                boxShadow: '0 0 10px rgba(168, 85, 247, 0.4)',
              }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>{totalXp.toLocaleString()} / {maxRankMinXp.toLocaleString()} XP</span>
            <span>Level 18+ Pinnacle</span>
          </div>
        </div>
      </div>

      {/* 4. Rank Ladder Strip: All 7 Ranks Preview */}
      {allTiers.length > 0 && (
        <div className="pt-3 border-t border-white/5">
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-mono mb-3">
            All Campus Ranks
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {allTiers.map((tier) => {
              const isCurrent = tier.slug === currentRank.slug;
              const isUnlocked = level >= tier.min_level;

              return (
                <div
                  key={tier.slug}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    isCurrent
                      ? 'border-white/30 bg-white/10 shadow-lg'
                      : isUnlocked
                      ? 'border-white/10 bg-white/[0.02] opacity-90'
                      : 'border-white/5 bg-black/20 opacity-40'
                  }`}
                  style={{
                    borderColor: isCurrent ? tier.color : undefined,
                  }}
                  title={`${tier.name}: ${tier.description} (Requires Level ${tier.min_level})`}
                >
                  <div className="flex justify-center mb-1.5">
                    <RankEmblem rank={tier} size="sm" showGlow={isCurrent} />
                  </div>
                  <div
                    className="text-xs font-bold truncate"
                    style={{ color: tier.color }}
                  >
                    {tier.name}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                    {isCurrent ? (
                      <span className="text-white font-semibold">Current</span>
                    ) : isUnlocked ? (
                      <span className="text-emerald-400">Unlocked</span>
                    ) : (
                      `L${tier.min_level}`
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
