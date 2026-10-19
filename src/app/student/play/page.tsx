'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import Shuffle from '@/components/Shuffle';
import { LinearCard, ComponentItem } from '@/components/ui/linear-card';

const CODEMONS_BANNER = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
    <defs>
      <linearGradient id="bg1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0a0a0c"/>
        <stop offset="50%" stop-color="#141418"/>
        <stop offset="100%" stop-color="#000000"/>
      </linearGradient>
      <pattern id="grid1" width="30" height="30" patternUnits="userSpaceOnUse">
        <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
      </pattern>
      <radialGradient id="glow1" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.15)"/>
        <stop offset="100%" stop-color="transparent"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg1)"/>
    <rect width="100%" height="100%" fill="url(#grid1)"/>
    <circle cx="400" cy="225" r="180" fill="url(#glow1)"/>
    <rect x="350" y="165" width="100" height="100" rx="24" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
    <text x="400" y="230" text-anchor="middle" font-size="48" font-family="system-ui">👾</text>
    <text x="400" y="300" text-anchor="middle" fill="#ffffff" font-size="18" font-weight="bold" font-family="monospace" letter-spacing="4">CODEMONS ARENA</text>
    <text x="400" y="325" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="12" font-family="monospace">8-BIT ALGORITHMIC BATTLES</text>
  </svg>`
)}`;

const QUESTS_BANNER = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
    <defs>
      <linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0e0e12"/>
        <stop offset="50%" stop-color="#18181f"/>
        <stop offset="100%" stop-color="#050508"/>
      </linearGradient>
      <pattern id="grid2" width="25" height="25" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1" fill="rgba(255,255,255,0.08)"/>
      </pattern>
      <radialGradient id="glow2" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.12)"/>
        <stop offset="100%" stop-color="transparent"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg2)"/>
    <rect width="100%" height="100%" fill="url(#grid2)"/>
    <circle cx="400" cy="225" r="180" fill="url(#glow2)"/>
    <rect x="350" y="165" width="100" height="100" rx="24" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
    <text x="400" y="230" text-anchor="middle" font-size="48" font-family="system-ui">🏆</text>
    <text x="400" y="300" text-anchor="middle" fill="#ffffff" font-size="18" font-weight="bold" font-family="monospace" letter-spacing="4">LEARNING QUESTS</text>
    <text x="400" y="325" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="12" font-family="monospace">TIMED ACADEMIC MILESTONES</text>
  </svg>`
)}`;

const PRACTICE_BANNER = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
    <defs>
      <linearGradient id="bg3" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#07080a"/>
        <stop offset="50%" stop-color="#121318"/>
        <stop offset="100%" stop-color="#020305"/>
      </linearGradient>
      <pattern id="grid3" width="40" height="20" patternUnits="userSpaceOnUse">
        <path d="M 0 20 L 40 20 M 20 0 L 20 20" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
      </pattern>
      <radialGradient id="glow3" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.14)"/>
        <stop offset="100%" stop-color="transparent"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg3)"/>
    <rect width="100%" height="100%" fill="url(#grid3)"/>
    <circle cx="400" cy="225" r="180" fill="url(#glow3)"/>
    <rect x="350" y="165" width="100" height="100" rx="24" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
    <text x="400" y="230" text-anchor="middle" font-size="48" font-family="system-ui">⚡</text>
    <text x="400" y="300" text-anchor="middle" fill="#ffffff" font-size="18" font-weight="bold" font-family="monospace" letter-spacing="4">PRACTICE DRILLS</text>
    <text x="400" y="325" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="12" font-family="monospace">CURATED ALGORITHMIC PROBLEMS</text>
  </svg>`
)}`;

const playElements: ComponentItem[] = [
  {
    id: 1,
    url: {
      src: CODEMONS_BANNER,
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
      src: QUESTS_BANNER,
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
      src: PRACTICE_BANNER,
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
