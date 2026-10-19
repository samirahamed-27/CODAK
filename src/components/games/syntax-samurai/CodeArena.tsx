'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  SyntaxQuestion,
  EnemyProfile,
  DifficultyConfig,
  TokenBoundingBox,
  SlashHitEvent,
  QuestionResultMeta,
} from '@/types/syntaxSamurai';
import { useKatanaBlade } from '@/hooks/useKatanaBlade';
import { KatanaCanvas } from '@/components/games/syntax-samurai/KatanaCanvas';
import { PixelCrumbleEngine } from '@/components/games/syntax-samurai/PixelCrumbleEngine';
import { TypewriterTransition } from '@/components/games/syntax-samurai/TypewriterTransition';

export interface CodeArenaProps {
  question: SyntaxQuestion;
  enemy: EnemyProfile;
  difficulty: DifficultyConfig;
  questionIndex: number;
  totalQuestions: number;
  score: number;
  onQuestionCompleted?: (
    isCorrect: boolean,
    xpGained: number,
    meta?: QuestionResultMeta
  ) => void;
  onForfeit?: () => void;
}

export const CodeArena: React.FC<CodeArenaProps> = ({
  question,
  enemy,
  difficulty,
  questionIndex,
  totalQuestions,
  score,
  onQuestionCompleted,
  onForfeit,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const errorTokenRef = useRef<HTMLSpanElement | null>(null);
  const healthyLinesRef = useRef<(HTMLDivElement | null)[]>([]);
  const crumbleEngineRef = useRef<PixelCrumbleEngine | null>(new PixelCrumbleEngine());

  // Targets for hit detection
  const [targets, setTargets] = useState<TokenBoundingBox[]>([]);

  // Phase 3 States: Typewriter Code Stream, Pixel Crumble & Micro-shake
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [isTokenHidden, setIsTokenHidden] = useState<boolean>(false);

  // Game battle states
  const [isSliced, setIsSliced] = useState<boolean>(false);
  const [selectedFix, setSelectedFix] = useState<string | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [combo, setCombo] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(difficulty.timePerQuestionSec);
  const [recentEvent, setRecentEvent] = useState<{
    type: 'hit' | 'parry';
    text: string;
    subtext: string;
    key: number;
  } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Measure bounding boxes of error token and healthy lines
  const updateBoundingBoxes = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const newTargets: TokenBoundingBox[] = [];

    // 1. Measure Error Token
    if (errorTokenRef.current) {
      const rect = errorTokenRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        newTargets.push({
          id: 'error-target',
          isError: true,
          lineIndex: question.errorLineIndex,
          text: question.errorToken,
          x: rect.left - containerRect.left,
          y: rect.top - containerRect.top,
          width: rect.width,
          height: rect.height,
        });
      }
    }

    // 2. Measure Healthy Code Lines (as parry deflect zones)
    healthyLinesRef.current.forEach((lineEl, idx) => {
      if (lineEl && idx !== question.errorLineIndex) {
        const rect = lineEl.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          newTargets.push({
            id: `healthy-line-${idx}`,
            isError: false,
            lineIndex: idx,
            text: `Line ${idx + 1}`,
            x: rect.left - containerRect.left,
            y: rect.top - containerRect.top,
            width: rect.width,
            height: rect.height,
          });
        }
      }
    });

    setTargets(newTargets);
  }, [question.errorLineIndex, question.errorToken]);

  // Recalculate bounding boxes when typewriter streaming finishes or window resizes
  useEffect(() => {
    if (!isStreaming) {
      const timer = setTimeout(updateBoundingBoxes, 40);
      return () => clearTimeout(timer);
    }
  }, [isStreaming, updateBoundingBoxes]);

  useEffect(() => {
    window.addEventListener('resize', updateBoundingBoxes);
    return () => window.removeEventListener('resize', updateBoundingBoxes);
  }, [updateBoundingBoxes]);

  // Typewriter streaming completion handler
  const handleTypingComplete = useCallback(() => {
    setIsStreaming(false);
  }, []);

  // Timer countdown
  useEffect(() => {
    if (isSliced && selectedFix !== null) return; // Pause when round completed

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Time expired
          onQuestionCompleted?.(false, 0, {
            wasSliced: isSliced,
            selectedFix: null,
            timeRemainingSec: 0,
            combo: 0,
            timeBonus: 0,
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSliced, onQuestionCompleted, selectedFix]);

  // Hit Handler (Critical Slash on the bugged token with Pixel Crumble FX)
  const handleHit = useCallback(
    (e: SlashHitEvent) => {
      if (isSliced) return;
      setIsSliced(true);
      setIsTokenHidden(true); // Hide original text token instantly
      setCombo((prev) => prev + 1);

      // Trigger 80ms screen micro-shake & visual flash
      setIsShaking(true);
      setIsFlashing(true);
      setTimeout(() => setIsShaking(false), 80);
      setTimeout(() => setIsFlashing(false), 80);

      // Spawn 65 pixel crumble particles erupting along cut vector
      if (crumbleEngineRef.current && e.token) {
        let cutAngle = -Math.PI / 4;
        if (e.cutSegment) {
          const cdx = e.cutSegment.p2.x - e.cutSegment.p1.x;
          const cdy = e.cutSegment.p2.y - e.cutSegment.p1.y;
          cutAngle = Math.atan2(cdy, cdx);
        }

        // Match color of the sliced code token dynamically
        let tokenColor = '#ef4444';
        if (errorTokenRef.current && typeof window !== 'undefined') {
          const compColor = window.getComputedStyle(errorTokenRef.current).color;
          if (compColor) tokenColor = compColor;
        }

        crumbleEngineRef.current.explode({
          x: e.token.x,
          y: e.token.y,
          width: e.token.width,
          height: e.token.height,
          cutAngle,
          count: 65,
          colors: [
            tokenColor,
            '#ef4444',
            '#f87171',
            '#ffffff',
            enemy.accentColor || '#f59e0b',
            enemy.themeColor || '#10b981',
          ],
        });
      }

      setRecentEvent({
        type: 'hit',
        text: '斬 • CRITICAL SLASH!',
        subtext: `Target: "${question.errorToken}" shattered into pixel debris! Select repair token:`,
        key: Date.now(),
      });
    },
    [enemy.accentColor, enemy.themeColor, isSliced, question.errorToken]
  );

  // Parry Handler (Deflect when slashing healthy code)
  const handleParry = useCallback(
    (e: SlashHitEvent) => {
      if (isSliced) return;
      setCombo(0); // Combo broken

      // Subtle 40ms vibration on parry
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 40);

      setRecentEvent({
        type: 'parry',
        text: '刀受け • PARRY DEFLECT!',
        subtext: `Healthy code struck at ${e.token?.text ?? 'line'}. Focus on the corrupted token!`,
        key: Date.now(),
      });
    },
    [isSliced]
  );

  // Katana blade tracking hook
  const {
    bladeState,
    trailRef,
    sparksRef,
    isInside,
  } = useKatanaBlade({
    containerRef,
    targets: isStreaming ? [] : targets,
    themeColor: enemy.themeColor,
    onHit: handleHit,
    onParry: handleParry,
    soundEnabled,
  });

  // Repair choice handler
  const handleChooseFix = (option: string) => {
    if (selectedFix !== null) return;
    setSelectedFix(option);

    const correct = option === question.correctReplacement;
    setIsAnswerCorrect(correct);

    const baseReward = correct ? difficulty.xpReward : 0;
    const comboBonus = correct ? Math.round(difficulty.xpReward * (combo * 0.1)) : 0;
    const timeBonus = correct ? Math.round(timeLeft * 2) : 0;
    const slashBonus = isSliced ? 50 : 0;
    const xp = baseReward + comboBonus + timeBonus + (correct ? slashBonus : 0);

    setTimeout(() => {
      onQuestionCompleted?.(correct, xp, {
        wasSliced: isSliced,
        selectedFix: option,
        timeRemainingSec: timeLeft,
        combo,
        timeBonus,
      });
    }, 1600);
  };

  // Syntax Tokenizer for clean visual presentation
  const renderCodeLines = () => {
    const lines = question.codeSnippet.split('\n');

    return lines.map((lineStr, lineIdx) => {
      const isErrorLine = lineIdx === question.errorLineIndex;

      // If this line has the error, split it to isolate errorToken
      if (isErrorLine && question.errorToken) {
        const errorIndex = lineStr.indexOf(question.errorToken);

        if (errorIndex !== -1) {
          const before = lineStr.substring(0, errorIndex);
          const bugged = question.errorToken;
          const after = lineStr.substring(errorIndex + bugged.length);

          return (
            <div
              key={lineIdx}
              ref={(el) => {
                healthyLinesRef.current[lineIdx] = el;
              }}
              className="flex items-center hover:bg-white/[0.02] px-2 py-0.5 rounded transition-colors"
            >
              <span className="w-8 select-none text-right pr-4 text-zinc-600 font-mono text-xs">
                {lineIdx + 1}
              </span>
              <span className="font-mono text-sm tracking-wide flex-1 whitespace-pre">
                <span className="text-zinc-300">{before}</span>
                <span
                  ref={errorTokenRef}
                  className={`relative inline-block px-1.5 py-0.5 rounded transition-all duration-300 font-bold ${
                    isTokenHidden
                      ? 'opacity-0 scale-90 pointer-events-none'
                      : isSliced
                      ? 'bg-red-500/20 text-red-200 line-through decoration-red-500 decoration-2 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                      : 'bg-red-950/60 border border-dashed border-red-500/80 text-red-300 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                  }`}
                  title="Flawed syntax wound: Drag katana across this token to slice!"
                >
                  {bugged}
                  {/* Slash cut scar */}
                  {isSliced && (
                    <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="w-[120%] h-0.5 bg-white shadow-[0_0_8px_#ffffff] rotate-[-25deg]" />
                    </span>
                  )}
                </span>
                <span className="text-zinc-300">{after}</span>
              </span>
            </div>
          );
        } else {
          // Fallback: If exact token substring wasn't located on line, treat line content as target
          return (
            <div
              key={lineIdx}
              className="flex items-center hover:bg-white/[0.02] px-2 py-0.5 rounded transition-colors"
            >
              <span className="w-8 select-none text-right pr-4 text-zinc-600 font-mono text-xs">
                {lineIdx + 1}
              </span>
              <span className="font-mono text-sm tracking-wide flex-1 whitespace-pre">
                <span
                  ref={errorTokenRef}
                  className={`relative inline-block px-1.5 py-0.5 rounded transition-all duration-300 font-bold ${
                    isTokenHidden
                      ? 'opacity-0 scale-90 pointer-events-none'
                      : isSliced
                      ? 'bg-red-500/20 text-red-200 line-through decoration-red-500 decoration-2 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                      : 'bg-red-950/60 border border-dashed border-red-500/80 text-red-300 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                  }`}
                  title="Flawed syntax wound: Drag katana across this token to slice!"
                >
                  {lineStr || question.errorToken || '/* syntax error */'}
                  {isSliced && (
                    <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="w-[120%] h-0.5 bg-white shadow-[0_0_8px_#ffffff] rotate-[-25deg]" />
                    </span>
                  )}
                </span>
              </span>
            </div>
          );
        }
      }

      // Healthy line
      return (
        <div
          key={lineIdx}
          ref={(el) => {
            healthyLinesRef.current[lineIdx] = el;
          }}
          className="flex items-center hover:bg-white/[0.02] px-2 py-0.5 rounded transition-colors"
        >
          <span className="w-8 select-none text-right pr-4 text-zinc-600 font-mono text-xs">
            {lineIdx + 1}
          </span>
          <span className="font-mono text-sm text-zinc-300 tracking-wide flex-1 whitespace-pre">
            {lineStr || ' '}
          </span>
        </div>
      );
    });
  };

  const timerPct = Math.max(0, (timeLeft / difficulty.timePerQuestionSec) * 100);

  return (
    <div
      ref={containerRef}
      data-katana-active="true"
      className="relative w-full max-w-5xl mx-auto flex flex-col justify-between rounded-2xl bg-[#09090f] border border-zinc-800 shadow-2xl overflow-hidden select-none font-sans"
      style={{
        cursor: 'none',
        boxShadow: `0 0 30px ${enemy.themeColor}15, inset 0 0 40px rgba(0,0,0,0.8)`,
      }}
    >
      {/* 60fps Katana Canvas Overlay with Pixel Crumble debris */}
      <KatanaCanvas
        containerRef={containerRef}
        bladeState={bladeState}
        trailRef={trailRef}
        sparksRef={sparksRef}
        crumbleEngineRef={crumbleEngineRef}
        isInside={isInside}
        themeColor={enemy.themeColor}
        accentColor={enemy.accentColor}
      />

      {/* =========================================================================
          TOP BATTLE STATUS BAR
          ========================================================================= */}
      <div className="relative z-10 px-5 py-3 bg-zinc-950/90 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
        {/* Opponent & Round Progress */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl border shadow-inner"
            style={{
              backgroundColor: `${enemy.themeColor}15`,
              borderColor: `${enemy.themeColor}40`,
            }}
          >
            <span>{enemy.avatarIcon}</span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white tracking-wider">
                {enemy.name.toUpperCase()} {enemy.kanji}
              </span>
              <span
                className="text-[10px] font-mono px-1.5 py-0.2 rounded font-bold"
                style={{
                  backgroundColor: `${difficulty.badgeColor}25`,
                  color: difficulty.badgeColor,
                }}
              >
                {difficulty.label}
              </span>
            </div>
            <div className="text-[11px] font-mono text-zinc-400">
              Trial <strong className="text-white">{questionIndex + 1}</strong> of {totalQuestions} •{' '}
              {enemy.alias}
            </div>
          </div>
        </div>

        {/* Combo & Score Counter */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div
            className={`px-3 py-1 rounded-full border transition-all duration-300 font-bold flex items-center gap-1.5 ${
              combo > 0
                ? 'bg-amber-950/60 border-amber-500/60 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500'
            }`}
          >
            <span>⚡</span>
            <span>COMBO x{combo}</span>
          </div>

          <div className="flex items-center gap-2 bg-zinc-900/90 px-3 py-1 rounded-lg border border-zinc-800 text-zinc-300">
            <span className="text-zinc-500">BOUNTY:</span>
            <span className="text-amber-400 font-bold">+{score} XP</span>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1 text-zinc-400 hover:text-white transition-colors"
            title={soundEnabled ? 'Mute SFX' : 'Enable SFX'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>

          {onForfeit && (
            <button
              onClick={onForfeit}
              className="text-[11px] font-mono px-2 py-1 rounded bg-red-950/30 border border-red-500/30 text-red-400 hover:bg-red-900/50 hover:text-white transition-colors"
            >
              FORFEIT
            </button>
          )}
        </div>
      </div>

      {/* Turn Timer Progress Bar */}
      <div className="relative z-10 w-full h-1 bg-zinc-900">
        <div
          className={`h-full transition-all duration-300 ${
            timeLeft <= 5 ? 'bg-red-500 animate-pulse' : 'bg-emerald-400'
          }`}
          style={{ width: `${timerPct}%` }}
        />
      </div>

      {/* =========================================================================
          SLICING BATTLE ARENA (CODE VIEWPORT)
          ========================================================================= */}
      <div className="relative z-10 p-5 sm:p-6 flex flex-col gap-4">
        {/* Editor Window Chrome with 80ms screen micro-shake & visual impact flash */}
        <div
          className={`relative rounded-xl bg-[#0c0d14] border border-zinc-800/90 shadow-xl overflow-hidden transition-transform duration-75 ${
            isShaking ? '-translate-y-1 translate-x-1 rotate-[0.4deg]' : ''
          }`}
        >
          {/* Visual Flash on Impact */}
          {isFlashing && (
            <div className="absolute inset-0 bg-white/20 pointer-events-none z-20 animate-in fade-in duration-75" />
          )}

          {/* Top Window Bar */}
          <div className="px-4 py-2 bg-zinc-950 border-b border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
              <span className="ml-2 text-[11px] text-zinc-500">
                scroll_{question.id}.{question.language === 'python' ? 'py' : question.language === 'javascript' ? 'js' : question.language === 'cpp' ? 'cpp' : 'java'}
              </span>
            </div>

            <div className="text-[11px] text-zinc-500 flex items-center gap-2">
              <span>HINT: {question.errorBoundingHint}</span>
            </div>
          </div>

          {/* Code lines container: Streamed via TypewriterTransition or interactive code */}
          <div className="p-4 sm:p-5 overflow-x-auto min-h-[160px] flex flex-col justify-center">
            {isStreaming ? (
              <TypewriterTransition
                codeSnippet={question.codeSnippet}
                lineSpeedMs={26}
                themeColor={enemy.themeColor}
                soundEnabled={soundEnabled}
                onComplete={handleTypingComplete}
              />
            ) : (
              renderCodeLines()
            )}
          </div>
        </div>

        {/* Dynamic Slash / Parry Event Banner */}
        {recentEvent && (
          <div
            key={recentEvent.key}
            className={`px-4 py-2.5 rounded-xl border flex items-center justify-between gap-3 animate-in fade-in zoom-in-95 duration-200 ${
              recentEvent.type === 'hit'
                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                : 'bg-sky-950/70 border-sky-500/50 text-sky-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {recentEvent.type === 'hit' ? '⚔️' : '🛡️'}
              </span>
              <div>
                <span className="text-xs font-mono font-bold tracking-wider">
                  {recentEvent.text}
                </span>
                <p className="text-[11px] font-sans opacity-80">
                  {recentEvent.subtext}
                </p>
              </div>
            </div>

            <div className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/40">
              {recentEvent.type === 'hit' ? 'BLADE SLICED' : 'BLADE DEFLECTED'}
            </div>
          </div>
        )}

        {/* =====================================================================
            REPAIR CHOICES (UNLOCKED UPON CRITICAL SLASH)
            ===================================================================== */}
        {isSliced && (
          <div className="rounded-xl p-4 bg-zinc-950/90 border border-zinc-800 shadow-xl flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-mono font-bold text-xs uppercase tracking-wider">
                  [SELECT BLADE REPAIR]
                </span>
                <span className="text-zinc-500 text-xs font-mono">•</span>
                <span className="text-xs text-zinc-400">
                  Choose the correct token to complete the scroll:
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">
                1 CORRECT • 3 DISTRACTORS
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {question.fixOptions.map((opt, i) => {
                const isSelected = selectedFix === opt;
                const isCorrect = opt === question.correctReplacement;

                let btnStyle = 'bg-zinc-900 border-zinc-700 hover:border-zinc-500 text-zinc-200';
                if (isSelected) {
                  btnStyle = isCorrect
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                    : 'bg-red-950 border-red-500 text-red-300 ring-2 ring-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]';
                }

                return (
                  <button
                    key={i}
                    onClick={() => handleChooseFix(opt)}
                    disabled={selectedFix !== null}
                    className={`group relative p-3 rounded-lg border font-mono text-xs sm:text-sm font-bold tracking-wider transition-all duration-200 text-center overflow-hidden ${btnStyle}`}
                  >
                    <span className="relative z-10">{opt}</span>
                    <span className="absolute bottom-1 right-2 text-[9px] font-mono text-zinc-500 opacity-60">
                      0{i + 1}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Explanation card upon answering */}
            {selectedFix !== null && (
              <div
                className={`p-3 rounded-lg border text-xs font-sans mt-1 animate-in fade-in duration-300 ${
                  isAnswerCorrect
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-red-950/40 border-red-500/40 text-red-200'
                }`}
              >
                <div className="font-mono font-bold mb-1 flex items-center gap-1.5">
                  <span>{isAnswerCorrect ? '✓ SCROLL PURIFIED' : '✗ SYNTAX REJECTED'}</span>
                </div>
                <p className="leading-relaxed opacity-90">{question.explanation}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          FOOTER / BATTLE INSTRUCTIONS
          ========================================================================= */}
      <div className="relative z-10 px-5 py-2.5 bg-zinc-950/80 border-t border-zinc-900 flex items-center justify-between text-[11px] font-mono text-zinc-500">
        <div className="flex items-center gap-2">
          <span className="text-zinc-400">KATANA COMMAND:</span>
          <span>
            {isSliced
              ? 'TARGET SLICED! Pick the correct repair token above.'
              : 'Drag blade across corrupted red token to trigger Critical Slash.'}
          </span>
        </div>
        <div>
          <span>TIMER: {timeLeft}s</span>
        </div>
      </div>
    </div>
  );
};

export default CodeArena;
