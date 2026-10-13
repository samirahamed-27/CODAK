import React from 'react';
import Link from 'next/link';
import { Sparkles, Trophy, BookOpen, Gamepad2, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col justify-between p-6 sm:p-12 max-w-5xl mx-auto">
      {/* Top Bar */}
      <header className="flex items-center justify-between py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-xl shadow-lg shadow-indigo-500/25">
            🎮
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Gamify</span>
        </div>
        <Link
          href="/login"
          className="text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
        >
          Sign In
        </Link>
      </header>

      {/* Hero Content */}
      <div className="py-12 sm:py-20 flex flex-col items-center text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          MSOT Challenge #4: Gamified Learning
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white mb-6 leading-tight">
          Duolingo for <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">College</span>
        </h1>

        <p className="text-slate-400 text-base sm:text-lg mb-8 leading-relaxed max-w-xl">
          Turn your daily lectures, quizzes, coding practice, and peer tutoring into XP, streaks, leagues, and campus battles.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold text-sm shadow-xl shadow-indigo-500/25 transition-all active:scale-95"
          >
            Start Learning Now
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* 3 Pillars Preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 my-8">
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 text-left">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
            <BookOpen className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white mb-1.5">1. Learn</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Quick daily concept quizzes, interactive practice, and verified academic quests with instant explanations.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 text-left">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white mb-1.5">2. Play</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Head-to-head quiz duels and bite-sized practice. Fair matchmaking, zero negative points, and no public shaming.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 text-left">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
            <Trophy className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white mb-1.5">3. Compete</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Weekly league tiers with Sunday resets, department leaderboards, and live team battles for campus glory.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-6 border-t border-slate-900 text-xs text-slate-500">
        Gamified Learning Platform • Timezone: Asia/Kolkata • Ledger-backed XP Engine
      </footer>
    </main>
  );
}
