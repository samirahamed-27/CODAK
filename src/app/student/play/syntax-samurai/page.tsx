'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LobbyScreen } from '@/components/games/syntax-samurai/LobbyScreen';
import { CodeArena } from '@/components/games/syntax-samurai/CodeArena';
import {
  VictoryScreen,
  calculateSamuraiRank,
} from '@/components/games/syntax-samurai/VictoryScreen';
import {
  LobbySelection,
  SyntaxQuestion,
  QuestionReviewItem,
  QuestionResultMeta,
  VictoryStats,
} from '@/types/syntaxSamurai';
import {
  getEnemyProfile,
  getDifficultyConfig,
  getRandomQuestions,
} from '@/data/syntaxSamuraiQuestions';

export default function SyntaxSamuraiPage() {
  const router = useRouter();
  const [gameState, setGameState] = useState<'lobby' | 'battle' | 'victory'>('lobby');
  const [battleConfig, setBattleConfig] = useState<LobbySelection | null>(null);
  const [battleQuestions, setBattleQuestions] = useState<SyntaxQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);

  // Background Music (BGM) state and audio ref
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const [isBgmMuted, setIsBgmMuted] = useState<boolean>(false);

  // Load mute preference from localStorage on mount
  useEffect(() => {
    try {
      const savedMute = localStorage.getItem('syntax_samurai_bgm_muted');
      if (savedMute !== null) {
        setIsBgmMuted(savedMute === 'true');
      }
    } catch {}
  }, []);

  // Synchronize audio element playback with game state and mute preference
  useEffect(() => {
    const audio = bgmRef.current;
    if (!audio) return;

    audio.muted = isBgmMuted;
    audio.volume = 0.45;

    if (gameState === 'battle') {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          // Autoplay policy fallback (resumes on user interaction)
          console.warn('Syntax Samurai BGM autoplay deferred:', err);
        });
      }
    } else {
      audio.pause();
      if (gameState === 'lobby') {
        audio.currentTime = 0;
      }
    }
  }, [gameState, isBgmMuted]);

  const toggleBgm = () => {
    setIsBgmMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('syntax_samurai_bgm_muted', String(next));
      } catch {}
      if (bgmRef.current) {
        bgmRef.current.muted = next;
        if (!next && gameState === 'battle') {
          bgmRef.current.play().catch(() => {});
        }
      }
      return next;
    });
  };

  // Phase 5: Tracking Session Metrics & Review Items
  const [reviewItems, setReviewItems] = useState<QuestionReviewItem[]>([]);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [slashesLandedCount, setSlashesLandedCount] = useState<number>(0);
  const [timeBonusTotal, setTimeBonusTotal] = useState<number>(0);
  const [comboBonusTotal, setComboBonusTotal] = useState<number>(0);
  const [baseXpTotal, setBaseXpTotal] = useState<number>(0);
  const recordedQuestionIdsRef = useRef<Set<string>>(new Set());

  const handleStartGame = (selection: LobbySelection) => {
    recordedQuestionIdsRef.current.clear();
    setBattleConfig(selection);
    const questions = getRandomQuestions(selection.enemy, selection.difficulty);
    setBattleQuestions(questions);
    setQuestionIndex(0);
    setScore(0);
    setCorrectCount(0);
    setReviewItems([]);
    setMaxCombo(0);
    setSlashesLandedCount(0);
    setTimeBonusTotal(0);
    setComboBonusTotal(0);
    setBaseXpTotal(0);
    setGameState('battle');

    // Trigger BGM in user-gesture callstack to guarantee playback
    if (bgmRef.current) {
      bgmRef.current.currentTime = 0;
      bgmRef.current.volume = 0.45;
      bgmRef.current.muted = isBgmMuted;
      bgmRef.current.play().catch(() => {});
    }
  };

  const handleBackToLobby = () => {
    recordedQuestionIdsRef.current.clear();
    setGameState('lobby');
    if (bgmRef.current) {
      bgmRef.current.pause();
      bgmRef.current.currentTime = 0;
    }
  };

  const handleQuestionCompleted = (
    isCorrect: boolean,
    xpGained: number,
    meta?: QuestionResultMeta
  ) => {
    const currentQ = battleQuestions[questionIndex];
    if (!currentQ || recordedQuestionIdsRef.current.has(currentQ.id)) {
      return;
    }
    recordedQuestionIdsRef.current.add(currentQ.id);

    const diff = battleConfig ? getDifficultyConfig(battleConfig.difficulty) : null;

    if (currentQ) {
      const wasSliced = meta?.wasSliced ?? false;
      const timeBonus = meta?.timeBonus ?? 0;
      const combo = meta?.combo ?? 0;

      if (wasSliced) {
        setSlashesLandedCount((prev) => prev + 1);
      }
      if (combo > maxCombo) {
        setMaxCombo(combo);
      }
      if (isCorrect && diff) {
        setCorrectCount((prev) => prev + 1);
        setScore((prev) => prev + xpGained);
        setBaseXpTotal((prev) => prev + diff.xpReward);
        setTimeBonusTotal((prev) => prev + timeBonus);
        setComboBonusTotal((prev) => prev + Math.round(diff.xpReward * (combo * 0.1)));
      }

      setReviewItems((prev) => [
        ...prev,
        {
          question: currentQ,
          wasSliced,
          selectedFix: meta?.selectedFix ?? null,
          isCorrect,
          timeRemainingSec: meta?.timeRemainingSec ?? 0,
          timeBonus,
          xpEarned: xpGained,
        },
      ]);
    }

    if (questionIndex + 1 < battleQuestions.length) {
      setQuestionIndex((prev) => prev + 1);
    } else {
      setGameState('victory');
      if (bgmRef.current) {
        bgmRef.current.pause();
      }
    }
  };

  const bgmAudioElement = (
    <audio ref={bgmRef} loop preload="auto" className="hidden">
      <source src="/assets/audio/syntax-samurai-bgm.m4a" type="audio/mp4" />
      <source src="/assets/audio/syntax-samurai-bgm.wav" type="audio/wav" />
      <source src="/assets/audio/Enter%20the%20sysntax%20samurai.wav" type="audio/wav" />
    </audio>
  );

  if (gameState === 'lobby' || !battleConfig) {
    return (
      <>
        {bgmAudioElement}
        <LobbyScreen
          onStartGame={handleStartGame}
          onBack={() => router.push('/student/play')}
        />
      </>
    );
  }

  const enemy = getEnemyProfile(battleConfig.enemy);
  const diff = getDifficultyConfig(battleConfig.difficulty);

  // Victory / Performance Hub & Code Review View
  if (gameState === 'victory') {
    const accuracyPercent =
      battleQuestions.length > 0
        ? Math.round((correctCount / battleQuestions.length) * 100)
        : 0;

    const rankDetails = calculateSamuraiRank(accuracyPercent, diff.id);

    const victoryStats: VictoryStats = {
      enemy,
      difficulty: diff,
      slashesLanded: slashesLandedCount,
      totalQuestions: battleQuestions.length,
      correctCount,
      accuracyPercent,
      maxCombo,
      baseXp: baseXpTotal,
      accuracyBonusXp: correctCount * diff.xpReward,
      comboBonusXp: comboBonusTotal,
      timeBonusXp: timeBonusTotal,
      totalScore: score,
      rank: rankDetails.rank,
      reviewItems,
    };

    return (
      <>
        {bgmAudioElement}
        <VictoryScreen
          stats={victoryStats}
          onPlayAgain={() => handleStartGame(battleConfig)}
          onChangeEnemy={handleBackToLobby}
          onReturnToDojo={() => router.push('/student/play')}
        />
      </>
    );
  }

  // Active Battle Arena
  const currentQuestion = battleQuestions[questionIndex];

  return (
    <div className="min-h-screen bg-[#07070b] text-white flex flex-col justify-between p-2 sm:p-3 font-mono select-none overflow-x-hidden">
      {bgmAudioElement}
      <header className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-2 mb-2 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToLobby}
            className="px-3 py-1.5 rounded bg-zinc-900 border border-zinc-700 text-xs text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
          >
            ← FORFEIT MATCH
          </button>
          <span className="text-xs sm:text-sm font-bold text-red-400">
            SYNTAX SAMURAI // ACTIVE BATTLE DOJO
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleBgm}
            aria-label={isBgmMuted ? 'Unmute BGM' : 'Mute BGM'}
            className="px-2.5 py-1 rounded bg-zinc-900/90 border border-zinc-700/80 hover:border-zinc-500 text-xs font-mono flex items-center gap-1.5 text-zinc-300 hover:text-white transition-all shadow-sm"
          >
            {isBgmMuted ? (
              <>
                <span className="text-red-400">🔇</span>
                <span className="text-zinc-400">BGM: OFF</span>
              </>
            ) : (
              <>
                <span className="text-emerald-400 animate-pulse">🔊</span>
                <span className="text-emerald-300">BGM: ON</span>
              </>
            )}
          </button>
          <div className="text-xs text-zinc-400 hidden sm:block">
            KATANA BLADE ACTIVE • DRAG TO SLICE
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center w-full my-auto">
        {currentQuestion ? (
          <CodeArena
            key={currentQuestion.id}
            question={currentQuestion}
            enemy={enemy}
            difficulty={diff}
            questionIndex={questionIndex}
            totalQuestions={battleQuestions.length}
            score={score}
            onQuestionCompleted={handleQuestionCompleted}
            onForfeit={handleBackToLobby}
          />
        ) : (
          <div className="text-zinc-500">Loading trial scroll...</div>
        )}
      </main>

      <footer className="text-center text-[11px] text-zinc-600 border-t border-zinc-900/80 py-1.5 mt-2 flex-shrink-0">
        SYNTAX SAMURAI • EXPANSIVE BATTLE ARENA
      </footer>
    </div>
  );
}
