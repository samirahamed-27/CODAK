'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LobbyScreen } from '@/components/games/syntax-samurai/LobbyScreen';
import { LobbySelection } from '@/types/syntaxSamurai';
import { getEnemyProfile, getDifficultyConfig, getQuestionsByFilter } from '@/data/syntaxSamuraiQuestions';

export default function SyntaxSamuraiPage() {
  const router = useRouter();
  const [gameState, setGameState] = useState<'lobby' | 'battle'>('lobby');
  const [battleConfig, setBattleConfig] = useState<LobbySelection | null>(null);

  const handleStartGame = (selection: LobbySelection) => {
    setBattleConfig(selection);
    setGameState('battle');
  };

  const handleBackToLobby = () => {
    setGameState('lobby');
  };

  if (gameState === 'lobby' || !battleConfig) {
    return (
      <LobbyScreen
        onStartGame={handleStartGame}
        onBack={() => router.push('/student/play')}
      />
    );
  }

  // Phase 1 Transition: Battle Canvas Standby Viewport
  const enemy = getEnemyProfile(battleConfig.enemy);
  const diff = getDifficultyConfig(battleConfig.difficulty);
  const questions = getQuestionsByFilter(battleConfig.enemy, battleConfig.difficulty);

  return (
    <div className="min-h-screen bg-[#07070b] text-white flex flex-col justify-between p-6 font-mono select-none">
      <header className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToLobby}
            className="px-3 py-1.5 rounded bg-zinc-900 border border-zinc-700 text-xs text-zinc-300 hover:text-white hover:border-zinc-500"
          >
            ← BACK TO DOJO LOBBY
          </button>
          <span className="text-sm font-bold text-red-500">SYNTAX SAMURAI // BATTLE CANVAS READY</span>
        </div>
        <div className="text-xs text-zinc-400">
          MATCH: <span className="text-white font-bold">{enemy.name.toUpperCase()}</span> ({enemy.alias}) •{' '}
          <span style={{ color: diff.badgeColor }}>{diff.label}</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center max-w-2xl mx-auto my-8 p-8 rounded-2xl bg-zinc-950/80 border border-zinc-800 shadow-2xl">
        <div
          className="w-24 h-24 rounded-2xl flex items-center justify-center text-5xl mb-4 border"
          style={{
            backgroundColor: `${enemy.themeColor}20`,
            borderColor: enemy.themeColor,
            boxShadow: `0 0 30px ${enemy.themeColor}40`,
          }}
        >
          {enemy.avatarIcon}
        </div>

        <h1 className="text-3xl font-black tracking-wider text-white mb-2">
          {enemy.name.toUpperCase()} {enemy.kanji}
        </h1>
        <p className="text-sm text-zinc-400 mb-6 max-w-md">
          {enemy.description}
        </p>

        <div className="w-full grid grid-cols-3 gap-3 mb-6 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs">
          <div>
            <div className="text-zinc-500 text-[10px]">DIFFICULTY</div>
            <div className="font-bold text-sm" style={{ color: diff.badgeColor }}>
              {diff.label}
            </div>
          </div>
          <div>
            <div className="text-zinc-500 text-[10px]">SCROLLS LOADED</div>
            <div className="font-bold text-sm text-white">{questions.length} Questions</div>
          </div>
          <div>
            <div className="text-zinc-500 text-[10px]">BOUNTY</div>
            <div className="font-bold text-sm text-amber-400">+{diff.xpReward} XP</div>
          </div>
        </div>

        <div className="p-3 rounded bg-zinc-900/90 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Phase 1 Complete: Lobby & Data Model loaded with {questions.length} curated questions.</span>
        </div>

        <button
          onClick={handleBackToLobby}
          className="px-6 py-3 rounded-lg font-bold text-xs tracking-wider uppercase bg-white text-black hover:bg-zinc-200 transition-colors"
        >
          Return to Lobby Selection
        </button>
      </main>

      <footer className="text-center text-xs text-zinc-600 border-t border-zinc-900 pt-4">
        SYNTAX SAMURAI • PHASE 1 DATA MODEL & LOBBY VERIFIED
      </footer>
    </div>
  );
}
