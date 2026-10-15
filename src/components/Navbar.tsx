'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UserRole } from '@/types/database';
import { LogOut, GraduationCap, ShieldAlert, Award } from 'lucide-react';

import Shuffle from '@/components/Shuffle';

interface NavbarProps {
  role?: UserRole;
  userName?: string;
}

export function Navbar({ role = 'student', userName }: NavbarProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Error signing out:', e);
    }
    router.push('/login');
    router.refresh();
  };

  const getRoleBadge = () => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-900 border border-slate-700 text-slate-300">
            <ShieldAlert className="w-3.5 h-3.5 text-sky-400" />
            Admin
          </span>
        );
      case 'faculty':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 border border-sky-500/30 text-sky-300">
            <Award className="w-3.5 h-3.5 text-sky-400" />
            Faculty
          </span>
        );
      case 'student':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#10131E] border border-sky-400/30 text-sky-300 shadow-[0_0_10px_rgba(125,211,252,0.1)]">
            <GraduationCap className="w-3.5 h-3.5 text-sky-400" />
            Student
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#1D2233] bg-[#07080B]/90 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href={`/${role}`} className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-[#10131E] border border-sky-400/40 flex items-center justify-center text-white shadow-lg shadow-sky-500/10 group-hover:scale-105 transition-transform">
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
            style={{ fontSize: '1.1rem', letterSpacing: '0.06em' }}
          />
        </Link>

        <div className="flex items-center gap-3">
          {getRoleBadge()}
          {userName && (
            <span className="hidden sm:inline text-xs text-slate-400 font-medium">
              {userName}
            </span>
          )}
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
