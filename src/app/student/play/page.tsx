'use client';

import React from 'react';
import Link from 'next/link';
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
      'Battle algorithmic bugs and conquer compiler errors in our premier retro 8-bit cyber arena. Choose your elemental starter creature—Pyrawr (Python 🔥), Jaskull (JavaScript ⚡), or Cplusaur (C++ 🌿). Each attack round tests your algorithmic problem-solving: answer correctly to charge energy, trigger critical strikes, and defeat multi-tier bug bosses. Earn +50 XP and verifiable academic ledger progression for every victorious match!',
    tags: ['8BitPixelGame', 'Codemons', 'Python', 'JavaScript', 'Cplusplus', '+50XP'],
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
    tags: ['ActiveQuests', 'WeeklyMilestones', 'LedgerRewards', 'XPMultipliers', 'UpTo+75XP'],
    playAction: {
      label: 'View Active Quests',
      href: '/student/quests',
    },
  },
  {
    id: 3,
    url: {
      src: 'https://images.unsplash.com/photo-1516116211227-bbc042971c08?auto=format&fit=crop&w=800&q=80',
    },
    title: 'Curated Practice Problem Directory',
    subtitle: 'PRACTICE DRILLS • 15 PROBLEMS',
    description:
      'Tackle handpicked algorithmic challenges spanning Arrays, Dynamic Programming, Two Pointers, and Binary Trees. Curated from LeetCode, Codeforces, and HackerRank, each problem features automated solution checks, detailed Big-O analysis, and peer discussion benchmarks.',
    tags: ['PracticeDirectory', 'LeetCode', 'Codeforces', 'HackerRank', '15Problems'],
    playAction: {
      label: 'Browse Practice Problems',
      href: '/student/practice',
    },
  },
];

export default function StudentPlayPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#07080B] game-bg-grid pb-24 text-slate-100">
      <Navbar role="student" userName="Aarav Sharma" />

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
            accentColor="#7DD3FC"
            style={{ fontSize: '1.5rem', letterSpacing: '0.05em' }}
          />
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Codemons retro cyber arena, algorithmic bug battles, starter monsters, weekly quests, and curated competitive practice arenas. Click any card to view detailed lore and launch the game.
          </p>
        </div>

        {/* ================================================================
            LINEAR CARDS: PLAY EXPERIENCES & ARCADE LOUNGE
            ================================================================ */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-xs font-mono font-bold tracking-wider text-slate-300 uppercase">
                Interactive Play Arenas (Click to Expand)
              </h2>
            </div>
            <span className="text-[11px] font-mono text-emerald-400/80">3 Experiences Available</span>
          </div>

          <LinearCard items={playElements} />
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
