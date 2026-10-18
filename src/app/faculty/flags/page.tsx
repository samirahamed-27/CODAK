'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import {
  getFlagsAction,
  reviewFlagAction,
  voidFlaggedXpAction,
  FlagItem,
} from '@/app/actions/flags';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Trash2,
  Filter,
  RefreshCw,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Zap,
  Users,
  Swords,
  Timer,
  Info,
} from 'lucide-react';

export default function FacultyFlagsPage() {
  const [flags, setFlags] = useState<FlagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [kindFilter, setKindFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  // Expanded evidence map
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  // Action modals
  const [selectedFlagForReview, setSelectedFlagForReview] = useState<FlagItem | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'reviewed' | 'dismissed' | 'confirmed'>('reviewed');
  const [reviewNote, setReviewNote] = useState('');

  const [selectedFlagForVoid, setSelectedFlagForVoid] = useState<FlagItem | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidMessage, setVoidMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [isPending, startTransition] = useTransition();

  const fetchFlags = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getFlagsAction({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        kind: kindFilter !== 'all' ? kindFilter : undefined,
      });

      if (!res.success) {
        setError(res.error || 'Failed to fetch flags.');
      } else {
        setFlags(res.flags);
      }
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred while loading flags.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, [statusFilter, kindFilter]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFlagForReview) return;

    startTransition(async () => {
      const res = await reviewFlagAction({
        flagId: selectedFlagForReview.id,
        status: reviewStatus,
        reviewNote: reviewNote.trim() || undefined,
      });

      if (res.success) {
        setSelectedFlagForReview(null);
        setReviewNote('');
        fetchFlags();
      } else {
        alert(res.error || 'Failed to update flag review.');
      }
    });
  };

  const handleVoidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFlagForVoid) return;

    if (!voidReason.trim() || voidReason.trim().length < 5) {
      setVoidMessage({
        type: 'error',
        text: 'A mandatory written reason (minimum 5 characters) is required to void XP.',
      });
      return;
    }

    startTransition(async () => {
      const res = await voidFlaggedXpAction({
        flagId: selectedFlagForVoid.id,
        reason: voidReason.trim(),
      });

      if (res.success) {
        setVoidMessage({
          type: 'success',
          text: `Successfully soft-voided ${res.voidedCount} XP event(s). Ledger updated and audit log saved.`,
        });
        setTimeout(() => {
          setSelectedFlagForVoid(null);
          setVoidReason('');
          setVoidMessage(null);
          fetchFlags();
        }, 1500);
      } else {
        setVoidMessage({
          type: 'error',
          text: res.error || 'Failed to void XP.',
        });
      }
    });
  };

  // Severity filter application on client
  const filteredFlags = flags.filter((f) => {
    if (severityFilter !== 'all' && f.severity !== severityFilter) return false;
    return true;
  });

  const openCount = flags.filter((f) => f.status === 'open').length;
  const highSevCount = flags.filter((f) => f.severity === 'high' || f.severity === 'critical').length;
  const spikeCount = flags.filter((f) => f.kind === 'spike').length;
  const collusionCount = flags.filter((f) => f.kind === 'answer_sharing' || f.kind === 'win_trading').length;

  return (
    <div className="min-h-screen flex flex-col bg-black pb-20 text-zinc-100">
      <Navbar role="faculty" userName="Faculty Staff" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link
                href="/faculty"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Faculty Dashboard
              </Link>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-900 border border-zinc-800 text-zinc-300 mb-2">
              <ShieldAlert className="w-3.5 h-3.5 text-white" />
              Academic Integrity System (Phase 5)
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Anti-Gaming & Integrity Flags
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Autonomous statistical detection flags for faculty review. XP is never auto-voided. Faculty review with written reason is required.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchFlags()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Open Flags
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{openCount}</span>
              <span className="text-xs text-zinc-500">pending review</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              High / Critical
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{highSevCount}</span>
              <span className="text-xs text-zinc-500">require attention</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              XP Spikes
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{spikeCount}</span>
              <span className="text-xs text-zinc-500">&gt; 3x baseline</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Collusion Flags
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{collusionCount}</span>
              <span className="text-xs text-zinc-500">sharing & win-trading</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
              <Filter className="w-3.5 h-3.5 text-zinc-300" />
              <span>Filters:</span>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-white"
            >
              <option value="all">Status: All</option>
              <option value="open">Open (Unreviewed)</option>
              <option value="reviewed">Reviewed</option>
              <option value="confirmed">Confirmed (Action Taken)</option>
              <option value="dismissed">Dismissed (False Positive)</option>
            </select>

            {/* Kind Filter */}
            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-white"
            >
              <option value="all">Detection Type: All</option>
              <option value="spike">XP Spikes</option>
              <option value="answer_sharing">Answer Sharing</option>
              <option value="win_trading">Duel Win-Trading</option>
              <option value="rate_limit">Rate Limit Exceeded</option>
            </select>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-white"
            >
              <option value="all">Severity: All</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="text-xs text-zinc-400">
            Showing <strong className="text-white">{filteredFlags.length}</strong> flags
          </div>
        </div>

        {/* Flags List / Table */}
        {error && (
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-white" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 text-white animate-spin" />
            <p className="text-xs text-zinc-400">Loading anti-gaming flags...</p>
          </div>
        ) : filteredFlags.length === 0 ? (
          <div className="p-12 rounded-2xl bg-zinc-900/20 border border-zinc-800 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white">No Matching Flags Found</h3>
            <p className="text-xs text-zinc-400 max-w-sm">
              All academic telemetry is clean or no detections match the selected filter criteria.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredFlags.map((flag) => {
              const isExpanded = !!expandedIds[flag.id];

              const getKindIcon = () => {
                switch (flag.kind) {
                  case 'spike':
                    return <Zap className="w-3.5 h-3.5 text-white" />;
                  case 'answer_sharing':
                    return <Users className="w-3.5 h-3.5 text-zinc-300" />;
                  case 'win_trading':
                    return <Swords className="w-3.5 h-3.5 text-zinc-300" />;
                  case 'rate_limit':
                    return <Timer className="w-3.5 h-3.5 text-white" />;
                  default:
                    return <AlertTriangle className="w-3.5 h-3.5 text-zinc-400" />;
                }
              };

              const getSeverityBadge = () => {
                switch (flag.severity) {
                  case 'critical':
                    return (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white text-black border border-white">
                        Critical
                      </span>
                    );
                  case 'high':
                    return (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-200 text-black border border-zinc-300">
                        High
                      </span>
                    );
                  case 'medium':
                    return (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-200 border border-zinc-700">
                        Medium
                      </span>
                    );
                  default:
                    return (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-900 text-zinc-400 border border-zinc-800">
                        Low
                      </span>
                    );
                }
              };

              const getStatusBadge = () => {
                switch (flag.status) {
                  case 'open':
                    return (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-white border border-zinc-700">
                        Open
                      </span>
                    );
                  case 'reviewed':
                    return (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-900 text-zinc-300 border border-zinc-700">
                        Reviewed
                      </span>
                    );
                  case 'confirmed':
                    return (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-200 border border-zinc-600">
                        Confirmed (Voided)
                      </span>
                    );
                  case 'dismissed':
                    return (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-950 text-zinc-500 border border-zinc-800">
                        Dismissed
                      </span>
                    );
                }
              };

              return (
                <div
                  key={flag.id}
                  className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col gap-3"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Left: Badges, Kind, Student */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black border border-zinc-800 text-xs font-semibold text-zinc-200">
                        {getKindIcon()}
                        <span className="capitalize">{flag.kind.replace('_', ' ')}</span>
                      </div>
                      {getSeverityBadge()}
                      {getStatusBadge()}

                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-white">{flag.studentName}</span>
                        {flag.studentCampus && (
                          <span className="text-[10px] font-normal text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">
                            {flag.studentCampus}
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-zinc-400 bg-black px-1.5 py-0.5 rounded border border-zinc-800">
                          {flag.studentRoll}
                        </span>

                        {flag.secondStudentId && (
                          <>
                            <span className="text-zinc-500 font-semibold text-[10px]">COLLUDING WITH</span>
                            <span className="font-bold text-white">{flag.secondStudentName || 'Student B'}</span>
                            {flag.secondStudentCampus && (
                              <span className="text-[10px] font-normal text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">
                                {flag.secondStudentCampus}
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-zinc-400 bg-black px-1.5 py-0.5 rounded border border-zinc-800">
                              {flag.secondStudentRoll || 'N/A'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right: Date and Action Buttons */}
                    <div className="flex items-center gap-2 self-end md:self-auto">
                      <button
                        onClick={() => toggleExpand(flag.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Evidence</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
                      </button>

                      {flag.status === 'open' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedFlagForReview(flag);
                              setReviewStatus('reviewed');
                              setReviewNote('');
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Review</span>
                          </button>

                          <button
                            onClick={() => {
                              setSelectedFlagForReview(flag);
                              setReviewStatus('dismissed');
                              setReviewNote('False positive / legitimate collaboration');
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold transition-all"
                          >
                            <XCircle className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Dismiss</span>
                          </button>

                          <button
                            onClick={() => {
                              setSelectedFlagForVoid(flag);
                              setVoidReason('');
                              setVoidMessage(null);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600 text-xs font-bold transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Void XP</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Summary row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                    <div>
                      Window:{' '}
                      <span className="text-slate-300 font-mono">
                        {new Date(flag.windowStart).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Asia/Kolkata',
                        })}{' '}
                        -{' '}
                        {new Date(flag.windowEnd).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Asia/Kolkata',
                        })}
                      </span>
                    </div>

                    {flag.reviewedAt && (
                      <div>
                        Reviewed:{' '}
                        <span className="text-slate-300">
                          {new Date(flag.reviewedAt).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            timeZone: 'Asia/Kolkata',
                          })}
                        </span>
                        {flag.reviewNote && <span className="italic text-slate-400 ml-1">({flag.reviewNote})</span>}
                      </div>
                    )}
                  </div>

                  {/* Collapsible Evidence Panel */}
                  {isExpanded && (
                    <div className="mt-2 p-4 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-indigo-400" />
                          Cryptographic & Statistical Evidence
                        </span>
                      </div>

                      {/* Tailored evidence view based on kind */}
                      {flag.kind === 'spike' && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                            <span className="text-[10px] text-slate-400 block">Today's XP</span>
                            <strong className="text-purple-300 text-sm font-mono font-bold">
                              {flag.evidence.today_xp} XP
                            </strong>
                          </div>
                          <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                            <span className="text-[10px] text-slate-400 block">14-Day Baseline Avg</span>
                            <strong className="text-slate-300 text-sm font-mono font-bold">
                              {flag.evidence.baseline_avg} XP/day
                            </strong>
                          </div>
                          <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                            <span className="text-[10px] text-slate-400 block">Spike Ratio</span>
                            <strong className="text-amber-400 text-sm font-mono font-bold">
                              {flag.evidence.ratio}x average
                            </strong>
                          </div>
                          <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                            <span className="text-[10px] text-slate-400 block">Baseline Active Days</span>
                            <strong className="text-slate-300 text-sm font-mono font-bold">
                              {flag.evidence.baseline_active_days} days
                            </strong>
                          </div>
                        </div>
                      )}

                      {flag.kind === 'answer_sharing' && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                            <span className="text-[10px] text-slate-400 block">Common Questions</span>
                            <strong className="text-white text-sm font-mono font-bold">
                              {flag.evidence.common_questions_count}
                            </strong>
                          </div>
                          <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                            <span className="text-[10px] text-slate-400 block">Shared WRONG Choices</span>
                            <strong className="text-rose-400 text-sm font-mono font-bold">
                              {flag.evidence.shared_wrong_count}
                            </strong>
                          </div>
                          <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                            <span className="text-[10px] text-slate-400 block">Wrong Match Ratio</span>
                            <strong className="text-amber-400 text-sm font-mono font-bold">
                              {((flag.evidence.wrong_match_ratio || 0) * 100).toFixed(0)}%
                            </strong>
                          </div>
                          <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                            <span className="text-[10px] text-slate-400 block">Max Submission Delta</span>
                            <strong className="text-slate-300 text-sm font-mono font-bold">
                              &le; {flag.evidence.time_delta_seconds_limit || 120}s
                            </strong>
                          </div>
                        </div>
                      )}

                      {flag.kind === 'win_trading' && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                            <span className="text-[10px] text-slate-400 block">Total Duels in 7d</span>
                            <strong className="text-white text-sm font-mono font-bold">
                              {flag.evidence.total_duels} duels
                            </strong>
                          </div>
                          <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                            <span className="text-[10px] text-slate-400 block">Student A Wins</span>
                            <strong className="text-indigo-400 text-sm font-mono font-bold">
                              {flag.evidence.student_a_wins}
                            </strong>
                          </div>
                          <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                            <span className="text-[10px] text-slate-400 block">Student B Wins</span>
                            <strong className="text-purple-400 text-sm font-mono font-bold">
                              {flag.evidence.student_b_wins}
                            </strong>
                          </div>
                          <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                            <span className="text-[10px] text-slate-400 block">One-Sided Ratio</span>
                            <strong className="text-amber-400 text-sm font-mono font-bold">
                              {((flag.evidence.one_sided_ratio || 0) * 100).toFixed(0)}%
                            </strong>
                          </div>
                        </div>
                      )}

                      {/* Raw JSON viewer */}
                      <pre className="p-3 rounded bg-black/60 text-[10px] text-slate-300 font-mono overflow-x-auto max-h-48 border border-slate-800/80">
                        {JSON.stringify(flag.evidence, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Review / Dismiss Flag */}
        {selectedFlagForReview && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 flex flex-col gap-4 shadow-2xl">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                Review Anti-Gaming Flag
              </h3>

              <p className="text-xs text-slate-400 leading-relaxed">
                Update the status for student{' '}
                <strong className="text-white">{selectedFlagForReview.studentName}</strong> (
                <span className="font-mono text-slate-300">{selectedFlagForReview.studentRoll}</span>).
              </p>

              <form onSubmit={handleReviewSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Select New Status
                  </label>
                  <select
                    value={reviewStatus}
                    onChange={(e: any) => setReviewStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="reviewed">Mark as Reviewed (Investigating)</option>
                    <option value="dismissed">Dismiss (False Positive / Inconclusive)</option>
                    <option value="confirmed">Confirm (Violation Verified)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Review Note / Faculty Comment
                  </label>
                  <textarea
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Enter review findings or justification..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedFlagForReview(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                  >
                    {isPending ? 'Saving...' : 'Save Review'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Void XP with Written Reason */}
        {selectedFlagForVoid && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-rose-900/40 rounded-2xl max-w-lg w-full p-6 flex flex-col gap-4 shadow-2xl">
              <div className="flex items-center gap-2.5 text-rose-400">
                <Trash2 className="w-5 h-5 shrink-0" />
                <h3 className="text-base font-bold text-white">Void XP with Mandatory Reason</h3>
              </div>

              <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/30 text-xs text-rose-300 leading-relaxed">
                <strong>Anti-Gaming Principle:</strong> Detection flags never auto-void XP. Only authorized faculty can void XP. Soft-voids preserve the original row in the immutable ledger, recalculate totals, and log the reason in the permanent audit trail.
              </div>

              <div className="text-xs text-slate-300 flex flex-col gap-1">
                <div>
                  Target Student: <strong className="text-white">{selectedFlagForVoid.studentName}</strong> (
                  <span className="font-mono text-slate-400">{selectedFlagForVoid.studentRoll}</span>)
                </div>
                <div>
                  Flag Type: <span className="capitalize font-semibold text-white">{selectedFlagForVoid.kind.replace('_', ' ')}</span>
                </div>
              </div>

              {voidMessage && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    voidMessage.type === 'success'
                      ? 'bg-emerald-950/40 border border-emerald-800 text-emerald-300'
                      : 'bg-rose-950/40 border border-rose-800 text-rose-300'
                  }`}
                >
                  {voidMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  )}
                  <span>{voidMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleVoidSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">
                    Written Reason <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                    placeholder="Provide a specific, written justification (e.g. Duplicate attempt submission or verified answer-sharing in practice round)..."
                    rows={4}
                    required
                    minLength={5}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    This note will be recorded in the audit log and shown neutrally in the student's ledger as "XP adjusted by faculty: &lt;reason&gt;".
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedFlagForVoid(null)}
                    disabled={isPending}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || voidReason.trim().length < 5}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50"
                  >
                    {isPending ? 'Processing Void...' : 'Confirm & Soft-Void XP'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
