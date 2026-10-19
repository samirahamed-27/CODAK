'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { redeemInviteAction } from '@/app/actions/invites';
import { getCampusesAction } from '@/app/actions/campus';
import {
  KeyRound,
  ShieldCheck,
  Building,
  GraduationCap,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  Sparkles,
} from 'lucide-react';

export default function RedeemInvitePage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [campuses, setCampuses] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [fullName, setFullName] = useState('');
  const [code, setCode] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [designation, setDesignation] = useState('Assistant Professor');
  const [campusId, setCampusId] = useState('');
  const [employeeId, setEmployeeId] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ role: string; redirectUrl: string } | null>(null);

  useEffect(() => {
    async function init() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        // Not logged in -> redirect to login with next=/redeem-invite
        router.push('/login?next=/redeem-invite');
        return;
      }

      setUser(authUser);

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      setProfile(prof);

      if (prof?.full_name && prof.full_name !== 'Student User') {
        setFullName(prof.full_name);
      } else if (authUser?.user_metadata?.full_name || authUser?.user_metadata?.name) {
        setFullName(authUser.user_metadata.full_name || authUser.user_metadata.name);
      }

      // If user is already faculty or admin, redirect them directly
      if (prof?.role === 'faculty') {
        router.push('/faculty');
        return;
      }
      if (prof?.role === 'admin') {
        router.push('/admin');
        return;
      }

      const campusRes = await getCampusesAction();
      if (campusRes.success) {
        setCampuses(campusRes.campuses);
        if (prof?.campus_id) {
          setCampusId(prof.campus_id);
        } else if (campusRes.campuses.length > 0) {
          setCampusId(campusRes.campuses[0].id);
        }
      }

      setLoading(false);
    }

    init();
  }, [router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setErrorMessage('Please enter your staff invite code.');
      return;
    }
    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMessage('Please enter your official full name (at least 2 characters).');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const res = await redeemInviteAction({
      code: code.trim(),
      fullName: fullName.trim(),
      department: department.trim() || undefined,
      designation: designation.trim() || undefined,
      campusId: campusId || undefined,
      employeeId: employeeId.trim() || undefined,
    });

    if (res.success && res.redirectUrl) {
      setSuccessInfo({ role: res.role || 'staff', redirectUrl: res.redirectUrl });
      setTimeout(() => {
        window.location.href = res.redirectUrl!;
      }, 1500);
    } else {
      setErrorMessage(res.error || 'Invalid or expired code');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  const isEmailVerified = Boolean(
    user?.email_confirmed_at ||
    user?.confirmed_at ||
    user?.app_metadata?.provider === 'google'
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white relative px-4 py-12 overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg rounded-3xl bg-[#0c0c0e]/95 backdrop-blur-md border border-white/15 shadow-2xl p-6 sm:p-8 flex flex-col items-center">
        {/* Header Icon */}
        <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white mb-4 shadow-lg">
          <KeyRound className="w-6 h-6 text-purple-400" />
        </div>

        <div className="text-center space-y-1 mb-6">
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Redeem Staff Invite Code
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mx-auto">
            Faculty and administrator accounts require a verified invitation code issued by your institution.
          </p>
        </div>

        {/* User Status Bar */}
        <div className="w-full p-3 rounded-2xl bg-white/5 border border-white/10 mb-6 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-zinc-300">
            <Mail className="w-4 h-4 text-zinc-400 shrink-0" />
            <span className="font-mono text-[11px] truncate max-w-[200px]">{user?.email}</span>
          </div>
          {isEmailVerified ? (
            <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-amber-400 font-semibold text-[11px]">
              <AlertCircle className="w-3.5 h-3.5" />
              Unverified
            </span>
          )}
        </div>

        {!isEmailVerified && (
          <div className="w-full p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs mb-6 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              <span>Email Verification Required</span>
            </div>
            <p className="text-[11px] text-amber-300/80 leading-relaxed">
              Please click the confirmation link sent to your email address before redeeming a staff invite code.
            </p>
          </div>
        )}

        {successInfo ? (
          <div className="w-full p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-center space-y-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-emerald-300">Promotion Successful!</h3>
              <p className="text-xs text-emerald-300/80 mt-1">
                Your account has been elevated to <strong className="capitalize">{successInfo.role}</strong>.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-xs text-zinc-400 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Redirecting to your dashboard...</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            {/* Full Name Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                <span>Full Name <span className="text-rose-400">*</span></span>
                <span className="text-[10px] text-zinc-500">Official name</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Dr. Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-black border border-white/15 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-all font-medium"
              />
            </div>

            {/* Invite Code Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                <span>Invite Code <span className="text-rose-400">*</span></span>
                <span className="text-[10px] text-zinc-500">20+ characters</span>
              </label>
              <input
                type="text"
                required
                placeholder="inv_..."
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-black border border-white/15 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-all font-mono tracking-wider"
              />
            </div>

            {/* Department (For Faculty) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/10">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                  <span>Department</span>
                  <span className="text-[10px] text-zinc-500">(Faculty)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Computer Science"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/15 text-xs text-white focus:outline-none focus:border-purple-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                  <span>Designation</span>
                  <span className="text-[10px] text-zinc-500">(Faculty)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Assistant Professor"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/15 text-xs text-white focus:outline-none focus:border-purple-500 transition-all"
                />
              </div>
            </div>

            {/* Campus Selection & Optional Employee ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Campus</label>
                <select
                  value={campusId}
                  onChange={(e) => setCampusId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-black border border-white/15 text-xs text-white focus:outline-none focus:border-purple-500 transition-all"
                >
                  <option value="">Default / Assigned from Invite</option>
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                  <span>Employee ID</span>
                  <span className="text-[10px] text-zinc-500">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., FAC-1029"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/15 text-xs text-white focus:outline-none focus:border-purple-500 transition-all font-mono"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !isEmailVerified}
              className="w-full py-3.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all shadow-lg shadow-white/10 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying & Elevating Account...</span>
                </>
              ) : (
                <>
                  <span>Redeem Invite Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
