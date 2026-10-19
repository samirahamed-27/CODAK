'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, KeyRound, AlertCircle, Loader2 } from 'lucide-react';
import { judgeLoginAction, JudgeRole } from '@/app/actions/judge';

export function JudgeLoginForm() {
  const router = useRouter();
  const [role, setRole] = useState<JudgeRole>('faculty');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!code.trim()) {
      setError('Please provide the judge access code.');
      return;
    }

    setLoading(true);

    try {
      const res = await judgeLoginAction(role, code.trim());
      if (!res.success) {
        setError(res.error || 'Authentication rejected.');
        setLoading(false);
        return;
      }

      if (res.redirectPath) {
        window.location.href = res.redirectPath;
      } else {
        router.push(`/${role}`);
      }
    } catch (err: any) {
      setError(err?.message || 'A network error occurred while connecting to judge services.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-3xl bg-[#0c0c0e]/95 backdrop-blur-md border border-white/15 p-6 sm:p-8 shadow-2xl flex flex-col items-center">
      {/* Icon */}
      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-lg">
        <ShieldCheck className="w-6 h-6" />
      </div>

      <h1 className="text-xl font-bold text-white tracking-tight mb-1 text-center">
        Evaluator Access
      </h1>
      <p className="text-xs text-zinc-400 mb-6 text-center leading-relaxed">
        Confidential judge portal. Enter your security access code and desired evaluation role.
      </p>

      {/* Role Picker */}
      <div className="flex w-full p-1 rounded-2xl bg-white/5 border border-white/10 mb-5">
        {(['student', 'faculty', 'admin'] as JudgeRole[]).map((r) => {
          const active = role === r;
          const label = r === 'student' ? '🎓 Student' : r === 'faculty' ? '👨‍🏫 Faculty' : '🛡️ Admin';
          return (
            <button
              key={r}
              type="button"
              onClick={() => {
                setRole(r);
                setError(null);
              }}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all ${
                active
                  ? 'bg-white text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">
            Judge Access Code
          </label>
          <div className="relative">
            <input
              type="password"
              autoComplete="off"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter server access code"
              className="w-full px-4 py-3 pl-10 rounded-xl bg-white/5 border border-white/15 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white transition-all font-mono"
            />
            <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5 pointer-events-none" />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 text-xs text-rose-300 bg-rose-500/10 border-l-2 border-rose-400 px-3 py-2.5 rounded-r-lg font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-white hover:bg-zinc-200 text-black font-bold px-5 py-3 rounded-full shadow-lg border border-white transition text-sm active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying Code...</span>
            </>
          ) : (
            <span>Authenticate as {role.toUpperCase()}</span>
          )}
        </button>
      </form>
    </div>
  );
}
