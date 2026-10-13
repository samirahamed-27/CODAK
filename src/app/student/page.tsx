import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import { Flame, Sparkles, ArrowRight, Gamepad2, Trophy, Zap, ShieldCheck } from 'lucide-react';

export default function StudentHomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 pb-20">
      <Navbar role="student" userName="Aarav Sharma" />

      <main className="flex-1 max-w-md w-full mx-auto px-4 py-6 flex flex-col gap-6">
        {/* DUOLINGO HERO: "ONE main thing: Today's quiz + your streak" */}
        <section
          aria-label="Daily loop hero card"
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900/60 via-slate-900 to-violet-950/70 border border-indigo-500/30 p-6 sm:p-7 shadow-2xl backdrop-blur-md"
        >
          {/* Background decorative glow */}
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Streak Indicator */}
          <div className="flex items-center justify-between mb-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-xs">
              <Flame className="w-4 h-4 fill-amber-500 text-amber-500 animate-pulse" />
              <span>3-Day Streak! 🔥</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Asia/Kolkata</span>
          </div>

          {/* Today's Quiz Feature */}
          <div className="mb-6">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400 block mb-1">
              Today's Challenge
            </span>
            <h2 className="text-2xl font-black text-white tracking-tight leading-snug mb-2">
              Daily Concept Quiz
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              5 quick questions on Data Structures. Keep your streak alive and earn up to{' '}
              <strong className="text-indigo-300">40 XP</strong>!
            </p>
          </div>

          {/* XP Reward Chip */}
          <div className="flex items-center gap-2 mb-6 text-xs text-slate-400">
            <div className="inline-flex items-center gap-1 text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              +15 Base XP
            </div>
            <span>+5 XP per correct answer</span>
          </div>

          {/* Big Launch Button */}
          <Link
            href="/student/learn"
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-[0.98] text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4 fill-slate-950" />
            <span>Start Today's Quiz</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </section>

        {/* QUICK LINKS: PLAY & COMPETE */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/student/play"
            className="group p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3 group-hover:scale-105 transition-transform">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white mb-0.5">Play Modes</h3>
              <p className="text-[11px] text-slate-400">Practice & Duels</p>
            </div>
          </Link>

          <Link
            href="/student/compete"
            className="group p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-105 transition-transform">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white mb-0.5">Compete</h3>
              <p className="text-[11px] text-slate-400">Weekly Leagues</p>
            </div>
          </Link>
        </div>

        {/* Fairness Guarantee Notice */}
        <section
          aria-label="Fairness pledge"
          className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex items-start gap-3"
        >
          <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-slate-400 leading-relaxed">
            <strong className="text-slate-300 font-semibold block mb-0.5">Fair & Inclusive Learning:</strong>
            XP is awarded strictly for verified learning. Game points never alter official college marks.
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
