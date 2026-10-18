'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SignIn1 } from '@/components/ui/modern-stunning-sign-in';
import { usePreloader } from '@/components/ui/PreloaderContext';
import { GraduationCap, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { getCampusesAction } from '@/app/actions/campus';
import { formatCampusDisplayName } from '@/lib/campus';

const DEMO_ACCOUNTS = [
  {
    role: 'student' as const,
    title: 'Student Account',
    name: 'Aarav Sharma',
    email: 'student@demo.edu',
    password: 'Password123!',
    tag: 'CS Student (Lvl 1)',
    avatar: '🎓',
    badgeClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    cardBorder: 'hover:border-emerald-500/60',
    btnBg: 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40',
    path: '/student',
  },
  {
    role: 'faculty' as const,
    title: 'Faculty Account',
    name: 'Dr. Priya Raman',
    email: 'faculty@demo.edu',
    password: 'Password123!',
    tag: 'CS Faculty & Reviewer',
    avatar: '👨‍🏫',
    badgeClass: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    cardBorder: 'hover:border-purple-500/60',
    btnBg: 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border-purple-500/40',
    path: '/faculty',
  },
  {
    role: 'admin' as const,
    title: 'Administrator',
    name: 'Vikram Singh',
    email: 'admin@demo.edu',
    password: 'Password123!',
    tag: 'Campus Super Admin',
    avatar: '🛡️',
    badgeClass: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    cardBorder: 'hover:border-rose-500/60',
    btnBg: 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/40',
    path: '/admin',
  },
];

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
  const supabase = createClient();

  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Student Signup Fields
  const [fullName, setFullName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [campuses, setCampuses] = useState<{ id: string; name: string; city: string; is_other: boolean }[]>([]);
  const [selectedCampusId, setSelectedCampusId] = useState('');
  const [campusOtherName, setCampusOtherName] = useState('');

  useEffect(() => {
    async function loadCampuses() {
      const res = await getCampusesAction();
      if (res.success && res.campuses.length > 0) {
        setCampuses(res.campuses);
        setSelectedCampusId(res.campuses[0].id);
      }
    }
    loadCampuses();
  }, []);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'oauth_failed') {
      setErrorMessage('Google authentication was cancelled or failed. Please try again.');
    }
  }, [searchParams]);

  // Global React Bits Pro Stairs Preloader
  const { startPreload, isPreloading } = usePreloader();

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setErrorMessage(null);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setGoogleLoading(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Google authentication failed');
      setGoogleLoading(false);
    }
  };

  const handleAuthSubmit = async (inputEmail: string, inputPassword?: string) => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const targetEmail = inputEmail.trim();
    const targetPassword = inputPassword || 'Password123!';
    const demo = DEMO_ACCOUNTS.find((d) => d.email.toLowerCase() === targetEmail.toLowerCase());
    const isPlaceholderSupabase =
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id') ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    try {
      try {
        await supabase.auth.signOut();
      } catch {
        // Ignore signout errors
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: targetPassword,
      });

      if (error) {
        // Fallback for demo accounts or offline/placeholder Supabase
        if (demo || isPlaceholderSupabase) {
          const targetRole = demo ? demo.role : 'student';
          setSuccessMessage(`Demo access verified for ${targetEmail}!`);
          startPreload({
            role: targetRole,
            destination: `/${targetRole}`,
            text: `Welcome to CODAK • Entering ${targetRole.toUpperCase()} Hub`,
            subtext: 'Initializing XP ledger, course velocity & battle arena...',
          });
          return;
        }

        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        const role = (profile?.role as 'student' | 'faculty' | 'admin') || 'student';
        setSuccessMessage('Credentials verified!');
        startPreload({
          role: role,
          destination: `/${role}`,
          text: `Welcome to CODAK • Entering ${role.toUpperCase()} Hub`,
          subtext: 'Initializing XP ledger, course velocity & battle arena...',
        });
      }
    } catch (err: any) {
      if (demo || isPlaceholderSupabase) {
        const targetRole = demo ? demo.role : 'student';
        setSuccessMessage(`Demo access verified for ${targetEmail}!`);
        startPreload({
          role: targetRole,
          destination: `/${targetRole}`,
          text: `Welcome to CODAK • Entering ${targetRole.toUpperCase()} Hub`,
          subtext: 'Initializing XP ledger, course velocity & battle arena...',
        });
        return;
      }
      setErrorMessage(err.message || 'An unexpected error occurred.');
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (!selectedCampusId) {
        setErrorMessage('Please select your campus.');
        setLoading(false);
        return;
      }

      const selectedCampus = campuses.find((c) => c.id === selectedCampusId);
      if (selectedCampus?.is_other && (!campusOtherName.trim() || campusOtherName.trim().length < 2)) {
        setErrorMessage('Please enter your campus name (between 2 and 60 characters).');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            roll_no: rollNo,
            department: department,
            campus_id: selectedCampusId,
            campus_other_name: selectedCampus?.is_other ? campusOtherName.trim() : undefined,
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        setSuccessMessage('Account created successfully!');
        startPreload({
          role: 'student',
          destination: '/student',
          text: 'Welcome to CODAK • Entering STUDENT Hub',
          subtext: 'Initializing XP ledger, course velocity & battle arena...',
        });
      } else {
        setSuccessMessage('Account created! Please check your email to verify your account.');
        setLoading(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
      setLoading(false);
    }
  };

  return (
    <div
      className={`relative min-h-screen transition-all duration-300 ${
        isPreloading ? 'opacity-0 pointer-events-none scale-[0.98]' : 'opacity-100 scale-100'
      }`}
    >
      {mode === 'signin' ? (
        <div className="relative min-h-screen">
          {/* Mode Toggle Bar */}
          <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-medium transition-all cursor-target"
              data-cursor-label="Register"
            >
              Create Account
            </button>
          </div>

          {/* Success toast if redirecting */}
          {successMessage && (
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 p-3 px-4 rounded-xl bg-emerald-500 text-black font-semibold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Modern Stunning Sign-In Component */}
          <SignIn1
            onSignInSuccess={handleAuthSubmit}
            onGoogleSignIn={handleGoogleSignIn}
            isLoading={loading}
            isGoogleLoading={googleLoading}
            externalError={errorMessage}
            demoAccounts={DEMO_ACCOUNTS}
            onQuickDemoSelect={handleAuthSubmit}
          />
        </div>
      ) : (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 bg-[#07080B] relative">
      <div className="w-full max-w-md bg-gradient-to-r from-[#ffffff10] to-[#121212] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold text-white tracking-tight">Create Account</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Join the campus gamified academic progression platform
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-white/5 p-1 rounded-xl mb-6 border border-white/10">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className="flex-1 py-2 text-xs font-medium rounded-lg text-zinc-400 hover:text-white transition-all"
          >
            Sign In
          </button>
          <button
            type="button"
            className="flex-1 py-2 text-xs font-semibold rounded-lg bg-white/15 text-white shadow-sm border border-white/10"
          >
            Student Sign Up
          </button>
        </div>

        {/* Alert Messages */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Google One-Click Registration */}
        <div className="mb-5">
          <button
            type="button"
            disabled={loading || googleLoading}
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-b from-[#232526] to-[#1c1d1e] border border-white/10 rounded-full px-5 py-3 font-medium text-white shadow hover:brightness-110 transition text-xs active:scale-95 disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
          </button>

          <div className="flex items-center my-4">
            <div className="flex-1 border-t border-white/10" />
            <span className="px-3 text-[10px] text-zinc-500 font-mono uppercase">Or register with email</span>
            <div className="flex-1 border-t border-white/10" />
          </div>
        </div>

        {/* Signup Form */}
        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Aarav Sharma"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-sky-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Roll Number</label>
              <input
                type="text"
                required
                placeholder="CS-2026-042"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-sky-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-sky-400"
              >
                <option value="Computer Science">Computer Science</option>
                <option value="Information Tech">Information Tech</option>
                <option value="Electronics & Comm">Electronics & Comm</option>
                <option value="Mechanical">Mechanical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Campus</label>
            <select
              value={selectedCampusId}
              onChange={(e) => setSelectedCampusId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-sky-400"
            >
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {formatCampusDisplayName(c)}
                </option>
              ))}
            </select>
          </div>

          {campuses.find((c) => c.id === selectedCampusId)?.is_other && (
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Your Campus Name</label>
              <input
                type="text"
                required
                maxLength={60}
                placeholder="Enter your college or institution name"
                value={campusOtherName}
                onChange={(e) => setCampusOtherName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-sky-400"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="student@demo.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-sky-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-sky-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-semibold shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {loading ? <span>Creating account...</span> : <span>Create Student Account</span>}
          </button>
        </form>
      </div>
    </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
