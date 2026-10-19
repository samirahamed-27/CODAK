'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import {
  createStaffInviteAction,
  getStaffInvitesAction,
  revokeStaffInviteAction,
  StaffInviteItem,
} from '@/app/actions/invites';
import { getCampusesAction } from '@/app/actions/campus';
import { createClient } from '@/lib/supabase/client';
import {
  KeyRound,
  ShieldCheck,
  PlusCircle,
  Copy,
  Check,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  XCircle,
  Clock,
  Building,
  Users,
  Shield,
  FileText,
} from 'lucide-react';
import clsx from 'clsx';

export default function AdminInvitesPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [invites, setInvites] = useState<StaffInviteItem[]>([]);
  const [campuses, setCampuses] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Form State
  const [role, setRole] = useState<'faculty' | 'admin'>('faculty');
  const [campusId, setCampusId] = useState<string>('');
  const [maxUses, setMaxUses] = useState<number>(25);
  const [expiresDays, setExpiresDays] = useState<number>(7);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Generated Code Display Modal / Box
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Revoke Action State
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile || profile.role !== 'admin') {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);

      // Load campuses and invites
      const [campusRes, invitesRes] = await Promise.all([
        getCampusesAction(),
        getStaffInvitesAction(),
      ]);

      if (campusRes.success) {
        setCampuses(campusRes.campuses);
      }
      if (invitesRes.success) {
        setInvites(invitesRes.invites);
      }

      setLoading(false);
    }

    init();
  }, []);

  const handleRoleChange = (newRole: 'faculty' | 'admin') => {
    setRole(newRole);
    setMaxUses(newRole === 'admin' ? 1 : 25);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setCreateError(null);
    setGeneratedCode(null);

    const res = await createStaffInviteAction({
      role,
      campusId: campusId || null,
      maxUses,
      expiresDays,
      note: note.trim() || null,
    });

    if (res.success && res.rawCode) {
      setGeneratedCode(res.rawCode);
      setNote('');
      // Reload invites list
      const updated = await getStaffInvitesAction();
      if (updated.success) {
        setInvites(updated.invites);
      }
    } else {
      setCreateError(res.error || 'Failed to create invite.');
    }
    setSubmitting(false);
  };

  const handleRevoke = async (inviteId: string) => {
    if (!confirm('Are you sure you want to revoke this invite code? Any future redemption attempts will be blocked.')) {
      return;
    }
    setRevokingId(inviteId);
    const res = await revokeStaffInviteAction(inviteId);
    if (res.success) {
      const updated = await getStaffInvitesAction();
      if (updated.success) {
        setInvites(updated.invites);
      }
    } else {
      alert(res.error || 'Failed to revoke invite.');
    }
    setRevokingId(null);
  };

  const handleCopyCode = async () => {
    if (!generatedCode) return;
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // fallback
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white px-4 text-center">
        <ShieldCheck className="w-12 h-12 text-rose-500 mb-4" />
        <h1 className="text-2xl font-bold">403 Forbidden</h1>
        <p className="text-sm text-zinc-400 mt-2 max-w-md">
          Administrator privileges are required to access staff invite codes.
        </p>
        <Link
          href="/"
          className="mt-6 px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-all"
        >
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-black text-zinc-100 pb-20">
      <Navbar role="admin" userName="System Administrator" />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 flex flex-col gap-8">
        {/* Breadcrumb & Header */}
        <div className="flex flex-col gap-2 border-b border-white/10 pb-6">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors self-start"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Admin Hub</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-1">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/20 text-white mb-2">
                <KeyRound className="w-3.5 h-3.5" />
                Staff Onboarding & Security
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Staff Invite Codes
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Generate single-use or multi-use cryptographically secure codes for Faculty and Administrator accounts.
              </p>
            </div>
          </div>
        </div>

        {/* Generated Code Reveal Box */}
        {generatedCode && (
          <div className="p-6 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 shadow-2xl relative overflow-hidden">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-3 flex-1">
                <div>
                  <h3 className="text-base font-bold text-amber-200">
                    Staff Invite Code Generated
                  </h3>
                  <p className="text-xs text-amber-300/80 font-medium mt-0.5">
                    ⚠️ You will NOT see this code again. Copy and securely share it with the intended faculty or administrator.
                  </p>
                </div>

                <div className="flex items-center gap-2 max-w-xl">
                  <div className="flex-1 px-4 py-3 rounded-xl bg-black/80 border border-amber-500/40 font-mono text-sm sm:text-base text-amber-200 select-all break-all font-bold tracking-wider">
                    {generatedCode}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-lg transition-all shrink-0 active:scale-95"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Grid: Form (4 cols) + Invites Table (8 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Create Invite Form */}
          <div className="lg:col-span-4 p-6 rounded-2xl bg-[#0c0c0e] border border-white/15 shadow-xl space-y-5">
            <div className="flex items-center gap-2 border-b border-white/10 pb-4">
              <div className="p-2 rounded-xl bg-white/10 text-white">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Create Staff Invite</h2>
                <span className="text-[11px] text-zinc-400">Restricted administrator action</span>
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {/* Target Role Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Target Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleRoleChange('faculty')}
                    className={clsx(
                      'py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5',
                      role === 'faculty'
                        ? 'bg-white text-black border-white shadow-sm'
                        : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
                    )}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Faculty</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleChange('admin')}
                    className={clsx(
                      'py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5',
                      role === 'admin'
                        ? 'bg-white text-black border-white shadow-sm'
                        : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
                    )}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Administrator</span>
                  </button>
                </div>
              </div>

              {/* Campus Assignment */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                  <span>Campus Assignment</span>
                  <span className="text-[10px] text-zinc-500">(Optional)</span>
                </label>
                <select
                  value={campusId}
                  onChange={(e) => setCampusId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/15 text-xs text-white focus:outline-none focus:border-white transition-all"
                >
                  <option value="">Any / Unassigned</option>
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Max Uses & Expiry */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Max Uses</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={maxUses}
                    onChange={(e) => setMaxUses(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/15 text-xs text-white focus:outline-none focus:border-white transition-all font-mono"
                  />
                  <span className="text-[10px] text-zinc-500 block">
                    {role === 'admin' ? 'Default: 1 use' : 'Default: 25 uses'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Expires (Days)</label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={expiresDays}
                    onChange={(e) => setExpiresDays(Math.max(1, parseInt(e.target.value) || 7))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/15 text-xs text-white focus:outline-none focus:border-white transition-all font-mono"
                  />
                  <span className="text-[10px] text-zinc-500 block">Default: 7 days</span>
                </div>
              </div>

              {/* Note / Purpose */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                  <span>Note / Purpose</span>
                  <span className="text-[10px] text-zinc-500">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Computer Science Faculty Batch 2026"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/15 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-all"
                />
              </div>

              {createError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {createError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating Code...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Generate Staff Invite</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Invites List */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-zinc-400" />
                  <span>Issued Staff Invites</span>
                </h2>
                <span className="text-xs text-zinc-400">{invites.length} total invites recorded</span>
              </div>
            </div>

            {invites.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#0c0c0e] border border-white/10 text-center text-zinc-400 text-xs">
                No staff invites generated yet. Use the form on the left to issue your first invite code.
              </div>
            ) : (
              <div className="space-y-3">
                {invites.map((inv) => {
                  const isRevoked = inv.status === 'revoked';
                  const isExpired = inv.status === 'expired';
                  const isUsedUp = inv.status === 'used up';
                  const isActive = inv.status === 'active';

                  return (
                    <div
                      key={inv.id}
                      className={clsx(
                        'p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4',
                        isActive
                          ? 'bg-[#0c0c0e] border-white/15 hover:border-white/30'
                          : 'bg-zinc-950/60 border-white/5 opacity-75'
                      )}
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={clsx(
                              'px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider',
                              inv.role === 'admin'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            )}
                          >
                            {inv.role}
                          </span>

                          <span
                            className={clsx(
                              'px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1',
                              isActive && 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30',
                              isUsedUp && 'bg-zinc-800 text-zinc-300 border border-zinc-700',
                              isExpired && 'bg-rose-500/10 text-rose-300 border border-rose-500/30',
                              isRevoked && 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                            )}
                          >
                            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                            <span className="capitalize">{inv.status}</span>
                          </span>

                          {inv.campuses && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400">
                              <Building className="w-3 h-3" />
                              <span>{inv.campuses.name}</span>
                            </span>
                          )}
                        </div>

                        {inv.note && (
                          <p className="text-xs text-zinc-300 font-medium">
                            {inv.note}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-400 font-mono">
                          <span>Uses: <strong className="text-white">{inv.used_count} / {inv.max_uses}</strong></span>
                          <span>Expires: {new Date(inv.expires_at).toLocaleDateString()}</span>
                          <span>Created: {new Date(inv.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="shrink-0 flex items-center gap-2">
                        {isActive && (
                          <button
                            type="button"
                            onClick={() => handleRevoke(inv.id)}
                            disabled={revokingId === inv.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-all disabled:opacity-50"
                          >
                            {revokingId === inv.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )}
                            <span>Revoke</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
