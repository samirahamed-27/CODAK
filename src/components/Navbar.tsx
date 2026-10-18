'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UserRole } from '@/types/database';
import { GraduationCap, ShieldAlert, Award } from 'lucide-react';

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

  const getRoleBadge = () => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-900 border border-white/20 text-zinc-300">
            <ShieldAlert className="w-3.5 h-3.5 text-white" />
            Admin
          </span>
        );
      case 'faculty':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 border border-white/20 text-white">
            <Award className="w-3.5 h-3.5 text-white" />
            Faculty
          </span>
        );
      case 'student':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-900 border border-white/20 text-zinc-200">
            <GraduationCap className="w-3.5 h-3.5 text-white" />
            Student
          </span>
        );
    }
  };

  const menuItems: StaggeredMenuItem[] =
    role === 'faculty'
      ? [
          { label: 'Dashboard', ariaLabel: 'Go to Faculty Dashboard', link: '/faculty' },
          { label: 'Competitions', ariaLabel: 'Manage HackerRank Competitions', link: '/faculty/competitions' },
          { label: 'Questions', ariaLabel: 'Manage Question Bank', link: '/faculty/questions' },
          { label: 'Student View', ariaLabel: 'Switch to Student View', link: '/student' },
        ]
      : role === 'admin'
      ? [
          { label: 'Admin Hub', ariaLabel: 'Go to Admin Hub', link: '/admin' },
          { label: 'XP Rules', ariaLabel: 'Manage XP Rules', link: '/admin/rules' },
          { label: 'Student View', ariaLabel: 'Switch to Student View', link: '/student' },
        ]
      : [
          { label: 'Dashboard', ariaLabel: 'Go to student dashboard', link: '/student' },
          { label: 'Learn', ariaLabel: 'Daily quiz, practice mode & concepts', link: '/student/learn' },
          { label: 'Play', ariaLabel: 'Codemons retro cyber arcade arena', link: '/student/play' },
          { label: 'Compete', ariaLabel: 'League tables and duels', link: '/student/compete' },
          { label: 'Profile', ariaLabel: 'View student profile and settings', link: '/student/profile' },
        ];

  const socialLinks = [
    { label: 'Leaderboard', link: '/student#leaderboard' },
    { label: 'Log out', link: '/api/auth/signout' },
    { label: 'Home', link: '/' },
  ];

  return (
    <header className="sticky top-0 z-[100] w-full border-b border-white/10 bg-black/90 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href={`/${role}`} className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-white/20 flex items-center justify-center text-white shadow-none group-hover:scale-105 transition-transform">
            🎮
          </div>
          <Shuffle
            text="CODAK"
            tag="span"
            effect="slide"
            duration={0.3}
            stagger={0.02}
            triggerOnHover={true}
            color="#FFFFFF"
            accentColor="#A1A1AA"
            style={{ fontSize: '1.1rem', letterSpacing: '0.06em' }}
          />
        </Link>

        <div className="flex items-center gap-2.5 sm:gap-3" suppressHydrationWarning>
          {getRoleBadge()}
          {userName && (
            <span className="hidden sm:inline text-xs text-zinc-400 font-medium">
              {userName}
            </span>
          )}
          {mounted && (
            <StaggeredMenu
              items={menuItems}
              socialItems={socialLinks}
              displaySocials={true}
              displayItemNumbering={true}
              colors={['#18181b', '#121214', '#09090b']}
              accentColor="#FFFFFF"
              menuButtonColor="#FFFFFF"
              openMenuButtonColor="#FFFFFF"
            />
          )}
        </div>
      </div>
    </header>
  );
}
