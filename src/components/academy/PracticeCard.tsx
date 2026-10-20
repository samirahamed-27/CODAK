'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Code2, RotateCw, ArrowUpRight, Zap, Trophy, BookOpen, Layers } from 'lucide-react';
import Shuffle from '@/components/Shuffle';
import FlipCard from '@/components/FlipCard';

export function PracticeCard() {
  const [isFlipped, setIsFlipped] = useState(false);

  // Front Face: Curated Practice Problem Directory matching collectible card styling
  const frontContent = (
    <div className="w-full h-full p-4 flex flex-col justify-between select-none relative overflow-hidden rounded-[22px] border border-white/15 bg-black">
      {/* Background Graphic Grid & Ambient Glow */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800/40 via-zinc-950/80 to-black" />
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                              linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
        {/* Subtle dual gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
      </div>

      {/* Top Header Floating Badges */}
      <div className="flex items-center justify-between text-xs z-10 relative">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[10px] font-mono uppercase tracking-wider text-zinc-300 shadow-md">
          <Code2 className="w-3.5 h-3.5 text-white" />
          <span>Practice Drills</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[10px] font-mono text-zinc-200 shadow-md">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>15 Curated</span>
        </div>
      </div>

      {/* Center Holographic Code Emblem & Platform Showcase */}
      <div className="my-auto py-2 z-10 relative flex flex-col items-center justify-center">
        <div className="relative w-24 h-24 rounded-2xl bg-white/[0.04] border border-white/15 flex items-center justify-center shadow-2xl shadow-black/80 mb-3 group-hover:scale-105 transition-transform">
          {/* Terminal / Code Icon */}
          <span className="text-5xl select-none filter drop-shadow-[0_0_12px_rgba(255,255,255,0.35)]">
            ⚡
          </span>
          {/* Problem tier badge overlay */}
          <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-black/85 border border-white/20 text-white font-mono text-[9px] font-bold shadow-md">
            TOP-TIER
          </div>
        </div>

        {/* Platform Directory Chips */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono">
          <span className="px-2 py-0.5 rounded-md bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-semibold shadow-sm shadow-yellow-500/5" title="LeetCode problems">
            LeetCode
          </span>
          <span className="px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 font-semibold shadow-sm shadow-red-500/5" title="Codeforces problems">
            Codeforces
          </span>
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold shadow-sm shadow-emerald-500/5" title="HackerRank problems">
            HackerRank
          </span>
        </div>
      </div>

      {/* Bottom Floating Title & Directory Stats */}
      <div className="w-full text-center z-10 relative pb-1">
        <div className="drop-shadow-lg">
          <Shuffle
            key="Practice Directory"
            text="Curated Practice Directory"
            tag="h2"
            effect="slide"
            duration={0.35}
            stagger={0.03}
            triggerOnHover={true}
            color="#FFFFFF"
            accentColor="#D4D4D8"
            style={{ fontSize: '1.2rem', letterSpacing: '0.02em', fontWeight: 700 }}
          />
        </div>
        <p className="text-[10px] font-mono text-zinc-400 tracking-wider uppercase mt-0.5">
          Algorithmic Benchmarks & Drills
        </p>

        <div className="mt-2.5 flex items-center justify-center gap-2">
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-mono text-zinc-200 shadow-sm">
            <Trophy className="w-3 h-3 text-amber-400" />
            <span>Verifiable XP</span>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-mono text-zinc-200 shadow-sm">
            <Layers className="w-3 h-3 text-white" />
            <span>4 Topic Tracks</span>
          </span>
        </div>
      </div>
    </div>
  );

  // Back Face: Intel, Track Overview & Launch Practice Button
  const backContent = (
    <div className="w-full h-full p-4 flex flex-col justify-between relative overflow-hidden bg-gradient-to-b from-[#141416] via-[#0e0e11] to-[#070709] border border-white/10 rounded-[22px] text-left select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
            <Code2 className="w-3.5 h-3.5 text-white" />
            <span>Practice Intel</span>
          </h3>
          <p className="text-[10px] text-zinc-400 font-mono">Curated Algorithmic Directory</p>
        </div>
        <button
          type="button"
          data-no-flip
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setIsFlipped(false);
          }}
          className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-300 hover:text-white transition-all text-[10px] flex items-center gap-1 cursor-pointer"
          title="Flip back to front"
        >
          <RotateCw className="w-3 h-3" />
          <span className="font-mono">Front</span>
        </button>
      </div>

      {/* Directory Highlights Overview */}
      <div className="space-y-2 py-1.5 text-xs">
        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
          <div className="flex items-center gap-1.5 text-zinc-200 font-semibold text-[11px]">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Curated Benchmarks</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-snug">
            Tackle handpicked algorithmic challenges spanning Arrays, DP, Two Pointers, and Binary Trees with automated checks.
          </p>
        </div>

        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
          <div className="flex items-center gap-1.5 text-zinc-200 font-semibold text-[11px]">
            <Trophy className="w-3.5 h-3.5 text-white" />
            <span>Verifiable Ledger XP</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-snug">
            Solve problems on <span className="text-yellow-400 font-semibold">LeetCode</span>, <span className="text-red-400 font-semibold">Codeforces</span>, or <span className="text-emerald-400 font-semibold">HackerRank</span> and claim verified XP credited directly to your student ledger.
          </p>
        </div>

        <div className="px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/5 flex items-center gap-2 text-[10px] font-mono text-zinc-400">
          <BookOpen className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
          <span>Includes automated solution analysis & peer discussion</span>
        </div>
      </div>

      {/* Practice Action Buttons */}
      <div className="space-y-1.5 pt-1">
        <Link
          href="/student/practice"
          data-no-flip
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-white/10 active:scale-95 cursor-pointer select-none"
        >
          <Code2 className="w-4 h-4" />
          <span>Browse Practice Problems</span>
          <ArrowUpRight className="w-4 h-4" />
        </Link>

        <Link
          href="/student/learn"
          data-no-flip
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="w-full py-1 px-2 rounded-lg text-zinc-400 hover:text-white text-[10px] font-mono flex items-center justify-center gap-1 transition-colors cursor-pointer"
        >
          <span>Daily Quiz & Practice Mode (/student/learn)</span>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="w-full flex flex-col items-center justify-center">
      <FlipCard
        front={frontContent}
        back={backContent}
        flipped={isFlipped}
        onFlipChange={setIsFlipped}
        axis="y"
        flipOnClick={true}
        draggable={true}
        dragDistance={0}
        tilt={true}
        tiltMax={10}
        glare={true}
        glareOpacity={0.2}
        hoverScale={1.02}
        perspective={1100}
        stiffness={180}
        damping={20}
        width="100%"
        height={415}
        radius={22}
        background="#0c0c0e"
        color="#f5f5f5"
        shadow={true}
        shadowColor="#000000"
        shadowOpacity={0.5}
        ariaLabel="Curated Practice Problem Directory Flip Card"
      />
    </div>
  );
}

export default PracticeCard;
