'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  VictoryStats,
  SamuraiRankDetails,
  Difficulty,
} from '@/types/syntaxSamurai';
import { CodeReviewModal } from '@/components/games/syntax-samurai/CodeReviewModal';
import { levelFromXp } from '@/lib/levels';

export interface VictoryScreenProps {
  stats: VictoryStats;
  onPlayAgain: () => void;
  onChangeEnemy: () => void;
  onReturnToDojo: () => void;
}

export function calculateSamuraiRank(
  accuracyPercent: number,
  difficulty: Difficulty
): SamuraiRankDetails {
  if (difficulty === 'codemare' && accuracyPercent >= 95) {
    return {
      rank: 'SHOGUN',
      label: 'SHOGUN',
      kanji: '将軍',
      title: 'Supreme Battlemaster',
      color: '#f59e0b',
      borderColor: 'border-amber-400',
      badgeGradient: 'from-amber-500/30 via-yellow-500/20 to-amber-600/30',
      minAccuracy: 95,
      requiresCodemare: true,
      lore: 'You have mastered the deadly Codemare scrolls with near-flawless blade precision. Your name is etched among the immortal shoguns of the compiler realm.',
    };
  }

  if (accuracyPercent >= 80) {
    return {
      rank: 'DAIMYO',
      label: 'DAIMYO',
      kanji: '大名',
      title: 'Feudal Warlord',
      color: '#a855f7',
      borderColor: 'border-purple-400',
      badgeGradient: 'from-purple-500/30 via-fuchsia-500/20 to-purple-600/30',
      minAccuracy: 80,
      lore: 'Formidable command of the language syntax. Your cuts are disciplined, precise, and lethal.',
    };
  }

  if (accuracyPercent >= 60) {
    return {
      rank: 'SAMURAI',
      label: 'SAMURAI',
      kanji: '侍',
      title: 'Honorable Blade',
      color: '#3b82f6',
      borderColor: 'border-blue-400',
      badgeGradient: 'from-blue-500/30 via-cyan-500/20 to-blue-600/30',
      minAccuracy: 60,
      lore: 'The way of the blade is within you. Continue purifying your syntax to achieve warlord status.',
    };
  }

  return {
    rank: 'RONIN',
    label: 'RONIN',
    kanji: '浪人',
    title: 'Wandering Blade',
    color: '#71717a',
    borderColor: 'border-zinc-500',
    badgeGradient: 'from-zinc-500/30 via-slate-500/20 to-zinc-600/30',
    minAccuracy: 0,
    lore: 'Your sword arm wavered amidst the corrupted scrolls. Return to the practice stones and sharpen your mind.',
  };
}

export const VictoryScreen: React.FC<VictoryScreenProps> = ({
  stats,
  onPlayAgain,
  onChangeEnemy,
  onReturnToDojo,
}) => {
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [animatedXp, setAnimatedXp] = useState(0);
  const audioPlayedRef = useRef(false);

  const rankInfo = calculateSamuraiRank(
    stats.accuracyPercent,
    stats.difficulty.id
  );

  // Platform level progress simulation
  const levelInfo = levelFromXp(stats.totalScore + 450); // Student baseline XP + match score

  // Animate XP count-up on entrance
  useEffect(() => {
    let start = 0;
    const end = stats.totalScore;
    const duration = 1200;
    const stepTime = 20;
    const increment = (end - start) / (duration / stepTime);

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        clearInterval(timer);
        setAnimatedXp(end);
      } else {
        setAnimatedXp(Math.round(start));
      }
    }, stepTime);

    // Audio chime for rank reveal
    if (!audioPlayedRef.current && typeof window !== 'undefined') {
      audioPlayedRef.current = true;
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const now = ctx.currentTime;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(520, now);
          osc.frequency.exponentialRampToValueAtTime(1040, now + 0.3);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.6);
        }
      } catch {
        // Audio fallback
      }
    }

    return () => clearInterval(timer);
  }, [stats.totalScore]);

  return (
    <div className="min-h-screen bg-[#07070b] text-white flex flex-col justify-between p-4 sm:p-6 font-mono select-none">
      {/* Top Banner Navigation */}
      <header className="flex items-center justify-between border-b border-zinc-800 pb-4 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <button
            onClick={onReturnToDojo}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
          >
            ← RETURN TO DOJO
          </button>
          <span className="text-xs sm:text-sm font-bold text-amber-400 tracking-wider">
            SYNTAX SAMURAI // BATTLE DECREE
          </span>
        </div>

        <div className="text-xs text-zinc-400 hidden sm:flex items-center gap-2">
          <span>OPPONENT:</span>
          <span className="font-bold text-white uppercase">{stats.enemy.name}</span>
          <span className="text-zinc-600">•</span>
          <span style={{ color: stats.difficulty.badgeColor }}>
            {stats.difficulty.label}
          </span>
        </div>
      </header>

      {/* Main Victory Showcase */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto w-full my-6">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* LEFT: Samurai Rank Emblem & Lore (5 cols) */}
          <div
            className={`lg:col-span-5 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-between text-center relative overflow-hidden border shadow-2xl bg-gradient-to-b ${rankInfo.badgeGradient}`}
            style={{ borderColor: rankInfo.color }}
          >
            {/* Background Kanji Watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none select-none text-[180px] font-black">
              {rankInfo.kanji}
            </div>

            <div className="relative z-10 w-full flex flex-col items-center">
              <span className="text-xs tracking-widest text-zinc-400 uppercase mb-2">
                ACADEMIC RANK ATTAINED
              </span>

              {/* Glowing Kanji Seal */}
              <div
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl flex flex-col items-center justify-center text-4xl sm:text-5xl font-black mb-4 border-2 shadow-2xl relative"
                style={{
                  borderColor: rankInfo.color,
                  backgroundColor: '#0a0a14',
                  boxShadow: `0 0 35px ${rankInfo.color}60`,
                  color: rankInfo.color,
                }}
              >
                <span>{rankInfo.kanji}</span>
                <span className="text-[10px] font-mono tracking-widest uppercase mt-1 opacity-80">
                  {rankInfo.rank}
                </span>
              </div>

              <h2
                className="text-2xl sm:text-3xl font-black tracking-wider uppercase mb-1"
                style={{ color: rankInfo.color }}
              >
                {rankInfo.label}
              </h2>
              <div className="text-xs text-zinc-300 font-sans tracking-wide mb-4">
                {rankInfo.title}
              </div>

              <p className="text-xs text-zinc-400 font-sans leading-relaxed max-w-xs mb-6">
                {rankInfo.lore}
              </p>
            </div>

            {/* Platform Progress Ledger Integration Card */}
            <div className="relative z-10 w-full p-4 rounded-xl bg-black/60 border border-zinc-800/80 text-left space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-sans">Platform Level:</span>
                <span className="font-bold text-amber-400">Level {levelInfo.level}</span>
              </div>

              {/* Level Progress Bar */}
              <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-1000"
                  style={{ width: `${levelInfo.progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                <span>{levelInfo.xpIntoLevel} XP</span>
                <span className="text-emerald-400">✓ SYNCED TO ACADEMIC LEDGER</span>
                <span>{levelInfo.nextThreshold} XP</span>
              </div>
            </div>
          </div>

          {/* RIGHT: Scoring Breakdown & Action Hub (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl p-6 sm:p-8 bg-[#0c0d16] border border-zinc-800 shadow-2xl flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-5">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-wider">
                    TRIAL PERFORMANCE METRICS
                  </h3>
                  <p className="text-xs text-zinc-500 font-sans">
                    Detailed combat breakdown and XP multipliers earned.
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-xs text-zinc-400 font-sans">Total Accuracy</div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-400">
                    {stats.accuracyPercent}%
                  </div>
                </div>
              </div>

              {/* Scoring Formula Metrics Breakdown */}
              <div className="space-y-3 font-mono text-xs mb-6">
                {/* 1. Slashes Landed */}
                <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">⚔️</span>
                    <div>
                      <div className="text-zinc-200 font-bold">SLASHES LANDED</div>
                      <div className="text-[10px] text-zinc-500">
                        {stats.slashesLanded} of {stats.totalQuestions} error tokens cleaved
                      </div>
                    </div>
                  </div>
                  <div className="font-bold text-zinc-200">
                    +{stats.slashesLanded * 50} XP
                  </div>
                </div>

                {/* 2. Repair Accuracy */}
                <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">📜</span>
                    <div>
                      <div className="text-zinc-200 font-bold">REPAIR ACCURACY</div>
                      <div className="text-[10px] text-zinc-500">
                        {stats.correctCount} of {stats.totalQuestions} purified scrolls
                      </div>
                    </div>
                  </div>
                  <div className="font-bold text-emerald-400">
                    +{stats.accuracyBonusXp} XP
                  </div>
                </div>

                {/* 3. Combo Multipliers */}
                <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">⚡</span>
                    <div>
                      <div className="text-zinc-200 font-bold">COMBO MULTIPLIER</div>
                      <div className="text-[10px] text-zinc-500">
                        Max streak reached: x{stats.maxCombo}
                      </div>
                    </div>
                  </div>
                  <div className="font-bold text-amber-400">
                    +{stats.comboBonusXp} XP
                  </div>
                </div>

                {/* 4. Time Bonuses */}
                <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">⏱️</span>
                    <div>
                      <div className="text-zinc-200 font-bold">SPEED TIME BONUS</div>
                      <div className="text-[10px] text-zinc-500">
                        Remaining blade seconds banked
                      </div>
                    </div>
                  </div>
                  <div className="font-bold text-sky-400">
                    +{stats.timeBonusXp} XP
                  </div>
                </div>
              </div>

              {/* Total Bounty Earned Ribbon */}
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/40 flex items-center justify-between mb-6">
                <div>
                  <span className="text-[10px] font-mono tracking-widest text-amber-400 uppercase">
                    TOTAL MATCH BOUNTY
                  </span>
                  <div className="text-xs text-zinc-400 font-sans">
                    XP added to student wallet & rankings
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-400 tracking-wider">
                  +{animatedXp} XP
                </div>
              </div>
            </div>

            {/* Action Buttons Hub */}
            <div className="space-y-3">
              {/* Primary: Inspect the Blade Review Drawer */}
              <button
                onClick={() => setIsReviewOpen(true)}
                className="w-full py-3.5 px-4 rounded-xl font-mono font-bold text-xs uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2"
              >
                <span>🔍</span>
                <span>INSPECT THE BLADE (CODE REVIEW)</span>
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  onClick={onPlayAgain}
                  className="py-3 px-3 rounded-xl font-mono font-bold text-xs uppercase tracking-wider bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-white hover:bg-zinc-800 transition-colors text-center"
                >
                  REMATCH
                </button>

                <button
                  onClick={onChangeEnemy}
                  className="py-3 px-3 rounded-xl font-mono font-bold text-xs uppercase tracking-wider bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors text-center"
                >
                  CHANGE ENEMY
                </button>

                <button
                  onClick={onReturnToDojo}
                  className="py-3 px-3 rounded-xl font-mono font-bold text-xs uppercase tracking-wider bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors text-center"
                >
                  RETURN TO DOJO
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-zinc-600 border-t border-zinc-900 pt-4 max-w-6xl mx-auto w-full">
        SYNTAX SAMURAI • PHASE 5: VICTORY DOJO, PERFORMANCE STATS & CODE REVIEW
      </footer>

      {/* Review Mode Modal */}
      <CodeReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        reviewItems={stats.reviewItems}
        enemy={stats.enemy}
      />
    </div>
  );
};

export default VictoryScreen;
