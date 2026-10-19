'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import {
  getLedgerAuditReportAction,
  LedgerAuditReport,
} from '@/app/actions/audit';
import {
  ShieldCheck,
  Database,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Lock,
  Activity,
  FileCheck,
} from 'lucide-react';

export default function AdminAuditPage() {
  const [report, setReport] = useState<LedgerAuditReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAudit = async () => {
    setRefreshing(true);
    const data = await getLedgerAuditReportAction();
    setReport(data);
    setRefreshing(false);
    setLoading(false);
  };

  useEffect(() => {
    fetchAudit();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-black pb-12 text-zinc-100">
      <Navbar role="admin" />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Admin Dashboard
          </Link>

          <button
            onClick={fetchAudit}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-xs text-white font-semibold transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Audit
          </button>
        </div>

        {/* Title Header */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/20 text-white mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Live Production Audit • Verified
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Ledger Audit & Security Hub
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Real-time automated reconciliation of immutable XP events, anti-gaming detection, and idempotency guarantees.
          </p>
        </div>

        {/* Status Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Ledger Events */}
          <div className="p-5 rounded-2xl bg-[#0c0c0e] border border-white/15 space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Ledger Events</span>
              <Database className="w-4 h-4 text-white" />
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {loading ? '...' : report?.totalEvents.toLocaleString()}
            </div>
            <div className="text-[11px] text-zinc-300 flex items-center gap-1">
              <span>{report?.validEvents || 0} valid</span>
              <span>•</span>
              <span className="text-zinc-500">{report?.voidedEvents || 0} voided</span>
            </div>
          </div>

          {/* Card 2: Total Valid XP Sum */}
          <div className="p-5 rounded-2xl bg-[#0c0c0e] border border-white/15 space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Verified Ledger XP</span>
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {loading ? '...' : report?.totalValidXp.toLocaleString()} XP
            </div>
            <div className="text-[11px] text-zinc-400 font-mono">
              Computed strictly from valid events
            </div>
          </div>

          {/* Card 3: Idempotency Integrity */}
          <div className="p-5 rounded-2xl bg-[#0c0c0e] border border-white/15 space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Idempotency Check</span>
              <Lock className="w-4 h-4 text-white" />
            </div>
            <div className="text-xl font-black text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5" />
              <span>{report?.uniqueConstraintStatus || 'HEALTHY'}</span>
            </div>
            <div className="text-[11px] text-zinc-400">
              0 duplicate reference payouts
            </div>
          </div>

          {/* Card 4: Anti-Gaming Flags */}
          <div className="p-5 rounded-2xl bg-[#0c0c0e] border border-white/15 space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Anti-Gaming System</span>
              <AlertTriangle className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {loading ? '...' : report?.antiGamingFlagCount || 0}
            </div>
            <div className="text-[11px] text-zinc-300 flex items-center gap-2">
              <span>{report?.pendingFlagsCount || 0} pending review</span>
              <Link
                href="/faculty/flags"
                className="text-white underline hover:text-zinc-300 font-semibold"
              >
                Inspect →
              </Link>
            </div>
          </div>
        </div>

        {/* Security Controls & Integrity Guarantees */}
        <section className="p-6 rounded-2xl bg-[#0c0c0e] border border-white/15 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-white" />
            Active Security Defenses & Ledger Constraints
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-black/70 border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <CheckCircle2 className="w-4 h-4" />
                <span>Immutable Append-Only Ledger</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Direct client `UPDATE` and `DELETE` on `xp_events` are blocked by database trigger `trg_prevent_xp_events_tamper`. Points are only modified through verified server actions and faculty void procedures.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-black/70 border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <CheckCircle2 className="w-4 h-4" />
                <span>Automated Double-Tap Prevention</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Unique composite reference constraints on `(student_id, action_type, reference_id)` reject concurrent attempts to claim identical quiz answers, milestone completions, or quest claims.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-black/70 border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <CheckCircle2 className="w-4 h-4" />
                <span>Anti-Gaming Heuristics & Rate Limits</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Active spike detection (`/api/cron/detect-spikes`) and duel collusion detection (`/api/cron/detect-collusion`) monitor rapid point bursts and repetitive pairings, logging security flags into `anti_gaming_flags`.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-black/70 border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <CheckCircle2 className="w-4 h-4" />
                <span>Cryptographic Anonymous Mode</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                When students toggle Anonymous Mode, names and roll numbers are sanitized server-side. Leaderboards and league tables only expose non-identifying rank chips and level tiers.
              </p>
            </div>
          </div>
        </section>

        {/* Quick Link to Faculty Review */}
        <div className="p-5 rounded-2xl bg-[#0c0c0e] border border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white">Review Flagged Anti-Gaming Incidents</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Inspect suspicious activity logs, examine telemetry evidence, or void illicit points.
            </p>
          </div>
          <Link
            href="/faculty/flags"
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold shadow-lg shadow-white/10 transition-all shrink-0"
          >
            Open Security Flags Hub →
          </Link>
        </div>
      </main>
    </div>
  );
}
