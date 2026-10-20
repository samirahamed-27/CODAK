'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Download,
  Printer,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Trophy,
  Zap,
  Flame,
  Award,
  Users,
  Building2,
  BookOpen,
  Code2,
  Sword,
  Gamepad2,
  Lock,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Search,
  ExternalLink,
  ChevronDown,
  Check,
  KeyRound,
  Sliders,
  Database,
  ArrowLeft,
  Calendar,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';

export function WorkflowVisualHub() {
  const [selectedRole, setSelectedRole] = useState<'all' | 'student' | 'faculty' | 'admin' | 'security'>('all');
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAccount(id);
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-zinc-100 pb-24">
      <Navbar role="student" />

      {/* Top Action Bar */}
      <div className="sticky top-16 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-white">CODAK Platform Documentation</span>
            <span className="hidden sm:inline text-zinc-600">·</span>
            <span className="hidden sm:inline font-mono">v1.0 Production Verified</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print View</span>
            </button>

            <a
              href="/api/download/workflow"
              download="CODAK_Master_Feature_Workflow_Dossier.pdf"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold shadow-md shadow-white/10 transition-all"
            >
              <Download className="w-3.5 h-3.5 text-black" />
              <span>Download PDF Dossier</span>
            </a>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-10">
        {/* Hero Showcase Header */}
        <div className="flex flex-col gap-4 border-b border-zinc-800/80 pb-8">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-900 border border-zinc-800 text-zinc-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Interactive Platform Blueprint
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 font-mono">
              39 Routes Verified
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            CODAK Architecture & Feature Workflow
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 max-w-4xl leading-relaxed">
            An end-to-end visual specification of CODAK&apos;s gamified learning engine, cryptographic XP ledger,
            faculty academic governance pipelines, dedicated campus leaderboards, and anti-gaming security protocols.
          </p>

          {/* Quick Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {[
              { id: 'all', label: 'All Systems Overview' },
              { id: 'student', label: '🎓 Student Gamification' },
              { id: 'faculty', label: '🏛️ Faculty Governance' },
              { id: 'admin', label: '⚙️ Admin & Cryptography' },
              { id: 'security', label: '🛡️ Anti-Gaming Defenses' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedRole(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                  selectedRole === tab.id
                    ? 'bg-zinc-800 border-zinc-700 text-white shadow-sm'
                    : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* System Vital Stats Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Ledger Integrity
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400">Append-Only</span>
            </div>
            <span className="text-[11px] text-zinc-500 mt-1">Guarded by prevent_xp_events_tamper()</span>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Calendar Standard
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl sm:text-3xl font-black text-amber-400">Asia/Kolkata</span>
            </div>
            <span className="text-[11px] text-zinc-500 mt-1">IST Midnight cutoffs & weekly leagues</span>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Total Routes
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl sm:text-3xl font-black text-white">39 Routes</span>
            </div>
            <span className="text-[11px] text-zinc-500 mt-1">Next.js 16 Turbo + PPR static pages</span>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Anti-Gaming Rules
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl sm:text-3xl font-black text-purple-400">Zero Auto-Void</span>
            </div>
            <span className="text-[11px] text-zinc-500 mt-1">Statistical flags + Human written review</span>
          </div>
        </div>

        {/* VISUAL ARCHITECTURE BLUEPRINT */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-amber-400" />
              <span>Multi-Tier System Architecture Blueprint</span>
            </h2>
            <span className="text-xs text-zinc-500 font-mono">End-to-End Topology</span>
          </div>

          <div className="p-6 rounded-3xl bg-zinc-950 border border-zinc-800 flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Tier 1: Client Frontends */}
              <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Tier 1: Next.js 16 Client Portal
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono">
                    React 19
                  </span>
                </div>
                <div className="flex flex-col gap-2 font-mono text-xs">
                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 flex items-center justify-between">
                    <span>Student Hub & Quizzes</span>
                    <span className="text-[10px] text-zinc-500">/student/*</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 flex items-center justify-between">
                    <span>Faculty Governance</span>
                    <span className="text-[10px] text-zinc-500">/faculty/*</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 flex items-center justify-between">
                    <span>Admin Hub & Audits</span>
                    <span className="text-[10px] text-zinc-500">/admin/*</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 flex items-center justify-between">
                    <span>Syntax Samurai Dojo</span>
                    <span className="text-[10px] text-zinc-500">/student/play/*</span>
                  </div>
                </div>
              </div>

              {/* Tier 2: Realtime & Server Engine */}
              <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                    Tier 2: Application & Logic Engine
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950/40 border border-blue-800/40 text-blue-300 font-mono">
                    Server Actions
                  </span>
                </div>
                <div className="flex flex-col gap-2 font-mono text-xs">
                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 flex items-center justify-between">
                    <span>Quiz & Streak Engine</span>
                    <span className="text-[10px] text-blue-400">Pure IST Logic</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 flex items-center justify-between">
                    <span>Real-Time Duel Channels</span>
                    <span className="text-[10px] text-purple-400">WebSockets</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 flex items-center justify-between">
                    <span>Academic Leaderboard Action</span>
                    <span className="text-[10px] text-emerald-400">Average Metrics</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 flex items-center justify-between">
                    <span>Anomaly & Collusion Cron</span>
                    <span className="text-[10px] text-amber-400">Statistical Analysis</span>
                  </div>
                </div>
              </div>

              {/* Tier 3: PostgreSQL Immutable Ledger */}
              <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Tier 3: PostgreSQL Data & Ledger
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 font-mono">
                    Supabase DB
                  </span>
                </div>
                <div className="flex flex-col gap-2 font-mono text-xs">
                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 flex items-center justify-between">
                    <span>xp_events (Append-Only)</span>
                    <span className="text-[10px] text-emerald-400">Trigger Guarded</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 flex items-center justify-between">
                    <span>student_streaks & events</span>
                    <span className="text-[10px] text-zinc-500">Freeze Quota</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 flex items-center justify-between">
                    <span>staff_invites (Access Keys)</span>
                    <span className="text-[10px] text-amber-400">Cryptographic</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 flex items-center justify-between">
                    <span>xp_rules (Dynamic Config)</span>
                    <span className="text-[10px] text-zinc-500">Hot-Reload</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PIPELINE 1: STUDENT GAMIFICATION WORKFLOW */}
        {(selectedRole === 'all' || selectedRole === 'student') && (
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span>Student Gamification & Learning Workflow</span>
              </h2>
              <span className="text-xs text-zinc-500">6 Continuous Lifecycle Steps</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Step 1 */}
              <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-lg bg-zinc-800 text-white font-mono font-bold text-xs flex items-center justify-center">
                    01
                  </span>
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase">Onboarding</span>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-bold text-white">Campus Enrollment & Affiliation</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Student signs in via Google OAuth or Password, then links with their campus branch, department, and roll number.
                  </p>
                </div>
                <div className="text-[11px] font-mono text-zinc-500">Route: /select-campus</div>
              </div>

              {/* Step 2 */}
              <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-lg bg-zinc-800 text-white font-mono font-bold text-xs flex items-center justify-center">
                    02
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-400 uppercase">Daily Practice</span>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-bold text-white">Daily Concept Quiz (Strict ABCD)</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    5 curated questions with answers masked server-side until completion. Strict alphabetical order without confusing option shuffle.
                  </p>
                </div>
                <div className="text-[11px] font-mono text-zinc-500">Base 15 XP + 5 XP per correct answer</div>
              </div>

              {/* Step 3 */}
              <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-lg bg-zinc-800 text-white font-mono font-bold text-xs flex items-center justify-center">
                    03
                  </span>
                  <span className="text-[11px] font-semibold text-blue-400 uppercase">Coding Arena</span>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-bold text-white">Practice Arena & 40 XP Cap Guard</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Students solve problems on LeetCode/HackerRank, submit proof, and earn XP. Daily practice ceiling of 40 XP prevents bot farming.
                  </p>
                </div>
                <div className="text-[11px] font-mono text-zinc-500">Easy (10 XP) · Med (20 XP) · Hard (40 XP)</div>
              </div>

              {/* Step 4 */}
              <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-lg bg-zinc-800 text-white font-mono font-bold text-xs flex items-center justify-center">
                    04
                  </span>
                  <span className="text-[11px] font-semibold text-purple-400 uppercase">Real-Time</span>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-bold text-white">1v1 Synchronous Code Duels</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Real-time WebSocket channels match peers for rapid-fire coding duels with dual health bars, live speed telemetry, and win bonuses.
                  </p>
                </div>
                <div className="text-[11px] font-mono text-zinc-500">DUEL_WIN (25 XP) · DUEL_PART (10 XP)</div>
              </div>

              {/* Step 5 */}
              <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-lg bg-zinc-800 text-white font-mono font-bold text-xs flex items-center justify-center">
                    05
                  </span>
                  <span className="text-[11px] font-semibold text-amber-400 uppercase">Arcade Dojo</span>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-bold text-white">Syntax Samurai Katana Slicing</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Katana blade cursor with dynamic slice trail, pixel crumble animations, syntax bug slicing, and Code Review victory breakdowns.
                  </p>
                </div>
                <div className="text-[11px] font-mono text-zinc-500">Mini-Game: /student/play/syntax-samurai</div>
              </div>

              {/* Step 6 */}
              <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-lg bg-zinc-800 text-white font-mono font-bold text-xs flex items-center justify-center">
                    06
                  </span>
                  <span className="text-[11px] font-semibold text-orange-400 uppercase">Progression</span>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-bold text-white">Streaks, Freezes & 7-Day Bonus</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Midnight IST calendar boundaries evaluate daily streaks. Up to 2 monthly freezes preserve streaks, and Day 7 awards a 50 XP bonus.
                  </p>
                </div>
                <div className="text-[11px] font-mono text-zinc-500">STREAK_7_BONUS (50 XP Milestone)</div>
              </div>
            </div>
          </section>
        )}

        {/* PIPELINE 2: FACULTY GOVERNANCE WORKFLOW */}
        {(selectedRole === 'all' || selectedRole === 'faculty') && (
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-400" />
                <span>Faculty Academic Oversight & Curation Workflow</span>
              </h2>
              <span className="text-xs text-zinc-500">Academic Authority & Quality Control</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-lg bg-zinc-800 text-white font-mono font-bold text-xs flex items-center justify-center">
                    01
                  </span>
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase">Analytics</span>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-bold text-white">Topic Weakness & Quiet Students</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Faculty dashboard automatically diagnoses topics where cohort accuracy drops below 50% and identifies students inactive for &gt;3 days.
                  </p>
                </div>
                <div className="text-[11px] font-mono text-zinc-500">Proactive Early Academic Support</div>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-lg bg-zinc-800 text-white font-mono font-bold text-xs flex items-center justify-center">
                    02
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-400 uppercase">Question Bank</span>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-bold text-white">Question Curation & &quot;Approve All&quot;</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Submit curriculum questions with explanations and correct options. Fast &quot;Approve All&quot; batch modal enables one-click approval of pending queues.
                  </p>
                </div>
                <div className="text-[11px] font-mono text-zinc-500">Route: /faculty/questions</div>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-lg bg-zinc-800 text-white font-mono font-bold text-xs flex items-center justify-center">
                    03
                  </span>
                  <span className="text-[11px] font-semibold text-blue-400 uppercase">Manual XP</span>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-bold text-white">Manual Awards with Written Reason</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Award points for Attendance (10 XP), Assignments (20 XP), Peer Help (15 XP), or Hackathons (40 XP) with mandatory written academic reasons.
                  </p>
                </div>
                <div className="text-[11px] font-mono text-zinc-500">Route: /faculty/award-xp</div>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-lg bg-zinc-800 text-white font-mono font-bold text-xs flex items-center justify-center">
                    04
                  </span>
                  <span className="text-[11px] font-semibold text-purple-400 uppercase">Competitions</span>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-bold text-white">HackerRank Programming Contests</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Set up campus coding contests, link HackerRank challenge URLs, set competition windows, and allocate verified contest bonuses.
                  </p>
                </div>
                <div className="text-[11px] font-mono text-zinc-500">Route: /faculty/competitions</div>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-lg bg-zinc-800 text-white font-mono font-bold text-xs flex items-center justify-center">
                    05
                  </span>
                  <span className="text-[11px] font-semibold text-red-400 uppercase">Integrity</span>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-bold text-white">Academic Integrity &amp; Written Voids</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Review statistical flags (XP Spikes, Collusion, Win-Trading). Points are never auto-voided; faculty review and enter mandatory justifications.
                  </p>
                </div>
                <div className="text-[11px] font-mono text-zinc-500">Route: /faculty/flags</div>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-lg bg-zinc-800 text-white font-mono font-bold text-xs flex items-center justify-center">
                    06
                  </span>
                  <span className="text-[11px] font-semibold text-amber-400 uppercase">Rankings</span>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-bold text-white">Dedicated Campus Leaderboards</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Compare student rankings inside a campus by department/batch, and benchmark campus performance against other institutions by average XP.
                  </p>
                </div>
                <div className="text-[11px] font-mono text-zinc-500">Route: /faculty/leaderboard</div>
              </div>
            </div>
          </section>
        )}

        {/* PIPELINE 3: ADMIN & SECURITY ARCHITECTURE */}
        {(selectedRole === 'all' || selectedRole === 'admin' || selectedRole === 'security') && (
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>Admin Infrastructure & Cryptographic Security Workflow</span>
              </h2>
              <span className="text-xs text-zinc-500">System Oversight & Threat Mitigation</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-lg bg-zinc-800 text-white font-mono font-bold text-xs flex items-center justify-center">
                    01
                  </span>
                  <span className="text-[11px] font-semibold text-amber-400 uppercase">Access Keys</span>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-bold text-white">Cryptographic Staff Invites</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Generate single-use cryptographic access tokens. Track active, expired, and redeemed cards with exact user attribution.
                  </p>
                </div>
                <div className="text-[11px] font-mono text-zinc-500">Route: /admin/invites</div>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-lg bg-zinc-800 text-white font-mono font-bold text-xs flex items-center justify-center">
                    02
                  </span>
                  <span className="text-[11px] font-semibold text-blue-400 uppercase">Rules Engine</span>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-bold text-white">Hot-Reload Dynamic XP Rules</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Adjust base points, multipliers, and daily occurrence limits across all 15+ platform activities live without re-deploying code.
                  </p>
                </div>
                <div className="text-[11px] font-mono text-zinc-500">Route: /admin/rules</div>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-lg bg-zinc-800 text-white font-mono font-bold text-xs flex items-center justify-center">
                    03
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-400 uppercase">Ledger Audit</span>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-bold text-white">Append-Only Immutable Ledger Audit</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Inspect raw <code>xp_events</code>. Verify that database trigger <code>prevent_xp_events_tamper()</code> prevents unauthorized UPDATE or DELETE.
                  </p>
                </div>
                <div className="text-[11px] font-mono text-zinc-500">Route: /admin/audit</div>
              </div>
            </div>
          </section>
        )}

        {/* ATTACK-DEFENSE SECURITY MATRIX */}
        {(selectedRole === 'all' || selectedRole === 'security') && (
          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-red-400" />
              <span>Anti-Gaming Threat Model & Security Defenses</span>
            </h2>

            <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/70 text-zinc-400 font-semibold uppercase text-[11px]">
                    <th className="py-3.5 px-4 w-44">Attack Vector</th>
                    <th className="py-3.5 px-4">Exploit Description</th>
                    <th className="py-3.5 px-4">Mathematical / Database Defense</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono text-xs">
                  <tr className="hover:bg-zinc-900/40">
                    <td className="py-3.5 px-4 font-bold text-white">Replay Attack</td>
                    <td className="py-3.5 px-4 text-zinc-300">Double-tapping submit button or replaying network requests</td>
                    <td className="py-3.5 px-4 text-emerald-400">UNIQUE constraint unique_student_action_ref (pays 0 XP on duplicate)</td>
                    <td className="py-3.5 px-4 text-center text-emerald-400">PASSED ✓</td>
                  </tr>
                  <tr className="hover:bg-zinc-900/40">
                    <td className="py-3.5 px-4 font-bold text-white">Direct Client Tamper</td>
                    <td className="py-3.5 px-4 text-zinc-300">Student directly calling INSERT, UPDATE, DELETE via client</td>
                    <td className="py-3.5 px-4 text-emerald-400">RLS blocks client; prevent_xp_events_tamper() raises database exception</td>
                    <td className="py-3.5 px-4 text-center text-emerald-400">PASSED ✓</td>
                  </tr>
                  <tr className="hover:bg-zinc-900/40">
                    <td className="py-3.5 px-4 font-bold text-white">Streak Farming</td>
                    <td className="py-3.5 px-4 text-zinc-300">Submitting multiple quizzes on the same calendar day</td>
                    <td className="py-3.5 px-4 text-emerald-400">Asia/Kolkata date boundary ensures exactly +1 streak increment per day</td>
                    <td className="py-3.5 px-4 text-center text-emerald-400">PASSED ✓</td>
                  </tr>
                  <tr className="hover:bg-zinc-900/40">
                    <td className="py-3.5 px-4 font-bold text-white">Answer Collusion</td>
                    <td className="py-3.5 px-4 text-zinc-300">Pairs copying identical wrong answers simultaneously</td>
                    <td className="py-3.5 px-4 text-emerald-400">Statistical correlation engine flags &gt;80% shared wrong choices</td>
                    <td className="py-3.5 px-4 text-center text-emerald-400">PASSED ✓</td>
                  </tr>
                  <tr className="hover:bg-zinc-900/40">
                    <td className="py-3.5 px-4 font-bold text-white">Practice Farming</td>
                    <td className="py-3.5 px-4 text-zinc-300">Submitting infinite fake practice solution claims</td>
                    <td className="py-3.5 px-4 text-emerald-400">Hard 40 XP daily practice ceiling inside stored procedure award_xp</td>
                    <td className="py-3.5 px-4 text-center text-emerald-400">PASSED ✓</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* VERIFIED REVIEW CREDENTIALS CARD */}
        <section className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <KeyRound className="w-5 h-5 text-amber-400" />
              <span>Review &amp; Teacher Evaluation Credentials</span>
            </div>
            <span className="text-xs text-zinc-400 font-mono">Shared Password: Password123!</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">
                  Faculty Account
                </span>
                <span className="text-sm font-bold text-white mt-1">faculty@demo.edu</span>
                <span className="text-xs text-zinc-500">Associate Professor, Computer Science</span>
              </div>
              <button
                onClick={() => copyToClipboard('faculty@demo.edu', 'faculty')}
                className="w-full py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 transition-all flex items-center justify-center gap-1.5"
              >
                {copiedAccount === 'faculty' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null}
                <span>{copiedAccount === 'faculty' ? 'Copied' : 'Copy Email'}</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">
                  Admin Account
                </span>
                <span className="text-sm font-bold text-white mt-1">admin@demo.edu</span>
                <span className="text-xs text-zinc-500">System Administrator</span>
              </div>
              <button
                onClick={() => copyToClipboard('admin@demo.edu', 'admin')}
                className="w-full py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 transition-all flex items-center justify-center gap-1.5"
              >
                {copiedAccount === 'admin' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null}
                <span>{copiedAccount === 'admin' ? 'Copied' : 'Copy Email'}</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                  Student Account
                </span>
                <span className="text-sm font-bold text-white mt-1">student@demo.edu</span>
                <span className="text-xs text-zinc-500">Roll: DEMO-STU-01, Year 1</span>
              </div>
              <button
                onClick={() => copyToClipboard('student@demo.edu', 'student')}
                className="w-full py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 transition-all flex items-center justify-center gap-1.5"
              >
                {copiedAccount === 'student' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null}
                <span>{copiedAccount === 'student' ? 'Copied' : 'Copy Email'}</span>
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
