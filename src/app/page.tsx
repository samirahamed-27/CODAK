import React from 'react';
import Link from 'next/link';
import { Trophy, BookOpen, Gamepad2, ArrowRight } from 'lucide-react';
import Shuffle from '@/components/Shuffle';

export default function HomePage() {
  return (
    <div className="w-full min-h-screen flex flex-col justify-between">
      <main className="w-full max-w-5xl mx-auto p-6 sm:p-12 flex flex-col justify-between flex-1">
        {/* Top Bar */}
        <header className="flex items-center justify-between py-4 border-b border-[#1D2233]/60 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#10131E] border border-sky-400/40 flex items-center justify-center text-xl shadow-lg shadow-sky-500/10">
              🎮
            </div>
            <Shuffle
              text="GAMIFY"
              tag="span"
              effect="slide"
              duration={0.3}
              stagger={0.02}
              triggerOnHover={true}
              color="#FFFFFF"
              accentColor="#7DD3FC"
              style={{ fontSize: '1.25rem', letterSpacing: '0.06em' }}
            />
          </div>
          <Link
            href="/login"
            className="text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl bg-[#10131E] border border-[#1D2233] text-slate-200 hover:text-white hover:border-sky-400/50 hover:bg-[#141826] transition-all shadow-sm"
          >
            Sign In
          </Link>
        </header>

        {/* Hero Content */}
        <div className="py-12 sm:py-20 flex flex-col items-center text-center max-w-2xl mx-auto">
          <div className="mb-3">
            <Shuffle
              text="GAMIFY"
              tag="h1"
              effect="slide"
              shuffleDirection="right"
              duration={0.4}
              animationMode="evenodd"
              shuffleTimes={2}
              ease="power3.out"
              stagger={0.03}
              threshold={0.1}
              triggerOnce={true}
              triggerOnHover={true}
              hoverRadius={50}
              color="#FFFFFF"
              accentColor="#7DD3FC"
              style={{ fontSize: 'clamp(2.75rem, 7vw, 4.75rem)', letterSpacing: '0.06em' }}
            />
          </div>

          <div className="mb-6">
            <Shuffle
              text="NEXT-GEN LEARNING PLATFORM"
              tag="h2"
              effect="slide"
              shuffleDirection="down"
              duration={0.45}
              animationMode="center"
              shuffleTimes={2}
              ease="power3.out"
              stagger={0.025}
              threshold={0.1}
              triggerOnce={true}
              triggerOnHover={true}
              hoverRadius={60}
              color="#E2E8F0"
              accentColor="#7DD3FC"
              style={{ fontSize: 'clamp(1.1rem, 3vw, 2rem)', letterSpacing: '0.05em' }}
            />
          </div>

          <p className="text-slate-400 text-base sm:text-lg mb-8 leading-relaxed max-w-xl">
            Turn your daily lectures, quizzes, coding practice, and peer tutoring into XP, streaks, leagues, and campus battles.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-[#07080B] font-bold text-sm shadow-xl shadow-sky-500/25 border border-sky-300 transition-all active:scale-95"
            >
              Start Learning Now
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* 3 Pillars Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 my-8">
          <div className="p-6 rounded-2xl bg-[#10131E]/90 border border-[#1D2233] hover:border-sky-400/40 transition-colors shadow-lg shadow-black/40 text-left group">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="mb-2">
              <Shuffle
                text="1. LEARN"
                tag="h3"
                effect="slide"
                duration={0.3}
                shuffleTimes={1}
                stagger={0.03}
                triggerOnHover={true}
                color="#FFFFFF"
                accentColor="#7DD3FC"
                style={{ fontSize: '1.1rem', letterSpacing: '0.04em' }}
              />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Quick daily concept quizzes, interactive practice, and verified academic quests with instant explanations.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#10131E]/90 border border-[#1D2233] hover:border-sky-400/40 transition-colors shadow-lg shadow-black/40 text-left group">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-200 mb-4 group-hover:scale-105 transition-transform">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div className="mb-2">
              <Shuffle
                text="2. PLAY"
                tag="h3"
                effect="slide"
                duration={0.3}
                shuffleTimes={1}
                stagger={0.03}
                triggerOnHover={true}
                color="#FFFFFF"
                accentColor="#7DD3FC"
                style={{ fontSize: '1.1rem', letterSpacing: '0.04em' }}
              />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Head-to-head quiz duels and bite-sized practice. Fair matchmaking, zero negative points, and no public shaming.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#10131E]/90 border border-[#1D2233] hover:border-sky-400/40 transition-colors shadow-lg shadow-black/40 text-left group">
            <div className="w-10 h-10 rounded-xl bg-sky-400/10 border border-sky-400/20 flex items-center justify-center text-sky-300 mb-4 group-hover:scale-105 transition-transform">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="mb-2">
              <Shuffle
                text="3. COMPETE"
                tag="h3"
                effect="slide"
                duration={0.3}
                shuffleTimes={1}
                stagger={0.03}
                triggerOnHover={true}
                color="#FFFFFF"
                accentColor="#7DD3FC"
                style={{ fontSize: '1.1rem', letterSpacing: '0.04em' }}
              />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Weekly league tiers with Sunday resets, department leaderboards, and live team battles for campus glory.
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center py-6 border-t border-[#1D2233]/60 text-xs text-slate-500">
          Gamified Learning Platform • Timezone: Asia/Kolkata • Ledger-backed XP Engine
        </footer>
      </main>
    </div>
  );
}
