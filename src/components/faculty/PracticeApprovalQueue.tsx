'use client';

import React, { useState, useEffect } from 'react';
import {
  getPendingPracticeClaimsAction,
  approvePracticeClaimAction,
  bulkApprovePracticeClaimsAction,
  rejectPracticeClaimAction,
} from '@/app/actions/practice';
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  Loader2,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
  User,
  ShieldCheck,
} from 'lucide-react';
import clsx from 'clsx';

export function PracticeApprovalQueue() {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClaimIds, setSelectedClaimIds] = useState<string[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Rejection dialog state
  const [rejectingClaimId, setRejectingClaimId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const loadClaims = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPendingPracticeClaimsAction();
      if (res.success) {
        setClaims(res.claims || []);
        setSelectedClaimIds([]);
      } else {
        setError(res.error || 'Failed to fetch pending claims.');
      }
    } catch (err: any) {
      setError(err?.message || 'Server error loading queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClaims();
  }, []);

  const handleSelectAll = () => {
    if (selectedClaimIds.length === claims.length) {
      setSelectedClaimIds([]);
    } else {
      setSelectedClaimIds(claims.map((c) => c.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedClaimIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSingleApprove = async (claimId: string) => {
    setProcessingId(claimId);
    setFeedback(null);
    try {
      const res = await approvePracticeClaimAction(claimId);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Claim approved successfully! Awarded +${res.xpAwarded} XP.`,
        });
        await loadClaims();
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Failed to approve claim.',
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Approval error.' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedClaimIds.length === 0) return;
    setBulkProcessing(true);
    setFeedback(null);
    try {
      const res = await bulkApprovePracticeClaimsAction(selectedClaimIds);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Bulk approval complete: ${res.approvedCount} approved, ${res.failedCount} failed.`,
        });
        await loadClaims();
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Bulk approval failed.',
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Bulk approval error.' });
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingClaimId) return;
    if (!rejectionReason.trim() || rejectionReason.trim().length < 3) {
      alert('Please provide a short reason for rejection.');
      return;
    }

    setProcessingId(rejectingClaimId);
    setFeedback(null);
    try {
      const res = await rejectPracticeClaimAction(rejectingClaimId, rejectionReason.trim());
      if (res.success) {
        setFeedback({
          type: 'success',
          message: 'Claim rejected. Feedback recorded and student notified.',
        });
        setRejectingClaimId(null);
        setRejectionReason('');
        await loadClaims();
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Failed to reject claim.',
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Rejection error.' });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Practice & Competition Approval Queue</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            {claims.length} pending solution proofs awaiting faculty verification
          </p>
        </div>

        {claims.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition"
            >
              {selectedClaimIds.length === claims.length ? 'Deselect All' : 'Select All'}
            </button>
            <button
              type="button"
              disabled={selectedClaimIds.length === 0 || bulkProcessing}
              onClick={handleBulkApprove}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-white text-black hover:bg-zinc-200 transition border border-white disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
            >
              {bulkProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Approving...</span>
                </>
              ) : (
                <>
                  <Layers className="w-3.5 h-3.5" />
                  <span>Bulk Approve ({selectedClaimIds.length})</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {feedback && (
        <div
          className={clsx(
            'p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 border',
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          )}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-xs text-zinc-400 border border-zinc-800 rounded-3xl bg-zinc-900/30 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-white" />
          <span>Loading pending practice claims...</span>
        </div>
      ) : claims.length === 0 ? (
        <div className="p-10 text-center text-xs text-zinc-400 border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/20">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
          <p className="font-semibold text-white">Queue is clear!</p>
          <p className="text-zinc-500 mt-1">All practice problem and competition claims have been reviewed.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {claims.map((claim) => {
            const isSelected = selectedClaimIds.includes(claim.id);
            const isBusy = processingId === claim.id;

            return (
              <div
                key={claim.id}
                className={clsx(
                  'p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4',
                  isSelected ? 'border-white/40 bg-zinc-900/90' : 'border-zinc-800 hover:border-zinc-700'
                )}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleSelect(claim.id)}
                    className="mt-1 h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-white focus:ring-0 cursor-pointer"
                  />

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-white">{claim.studentName}</span>
                      <span className="text-[10px] font-mono text-zinc-400 bg-black/60 px-2 py-0.5 rounded border border-zinc-800">
                        {claim.studentRoll || claim.studentEmail}
                      </span>
                      <span
                        className={clsx(
                          'text-[10px] font-mono px-2 py-0.5 rounded border font-semibold',
                          claim.difficulty === 'Easy'
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : claim.difficulty === 'Hard'
                            ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        )}
                      >
                        {claim.difficulty} (
                        {claim.isCompetition
                          ? '25 XP'
                          : claim.difficulty === 'Hard'
                          ? '40 XP'
                          : claim.difficulty === 'Easy'
                          ? '10 XP'
                          : '20 XP'}
                        )
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-zinc-200">{claim.problemTitle}</p>
                    <p className="text-xs text-zinc-400 font-mono">
                      Topic: <span className="text-zinc-300">{claim.topic}</span> • Platform:{' '}
                      <span className="text-zinc-300">{claim.platform}</span>
                    </p>

                    {/* Proof link */}
                    <div className="pt-1.5 flex items-center gap-2">
                      <a
                        href={claim.submissionProof}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 underline font-mono truncate max-w-xs sm:max-w-md"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{claim.submissionProof}</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleSingleApprove(claim.id)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition disabled:opacity-50 flex items-center gap-1"
                  >
                    {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>Approve</span>
                  </button>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => {
                      setRejectingClaimId(claim.id);
                      setRejectionReason('');
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition disabled:opacity-50 flex items-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectingClaimId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative flex flex-col gap-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-400" />
              <span>Reject Practice Solution Claim</span>
            </h4>
            <p className="text-xs text-zinc-400">
              Please provide a short reason for rejecting this claim (e.g. invalid submission link, incomplete solution, wrong problem).
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Rejection Reason (Required)
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Proof URL does not show accepted submission"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white transition font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setRejectingClaimId(null)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingId === rejectingClaimId}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition disabled:opacity-50"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
