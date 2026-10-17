'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { createClient } from '@/lib/supabase/client';
import { XpRule } from '@/types/database';
import { Sliders, ArrowLeft, History, Check, X, AlertCircle, Edit2 } from 'lucide-react';
import { updateXpRuleAction } from '@/app/actions/rules';

interface RuleHistoryRow {
  id: string;
  action_type: string;
  old_base_xp: number;
  new_base_xp: number;
  old_extra_xp: number;
  new_extra_xp: number;
  old_daily_limit: number | null;
  new_daily_limit: number | null;
  old_active: boolean;
  new_active: boolean;
  changed_at: string;
}

export default function AdminRulesPage() {
  const supabase = createClient();

  const [rules, setRules] = useState<XpRule[]>([]);
  const [history, setHistory] = useState<RuleHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<XpRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);

    // 1. Fetch rules
    const { data: rulesData, error: rulesError } = await supabase
      .from('xp_rules')
      .select('*')
      .order('action_type');

    if (rulesData) {
      setRules(rulesData as XpRule[]);
    } else if (rulesError) {
      setErrorMessage(rulesError.message);
    }

    // 2. Fetch history
    const { data: historyData, error: histError } = await supabase
      .from('xp_rules_history')
      .select('*')
      .order('changed_at', { ascending: false })
      .limit(20);

    if (historyData) {
      setHistory(historyData as RuleHistoryRow[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await updateXpRuleAction({
      id: editingRule.id,
      displayName: editingRule.display_name,
      baseXp: Number(editingRule.base_xp),
      extraXp: Number(editingRule.extra_xp),
      dailyLimit: editingRule.daily_limit ? Number(editingRule.daily_limit) : null,
      active: editingRule.active,
      reason: `Admin updated rule for ${editingRule.action_type}`,
    });

    if (!res.success) {
      setErrorMessage(res.error || 'Failed to update rule');
      setSaving(false);
    } else {
      setSuccessMessage(`Rule "${editingRule.action_type}" updated successfully! Change recorded in audit log.`);
      setEditingRule(null);
      setSaving(false);
      await loadData();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 pb-16">
      <Navbar role="admin" userName="Vikram Singh (Admin)" />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Link
            href="/admin"
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 py-1 px-2.5 rounded-lg bg-slate-900 border border-slate-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Admin Hub
          </Link>
        </div>

        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-2">
            <Sliders className="w-3.5 h-3.5" />
            Rule Engine Management
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            XP Rules & Point Values
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Edit reward rates and daily caps. Changes immediately take effect without code updates.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Edit Rule Modal / Card */}
        {editingRule && (
          <div className="mb-8 p-6 rounded-3xl bg-slate-900 border border-indigo-500/40 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-400" />
                Editing Rule: <span className="font-mono text-indigo-300">{editingRule.action_type}</span>
              </h2>
              <button
                onClick={() => setEditingRule(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  value={editingRule.display_name}
                  onChange={(e) => setEditingRule({ ...editingRule, display_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Base XP</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={editingRule.base_xp}
                  onChange={(e) => setEditingRule({ ...editingRule, base_xp: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Extra XP / Unit</label>
                <input
                  type="number"
                  min="0"
                  value={editingRule.extra_xp}
                  onChange={(e) => setEditingRule({ ...editingRule, extra_xp: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Daily Limit</label>
                <input
                  type="number"
                  min="1"
                  placeholder="None"
                  value={editingRule.daily_limit || ''}
                  onChange={(e) =>
                    setEditingRule({
                      ...editingRule,
                      daily_limit: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-col justify-end">
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Active Status</label>
                <div className="flex items-center gap-2 h-9">
                  <input
                    type="checkbox"
                    id="ruleActive"
                    checked={editingRule.active}
                    onChange={(e) => setEditingRule({ ...editingRule, active: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-slate-950 border-slate-800"
                  />
                  <label htmlFor="ruleActive" className="text-xs text-slate-300">
                    {editingRule.active ? 'Active' : 'Disabled'}
                  </label>
                </div>
              </div>

              <div className="sm:col-span-2 lg:col-span-5 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRule(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20"
                >
                  {saving ? 'Saving...' : 'Save Rule Changes'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Live Rules Table */}
        <section aria-label="XP Rules Table" className="mb-10 p-6 rounded-3xl bg-slate-900/80 border border-slate-800">
          <h2 className="text-sm font-bold text-white mb-4">Configured Rules (`xp_rules` Database State)</h2>

          {loading ? (
            <div className="text-xs text-slate-500 py-4">Loading rules from database...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="text-[11px] uppercase bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3">Action Type</th>
                    <th className="py-3 px-3">Display Name</th>
                    <th className="py-3 px-3">Base XP</th>
                    <th className="py-3 px-3">Extra XP</th>
                    <th className="py-3 px-3">Daily Limit</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {rules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-950/40">
                      <td className="py-3 px-3 font-mono text-indigo-300 font-semibold">{rule.action_type}</td>
                      <td className="py-3 px-3 text-white font-medium">{rule.display_name}</td>
                      <td className="py-3 px-3 font-bold text-slate-200">{rule.base_xp}</td>
                      <td className="py-3 px-3 text-slate-400">+{rule.extra_xp}</td>
                      <td className="py-3 px-3 text-slate-400">{rule.daily_limit ? `${rule.daily_limit}/day` : 'None'}</td>
                      <td className="py-3 px-3">
                        {rule.active ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400">
                            Disabled
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setEditingRule(rule)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition-colors"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Change History Audit Log */}
        <section aria-label="Rule Change History" className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white">Rule Audit Log (`xp_rules_history`)</h2>
          </div>

          {history.length === 0 ? (
            <p className="text-xs text-slate-500 py-3">No rule modifications recorded yet. Any edit above will log an immutable history row.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="text-[11px] uppercase bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Base XP</th>
                    <th className="py-2.5 px-3">Extra XP</th>
                    <th className="py-2.5 px-3">Daily Limit</th>
                    <th className="py-2.5 px-3">Active</th>
                    <th className="py-2.5 px-3">Timestamp (IST)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {history.map((row) => (
                    <tr key={row.id}>
                      <td className="py-2 px-3 text-indigo-300 font-sans font-semibold">{row.action_type}</td>
                      <td className="py-2 px-3">
                        <span className="text-slate-500 line-through mr-1">{row.old_base_xp}</span>
                        <span className="text-emerald-400 font-bold">{row.new_base_xp}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-slate-500 line-through mr-1">{row.old_extra_xp}</span>
                        <span className="text-emerald-400 font-bold">{row.new_extra_xp}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-slate-500 line-through mr-1">{row.old_daily_limit ?? 'null'}</span>
                        <span className="text-emerald-400 font-bold">{row.new_daily_limit ?? 'null'}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-slate-500 mr-1">{row.old_active ? 'true' : 'false'} →</span>
                        <span className="text-white">{row.new_active ? 'true' : 'false'}</span>
                      </td>
                      <td className="py-2 px-3 text-slate-400 font-sans">
                        {new Date(row.changed_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
