'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { awardXpAction, AwardXpResult } from '@/app/actions/xp';
import { searchStudentsAction, StudentSearchResult } from '@/app/actions/student-search';
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
  }, []);

  // 2. Debounced Student Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const res = await searchStudentsAction(searchQuery);
      if (res.success) {
        setSearchResults(res.students);
        setShowDropdown(true);
      }
      setIsSearching(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Auto-generate reference suggestion whenever action or student changes
  useEffect(() => {
    if (selectedActionType) {
      const today = new Date().toISOString().split('T')[0];
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      setReferenceId(`${selectedActionType}_${today}_session${randomSuffix}`);
    }
  }, [selectedActionType, selectedStudentId]);

  const activeRule = rules.find((r) => r.action_type === selectedActionType);

  const handleSelectStudent = (student: StudentSearchResult) => {
    setSelectedStudent(student);
    setSelectedStudentId(student.id);
    setShowDropdown(false);
    setSearchQuery('');
  };

  const handleClearSelectedStudent = () => {
    setSelectedStudent(null);
    setSelectedStudentId('');
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      setResult({
        success: false,
        status: 'error',
        error: 'Please search and select a student by roll number or name first.',
      });
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
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold block text-sm mb-0.5">XP Awarded Successfully!</strong>
            <span>
              Awarded <strong>+{result.xpAwarded} XP</strong>. The student's updated total is now{' '}
              <strong>{result.newTotal} XP</strong>.
            </span>
          </div>
        </div>
      );
    }

    if (result.status === 'duplicate') {
      return (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold block text-sm mb-0.5">Duplicate Action Blocked</strong>
            <span>
              This student has already been rewarded for reference ID <code>{referenceId}</code>.
              The ledger's unique constraint safely prevented double-awarding.
            </span>
          </div>
        </div>
      );
    }

    if (result.status === 'limit_reached') {
      return (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
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
      <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold block text-sm mb-0.5">Award Request Failed</strong>
          <span>{result.error || 'An unexpected error occurred.'}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 pb-16 text-slate-100">
      <Navbar role="faculty" userName="Faculty Staff" />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Link
            href="/faculty"
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 py-1 px-2.5 rounded-lg bg-slate-900 border border-slate-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </Link>
        </div>

        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-2">
            <Award className="w-3.5 h-3.5" />
            Ledger-Backed XP Dispatcher
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Manual XP Award Panel
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Dispatch verifiable learning points directly to the student ledger.
          </p>
        </div>

        {renderFeedbackMessage()}

        <form
          onSubmit={handleSubmit}
          className="mt-6 p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col gap-5 shadow-2xl backdrop-blur-md"
        >
          {/* Pick Student: Debounced Roll Number Search */}
          <div className="relative">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Search Student by Roll Number or Name
            </label>

            {selectedStudent ? (
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {selectedStudent.fullName}
                    </span>
                    <span className="text-[11px] text-indigo-300 font-mono">
                      {selectedStudent.rollNo} • {selectedStudent.department} (Year {selectedStudent.yearOfStudy})
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearSelectedStudent}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 transition-colors flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Change</span>
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Type roll number (e.g. CS2026-001) or student name..."
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  {isSearching && (
                    <Loader2 className="w-4 h-4 text-slate-400 animate-spin absolute right-3.5" />
                  )}
                </div>

                {/* Dropdown Results (Max 10) */}
                {showDropdown && searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-20 max-h-60 overflow-y-auto rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl py-1">
                    {searchResults.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelectStudent(s)}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-900 flex items-center justify-between border-b border-slate-900/50 last:border-0 transition-colors"
                      >
                        <div>
                          <div className="text-xs font-semibold text-white">{s.fullName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {s.rollNo} • {s.department}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                          Select
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {showDropdown && searchQuery.trim() && searchResults.length === 0 && !isSearching && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-20 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 text-center">
                    No students found matching "{searchQuery}".
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pick Action */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Learning Action Type
            </label>
            {loadingRules ? (
              <div className="text-xs text-slate-500">Loading XP rules...</div>
            ) : (
              <select
                value={selectedActionType}
                onChange={(e) => setSelectedActionType(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
              >
                {rules.map((r) => (
                  <option key={r.action_type} value={r.action_type}>
                    {r.display_name} ({r.base_xp} Base XP
                    {r.extra_xp > 0 ? ` + ${r.extra_xp}/unit` : ''}
                    {r.daily_limit ? `, Max ${r.daily_limit}/day` : ''})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Extra Units (if applicable) */}
          {activeRule && activeRule.extra_xp > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Extra Units (e.g. Correct Quiz Answers, +{activeRule.extra_xp} XP each)
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={extraUnits}
                onChange={(e) => setExtraUnits(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* Reference ID */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Reference ID (Unique Invariant)
              </label>
              <span className="text-[11px] text-slate-500">Auto-generated • Editable</span>
            </div>
            <input
              type="text"
              required
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              placeholder="e.g. ATTENDANCE_2026-10-14_math"
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
            />
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
              Enforced by database unique constraint. Submitting with the same Reference ID twice will
              prevent duplicate payouts.
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !selectedStudentId}
            className="w-full mt-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.99] text-white text-xs font-bold shadow-xl shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
