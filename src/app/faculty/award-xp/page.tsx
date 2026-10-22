'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { awardXpAction, AwardXpResult } from '@/app/actions/xp';
import {
  deductXpAction,
  getStudentXpSummaryAction,
  DeductXpResult,
} from '@/app/actions/xp-deductions';
import { searchStudentsAction, StudentSearchResult } from '@/app/actions/student-search';
import { RankChip } from '@/components/ranks/RankChip';
import { createClient } from '@/lib/supabase/client';
import { XpRule } from '@/types/database';
import clsx from 'clsx';
import {
  Award,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  Search,
  UserCheck,
  X,
  Loader2,
  PlusCircle,
  MinusCircle,
  ShieldAlert,
} from 'lucide-react';

export default function AwardOrDeductXpPage() {
  const supabase = createClient();

  const [mode, setMode] = useState<'award' | 'deduct'>('award');

  const [rules, setRules] = useState<XpRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(true);

  // Student Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StudentSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchResult | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [studentSummary, setStudentSummary] = useState<{
    currentXp: number;
    totalValidEvents: number;
  } | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Award Form State
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedActionType, setSelectedActionType] = useState('');
  const [extraUnits, setExtraUnits] = useState(0);
  const [referenceId, setReferenceId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AwardXpResult | null>(null);

  // Deduct Form State
  const [deductAmount, setDeductAmount] = useState<number>(25);
  const [deductReason, setDeductReason] = useState<string>('Attendance absence infraction');
  const [customReason, setCustomReason] = useState<string>('');
  const [deductResult, setDeductResult] = useState<DeductXpResult | null>(null);

  // 1. Fetch Active Rules
  useEffect(() => {
    async function loadRules() {
      const { data: rulesData } = await supabase
        .from('xp_rules')
        .select('*')
        .eq('active', true)
        .order('display_name');

      if (rulesData) {
        setRules(rulesData as XpRule[]);
        if (rulesData.length > 0) {
          setSelectedActionType(rulesData[0].action_type);
        }
      }

      setLoadingRules(false);
    }

    loadRules();
  }, [supabase]);

  // 2. Debounced Student Search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const res = await searchStudentsAction(searchQuery);
      if (res.success && res.students) {
        setSearchResults(res.students);
        setShowDropdown(true);
      }
      setIsSearching(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Auto-fill reference ID with readable template on rule selection
  useEffect(() => {
    if (selectedActionType) {
      const today = new Date().toISOString().split('T')[0];
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      setReferenceId(`${selectedActionType}_${today}_session${randomSuffix}`);
    }
  }, [selectedActionType]);

  const handleSelectStudent = async (student: StudentSearchResult) => {
    setSelectedStudent(student);
    setSelectedStudentId(student.id);
    setSearchQuery('');
    setShowDropdown(false);

    // Fetch live XP balance summary
    setLoadingSummary(true);
    const summary = await getStudentXpSummaryAction(student.id);
    if (summary.success) {
      setStudentSummary({
        currentXp: summary.currentXp ?? 0,
        totalValidEvents: summary.totalValidEvents ?? 0,
      });
    }
    setLoadingSummary(false);
  };

  const handleClearStudent = () => {
    setSelectedStudent(null);
    setSelectedStudentId('');
    setStudentSummary(null);
  };

  const handleAwardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedActionType || !referenceId) {
      return;
    }

    setSubmitting(true);
    setResult(null);

    const res = await awardXpAction({
      studentId: selectedStudentId,
      actionType: selectedActionType,
      referenceId,
      extraUnits,
    });

    setResult(res);
    setSubmitting(false);

    if (res.status === 'awarded') {
      const today = new Date().toISOString().split('T')[0];
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      setReferenceId(`${selectedActionType}_${today}_session${randomSuffix}`);

      // Refresh student summary
      if (selectedStudentId) {
        const sum = await getStudentXpSummaryAction(selectedStudentId);
        if (sum.success) {
          setStudentSummary({
            currentXp: sum.currentXp ?? 0,
            totalValidEvents: sum.totalValidEvents ?? 0,
          });
        }
      }
    }
  };

  const handleDeductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;

    const finalReason =
      deductReason === 'Other' ? customReason.trim() : deductReason.trim();

    if (finalReason.length < 3) {
      setDeductResult({
        success: false,
        error: 'Please specify a reason of at least 3 characters for the deduction.',
      });
      return;
    }

    setSubmitting(true);
    setDeductResult(null);

    const res = await deductXpAction({
      studentId: selectedStudentId,
      amount: deductAmount,
      reason: finalReason,
    });

    setDeductResult(res);
    setSubmitting(false);

    if (res.success && res.newTotal !== undefined) {
      setStudentSummary((prev) =>
        prev ? { ...prev, currentXp: res.newTotal! } : null
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-black pb-16 text-zinc-100">
      <Navbar role="faculty" />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Link
            href="/faculty"
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 py-1 px-2.5 rounded-lg bg-zinc-900 border border-white/15 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </Link>
        </div>

        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/20 text-white mb-2">
            <Award className="w-3.5 h-3.5" />
            Faculty Ledger Terminal
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Manage Student XP
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Grant points or enforce disciplinary deductions with immutable ledger transactions and audit logs.
          </p>
        </div>

        {/* Mode Switcher Toggle */}
        <div className="flex bg-zinc-900 border border-white/15 rounded-2xl p-1.5 mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('award');
              setResult(null);
              setDeductResult(null);
            }}
            className={clsx(
              'flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer',
              mode === 'award'
                ? 'bg-white text-black shadow-lg'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            <PlusCircle className="w-4 h-4 text-emerald-500" />
            <span>Award Student XP</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('deduct');
              setResult(null);
              setDeductResult(null);
            }}
            className={clsx(
              'flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer',
              mode === 'deduct'
                ? 'bg-rose-600 text-white shadow-lg'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            <MinusCircle className="w-4 h-4 text-white" />
            <span>Deduct Student XP (Penalty)</span>
          </button>
        </div>

        {/* Feedback Banners */}
        {mode === 'award' && result && (
          <div className="mb-6">
            {result.status === 'awarded' && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 text-emerald-200 text-xs flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block text-sm mb-0.5">XP Awarded Successfully!</strong>
                  <span>
                    Awarded <strong>+{result.xpAwarded} XP</strong>. The student&apos;s updated total is now{' '}
                    <strong>{result.newTotal} XP</strong>.
                  </span>
                </div>
              </div>
            )}
            {result.status === 'duplicate' && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-amber-200 text-xs flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block text-sm mb-0.5">Duplicate Action Blocked</strong>
                  <span>
                    This student has already been rewarded for reference ID <code>{referenceId}</code>.
                  </span>
                </div>
              </div>
            )}
            {result.status === 'limit_reached' && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-amber-200 text-xs flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block text-sm mb-0.5">Daily Limit Reached</strong>
                  <span>This student has reached the daily limit for this action today.</span>
                </div>
              </div>
            )}
            {result.status === 'error' && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-400/30 text-rose-200 text-xs flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block text-sm mb-0.5">Award Request Failed</strong>
                  <span>{result.error || 'An unexpected error occurred.'}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {mode === 'deduct' && deductResult && (
          <div className="mb-6">
            {deductResult.success ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 text-emerald-200 text-xs flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block text-sm mb-0.5">XP Deducted Successfully</strong>
                  <span>
                    Deducted <strong>-{deductResult.deductedAmount} XP</strong>. The student&apos;s new balance is{' '}
                    <strong>{deductResult.newTotal} XP</strong>. Recorded in audit ledger.
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-400/30 text-rose-200 text-xs flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block text-sm mb-0.5">Deduction Failed</strong>
                  <span>{deductResult.error || 'Could not deduct XP.'}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Selected Student Banner / Search */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#0c0c0e] border border-white/15 shadow-2xl backdrop-blur-md mb-6">
          <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
            Target Student
          </label>

          {selectedStudent ? (
            <div className="p-4 rounded-2xl bg-white/10 border border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{selectedStudent.fullName}</span>
                    {selectedStudent.department && (
                      <span className="text-[10px] font-normal text-zinc-300 bg-white/10 px-1.5 py-0.5 rounded border border-white/20">
                        {selectedStudent.department} {selectedStudent.yearOfStudy ? `Y${selectedStudent.yearOfStudy}` : ''}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {selectedStudent.rollNo}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {studentSummary && (
                  <div className="px-3 py-1 rounded-xl bg-black border border-white/15 text-right">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold block">Current XP</span>
                    <span className="text-sm font-mono font-black text-amber-300">
                      {studentSummary.currentXp.toLocaleString()} XP
                    </span>
                  </div>
                )}
                <RankChip level={selectedStudent.level || 1} size="sm" showLevel />
                <button
                  type="button"
                  onClick={handleClearStudent}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-xs text-zinc-300 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Change</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search student by name, roll number, or email..."
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-black border border-white/15 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-white"
                />
                {isSearching && (
                  <Loader2 className="w-4 h-4 text-zinc-400 animate-spin absolute right-3.5" />
                )}
              </div>

              {/* Dropdown Results */}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 z-20 max-h-60 overflow-y-auto rounded-2xl bg-[#0c0c0e] border border-white/20 shadow-2xl py-1">
                  {searchResults.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => handleSelectStudent(student)}
                      className="w-full text-left px-4 py-2.5 hover:bg-zinc-900 flex items-center justify-between border-b border-white/5 last:border-0 transition-colors cursor-pointer"
                    >
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>{student.fullName}</span>
                          {student.department && (
                            <span className="text-[10px] font-normal text-zinc-300 bg-white/10 px-1.5 py-0.5 rounded border border-white/20">
                              {student.department}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          {student.rollNo}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-white bg-white/10 px-2 py-0.5 rounded-md border border-white/20">
                        LVL {student.level || 1}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODE 1: AWARD XP FORM */}
        {mode === 'award' && (
          <form
            onSubmit={handleAwardSubmit}
            className="p-6 sm:p-8 rounded-3xl bg-[#0c0c0e] border border-white/15 flex flex-col gap-5 shadow-2xl backdrop-blur-md"
          >
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                Action Type & Point Rule
              </label>
              {loadingRules ? (
                <div className="text-xs text-zinc-500">Loading XP rules...</div>
              ) : (
                <select
                  value={selectedActionType}
                  onChange={(e) => setSelectedActionType(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-black border border-white/15 text-white text-xs focus:outline-none focus:border-white"
                >
                  {rules
                    .filter((r) => r.action_type !== 'REWARD_REDEMPTION' && r.action_type !== 'XP_DEDUCTION')
                    .map((rule) => (
                      <option key={rule.id} value={rule.action_type} className="bg-black text-white">
                        {rule.display_name} — Base {rule.base_xp} XP
                        {rule.extra_xp > 0 ? ` (+${rule.extra_xp}/unit)` : ''}
                        {rule.daily_limit ? ` (Max ${rule.daily_limit}/day)` : ''}
                      </option>
                    ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                Extra Units (Optional)
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={extraUnits}
                onChange={(e) => setExtraUnits(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-4 py-3 rounded-xl bg-black border border-white/15 text-white text-xs focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Reference ID (Unique Invariant)
                </label>
                <span className="text-[11px] text-zinc-500">Auto-generated</span>
              </div>
              <input
                type="text"
                required
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-black border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-white"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !selectedStudentId}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold shadow-xl shadow-white/10 transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <span>Writing to Ledger...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Award XP to Ledger</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* MODE 2: DEDUCT XP FORM */}
        {mode === 'deduct' && (
          <form
            onSubmit={handleDeductSubmit}
            className="p-6 sm:p-8 rounded-3xl bg-[#0c0c0e] border border-rose-500/30 flex flex-col gap-5 shadow-2xl backdrop-blur-md relative overflow-hidden"
          >
            <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4" />
              <span>Administrative XP Penalty Terminal</span>
            </div>

            {/* Step 1: Penalty Amount */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                Penalty Amount (XP to Deduct)
              </label>
              <div className="flex gap-2 mb-2">
                {[10, 25, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDeductAmount(amt)}
                    className={clsx(
                      'px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all',
                      deductAmount === amt
                        ? 'bg-rose-600 text-white shadow-md'
                        : 'bg-white/5 text-zinc-400 hover:text-white border border-white/10'
                    )}
                  >
                    -{amt} XP
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="1"
                max="1000"
                required
                value={deductAmount}
                onChange={(e) => setDeductAmount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-4 py-3 rounded-xl bg-black border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-rose-400"
              />
            </div>

            {/* Step 2: Reason */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                Mandatory Deduction Reason
              </label>
              <select
                value={deductReason}
                onChange={(e) => setDeductReason(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-black border border-white/15 text-white text-xs focus:outline-none focus:border-rose-400 mb-2"
              >
                <option value="Attendance absence infraction">Attendance absence infraction</option>
                <option value="Academic misconduct / unauthorized assistance">Academic misconduct / unauthorized assistance</option>
                <option value="Cheating / duel win-trading infraction">Cheating / duel win-trading infraction</option>
                <option value="Failure to submit assignment on deadline">Failure to submit assignment on deadline</option>
                <option value="Administrative ledger adjustment">Administrative ledger adjustment</option>
                <option value="Other">Other (Custom explanation)</option>
              </select>

              {deductReason === 'Other' && (
                <input
                  type="text"
                  required
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Explain why points are being deducted (min 3 chars)..."
                  className="w-full px-4 py-3 rounded-xl bg-black border border-rose-400/40 text-white text-xs focus:outline-none focus:border-rose-400"
                />
              )}
            </div>

            {/* Projected Impact Preview */}
            {studentSummary && (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs space-y-1.5">
                <div className="flex justify-between text-zinc-400">
                  <span>Current Ledger Total:</span>
                  <span className="font-mono text-white font-bold">
                    {studentSummary.currentXp.toLocaleString()} XP
                  </span>
                </div>
                <div className="flex justify-between text-rose-400">
                  <span>Deduction:</span>
                  <span className="font-mono font-bold">-{deductAmount} XP</span>
                </div>
                <div className="pt-1.5 border-t border-white/10 flex justify-between text-white font-bold">
                  <span>Projected New Balance:</span>
                  <span className="font-mono text-amber-300">
                    {(studentSummary.currentXp - deductAmount).toLocaleString()} XP
                  </span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !selectedStudentId}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xl shadow-rose-600/20 transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <span>Executing Deduction...</span>
              ) : (
                <>
                  <MinusCircle className="w-4 h-4" />
                  <span>Execute XP Deduction (-{deductAmount} XP)</span>
                </>
              )}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
