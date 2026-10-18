'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Gamepad2, ShieldCheck, CheckCircle2 } from 'lucide-react';

export type PreloaderVariant = 'stairs' | 'percentage' | 'circle' | 'slide' | 'curtain';

export interface PreloaderProps {
  active?: boolean;
  variant?: PreloaderVariant;
  duration?: number; // total duration in ms
  text?: string;
  subtext?: string;
  bgColor?: string;
  accentColor?: string;
  zIndex?: number;
  position?: 'fixed' | 'absolute';
  stairCount?: number;
  readyToExit?: boolean;
  onComplete?: () => void;
}

export const Preloader: React.FC<PreloaderProps> = ({
  active = true,
  variant = 'stairs',
  duration = 2000,
  text = 'Authenticating CODAK Session...',
  subtext = 'Preparing your personalized academic dashboard',
  bgColor = '#000000',
  accentColor = '#FFFFFF',
  zIndex = 99999,
  position = 'fixed',
  stairCount = 6,
  readyToExit = true,
  onComplete,
}) => {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'exiting' | 'done'>('loading');

  // Progress counter simulation over duration
  useEffect(() => {
    if (!active) {
      setProgress(0);
      setPhase('loading');
      return;
    }

    setPhase('loading');
    const startTime = performance.now();
    const intervalTime = 25;

    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / (duration * 0.72)) * 100));
      setProgress(pct);

      if (pct >= 100) {
        clearInterval(interval);
      }
    }, intervalTime);

    return () => clearInterval(interval);
  }, [active, duration]);

  // 1. Once progress reaches 100%, transition from 'loading' to 'exiting'
  useEffect(() => {
    if (progress < 100 || phase !== 'loading') return;

    if (readyToExit) {
      setPhase('exiting');
      return;
    }

    // Fallback: if destination route takes a moment to mount, wait at most 700ms
    const fallbackTimer = setTimeout(() => {
      setPhase('exiting');
    }, 700);

    return () => clearTimeout(fallbackTimer);
  }, [progress, readyToExit, phase]);

  // 2. Once in 'exiting' phase, smoothly wait for stairs to finish sliding up, then complete
  useEffect(() => {
    if (phase !== 'exiting') return;

    const exitTimer = setTimeout(() => {
      setPhase('done');
      onComplete?.();
    }, 1100);

    return () => clearTimeout(exitTimer);
  }, [phase, onComplete]);

  // 3. Absolute watchdog safety timeout: preloader can NEVER hang longer than duration + 2500ms
  useEffect(() => {
    if (!active) return;
    const watchdog = setTimeout(() => {
      setPhase('done');
      onComplete?.();
    }, duration + 2500);

    return () => clearTimeout(watchdog);
  }, [active, duration, onComplete]);

  if (!active || phase === 'done') return null;

  const isExiting = phase === 'exiting';

  // Dynamic progress stage label for percentage variant
  const getStageLabel = (p: number) => {
    if (p < 25) return 'Verifying Security Tokens & Credentials...';
    if (p < 55) return 'Syncing XP Ledger & Academic Progression...';
    if (p < 85) return 'Constructing Real-Time Battle Arena...';
    return 'Session Authenticated! Welcome aboard.';
  };

  return (
    <AnimatePresence>
      {active && (
        <div
          role="status"
          aria-live="polite"
          aria-label="Application loading screen"
          className={`${position} inset-0 ${
            isExiting ? 'pointer-events-none' : 'pointer-events-auto'
          } flex items-center justify-center overflow-hidden`}
          style={{ zIndex }}
        >
          {/* ========================================================= */}
          {/* 1. STAIRS VARIANT                                         */}
          {/* ========================================================= */}
          {variant === 'stairs' && (
            <div className="absolute inset-0 flex w-full h-full overflow-hidden">
              {/* Ambient duotone background glow (fades out as stairs lift) */}
              <motion.div
                initial={{ opacity: 1 }}
                animate={isExiting ? { opacity: 0 } : { opacity: 1 }}
                transition={{ duration: 0.55 }}
                className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-800/20 via-[#000000]/95 to-[#000000] pointer-events-none -z-10"
              />

              {Array.from({ length: stairCount }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ y: 0 }}
                  animate={isExiting ? { y: '-100%' } : { y: 0 }}
                  transition={{
                    duration: 0.85,
                    ease: [0.77, 0, 0.175, 1],
                    delay: isExiting ? (stairCount - i - 1) * 0.055 : 0,
                  }}
                  className="h-full flex-1 relative border-r border-white/[0.12] last:border-none overflow-hidden"
                  style={{
                    background:
                      i % 2 === 0
                        ? 'linear-gradient(180deg, #141416 0%, #0a0a0c 50%, #000000 100%)'
                        : 'linear-gradient(180deg, #18181b 0%, #0e0e10 50%, #000000 100%)',
                    boxShadow: 'inset 0 0 50px rgba(255, 255, 255, 0.02)',
                  }}
                >
                  {/* Subtle white vertical sheen */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-white/[0.04] pointer-events-none" />
                  {/* Glowing white bottom rim that sweeps upward */}
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-white/20 via-white to-white/20 shadow-[0_0_15px_rgba(255,255,255,0.7)]" />
                </motion.div>
              ))}

              {/* Center Content */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={isExiting ? { opacity: 0, scale: 0.92, y: -24 } : { opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 pointer-events-none"
              >
                {/* Center duotone ambient halo */}
                <div className="absolute w-[440px] h-[440px] rounded-full bg-white/5 blur-[90px] pointer-events-none -z-10" />

                <div className="relative mb-5">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/30 flex items-center justify-center text-3xl shadow-[0_0_25px_rgba(255,255,255,0.15)] backdrop-blur-md">
                    🎮
                  </div>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 5, ease: 'linear' }}
                    className="absolute -inset-1.5 rounded-2xl border-2 border-dashed border-white/35 pointer-events-none"
                  />
                </div>

                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xl font-bold tracking-wider text-white">CODAK</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-white font-mono font-bold border border-white/30 shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                    ACADEMY
                  </span>
                </div>

                <p className="text-sm font-medium text-zinc-200 mb-1 max-w-sm">{text}</p>
                <p className="text-xs text-zinc-400 max-w-xs">{subtext}</p>

                <div className="w-52 h-1.5 rounded-full bg-white/10 mt-6 overflow-hidden p-0.5 border border-white/20">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-zinc-400 via-white to-zinc-200 shadow-[0_0_12px_rgba(255,255,255,0.6)]"
                    style={{ width: `${progress}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
              </motion.div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2. PERCENTAGE VARIANT                                     */}
          {/* ========================================================= */}
          {variant === 'percentage' && (
            <motion.div
              initial={{ opacity: 1 }}
              animate={isExiting ? { opacity: 0, scale: 1.05 } : { opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
              className="absolute inset-0 flex flex-col justify-between p-8 sm:p-14"
              style={{ backgroundColor: bgColor }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-lg">
                    🎮
                  </div>
                  <span className="text-sm font-bold tracking-wider text-white">CODAK</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  AUTHENTICATING
                </div>
              </div>

              {/* Big Percentage Number */}
              <div className="my-auto">
                <div className="text-[clamp(5rem,14vw,11rem)] font-black leading-none tracking-tight font-mono text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-200 to-zinc-600">
                  {progress}%
                </div>
                <p className="text-sm font-mono text-white tracking-wide mt-2">
                  {getStageLabel(progress)}
                </p>
              </div>

              {/* Bottom Progress Bar */}
              <div className="space-y-3">
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-zinc-400 via-white to-zinc-200 transition-all duration-75"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-zinc-500 font-mono">
                  <span>{text}</span>
                  <span>{progress}/100</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ========================================================= */}
          {/* 3. CIRCLE VARIANT                                         */}
          {/* ========================================================= */}
          {variant === 'circle' && (
            <motion.div
              initial={{ opacity: 1 }}
              animate={isExiting ? { opacity: 0 } : { opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 flex flex-col items-center justify-center"
              style={{ backgroundColor: bgColor }}
            >
              <motion.div
                animate={isExiting ? { scale: 3, opacity: 0 } : { scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: 'easeIn' }}
                className="relative flex items-center justify-center"
              >
                {/* SVG Radial Track */}
                <svg className="w-52 h-52 -rotate-90">
                  <circle
                    cx="104"
                    cy="104"
                    r="84"
                    stroke="currentColor"
                    strokeWidth="6"
                    className="text-white/10"
                    fill="transparent"
                  />
                  <circle
                    cx="104"
                    cy="104"
                    r="84"
                    stroke={accentColor}
                    strokeWidth="6"
                    strokeDasharray={2 * Math.PI * 84}
                    strokeDashoffset={2 * Math.PI * 84 * (1 - progress / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-75 shadow-lg"
                    fill="transparent"
                  />
                </svg>

                {/* Inner Center Orb */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-black font-mono text-white">{progress}%</span>
                  <span className="text-[10px] uppercase font-bold text-white tracking-wider mt-1">
                    READY
                  </span>
                </div>
              </motion.div>

              <div className="mt-8 text-center max-w-xs px-4">
                <h3 className="text-sm font-semibold text-white tracking-wide">{text}</h3>
                <p className="text-xs text-zinc-500 mt-1">{subtext}</p>
              </div>
            </motion.div>
          )}

          {/* ========================================================= */}
          {/* 4. SLIDE VARIANT                                          */}
          {/* ========================================================= */}
          {variant === 'slide' && (
            <div className="absolute inset-0 flex flex-col w-full h-full">
              {/* Top Half */}
              <motion.div
                initial={{ y: 0 }}
                animate={isExiting ? { y: '-100%' } : { y: 0 }}
                transition={{ duration: 0.65, ease: [0.76, 0, 0.24, 1] }}
                className="w-full flex-1 border-b border-white/20 flex items-end justify-center pb-6"
                style={{ backgroundColor: bgColor }}
              >
                <div className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/30 mx-auto flex items-center justify-center text-2xl shadow-lg shadow-white/10 mb-2">
                    🎮
                  </div>
                  <h2 className="text-base font-bold text-white tracking-wide">CODAK PLATFORM</h2>
                </div>
              </motion.div>

              {/* Center Beam */}
              <motion.div
                animate={isExiting ? { opacity: 0 } : { opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="h-[2px] w-full bg-gradient-to-r from-transparent via-white to-transparent z-20 shadow-[0_0_12px_#ffffff]"
              />

              {/* Bottom Half */}
              <motion.div
                initial={{ y: 0 }}
                animate={isExiting ? { y: '100%' } : { y: 0 }}
                transition={{ duration: 0.65, ease: [0.76, 0, 0.24, 1] }}
                className="w-full flex-1 flex flex-col items-center justify-start pt-6 text-center px-4"
                style={{ backgroundColor: bgColor }}
              >
                <p className="text-xs font-mono text-white">{getStageLabel(progress)}</p>
                <div className="w-44 h-1 rounded-full bg-white/10 mt-3 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-75"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </motion.div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 5. CURTAIN VARIANT                                        */}
          {/* ========================================================= */}
          {variant === 'curtain' && (
            <div className="absolute inset-0 flex w-full h-full">
              {/* Left Curtain */}
              <motion.div
                initial={{ x: 0 }}
                animate={isExiting ? { x: '-100%' } : { x: 0 }}
                transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
                className="h-full w-1/2 border-r border-white/20 flex items-center justify-end pr-6 sm:pr-12"
                style={{ backgroundColor: bgColor }}
              >
                <div className="text-right">
                  <span className="text-2xl sm:text-4xl font-black text-white block">COD</span>
                  <span className="text-xs font-mono text-zinc-500">ACADEMIC</span>
                </div>
              </motion.div>

              {/* Right Curtain */}
              <motion.div
                initial={{ x: 0 }}
                animate={isExiting ? { x: '100%' } : { x: 0 }}
                transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
                className="h-full w-1/2 border-l border-white/20 flex items-center justify-start pl-6 sm:pl-12"
                style={{ backgroundColor: bgColor }}
              >
                <div className="text-left">
                  <span className="text-2xl sm:text-4xl font-black text-white block">AK</span>
                  <span className="text-xs font-mono text-zinc-500">PROGRESSION</span>
                </div>
              </motion.div>

              {/* Center Icon badge */}
              <motion.div
                animate={isExiting ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <div className="w-14 h-14 rounded-full bg-zinc-900 border border-white flex items-center justify-center text-xl shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                  🎮
                </div>
              </motion.div>
            </div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
};

export default Preloader;
