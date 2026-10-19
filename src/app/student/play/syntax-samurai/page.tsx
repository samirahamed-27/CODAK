'use client';

import React, { useState } from 'react';
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

  // Phase 5: Tracking Session Metrics & Review Items
  const [reviewItems, setReviewItems] = useState<QuestionReviewItem[]>([]);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [slashesLandedCount, setSlashesLandedCount] = useState<number>(0);
  const [timeBonusTotal, setTimeBonusTotal] = useState<number>(0);
  const [comboBonusTotal, setComboBonusTotal] = useState<number>(0);
  const [baseXpTotal, setBaseXpTotal] = useState<number>(0);

  const handleStartGame = (selection: LobbySelection) => {
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
  };

  const handleBackToLobby = () => {
    setGameState('lobby');
  };

  const handleQuestionCompleted = (
    isCorrect: boolean,
    xpGained: number,
    meta?: QuestionResultMeta
  ) => {
    const currentQ = battleQuestions[questionIndex];
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
      <VictoryScreen
        stats={victoryStats}
        onPlayAgain={() => handleStartGame(battleConfig)}
        onChangeEnemy={handleBackToLobby}
        onReturnToDojo={() => router.push('/student/play')}
      />
    );
  }

  // Active Battle Arena
  const currentQuestion = battleQuestions[questionIndex];

  return (
    <div className="min-h-screen bg-[#07070b] text-white flex flex-col justify-between p-2 sm:p-3 font-mono select-none overflow-x-hidden">
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
        <div className="text-xs text-zinc-400 hidden sm:block">
          KATANA BLADE ACTIVE • DRAG TO SLICE
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
