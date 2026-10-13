import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { PlaceholderCard } from '@/components/PlaceholderCard';
import { ShieldCheck, Sliders, Database, AlertTriangle } from 'lucide-react';

export default function AdminDashboardPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 pb-12">
      <Navbar role="admin" userName="Vikram Singh" />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 flex flex-col gap-8">
        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            System Administration
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Campus Platform Admin
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Manage XP economy rules, audit ledger integrity, and monitor campus engagement.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/faculty/award-xp"
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white text-xs font-semibold transition-all shrink-0"
              >
                Award XP
              </Link>
              <Link
                href="/admin/rules"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-rose-600/20 transition-all shrink-0"
              >
                <Sliders className="w-4 h-4" />
                <span>Manage XP Rules</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Placeholders for Admin Workflows */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Placeholder 1: xp_rules Manager */}
          <PlaceholderCard
            title="XP Rule Engine Manager"
            description="Control point values, base XP, extra XP, and daily frequency limits directly in the xp_rules database table without deploying code."
            phase="Coming in Phase 1 & 4"
            icon={Sliders}
            features={[
              'Live point configuration (ATTENDANCE: 10, DAILY_QUIZ: 15+5)',
              'Daily limit caps (PEER_HELP: 3/day)',
              'Enable/disable individual rules on the fly',
              'Audit logs of point value modifications'
            ]}
          />

          {/* Placeholder 2: Ledger Integrity & Anti-Gaming */}
          <PlaceholderCard
            title="Ledger Audit & Security"
            description="Monitor the immutable xp_events ledger to verify that the UNIQUE constraint on (student, action, ref) prevents duplicate payouts."
            phase="Coming in Phase 1 & 5"
            icon={Database}
            features={[
              'Ledger sum vs cached points reconciliation',
              'Detection of automated double-taps',
              'Anti-gaming heuristics and rate limit alerts',
              'Anonymous mode server verification'
            ]}
          />
        </div>

        {/* Core Rules Seed Preview Table */}
        <section
          aria-label="Configured XP rules"
          className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-400" />
              Initial XP Rules Table (`xp_rules` Database State)
            </h2>
            <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-semibold">
              Active in DB
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[11px] uppercase bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Action Type</th>
                  <th className="py-2.5 px-3">Base XP</th>
                  <th className="py-2.5 px-3">Extra XP</th>
                  <th className="py-2.5 px-3">Daily Limit</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                <tr>
                  <td className="py-2 px-3 font-medium text-white">ATTENDANCE</td>
                  <td className="py-2 px-3 text-indigo-300 font-semibold">10</td>
                  <td className="py-2 px-3">0</td>
                  <td className="py-2 px-3 text-slate-400">None</td>
                  <td className="py-2 px-3 text-emerald-400">Active</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium text-white">DAILY_QUIZ</td>
                  <td className="py-2 px-3 text-indigo-300 font-semibold">15</td>
                  <td className="py-2 px-3 text-emerald-300 font-semibold">+5/correct</td>
                  <td className="py-2 px-3 text-amber-300 font-semibold">1 / day</td>
                  <td className="py-2 px-3 text-emerald-400">Active</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium text-white">PEER_HELP</td>
                  <td className="py-2 px-3 text-indigo-300 font-semibold">15</td>
                  <td className="py-2 px-3">0</td>
                  <td className="py-2 px-3 text-amber-300 font-semibold">3 / day</td>
                  <td className="py-2 px-3 text-emerald-400">Active</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium text-white">ASSIGNMENT_ON_TIME</td>
                  <td className="py-2 px-3 text-indigo-300 font-semibold">20</td>
                  <td className="py-2 px-3">0</td>
                  <td className="py-2 px-3 text-slate-400">None</td>
                  <td className="py-2 px-3 text-emerald-400">Active</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium text-white">CLUB_ACTIVITY</td>
                  <td className="py-2 px-3 text-indigo-300 font-semibold">25</td>
                  <td className="py-2 px-3">0</td>
                  <td className="py-2 px-3 text-slate-400">None</td>
                  <td className="py-2 px-3 text-emerald-400">Active</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium text-white">STREAK_7_BONUS</td>
                  <td className="py-2 px-3 text-indigo-300 font-semibold">50</td>
                  <td className="py-2 px-3">0</td>
                  <td className="py-2 px-3 text-slate-400">None</td>
                  <td className="py-2 px-3 text-emerald-400">Active</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
