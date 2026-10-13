'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { awardXpAction, AwardXpResult } from '@/app/actions/xp';
import { createClient } from '@/lib/supabase/client';
import { XpRule } from '@/types/database';
import { Award, ArrowLeft, CheckCircle2, AlertTriangle, AlertCircle, Sparkles } from 'lucide-react';

interface StudentOption {
  id: string;
  full_name: string;
  roll_no: string;
  department: string;
}

export default function AwardXpPage() {
  const supabase = createClient();

  const [students, setStudents] = useState<StudentOption[]>([]);
  const [rules, setRules] = useState<XpRule[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form State
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedActionType, setSelectedActionType] = useState('');
  const [extraUnits, setExtraUnits] = useState(0);
  const [referenceId, setReferenceId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AwardXpResult | null>(null);

  useEffect(() => {
    async function loadData() {
      // 1. Fetch Students
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, roll_no, department, profiles(full_name)')
        .limit(50);

      if (studentsData) {
        const formatted = studentsData.map((s: any) => ({
          id: s.id,
          roll_no: s.roll_no,
          department: s.department,
          full_name: s.profiles?.full_name || 'Student',
        }));
        setStudents(formatted);
        if (formatted.length > 0) {
          setSelectedStudentId(formatted[0].id);
        }
      }

      // 2. Fetch Active Rules
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

      setLoadingInitial(false);
    }

    loadData();
  }, []);

  // Auto-generate reference suggestion whenever action or student changes
  useEffect(() => {
    if (selectedActionType) {
      const today = new Date().toISOString().split('T')[0];
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      setReferenceId(`${selectedActionType}_${today}_session${randomSuffix}`);
    }
  }, [selectedActionType, selectedStudentId]);

  const activeRule = rules.find((r) => r.action_type === selectedActionType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="min-h-screen flex flex-col bg-slate-950 pb-16">
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
          {/* Pick Student */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Select Student
            </label>
            {loadingInitial ? (
              <div className="text-xs text-slate-500">Loading student directory...</div>
            ) : (
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.roll_no} • {s.department})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Pick Action */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Learning Action Type
            </label>
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
            disabled={submitting || loadingInitial}
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
