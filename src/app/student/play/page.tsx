'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import Shuffle from '@/components/Shuffle';
import { LinearCard, ComponentItem } from '@/components/ui/linear-card';

const playElements: ComponentItem[] = [
  {
    id: 1,
    url: {
      src: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80',
    },
    title: 'Codemons: Retro Cyber Arena',
    subtitle: 'ARCADE GAME • 8-BIT CYBER BATTLE',
    description:
      'Battle algorithmic bugs and conquer compiler errors in our premier retro 8-bit cyber arena. Choose your elemental starter creature—Pyrawr (Python 🔥), Jaskull (JavaScript ⚡), or Cplusaur (C++ 🌿). Each attack round tests your algorithmic problem-solving: answer correctly to charge energy, trigger critical strikes, and defeat multi-tier bug bosses. Earn +50 XP and verifiable academic ledger progression for every victorious match!\n\n🖥️ Recommended to play on PC • Keep magnification around 65% for the best experience.',
    playAction: {
      label: 'Launch Play Lounge',
      href: '/play.html',
    },
    secondaryAction: {
      label: 'Direct Arena (/index.html)',
      href: '/index.html',
    },
  },
  {
    id: 2,
    url: {
      src: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=800&q=80',
    },
    title: 'Learning Quests & Milestones',
    subtitle: 'QUEST LOG • VERIFIABLE LEDGER',
    description:
      'Embark on time-locked academic quests and multi-tier learning milestones. Complete weekly quiz streaks, solve curated problem benchmarks, and earn unique ledger rewards authenticated directly on the server. Unlock rare pixel avatar cosmetics, bonus streak freezes, and season league XP multipliers.',
    playAction: {
      label: 'View Active Quests',
      href: '/student/quests',
    },
  },
  {
    id: 3,
    url: {
      src: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
    },
    title: 'Curated Practice Problem Directory',
    subtitle: 'PRACTICE DRILLS • 15 PROBLEMS',
    description:
      'Tackle handpicked algorithmic challenges spanning Arrays, Dynamic Programming, Two Pointers, and Binary Trees. Curated from LeetCode, Codeforces, and HackerRank, each problem features automated solution checks, detailed Big-O analysis, and peer discussion benchmarks.',
    playAction: {
      label: 'Browse Practice Problems',
      href: '/student/practice',
    },
  },
];

export default function StudentPlayPage() {
  return (
    <div className="min-h-screen flex flex-col bg-black game-bg-grid pb-24 text-slate-100">
      <Navbar role="student" />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 flex flex-col gap-6">
        <div>
          <Shuffle
            text="PLAY & ARCADE LOUNGE"
            tag="h1"
            effect="slide"
            duration={0.35}
            stagger={0.03}
            triggerOnHover={true}
            color="#FFFFFF"
            accentColor="#A1A1AA"
            style={{ fontSize: '1.5rem', letterSpacing: '0.05em' }}
          />
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl">
            Codemons retro cyber arena, algorithmic bug battles, starter monsters, weekly quests, and curated competitive practice arenas.
          </p>
        </div>

        {/* ================================================================
            LINEAR CARDS: PLAY EXPERIENCES & ARCADE LOUNGE
            ================================================================ */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <h2 className="text-xs font-mono font-bold tracking-wider text-zinc-300 uppercase">
                Interactive Play Arenas
              </h2>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">3 Experiences Available</span>
          </div>

          <LinearCard items={playElements} />
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
