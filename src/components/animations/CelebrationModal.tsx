'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CelebrationCheckResult } from '@/app/actions/celebrations';
import { RankEmblem } from '@/components/ranks/RankEmblem';
import { Sparkles, Award, ArrowRight, X } from 'lucide-react';

interface CelebrationModalProps {
  data: CelebrationCheckResult;
  onClose: () => void;
}

export const CelebrationModal: React.FC<CelebrationModalProps> = ({ data, onClose }) => {
  const {
    type = 'level_up',
    oldLevel = 1,
    newLevel = 2,
    oldRank,
    newRank,
    levelsToNextRank = 0,
    xpToNextRank = 0,
    nextRank,
  } = data;

  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [displayedLevel, setDisplayedLevel] = useState(oldLevel);
  const [showNewEmblem, setShowNewEmblem] = useState(false);
  const [showGoal, setShowGoal] = useState(false);

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setIsReducedMotion(mediaQuery.matches);

      const handler = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, []);

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Animation sequence timing
  useEffect(() => {
    if (isReducedMotion) {
      setDisplayedLevel(newLevel);
      setShowNewEmblem(true);
      setShowGoal(true);
      // Still auto-dismiss after calm period if not tapped
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }

    if (type === 'level_up') {
      // 1.2-second sequence
      const stepTime = 1200 / Math.max(1, newLevel - oldLevel + 1);
      let cur = oldLevel;
      const interval = setInterval(() => {
        cur += 1;
        if (cur <= newLevel) {
          setDisplayedLevel(cur);
        } else {
          clearInterval(interval);
        }
      }, stepTime);

      const timer = setTimeout(onClose, 1400);
      return () => {
        clearInterval(interval);
        clearTimeout(timer);
      };
    } else {
      // 2.5-second rank-up sequence
      // 0.0s - 0.6s: Old rank glow
      // 0.6s: Morph/flip to new emblem
      const flipTimer = setTimeout(() => {
        setShowNewEmblem(true);
        setDisplayedLevel(newLevel);
      }, 700);

      // 1.5s: Reveal next goal
      const goalTimer = setTimeout(() => {
        setShowGoal(true);
      }, 1500);

      // 2.7s: Finish
      const finishTimer = setTimeout(onClose, 2800);

      return () => {
        clearTimeout(flipTimer);
        clearTimeout(goalTimer);
        clearTimeout(finishTimer);
      };
    }
  }, [isReducedMotion, type, oldLevel, newLevel, onClose]);

  const rankColor = newRank?.color || '#38BDF8';
  const oldRankColor = oldRank?.color || '#94A3B8';

  // Screen reader accessible announcement
  const ariaAnnouncement =
    type === 'rank_up'
      ? `Level ${newLevel} reached. New rank: ${newRank?.name}.`
      : `Level ${newLevel} reached.`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={type === 'rank_up' ? 'Rank Up Celebration' : 'Level Up Celebration'}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-pointer select-none"
      style={{
        animation: isReducedMotion ? 'celebrationFadeIn 0.3s ease-out' : 'celebrationFadeIn 0.2s ease-out',
      }}
    >
      {/* Screen Reader Announcement (No sound, no vibration) */}
      <div role="status" aria-live="polite" className="sr-only">
        {ariaAnnouncement}
      </div>

      <style jsx global>{`
        @keyframes celebrationFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulseRing {
          0% { transform: scale(0.95); opacity: 0.6; }
          50% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 0.8; }
        }
        @keyframes emblemFlip {
          0% { transform: rotateY(0deg) scale(0.9); }
          50% { transform: rotateY(90deg) scale(1.1); }
          100% { transform: rotateY(0deg) scale(1); }
        }
        @keyframes fillBar {
          from { width: 0%; }
          to { width: 100%; }
        }
        @keyframes floatUp {
          from { transform: translateY(12px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* Main Celebration Card (Works at 360px width & landscape) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl border p-6 text-center shadow-2xl relative overflow-hidden bg-slate-900/95"
        style={{
          borderColor: `${rankColor}60`,
          boxShadow: `0 20px 50px -10px ${rankColor}30`,
        }}
      >
        {/* Skip button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Skip celebration"
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Calm Reduced Motion Mode */}
        {isReducedMotion ? (
          <div className="space-y-4 py-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider bg-white/10 text-slate-300">
              <span>{type === 'rank_up' ? 'Academic Rank Up' : 'Level Advanced'}</span>
            </div>

            <div className="my-3 flex justify-center">
              <RankEmblem rank={newRank} size="xl" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-white">
                {type === 'rank_up' ? newRank?.name : `Level ${newLevel}`}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {type === 'rank_up'
                  ? `Achieved at Level ${newLevel}. Badge unlocked.`
                  : `Level ${oldLevel} → Level ${newLevel}`}
              </p>
            </div>

            {type === 'rank_up' && nextRank && (
              <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-slate-300">
                Next rank: <strong className="text-white">{nextRank.name}</strong> at Level {nextRank.min_level} ({xpToNextRank} XP to go)
              </div>
            )}

            <p className="text-[10px] text-slate-500 font-mono">Tap anywhere to close</p>
          </div>
        ) : type === 'level_up' ? (
          /* ==============================================================
             LEVEL-UP SEQUENCE (~1.2s):
             Ring pulse glow, count-up number, progress fill
             ============================================================== */
          <div className="space-y-5 py-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Level Up!</span>
            </div>

            {/* Pulsing Level Badge */}
            <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
              <div
                className="absolute inset-0 rounded-full blur-md"
                style={{
                  backgroundColor: `${rankColor}40`,
                  animation: 'pulseRing 1.2s infinite ease-in-out',
                }}
              />
              <div
                className="relative w-24 h-24 rounded-full flex flex-col items-center justify-center border-2 shadow-inner"
                style={{
                  borderColor: rankColor,
                  backgroundColor: '#0F172A',
                }}
              >
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">LVL</span>
                <span className="text-3xl font-black text-white tracking-tight">{displayedLevel}</span>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Level {newLevel} Reached</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Keep up the great work! Your daily streak is active.
              </p>
            </div>

            {/* Level XP Bar Fill Animation */}
            <div className="space-y-1">
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: rankColor,
                    animation: 'fillBar 1s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                  }}
                />
              </div>
            </div>

            <p className="text-[10px] text-slate-500 font-mono pt-1">Tap anywhere to dismiss</p>
          </div>
        ) : (
          /* ==============================================================
             RANK-UP SEQUENCE (~2.5s):
             Emblem flip/morph from old to new, badge unlock, next goal banner
             ============================================================== */
          <div className="space-y-4 py-1">
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase border"
              style={{
                backgroundColor: `${rankColor}20`,
                borderColor: `${rankColor}50`,
                color: rankColor,
              }}
            >
              <Award className="w-3.5 h-3.5" />
              <span>New Rank Achieved!</span>
            </div>

            {/* Emblem Morph Container */}
            <div className="relative w-32 h-32 mx-auto flex items-center justify-center my-2">
              <div
                className="absolute inset-0 rounded-full blur-xl transition-all duration-700"
                style={{
                  backgroundColor: showNewEmblem ? `${rankColor}50` : `${oldRankColor}30`,
                }}
              />
              <div
                className="relative z-10 transition-transform duration-500"
                style={{
                  animation: showNewEmblem ? 'emblemFlip 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
                }}
              >
                <RankEmblem rank={showNewEmblem ? newRank : oldRank} size="xl" />
              </div>
            </div>

            {/* Rank Title & Badge Unlocked */}
            <div style={{ animation: 'floatUp 0.4s ease-out' }}>
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-widest">
                Level {newLevel} • Academic Rank
              </div>
              <h2
                className="text-2xl sm:text-3xl font-black tracking-tight mt-0.5"
                style={{ color: rankColor }}
              >
                {newRank?.name}
              </h2>
              <div className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span>✓ Badge Unlocked</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed px-2">
              {newRank?.description}
            </p>

            {/* Next Milestone Goal Banner */}
            {showGoal && nextRank && (
              <div
                className="p-3 rounded-2xl border text-xs flex items-center justify-between gap-2 text-left bg-slate-950/60"
                style={{
                  borderColor: `${nextRank.color}40`,
                  animation: 'floatUp 0.3s ease-out',
                }}
              >
                <div>
                  <span className="text-[10px] uppercase font-mono block text-slate-400">Next Target</span>
                  <span className="font-bold text-white">Rank: {nextRank.name} (L{nextRank.min_level})</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-mono font-bold text-indigo-400">
                    {xpToNextRank} XP to go
                  </span>
                </div>
              </div>
            )}

            <p className="text-[10px] text-slate-500 font-mono pt-1">Tap or press Esc to continue</p>
          </div>
        )}
      </div>
    </div>
  );
};
