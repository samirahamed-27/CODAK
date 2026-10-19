'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LobbyScreen } from '@/components/games/syntax-samurai/LobbyScreen';
import { CodeArena } from '@/components/games/syntax-samurai/CodeArena';
import { LobbySelection, SyntaxQuestion } from '@/types/syntaxSamurai';
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

  const handleStartGame = (selection: LobbySelection) => {
    setBattleConfig(selection);
    const questions = getRandomQuestions(selection.enemy, selection.difficulty);
    setBattleQuestions(questions);
    setQuestionIndex(0);
    setScore(0);
    setCorrectCount(0);
    setGameState('battle');
  };

  const handleBackToLobby = () => {
    setGameState('lobby');
  };

  const handleQuestionCompleted = (isCorrect: boolean, xpGained: number) => {
    if (isCorrect) {
      setScore((prev) => prev + xpGained);
      setCorrectCount((prev) => prev + 1);
    }

    if (questionIndex + 1 < battleQuestions.length) {
      setQuestionIndex((prev) => prev + 1);
    } else {
      setGameState('victory');
    }
  };

  if (gameState === 'lobby' || !battleConfig) {
    return (
      <LobbyScreen
        onStartGame={handleStartGame}
        onBack={() => router.push('/student/play')}
      />
    );
  }

  const enemy = getEnemyProfile(battleConfig.enemy);
  const diff = getDifficultyConfig(battleConfig.difficulty);

  // Victory / Battle Results View
  if (gameState === 'victory') {
    return (
      <div className="min-h-screen bg-[#07070b] text-white flex flex-col justify-between p-6 font-mono select-none">
        <header className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackToLobby}
              className="px-3 py-1.5 rounded bg-zinc-900 border border-zinc-700 text-xs text-zinc-300 hover:text-white hover:border-zinc-500"
            >
              ← RETURN TO DOJO LOBBY
            </button>
            <span className="text-sm font-bold text-amber-400">
              SYNTAX SAMURAI // BATTLE DECREE
            </span>
          </div>
          <div className="text-xs text-zinc-400">
            {enemy.name.toUpperCase()} ({enemy.alias}) • {diff.label}
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center text-center max-w-xl mx-auto my-8 p-8 rounded-2xl bg-zinc-950/90 border border-zinc-800 shadow-2xl">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-4 border"
            style={{
              backgroundColor: `${enemy.themeColor}20`,
              borderColor: enemy.themeColor,
              boxShadow: `0 0 30px ${enemy.themeColor}40`,
            }}
          >
            <span>🏆</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-wider text-white mb-2">
            DOJO TRIAL COMPLETE!
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mb-6">
            The {enemy.alias} scrolls have been tested against your katana blade.
          </p>

          <div className="w-full grid grid-cols-3 gap-3 mb-6 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs">
            <div>
              <div className="text-zinc-500 text-[10px]">ACCURACY</div>
              <div className="font-bold text-base text-emerald-400">
                {correctCount} / {battleQuestions.length}
              </div>
            </div>
            <div>
              <div className="text-zinc-500 text-[10px]">DIFFICULTY</div>
              <div className="font-bold text-base" style={{ color: diff.badgeColor }}>
                {diff.label}
              </div>
            </div>
            <div>
              <div className="text-zinc-500 text-[10px]">TOTAL BOUNTY</div>
              <div className="font-bold text-base text-amber-400">+{score} XP</div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full">
            <button
              onClick={() => handleStartGame(battleConfig)}
              className="flex-1 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-white text-black hover:bg-zinc-200 transition-colors"
            >
              Play Again
            </button>
            <button
              onClick={handleBackToLobby}
              className="flex-1 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
            >
              Choose New Dojo
            </button>
          </div>
        </main>

        <footer className="text-center text-xs text-zinc-600 border-t border-zinc-900 pt-4">
          SYNTAX SAMURAI • BATTLE ENGINE VERIFIED
        </footer>
      </div>
    );
  }

  // Active Battle Arena
  const currentQuestion = battleQuestions[questionIndex];

  return (
    <div className="min-h-screen bg-[#07070b] text-white flex flex-col justify-between p-4 sm:p-6 font-mono select-none">
      <header className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToLobby}
            className="px-3 py-1.5 rounded bg-zinc-900 border border-zinc-700 text-xs text-zinc-300 hover:text-white hover:border-zinc-500"
          >
            ← FORFEIT MATCH
          </button>
          <span className="text-xs sm:text-sm font-bold text-red-400">
            SYNTAX SAMURAI // ACTIVE BATTLE DOJO
          </span>
        </div>
        <div className="text-xs text-zinc-400 hidden sm:block">
          KATANA BLADE ACTIVE • DRAG TO SLICE
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center">
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

      <footer className="text-center text-[11px] text-zinc-600 border-t border-zinc-900 pt-3 mt-4">
        SYNTAX SAMURAI • PHASE 2: KATANA CURSOR, BLADE TRAIL & HIT DETECTION ACTIVE
      </footer>
    </div>
  );
}
