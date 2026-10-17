'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UserRole } from '@/types/database';
import { LogOut, GraduationCap, ShieldAlert, Award } from 'lucide-react';

import Shuffle from '@/components/Shuffle';
import StaggeredMenu, { StaggeredMenuItem } from '@/components/StaggeredMenu';

interface NavbarProps {
  role?: UserRole;
  userName?: string;
}

export function Navbar({ role = 'student', userName }: NavbarProps) {
  const router = useRouter();
  const supabase = createClient();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Error signing out:', e);
    }
    window.location.href = '/api/auth/signout';
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

  const menuItems: StaggeredMenuItem[] =
    role === 'faculty'
      ? [
          { label: 'Dashboard', ariaLabel: 'Go to Faculty Dashboard', link: '/faculty' },
          { label: 'Questions', ariaLabel: 'Manage Question Bank', link: '/faculty/questions' },
          { label: 'Student View', ariaLabel: 'Switch to Student View', link: '/student' },
          { label: 'Log out', ariaLabel: 'Sign out of account', link: '/api/auth/signout' },
        ]
      : role === 'admin'
      ? [
          { label: 'Admin Hub', ariaLabel: 'Go to Admin Hub', link: '/admin' },
          { label: 'XP Rules', ariaLabel: 'Manage XP Rules', link: '/admin/rules' },
          { label: 'Student View', ariaLabel: 'Switch to Student View', link: '/student' },
          { label: 'Log out', ariaLabel: 'Sign out of account', link: '/api/auth/signout' },
        ]
      : [
          { label: 'Dashboard', ariaLabel: 'Go to student dashboard', link: '/student' },
          { label: 'Learn', ariaLabel: 'Explore learning modules', link: '/student/learn' },
          { label: 'Play Quiz', ariaLabel: 'Daily quiz and practice mode', link: '/student/play' },
          { label: 'Compete', ariaLabel: 'League tables and duels', link: '/student/compete' },
          { label: 'Log out', ariaLabel: 'Sign out of account', link: '/api/auth/signout' },
        ];

  const socialLinks = [
    { label: 'Leaderboard', link: '/student#leaderboard' },
    { label: 'Log out', link: '/api/auth/signout' },
    { label: 'Home', link: '/' },
  ];

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

        <div className="flex items-center gap-2.5 sm:gap-3" suppressHydrationWarning>
          {getRoleBadge()}
          {userName && (
            <span className="hidden sm:inline text-xs text-slate-400 font-medium">
              {userName}
            </span>
          )}
          {mounted && (
            <StaggeredMenu
              items={menuItems}
              socialItems={socialLinks}
              displaySocials={true}
              displayItemNumbering={true}
              colors={['#10131E', '#1D2233', '#162846']}
              accentColor="#7DD3FC"
              menuButtonColor="#E2E8F0"
              openMenuButtonColor="#7DD3FC"
            />
          )}
          <button
            onClick={handleSignOut}
            title="Log out"
            aria-label="Log out of account"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all hover:scale-105 active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
