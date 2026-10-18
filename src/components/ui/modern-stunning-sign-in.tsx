'use client';

import * as React from 'react';
import { useState } from 'react';

export interface SignIn1Props {
  onSignInSuccess?: (email: string, password?: string) => void;
  onGoogleSignIn?: () => void;
  isLoading?: boolean;
  isGoogleLoading?: boolean;
  externalError?: string | null;
  demoAccounts?: Array<{
    role: string;
    email: string;
    password: string;
    title: string;
  }>;
  onQuickDemoSelect?: (email: string, password: string) => void;
}

const SignIn1 = ({
  onSignInSuccess,
  onGoogleSignIn,
  isLoading = false,
  isGoogleLoading = false,
  externalError = null,
  demoAccounts,
  onQuickDemoSelect,
}: SignIn1Props) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');

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
      alert('Sign in successful! (Demo)');
    }
  };

  const displayError = externalError || error;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black relative overflow-hidden w-full px-4 py-8">
      {/* Background ambient lighting - duotone monochrome */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />

      {/* Centered glass card */}
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-[#0c0c0e]/90 backdrop-blur-md border border-white/15 shadow-2xl p-7 sm:p-8 flex flex-col items-center">
        {/* Logo */}
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 mb-5 shadow-lg border border-white/20">
          <svg
            className="w-6 h-6 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
          </svg>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-semibold text-white mb-2 text-center tracking-tight">
          Welcome Back
        </h2>
        <p className="text-xs text-zinc-400 mb-6 text-center">
          Sign in to your learning & progression account
        </p>

        {/* Form */}
        <form onSubmit={handleSignIn} className="flex flex-col w-full gap-4">
          <div className="w-full flex flex-col gap-3">
            <input
              placeholder="Email"
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
              <div className="text-xs text-zinc-300 bg-white/10 border-l-2 border-white px-2 py-1 text-left font-medium">
                {displayError}
              </div>
            )}
          </div>

          <hr className="opacity-10 border-white" />

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-white hover:bg-zinc-200 text-black font-bold px-5 py-3 rounded-full shadow-lg border border-white transition mb-3 text-sm active:scale-95 disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>

            {/* Google Sign In - duotone */}
            <button
              type="button"
              disabled={isLoading || isGoogleLoading}
              onClick={() => {
                if (onGoogleSignIn) {
                  onGoogleSignIn();
                } else {
                  setEmail('student@demo.edu');
                  setPassword('Password123!');
                }
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

            {/* Quick Demo Access Pills */}
            {demoAccounts && demoAccounts.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/10">
                <span className="text-[10px] text-zinc-400 uppercase font-mono block mb-2 text-center">
                  Quick Demo Access:
                </span>
                <div className="flex justify-center gap-1.5 flex-wrap">
                  {demoAccounts.map((demo) => (
                    <button
                      key={demo.role}
                      type="button"
                      onClick={() => {
                        setEmail(demo.email);
                        setPassword(demo.password);
                        onQuickDemoSelect?.(demo.email, demo.password);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] text-zinc-300 hover:text-white capitalize transition-all"
                    >
                      {demo.role}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="w-full text-center mt-3">
              <span className="text-xs text-zinc-400">
                Don&apos;t have an account?{' '}
                <a
                  href="/login?mode=signup"
                  className="underline text-white hover:text-zinc-300"
                >
                  Sign up, it&apos;s free!
                </a>
              </span>
            </div>
          </div>
        </form>
      </div>

      {/* User count and avatars */}
      <div className="relative z-10 mt-8 flex flex-col items-center text-center">
        <p className="text-zinc-400 text-xs sm:text-sm mb-2">
          Join <span className="font-semibold text-white">thousands</span> of students and faculty members already learning.
        </p>
        <div className="flex -space-x-2">
          {/* Unsplash avatars */}
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80&q=80"
            alt="Student user"
            className="w-8 h-8 rounded-full border-2 border-black object-cover ring-1 ring-white/10"
          />
          <img
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&h=80&q=80"
            alt="Student user"
            className="w-8 h-8 rounded-full border-2 border-black object-cover ring-1 ring-white/10"
          />
          <img
            src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&h=80&q=80"
            alt="Student user"
            className="w-8 h-8 rounded-full border-2 border-black object-cover ring-1 ring-white/10"
          />
          <img
            src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&h=80&q=80"
            alt="Student user"
            className="w-8 h-8 rounded-full border-2 border-black object-cover ring-1 ring-white/10"
          />
        </div>
      </div>
    </div>
  );
};

export { SignIn1 };
export default SignIn1;
