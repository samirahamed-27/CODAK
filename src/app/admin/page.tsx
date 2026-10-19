import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { ShieldCheck, Sliders, Database, KeyRound } from 'lucide-react';

export default function AdminDashboardPage() {
  return (
    <div className="min-h-screen flex flex-col bg-black pb-12">
      <Navbar role="admin" userName="Vikram Singh" />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 flex flex-col gap-8">
        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/20 text-white mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            System Administration
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Campus Platform Admin
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Manage XP economy rules, audit ledger integrity, and monitor campus engagement.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/invites"
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-white text-xs font-semibold transition-all shrink-0"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Staff Invites</span>
              </Link>
              <Link
                href="/faculty/award-xp"
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-white text-xs font-semibold transition-all shrink-0"
              >
                Award XP
              </Link>
              <Link
                href="/admin/rules"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold shadow-lg shadow-white/10 transition-all shrink-0"
              >
                <Sliders className="w-4 h-4" />
                <span>Manage XP Rules</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Active Admin Modules */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Module 1: Live XP Rule Engine Manager */}
          <div className="p-6 rounded-2xl bg-[#0c0c0e] border border-white/15 hover:border-white/30 transition-all shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                  <Sliders className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 border border-white/20 text-white">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  Live • Operational
                </span>
              </div>

              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  XP Rule Engine Manager
                </h2>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Control point values, base XP, extra XP, and daily frequency limits directly in the `xp_rules` database table without deploying code.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/10">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
                  Active System Capabilities:
                </span>
                <ul className="space-y-1.5 text-xs text-zinc-300">
                  <li className="flex items-center gap-2">
                    <span className="text-white font-bold">✓</span>
                    <span>Live point configuration (Base XP, extra XP)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-white font-bold">✓</span>
                    <span>Daily limit caps (PEER_HELP, QUIZ, ASSIGNMENT)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-white font-bold">✓</span>
                    <span>Enable / disable individual rules on the fly</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-white font-bold">✓</span>
                    <span>Immutable audit logs of point value modifications</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-6">
              <Link
                href="/admin/rules"
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold shadow-lg shadow-white/10 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <span>Configure XP Rules</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Module 2: Live Ledger Audit & Security */}
          <div className="p-6 rounded-2xl bg-[#0c0c0e] border border-white/15 hover:border-white/30 transition-all shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                  <Database className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 border border-white/20 text-white">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  Live • Operational
                </span>
              </div>

              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Ledger Audit & Security Hub
                </h2>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Monitor the immutable `xp_events` ledger, verify UNIQUE constraints preventing duplicate payouts, and review automated anti-gaming flags.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/10">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
                  Active Security Controls:
                </span>
                <ul className="space-y-1.5 text-xs text-zinc-300">
                  <li className="flex items-center gap-2">
                    <span className="text-white font-bold">✓</span>
                    <span>Ledger sum vs cached points automated reconciliation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-white font-bold">✓</span>
                    <span>Detection and rejection of automated double-taps</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-white font-bold">✓</span>
                    <span>Anti-gaming heuristics and rate limit alerts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-white font-bold">✓</span>
                    <span>Server-side cryptographic anonymous mode</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-6">
              <Link
                href="/admin/audit"
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold shadow-lg shadow-white/10 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <span>Open Ledger Audit Hub</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Module 3: Staff Invites & Access Codes */}
          <div className="p-6 rounded-2xl bg-[#0c0c0e] border border-white/15 hover:border-white/30 transition-all shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                  <KeyRound className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active • Protected
                </span>
              </div>

              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Staff Invites & Access Codes
                </h2>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Generate cryptographically secure one-time invite codes for Faculty and Administrator onboarding without public role selection.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/10">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
                  Staff Access Controls:
                </span>
                <ul className="space-y-1.5 text-xs text-zinc-300">
                  <li className="flex items-center gap-2">
                    <span className="text-white font-bold">✓</span>
                    <span>Generate Faculty & Admin invite codes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-white font-bold">✓</span>
                    <span>One-time display copy box with warning</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-white font-bold">✓</span>
                    <span>Configurable max uses (1 or multi-use) & 7d expiry</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-white font-bold">✓</span>
                    <span>Track redemptions & revoke active codes</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-6">
              <Link
                href="/admin/invites"
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold shadow-lg shadow-white/10 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <span>Manage Staff Invites</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Core Rules Seed Preview Table */}
        <section
          aria-label="Configured XP rules"
          className="p-6 rounded-2xl bg-[#0c0c0e] border border-white/15"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
              <Database className="w-4 h-4 text-white" />
              Initial XP Rules Table (`xp_rules` Database State)
            </h2>
            <span className="text-[11px] text-white bg-white/10 px-2.5 py-0.5 rounded-full border border-white/20 font-semibold">
              Active in DB
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="text-[11px] uppercase bg-black/80 text-zinc-400 border-b border-white/10">
                <tr>
                  <th className="py-2.5 px-3">Action Type</th>
                  <th className="py-2.5 px-3">Base XP</th>
                  <th className="py-2.5 px-3">Extra XP</th>
                  <th className="py-2.5 px-3">Daily Limit</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr>
                  <td className="py-2 px-3 font-medium text-white">ATTENDANCE</td>
                  <td className="py-2 px-3 text-white font-semibold">10</td>
                  <td className="py-2 px-3">0</td>
                  <td className="py-2 px-3 text-zinc-400">None</td>
                  <td className="py-2 px-3 text-white">Active</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium text-white">DAILY_QUIZ</td>
                  <td className="py-2 px-3 text-white font-semibold">15</td>
                  <td className="py-2 px-3 text-zinc-300 font-semibold">+5/correct</td>
                  <td className="py-2 px-3 text-zinc-300 font-semibold">1 / day</td>
                  <td className="py-2 px-3 text-white">Active</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium text-white">PEER_HELP</td>
                  <td className="py-2 px-3 text-white font-semibold">15</td>
                  <td className="py-2 px-3">0</td>
                  <td className="py-2 px-3 text-zinc-300 font-semibold">3 / day</td>
                  <td className="py-2 px-3 text-white">Active</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium text-white">ASSIGNMENT_ON_TIME</td>
                  <td className="py-2 px-3 text-white font-semibold">20</td>
                  <td className="py-2 px-3">0</td>
                  <td className="py-2 px-3 text-zinc-400">None</td>
                  <td className="py-2 px-3 text-white">Active</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium text-white">CLUB_ACTIVITY</td>
                  <td className="py-2 px-3 text-white font-semibold">25</td>
                  <td className="py-2 px-3">0</td>
                  <td className="py-2 px-3 text-zinc-400">None</td>
                  <td className="py-2 px-3 text-white">Active</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium text-white">STREAK_7_BONUS</td>
                  <td className="py-2 px-3 text-white font-semibold">50</td>
                  <td className="py-2 px-3">0</td>
                  <td className="py-2 px-3 text-zinc-400">None</td>
                  <td className="py-2 px-3 text-white">Active</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
