'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { awardXpAction, AwardXpResult } from '@/app/actions/xp';
import { searchStudentsAction, StudentSearchResult } from '@/app/actions/student-search';
import { RankChip } from '@/components/ranks/RankChip';
import { createClient } from '@/lib/supabase/client';
import { XpRule } from '@/types/database';
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
} from 'lucide-react';

export default function AwardXpPage() {
  const supabase = createClient();

  const [rules, setRules] = useState<XpRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(true);

  // Student Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StudentSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchResult | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Form State
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedActionType, setSelectedActionType] = useState('');
  const [extraUnits, setExtraUnits] = useState(0);
  const [referenceId, setReferenceId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AwardXpResult | null>(null);

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

  const handleSelectStudent = (student: StudentSearchResult) => {
    setSelectedStudent(student);
    setSelectedStudentId(student.id);
    setSearchQuery('');
    setShowDropdown(false);
  };

  const handleClearStudent = () => {
    setSelectedStudent(null);
    setSelectedStudentId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    // If successfully awarded, generate fresh reference for next award
    if (res.status === 'awarded') {
      const today = new Date().toISOString().split('T')[0];
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      setReferenceId(`${selectedActionType}_${today}_session${randomSuffix}`);
    }
  };

  const renderFeedbackMessage = () => {
    if (!result) return null;

    if (result.status === 'awarded') {
      return (
        <div className="p-4 rounded-2xl bg-white/10 border border-white/20 text-white text-xs flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-white shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold block text-sm mb-0.5">XP Awarded Successfully!</strong>
            <span>
              Awarded <strong>+{result.xpAwarded} XP</strong>. The student&apos;s updated total is now{' '}
              <strong>{result.newTotal} XP</strong>.
            </span>
          </div>
        </div>
      );
    }

    if (result.status === 'duplicate') {
      return (
        <div className="p-4 rounded-2xl bg-white/10 border border-white/20 text-zinc-200 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-zinc-300 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold block text-sm mb-0.5">Duplicate Action Blocked</strong>
            <span>
              This student has already been rewarded for reference ID <code>{referenceId}</code>.
              The ledger&apos;s unique constraint safely prevented double-awarding.
            </span>
          </div>
        </div>
      );
    }

    if (result.status === 'limit_reached') {
      return (
        <div className="p-4 rounded-2xl bg-white/10 border border-white/20 text-zinc-200 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-zinc-300 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold block text-sm mb-0.5">Daily Limit Reached</strong>
            <span>
              This student has reached the maximum allowed awards for this action today (Asia/Kolkata
              calendar day).
            </span>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 rounded-2xl bg-white/10 border border-white/20 text-zinc-200 text-xs flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-white shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold block text-sm mb-0.5">Award Request Failed</strong>
          <span>{result.error || 'An unexpected error occurred.'}</span>
        </div>
      </div>
    );
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
            Award Student XP
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Grant points directly to student records with idempotent reference guarantees and automatic rate-limiting.
          </p>
        </div>

        {/* Feedback Message Banner */}
        <div className="mb-6">{renderFeedbackMessage()}</div>

        {/* Award Form Card */}
        <form
          onSubmit={handleSubmit}
          className="mt-6 p-6 sm:p-8 rounded-3xl bg-[#0c0c0e] border border-white/15 flex flex-col gap-5 shadow-2xl backdrop-blur-md"
        >
          {/* Step 1: Select Student */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
              Step 1: Select Student
            </label>

            {selectedStudent ? (
              <div className="p-4 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white">
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

                <div className="flex items-center gap-2">
                  <RankChip level={selectedStudent.level || 1} size="sm" showLevel />
                  <button
                    type="button"
                    onClick={handleClearStudent}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-xs text-zinc-300 transition-colors flex items-center gap-1"
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
                    placeholder="Search by student name or email..."
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
                        className="w-full text-left px-4 py-2.5 hover:bg-zinc-900 flex items-center justify-between border-b border-white/5 last:border-0 transition-colors"
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

                {showDropdown && searchQuery.trim().length >= 2 && searchResults.length === 0 && !isSearching && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-20 p-3 rounded-xl bg-[#0c0c0e] border border-white/15 text-xs text-zinc-400 text-center">
                    No matching students found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2: Action Type */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
              Step 2: Action Type & Point Rule
            </label>
            {loadingRules ? (
              <div className="text-xs text-zinc-500">Loading XP rules...</div>
            ) : (
              <select
                value={selectedActionType}
                onChange={(e) => setSelectedActionType(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-black border border-white/15 text-white text-xs focus:outline-none focus:border-white"
              >
                {rules.map((rule) => (
                  <option key={rule.id} value={rule.action_type} className="bg-black text-white">
                    {rule.display_name} — Base {rule.base_xp} XP
                    {rule.extra_xp > 0 ? ` (+${rule.extra_xp}/unit)` : ''}
                    {rule.daily_limit ? ` (Max ${rule.daily_limit}/day)` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Step 3: Extra Units */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
              Step 3: Extra Units (Optional)
            </label>
            <input
              type="number"
              min="0"
              max="50"
              value={extraUnits}
              onChange={(e) => setExtraUnits(Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="0"
              className="w-full px-4 py-3 rounded-xl bg-black border border-white/15 text-white text-xs focus:outline-none focus:border-white"
            />
          </div>

          {/* Step 4: Unique Invariant Reference ID */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Reference ID (Unique Invariant)
              </label>
              <span className="text-[11px] text-zinc-500">Auto-generated • Editable</span>
            </div>
            <input
              type="text"
              required
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              placeholder="e.g. ATTENDANCE_2026-10-14_math"
              className="w-full px-4 py-3 rounded-xl bg-black border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-white"
            />
            <p className="text-[11px] text-zinc-400 mt-1.5 leading-relaxed">
              Enforced by database unique constraint. Submitting with the same Reference ID twice will
              prevent duplicate payouts.
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !selectedStudentId}
            className="w-full mt-2 py-3.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold shadow-xl shadow-white/10 transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
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
      </main>
    </div>
  );
}
