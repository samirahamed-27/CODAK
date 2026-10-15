'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { GraduationCap, ArrowRight, AlertCircle, CheckCircle, Zap } from 'lucide-react';
import Link from 'next/link';
import Shuffle from '@/components/Shuffle';

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

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Student Signup Fields
  const [fullName, setFullName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [department, setDepartment] = useState('Computer Science');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleQuickLogin = (demo: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(demo.email);
    setPassword(demo.password);
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(`Welcome back, ${demo.name}! Logging in as ${demo.role.toUpperCase()}...`);

    setTimeout(async () => {
      try {
        await supabase.auth.signInWithPassword({
          email: demo.email,
          password: demo.password,
        });
      } catch {
        // Safe fallback in offline or demo mode
      }
      router.push(demo.path);
      router.refresh();
    }, 450);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const demo = DEMO_ACCOUNTS.find((d) => d.email.toLowerCase() === email.trim().toLowerCase());
    const isPlaceholderSupabase =
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id') ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Graceful fallback for demo accounts or offline/placeholder Supabase
        if (demo || isPlaceholderSupabase) {
          const targetRole = demo ? demo.role : 'student';
          setSuccessMessage(`Demo login granted for ${email}! Redirecting...`);
          setTimeout(() => {
            router.push(`/${targetRole}`);
            router.refresh();
          }, 450);
          return;
        }

        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        // Fetch role to route to right dashboard
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        const role = profile?.role || 'student';
        router.push(`/${role}`);
        router.refresh();
      }
    } catch (err: any) {
      if (demo || isPlaceholderSupabase) {
        const targetRole = demo ? demo.role : 'student';
        setSuccessMessage(`Demo login granted for ${email}! Redirecting...`);
        setTimeout(() => {
          router.push(`/${targetRole}`);
          router.refresh();
        }, 450);
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
      // Golden Rule: We NEVER submit role in metadata.
      // Database trigger automatically forces role = 'student'.
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            roll_no: rollNo,
            department: department,
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        setSuccessMessage('Account created successfully! Redirecting...');
        setTimeout(() => {
          router.push('/student');
          router.refresh();
        }, 1200);
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
    <div className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 bg-[#07080B] game-bg-grid">
      <div className="w-full max-w-md bg-[#10131E]/95 border border-[#1D2233] rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        {/* Brand */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-3 group">
            <div className="w-10 h-10 rounded-2xl bg-[#07080B] border border-sky-400/40 flex items-center justify-center text-xl shadow-lg shadow-sky-500/10 group-hover:scale-105 transition-transform">
              🎮
            </div>
            <Shuffle
              text="GAMIFY"
              tag="span"
              effect="slide"
              duration={0.3}
              stagger={0.02}
              triggerOnHover={true}
              color="#FFFFFF"
              accentColor="#7DD3FC"
              style={{ fontSize: '1.25rem', letterSpacing: '0.06em' }}
            />
          </Link>
          <p className="text-xs text-slate-400">
            {mode === 'signin'
              ? 'Sign in to continue your learning streak'
              : 'Join the campus gamified learning challenge'}
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-[#07080B] p-1 rounded-xl mb-6 border border-[#1D2233]">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'signin'
                ? 'bg-sky-400 text-[#07080B] font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'signup'
                ? 'bg-sky-400 text-[#07080B] font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
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

        {/* Auth Form */}
        <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aarav Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Roll Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="CS-2026-042"
                    value={rollNo}
                    onChange={(e) => setRollNo(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Department
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#07080B] border border-[#1D2233] text-white text-xs focus:outline-none focus:border-sky-400"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Information Tech">Information Tech</option>
                    <option value="Electronics & Comm">Electronics & Comm</option>
                    <option value="Mechanical">Mechanical</option>
                  </select>
                </div>
              </div>

              {/* Informational banner: Student-only registration rule */}
              <div className="p-2.5 rounded-xl bg-[#07080B] border border-[#1D2233] text-[11px] text-slate-400 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-sky-400 shrink-0" />
                <span>
                  All new signups register as <strong>Students</strong>. Faculty and Admin accounts are provisioned separately.
                </span>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="student@demo.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#07080B] border border-[#1D2233] text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-sky-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#07080B] border border-[#1D2233] text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-sky-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-sky-400 hover:bg-sky-300 active:scale-[0.99] text-[#07080B] text-xs font-bold shadow-lg shadow-sky-500/20 border border-sky-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>{mode === 'signin' ? 'Sign In' : 'Create Student Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Accounts 1-Click Login Section */}
        {mode === 'signin' && (
          <div className="mt-6 pt-5 border-t border-[#1D2233]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-semibold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                Quick Demo Accounts (1-Click)
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                PW: Password123!
              </span>
            </div>

            <div className="space-y-2">
              {DEMO_ACCOUNTS.map((demo) => (
                <div
                  key={demo.role}
                  className={`group flex items-center justify-between p-2.5 rounded-xl bg-[#07080B] border border-[#1D2233] ${demo.cardBorder} transition-all`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-lg shrink-0">{demo.avatar}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-white truncate">
                          {demo.name}
                        </span>
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${demo.badgeClass}`}>
                          {demo.role.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        {demo.email}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    id={`btn-quick-login-${demo.role}`}
                    onClick={() => handleQuickLogin(demo)}
                    disabled={loading}
                    className={`shrink-0 ml-2 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all flex items-center gap-1 active:scale-95 disabled:opacity-50 ${demo.btnBg}`}
                  >
                    <span>Instant Login</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
