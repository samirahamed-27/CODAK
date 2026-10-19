'use client';

import * as React from 'react';
import { useState } from 'react';

export type UserPortalRole = 'student' | 'faculty' | 'admin';

export interface SignIn1Props {
  onSignInSuccess?: (email: string, password?: string) => void;
  onGoogleSignIn?: () => void;
  isLoading?: boolean;
  isGoogleLoading?: boolean;
  externalError?: string | null;
  initialRole?: UserPortalRole;
  demoAccounts?: Array<{
    role: string;
    email: string;
    password: string;
    title: string;
    name?: string;
  }>;
  onQuickDemoSelect?: (email: string, password: string) => void;
}

const PORTAL_META: Record<
  UserPortalRole,
  {
    icon: string;
    label: string;
    title: string;
    subtitle: string;
    placeholderEmail: string;
    defaultDemoEmail: string;
    defaultDemoName: string;
    demoNote: string;
  }
> = {
  student: {
    icon: '🎓',
    label: 'Student',
    title: 'Student Portal',
    subtitle: 'Sign in to your learning, quests & duel arena',
    placeholderEmail: 'student@institution.edu',
    defaultDemoEmail: 'student@demo.edu',
    defaultDemoName: 'Aarav Sharma',
    demoNote: 'Standard academic learner account',
  },
  faculty: {
    icon: '👨‍🏫',
    label: 'Faculty',
    title: 'Faculty Portal',
    subtitle: 'Curriculum oversight, question review & analytics',
    placeholderEmail: 'faculty@institution.edu',
    defaultDemoEmail: 'faculty@demo.edu',
    defaultDemoName: 'Dr. Priya Raman',
    demoNote: 'Course instructor & curriculum reviewer',
  },
  admin: {
    icon: '🛡️',
    label: 'Admin',
    title: 'Platform Admin',
    subtitle: 'XP rule engine, ledger audit & campus governance',
    placeholderEmail: 'admin@institution.edu',
    defaultDemoEmail: 'admin@demo.edu',
    defaultDemoName: 'Vikram Singh',
    demoNote: 'Super-admin platform console',
  },
};

const SignIn1 = ({
  onSignInSuccess,
  onGoogleSignIn,
  isLoading = false,
  isGoogleLoading = false,
  externalError = null,
  initialRole = 'student',
  demoAccounts,
  onQuickDemoSelect,
}: SignIn1Props) => {
  const [selectedRole, setSelectedRole] = useState<UserPortalRole>(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const currentMeta = PORTAL_META[selectedRole];

  const validateEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const handleSignIn = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');

    if (onSignInSuccess) {
      onSignInSuccess(email, password);
    } else {
      alert(`Sign in successful as ${selectedRole}! (Demo)`);
    }
  };

  const handleQuickAutofill = (targetEmail: string, targetPassword = 'Password123!') => {
    setEmail(targetEmail);
    setPassword(targetPassword);
    setError('');
    onQuickDemoSelect?.(targetEmail, targetPassword);
  };

  const displayError = externalError || error;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black relative overflow-hidden w-full px-4 py-8">
      {/* Background ambient lighting - duotone monochrome */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />

      {/* Centered glass card */}
      <div className="relative z-10 w-full max-w-md rounded-3xl bg-[#0c0c0e]/90 backdrop-blur-md border border-white/15 shadow-2xl p-6 sm:p-8 flex flex-col items-center">
        {/* Brand / Logo */}
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 mb-4 shadow-lg border border-white/20 text-2xl">
          {currentMeta.icon}
        </div>

        {/* Role Portal Selector Tabs */}
        <div className="flex w-full p-1 rounded-2xl bg-white/5 border border-white/10 mb-5">
          {(['student', 'faculty', 'admin'] as UserPortalRole[]).map((r) => {
            const meta = PORTAL_META[r];
            const active = selectedRole === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setSelectedRole(r);
                  setError('');
                }}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  active
                    ? 'bg-white text-black shadow-md shadow-white/10'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{meta.icon}</span>
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>

        {/* Portal Title & Subtitle */}
        <h2 className="text-2xl font-bold text-white mb-1.5 text-center tracking-tight">
          {currentMeta.title}
        </h2>
        <p className="text-xs text-zinc-400 mb-5 text-center leading-relaxed">
          {currentMeta.subtitle}
        </p>

        {/* Form */}
        <form onSubmit={handleSignIn} className="flex flex-col w-full gap-4">
          <div className="w-full flex flex-col gap-3">
            <input
              placeholder={currentMeta.placeholderEmail}
              type="email"
              value={email}
              autoComplete="email"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white transition-all"
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              placeholder="Password"
              type="password"
              value={password}
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white transition-all"
              onChange={(e) => setPassword(e.target.value)}
            />

            {displayError && (
              <div className="text-xs text-rose-300 bg-rose-500/10 border-l-2 border-rose-400 px-3 py-2 rounded-r-lg text-left font-medium">
                {displayError}
              </div>
            )}
          </div>

          {/* Quick Demo Evaluation Autofill Card */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-semibold text-zinc-200">
                {currentMeta.defaultDemoName}
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">
                {currentMeta.defaultDemoEmail}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleQuickAutofill(currentMeta.defaultDemoEmail, 'Password123!')}
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold transition border border-white/10 shadow-sm active:scale-95"
            >
              Auto-Fill Credentials
            </button>
          </div>

          <hr className="opacity-10 border-white" />

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-white hover:bg-zinc-200 text-black font-bold px-5 py-3 rounded-full shadow-lg border border-white transition mb-3 text-sm active:scale-95 disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : `Sign in to ${currentMeta.label} Hub`}
            </button>

            {/* Google Sign In - duotone */}
            <button
              type="button"
              disabled={isLoading || isGoogleLoading}
              onClick={() => {
                onGoogleSignIn?.();
              }}
              className="w-full flex items-center justify-center gap-2 bg-zinc-900 border border-white/15 rounded-full px-5 py-3 font-medium text-white shadow hover:bg-zinc-800 transition mb-2 text-sm active:scale-95 disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#ffffff"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#a1a1aa"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#71717a"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#d4d4d8"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
            </button>

            {/* Role-specific footnote / signup prompt */}
            <div className="w-full text-center mt-3">
              {selectedRole === 'student' ? (
                <span className="text-xs text-zinc-400">
                  Don&apos;t have an account?{' '}
                  <a
                    href="/login?mode=signup"
                    className="underline text-white hover:text-zinc-300 font-medium"
                  >
                    Sign up as a student
                  </a>
                </span>
              ) : (
                <span className="text-[11px] text-zinc-500">
                  {selectedRole === 'faculty'
                    ? 'Faculty accounts are provisioned by institution department chairs.'
                    : 'Administrator accounts are restricted to platform supervisors.'}
                </span>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Community proof & avatars */}
      <div className="relative z-10 mt-6 flex flex-col items-center text-center">
        <p className="text-zinc-400 text-xs sm:text-sm mb-2">
          Join <span className="font-semibold text-white">thousands</span> of students and faculty members across partner campuses.
        </p>
        <div className="flex -space-x-2">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80&q=80"
            alt="Student user"
            className="w-7 h-7 rounded-full border-2 border-black object-cover ring-1 ring-white/10"
          />
          <img
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&h=80&q=80"
            alt="Faculty user"
            className="w-7 h-7 rounded-full border-2 border-black object-cover ring-1 ring-white/10"
          />
          <img
            src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&h=80&q=80"
            alt="Student user"
            className="w-7 h-7 rounded-full border-2 border-black object-cover ring-1 ring-white/10"
          />
          <img
            src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&h=80&q=80"
            alt="Admin user"
            className="w-7 h-7 rounded-full border-2 border-black object-cover ring-1 ring-white/10"
          />
        </div>
      </div>
    </div>
  );
};

export { SignIn1 };
export default SignIn1;
