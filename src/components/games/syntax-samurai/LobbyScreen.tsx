'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  LanguageEnemy,
  Difficulty,
  LobbySelection,
  LobbyScreenProps,
} from '@/types/syntaxSamurai';
import {
  ENEMY_PROFILES,
  DIFFICULTY_TIERS,
  getEnemyProfile,
  getDifficultyConfig,
  getQuestionsByFilter,
} from '@/data/syntaxSamuraiQuestions';

// Web Audio API Retro Sound Synthesizer
class DojoAudioSynth {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public playSelect() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // AudioContext policy fallback
    }
  }

  public playSwitch() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.setValueAtTime(780, now + 0.04);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // AudioContext policy fallback
    }
  }

  public playSlash() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Noise burst for sword unsheath swoosh
      const bufferSize = this.ctx.sampleRate * 0.15;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.frequency.exponentialRampToValueAtTime(3200, now + 0.05);
      filter.frequency.exponentialRampToValueAtTime(800, now + 0.14);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + 0.15);

      // Resonant harmonic ring
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(330, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.12);

      oscGain.gain.setValueAtTime(0.08, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // AudioContext policy fallback
    }
  }
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  onStartGame,
  onBack,
  initialEnemy = 'python',
  initialDifficulty = 'normal',
}) => {
  const [selectedEnemy, setSelectedEnemy] = useState<LanguageEnemy>(initialEnemy);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(initialDifficulty);
  const [isEngaging, setIsEngaging] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const audioSynthRef = useRef<DojoAudioSynth | null>(null);

  useEffect(() => {
    audioSynthRef.current = new DojoAudioSynth();
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (audioSynthRef.current) {
      audioSynthRef.current.enabled = next;
      if (next) audioSynthRef.current.playSelect();
    }
  };

  const handleEnemySelect = (enemy: LanguageEnemy) => {
    setSelectedEnemy(enemy);
    audioSynthRef.current?.playSelect();
  };

  const handleDifficultySelect = (difficulty: Difficulty) => {
    setSelectedDifficulty(difficulty);
    audioSynthRef.current?.playSwitch();
  };

  const handleEngage = () => {
    if (isEngaging) return;
    setIsEngaging(true);
    audioSynthRef.current?.playSlash();

    const selection: LobbySelection = {
      enemy: selectedEnemy,
      difficulty: selectedDifficulty,
    };

    // Smooth katana slash delay before invoking game callback
    setTimeout(() => {
      onStartGame?.(selection);
    }, 450);
  };

  const activeEnemy = getEnemyProfile(selectedEnemy);
  const activeDifficulty = getDifficultyConfig(selectedDifficulty);
  const availableQuestions = getQuestionsByFilter(selectedEnemy, selectedDifficulty);

  const enemyKeys: LanguageEnemy[] = ['python', 'javascript', 'cpp', 'java'];
  const difficultyKeys: Difficulty[] = ['easy', 'normal', 'hard', 'codemare'];

  return (
    <div className="relative min-h-screen w-full bg-[#07070b] text-zinc-100 flex flex-col justify-between overflow-x-hidden select-none font-sans">
      {/* Background Japanese Monogram & Grid overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 10%, rgba(255,255,255,0.06) 0%, transparent 60%), linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
            backgroundSize: '100% 100%, 32px 32px, 32px 32px',
          }}
        />
        {/* Subtle Ambient Red Sun/Kanji watermark in background */}
        <div className="absolute -top-32 right-1/2 translate-x-1/2 w-96 h-96 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />
      </div>

      {/* Katana Slash Transition Overlay */}
      {isEngaging && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full flex items-center justify-center">
            {/* Diagonal Slash Flash Line */}
            <div
              className="absolute w-[180%] h-1 bg-white shadow-[0_0_25px_#ffffff] rotate-[-25deg] transform -translate-x-full animate-[ping_0.4s_ease-out_forwards]"
              style={{
                boxShadow: `0 0 30px ${activeEnemy.themeColor}, 0 0 60px ${activeEnemy.themeColor}`,
              }}
            />
            <div className="text-center z-10">
              <span className="text-5xl md:text-7xl font-mono font-black tracking-widest text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]">
                抜刀 • ENGAGE!
              </span>
              <p
                className="text-sm font-mono tracking-widest uppercase mt-3"
                style={{ color: activeEnemy.accentColor }}
              >
                Entering {activeEnemy.alias} Dojo • {activeDifficulty.label} Tier
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TOP BAR / TORII DOJO BANNER
          ========================================================================= */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-3.5 pb-2.5 flex flex-wrap items-center justify-between gap-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="group flex items-center gap-2 px-3 py-1.5 rounded bg-zinc-900/90 border border-zinc-700/80 text-zinc-400 hover:text-white hover:border-zinc-500 transition-all text-xs font-mono tracking-wider"
              title="Return to Arcade Hub"
            >
              <span className="group-hover:-translate-x-1 transition-transform">←</span>
              <span>ARCADE</span>
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-red-950/80 border border-red-500/40 flex items-center justify-center text-red-400 font-bold font-mono text-sm shadow-[0_0_12px_rgba(239,68,68,0.25)]">
              侍
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-wider text-white font-mono flex items-center gap-2">
                  <span>SYNTAX SAMURAI</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono font-normal">
                    DOJO
                  </span>
                </h1>
              </div>
              <p className="text-[10px] text-zinc-400 font-mono tracking-tight hidden sm:block">
                構文侍 • THE WAY OF THE COMPILER BLADE
              </p>
            </div>
          </div>
        </div>

        {/* Status Pills & Sound Toggle */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded bg-zinc-900/80 border border-zinc-800 text-zinc-400 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>KATANA: HONED</span>
          </div>

          <button
            onClick={toggleSound}
            aria-label="Toggle Sound"
            className={`px-2.5 py-1 rounded border text-xs font-mono transition-all flex items-center gap-1.5 ${
              soundEnabled
                ? 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:border-zinc-500'
                : 'bg-zinc-950 border-zinc-800 text-zinc-500'
            }`}
          >
            <span>{soundEnabled ? '🔊 SFX ON' : '🔇 SFX MUTED'}</span>
          </button>
        </div>
      </header>

      {/* =========================================================================
          MAIN SELECTION LOBBY VIEWPORT
          ========================================================================= */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col gap-4 justify-between">
        {/* DOJO INTRO / LORE HERO HEADER */}
        <section className="text-center max-w-3xl mx-auto flex flex-col items-center gap-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-red-950/40 border border-red-500/30 text-red-300 text-[10px] font-mono tracking-widest uppercase">
            <span>⚔️ STEP 1: CHOOSE TARGET</span>
            <span className="text-red-500">•</span>
            <span>STEP 2: SET DIFFICULTY</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-mono tracking-wide text-white drop-shadow-md">
            CHOOSE YOUR ADVERSARY & BLADE TIER
          </h2>
          <p className="text-[11px] text-zinc-400 max-w-lg font-sans">
            Every programming language manifests as a fierce dojo phantom. Identify the syntax
            wounds in their scrolls, slice the defective tokens, and restore pure bytecode balance.
          </p>
        </section>

        {/* =====================================================================
            STEP 1: CHOOSE YOUR ENEMY (LANGUAGE ENEMY CARDS)
            ===================================================================== */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-red-400 uppercase tracking-wider">
                [01] SELECT OPPONENT REALM
              </span>
              <span className="text-zinc-600 font-mono text-xs">•</span>
              <span className="text-[11px] text-zinc-400 font-mono">4 LANGUAGE ENEMY GUARDIANS</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">
              CLICK CARD TO LOCK TARGET
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {enemyKeys.map((key) => {
              const enemy = ENEMY_PROFILES[key];
              const isSelected = selectedEnemy === key;

              return (
                <div
                  key={enemy.id}
                  onClick={() => handleEnemySelect(enemy.id)}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleEnemySelect(enemy.id);
                    }
                  }}
                  className={`group relative rounded-xl p-3.5 flex flex-col justify-between cursor-pointer transition-all duration-300 backdrop-blur-md overflow-hidden ${
                    isSelected
                      ? 'bg-zinc-900/90 shadow-xl ring-2 scale-[1.01]'
                      : 'bg-zinc-950/60 hover:bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700'
                  }`}
                  style={{
                    borderColor: isSelected ? enemy.themeColor : undefined,
                    boxShadow: isSelected
                      ? `0 0 20px ${enemy.themeColor}33, inset 0 0 12px ${enemy.themeColor}15`
                      : undefined,
                  }}
                >
                  {/* Watermark Kanji Background */}
                  <div
                    className="absolute -right-4 -bottom-6 text-7xl font-serif font-black select-none pointer-events-none transition-opacity duration-300"
                    style={{
                      color: isSelected ? `${enemy.themeColor}20` : 'rgba(255,255,255,0.03)',
                    }}
                  >
                    {enemy.kanji}
                  </div>

                  {/* Top Header of Card */}
                  <div className="relative z-10 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl sm:text-3xl" role="img" aria-label={enemy.name}>
                        {enemy.avatarIcon}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-base font-bold font-mono tracking-tight text-white group-hover:text-zinc-100">
                            {enemy.name}
                          </h3>
                          <span
                            className="text-[11px] font-mono px-1.5 py-0.2 rounded font-bold"
                            style={{
                              backgroundColor: `${enemy.themeColor}25`,
                              color: enemy.accentColor,
                            }}
                          >
                            {enemy.kanji}
                          </span>
                        </div>
                        <p
                          className="text-[11px] font-mono font-medium tracking-wide"
                          style={{ color: enemy.accentColor }}
                        >
                          {enemy.alias}
                        </p>
                      </div>
                    </div>

                    {/* Threat rating stars */}
                    <div
                      className="flex items-center gap-0.5 text-xs"
                      title={`Threat Rating: ${enemy.difficultyRating} of 4`}
                    >
                      {[1, 2, 3, 4].map((star) => (
                        <span
                          key={star}
                          style={{
                            color:
                              star <= enemy.difficultyRating
                                ? enemy.themeColor
                                : 'rgba(255,255,255,0.15)',
                          }}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Middle: Element & Description */}
                  <div className="relative z-10 my-3 flex flex-col gap-2">
                    <div className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-300 bg-zinc-900/90 px-2 py-0.5 rounded border border-zinc-800 w-fit">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: enemy.themeColor }}
                      />
                      <span>{enemy.element}</span>
                    </div>
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                      {enemy.description}
                    </p>
                  </div>

                  {/* Bottom: Signature Stats */}
                  <div className="relative z-10 pt-2 border-t border-zinc-800/80 flex flex-col gap-1 text-[11px] font-mono">
                    <div className="flex justify-between text-zinc-400">
                      <span>SPEED:</span>
                      <span className="text-zinc-200 font-semibold">{enemy.stats.attackSpeed}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>THREAT:</span>
                      <span
                        className="truncate max-w-[150px] text-right font-medium"
                        style={{ color: isSelected ? enemy.accentColor : '#a1a1aa' }}
                        title={enemy.stats.lethalThreat}
                      >
                        {enemy.stats.lethalThreat}
                      </span>
                    </div>
                  </div>

                  {/* Card Select Indicator Seal */}
                  <div className="relative z-10 mt-3 pt-2 flex items-center justify-between text-[11px] font-mono">
                    <span
                      className={`transition-colors font-bold ${
                        isSelected ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-400'
                      }`}
                    >
                      {isSelected ? '⚔️ TARGET LOCKED' : 'SELECT OPPONENT'}
                    </span>
                    <span
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${
                        isSelected
                          ? 'bg-white text-black font-bold'
                          : 'border border-zinc-700 text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                  </div>

                  {/* Edge Accent Bar */}
                  {isSelected && (
                    <div
                      className="absolute bottom-0 left-0 right-0 h-1"
                      style={{ backgroundColor: enemy.themeColor }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* =====================================================================
            STEP 2: CHOOSE DIFFICULTY (DIFFICULTY BADGES / TIERS)
            ===================================================================== */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                [02] SET BATTLE INTENSITY
              </span>
              <span className="text-zinc-600 font-mono text-xs">•</span>
              <span className="text-[11px] text-zinc-400 font-mono">SCALED REWARDS & TIMER PACE</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">
              HIGHER TIER = GREATER XP & SLICE MULTIPLIER
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {difficultyKeys.map((tierKey) => {
              const tier = DIFFICULTY_TIERS[tierKey];
              const isSelected = selectedDifficulty === tierKey;

              return (
                <div
                  key={tier.id}
                  onClick={() => handleDifficultySelect(tier.id)}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleDifficultySelect(tier.id);
                    }
                  }}
                  className={`group relative rounded-xl p-3 sm:p-3.5 flex flex-col justify-between cursor-pointer transition-all duration-200 border ${
                    isSelected
                      ? 'bg-zinc-900 border-white/40 ring-2 shadow-lg scale-[1.01]'
                      : 'bg-zinc-950/70 hover:bg-zinc-900/60 border-zinc-800/90 hover:border-zinc-700'
                  }`}
                  style={{
                    borderColor: isSelected ? tier.badgeColor : undefined,
                    boxShadow: isSelected ? `0 0 16px ${tier.badgeColor}25` : undefined,
                  }}
                >
                  <div>
                    {/* Header: Label, Kanji, Sublabel */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-black font-mono tracking-wider"
                          style={{
                            backgroundColor: `${tier.badgeColor}25`,
                            color: tier.badgeColor,
                          }}
                        >
                          {tier.label}
                        </span>
                        <span className="text-[11px] text-zinc-400 font-mono">{tier.sublabel}</span>
                      </div>
                      <span className="text-xs font-serif font-bold text-zinc-400">
                        {tier.kanji}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-[10px] text-zinc-400 line-clamp-2 mb-2 leading-relaxed">
                      {tier.description}
                    </p>
                  </div>

                  {/* Metrics Badges: Questions, Time, XP */}
                  <div className="pt-1.5 border-t border-zinc-800/80 flex flex-col gap-1 font-mono text-[10px]">
                    <div className="flex justify-between items-center text-zinc-300">
                      <span className="text-zinc-500">TRIALS:</span>
                      <span className="font-bold text-white flex items-center gap-1">
                        <span>🗡️</span>
                        <span>{tier.questionCount} Questions</span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-300">
                      <span className="text-zinc-500">EST. TIME:</span>
                      <span className="text-zinc-300">{tier.estimatedTime}</span>
                    </div>
                    <div className="flex justify-between items-center text-amber-400 font-bold">
                      <span className="text-zinc-500 font-normal">BOUNTY:</span>
                      <span className="flex items-center gap-1">
                        <span>+{tier.xpReward} XP</span>
                        <span className="text-[9px] px-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300">
                          {tier.slashMultiplier}x
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Bottom selection bar */}
                  <div
                    className={`mt-2 pt-1 text-center text-[9px] font-mono tracking-wider uppercase font-bold transition-colors ${
                      isSelected ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-400'
                    }`}
                  >
                    {isSelected ? '● TIER ACTIVE' : 'ACTIVATE TIER'}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* =====================================================================
            STEP 3: BATTLE BRIEFING DASHBOARD & ENGAGE ACTION
            ===================================================================== */}
        <section
          className="relative rounded-xl p-4 sm:p-5 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4"
          style={{
            borderColor: `${activeEnemy.themeColor}50`,
            boxShadow: `0 10px 30px -10px ${activeEnemy.themeColor}20`,
          }}
        >
          {/* Left: Match Briefing Overview */}
          <div className="flex items-center gap-3.5 w-full md:w-auto">
            <div
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-2xl sm:text-3xl shadow-inner border border-white/10 shrink-0"
              style={{
                backgroundColor: `${activeEnemy.themeColor}15`,
                borderColor: `${activeEnemy.themeColor}40`,
              }}
            >
              <span>{activeEnemy.avatarIcon}</span>
            </div>

            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-bold uppercase tracking-wider">
                  MATCH PREVIEW
                </span>
                <span
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor: `${activeDifficulty.badgeColor}20`,
                    color: activeDifficulty.badgeColor,
                  }}
                >
                  {activeDifficulty.label} ({activeDifficulty.kanji})
                </span>
              </div>

              <h4 className="text-base sm:text-lg font-bold font-mono text-white flex items-center gap-2">
                <span>VS {activeEnemy.name.toUpperCase()}</span>
                <span className="text-zinc-500 font-normal text-xs font-sans">
                  ({activeEnemy.alias})
                </span>
              </h4>

              <div className="flex items-center gap-2.5 text-[11px] font-mono text-zinc-400 flex-wrap">
                <span>
                  <strong className="text-white">{availableQuestions.length}</strong> Curated Scrolls
                </span>
                <span>•</span>
                <span>
                  Limit:{' '}
                  <strong className="text-white">
                    {activeDifficulty.timePerQuestionSec}s
                  </strong>{' '}
                  / Trial
                </span>
                <span>•</span>
                <span className="text-amber-400 font-semibold">
                  Bounty: +{activeDifficulty.xpReward} XP
                </span>
              </div>
            </div>
          </div>

          {/* Right: Engage Battle CTA Button */}
          <div className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-3">
            <div className="hidden lg:flex flex-col text-right font-mono text-[10px] text-zinc-400">
              <span className="text-zinc-300 font-bold">READY TO DRAW BLADE?</span>
              <span className="text-zinc-500">Press button to enter canvas</span>
            </div>

            <button
              onClick={handleEngage}
              disabled={isEngaging}
              className="w-full sm:w-auto min-w-[200px] group relative px-5 py-3 rounded-xl font-mono font-black text-xs sm:text-sm tracking-widest uppercase transition-all duration-200 overflow-hidden shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              style={{
                backgroundColor: activeEnemy.themeColor,
                color: '#000000',
                boxShadow: `0 0 20px ${activeEnemy.themeColor}50`,
              }}
            >
              {/* Shimmer sweep effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

              <div className="relative flex items-center justify-center gap-2">
                <span className="text-base group-hover:rotate-45 transition-transform">⚔️</span>
                <span>ENGAGE BATTLE (抜刀)</span>
              </div>
            </button>
          </div>
        </section>
      </main>

      {/* =========================================================================
          FOOTER / CONTROLS & LORE TICKER
          ========================================================================= */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-zinc-900 text-[11px] font-mono text-zinc-500">
        <div className="flex items-center gap-2">
          <span className="text-zinc-400">DOJO CODE OF HONOR:</span>
          <span>SLICE ONLY SYNTAX WOUNDS • DO NOT HESITATE</span>
        </div>
        <div>
          <span>SYNTAX SAMURAI v1.0 • PHASE 1 LOBBY READY</span>
        </div>
      </footer>
    </div>
  );
};

export default LobbyScreen;
