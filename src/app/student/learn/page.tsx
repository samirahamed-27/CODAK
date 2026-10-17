import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import { PlaceholderCard } from '@/components/PlaceholderCard';
import { BookOpen, Gamepad2, ArrowRight, Sparkles, Swords } from 'lucide-react';
import Shuffle from '@/components/Shuffle';

export default function StudentLearnPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#07080B] game-bg-grid pb-20">
      <Navbar role="student" userName="Aarav Sharma" />

      <main className="flex-1 max-w-md w-full mx-auto px-4 py-6 flex flex-col gap-4">
        <Shuffle
          text="LEARN AREA"
          tag="h1"
          effect="slide"
          duration={0.35}
          stagger={0.03}
          triggerOnHover={true}
          color="#FFFFFF"
          accentColor="#7DD3FC"
          style={{ fontSize: '1.25rem', letterSpacing: '0.05em' }}
        />
        <p className="text-xs text-slate-400 -mt-2 mb-1">
          Daily curriculum, concept quizzes, and verifiable academic quests.
        </p>

        {/* ================================================================
            FEATURED: CODEMONS RETRO ARCADE LOUNGE (play.html)
            ================================================================ */}
        <div className="relative group overflow-hidden rounded-2xl border border-sky-500/40 bg-gradient-to-b from-[#0e1726] via-[#0a0f1d] to-[#07080b] p-5 shadow-xl shadow-sky-950/50 hover:border-sky-400/80 transition-all duration-300">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-sky-500/15 rounded-full blur-3xl pointer-events-none group-hover:bg-sky-500/25 transition-all duration-500" />
          <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Header Row */}
          <div className="flex items-start justify-between gap-3 mb-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-sky-500/15 border border-sky-400/40 flex items-center justify-center text-sky-300 shadow-inner group-hover:scale-105 group-hover:bg-sky-500/25 transition-all">
                <Gamepad2 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded">
                    ARCADE GAME
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 px-2 py-0.5 rounded flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    READY TO PLAY
                  </span>
                </div>
                <h2 className="text-base font-bold text-white tracking-wide mt-1 flex items-center gap-1.5">
                  Codemons: Retro Cyber Arena
                </h2>
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-slate-300 leading-relaxed mb-3.5 relative z-10">
            Battle bugs. Learn to code. Pick your starter (<span className="text-amber-300 font-mono font-semibold">Pyrawr</span>, <span className="text-sky-300 font-mono font-semibold">Jaskull</span>, or <span className="text-emerald-300 font-mono font-semibold">Cplusaur</span>) and solve algorithmic CS questions to power your attacks!
          </p>

          {/* Feature Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mb-4 text-[11px] font-mono text-slate-400 relative z-10">
            <span className="bg-[#121929] border border-slate-700/70 px-2.5 py-1 rounded text-slate-300">
              🕹️ 8-Bit Pixel Game
            </span>
            <span className="bg-[#121929] border border-slate-700/70 px-2.5 py-1 rounded text-slate-300">
              🐍 Python / JS / C++
            </span>
            <span className="bg-amber-400/10 border border-amber-400/30 px-2.5 py-1 rounded text-amber-300 font-bold">
              +50 XP / Match
            </span>
          </div>

          {/* Action Link Buttons */}
          <div className="flex items-center gap-2.5 relative z-10">
            <a
              href="/play.html"
              id="link-arcade-play-html"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-300 hover:to-sky-400 text-slate-950 font-bold text-xs tracking-wider uppercase transition-all shadow-lg shadow-sky-500/25 active:scale-[0.98]"
            >
              <Gamepad2 className="w-4 h-4" />
              <span>Launch Play Lounge (play.html)</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </a>
            <a
              href="/index.html"
              id="link-instant-codemons"
              className="flex items-center justify-center px-3.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-200 text-xs font-mono font-medium transition-all"
              title="Jump directly to Codemons Game Arena"
            >
              <Swords className="w-4 h-4 text-amber-400" />
            </a>
          </div>
        </div>

        {/* Learning Quests Banner */}
        <div className="relative group overflow-hidden rounded-2xl border border-indigo-500/40 bg-gradient-to-b from-[#121629] via-[#0d1020] to-[#07080b] p-5 shadow-xl shadow-indigo-950/40 hover:border-indigo-400/80 transition-all duration-300">
          <div className="flex items-start justify-between gap-3 mb-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-inner">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400 bg-indigo-400/10 border border-indigo-400/30 px-2 py-0.5 rounded">
                  NEW IN PHASE 3
                </span>
                <h3 className="text-sm font-bold text-white mt-1">Learning Quests</h3>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-amber-300 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded">
              Up to +75 XP
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-4 relative z-10">
            Track weekly milestones, complete quiz goals, and earn unique ledger rewards verified on the server.
          </p>

          <Link
            href="/student/quests"
            id="link-student-quests"
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-lg shadow-indigo-500/25 active:scale-[0.98]"
          >
            <span>View Active Quests</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Practice Problems Directory Card */}
        <div className="relative group overflow-hidden rounded-2xl border border-sky-500/40 bg-gradient-to-b from-[#0b1424] via-[#090f1b] to-[#07080b] p-5 shadow-xl shadow-sky-950/40 hover:border-sky-400/80 transition-all duration-300">
          <div className="flex items-start justify-between gap-3 mb-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-400/40 flex items-center justify-center text-sky-300 shadow-inner">
                <BookOpen className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-400 bg-sky-400/10 border border-sky-400/30 px-2 py-0.5 rounded">
                  PRACTICE DIRECTORY
                </span>
                <h3 className="text-sm font-bold text-white mt-1">Curated Problem Links</h3>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-slate-300 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded">
              15 Problems
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-4 relative z-10">
            Handpicked algorithmic problems across Arrays, DP, and Trees on LeetCode, Codeforces, and HackerRank.
          </p>

          <Link
            href="/student/practice"
            id="link-student-practice"
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-lg shadow-sky-500/25 active:scale-[0.98]"
          >
            <span>Browse Practice Problems</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
