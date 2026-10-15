'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Gamepad2,
  Home,
  BookOpen,
  Trophy,
  PieChart,
  User,
  LogOut,
  Menu,
  X,
  Zap,
} from 'lucide-react';
import { levelFromXp } from '@/lib/levels';
import Shuffle from '@/components/Shuffle';

interface AcademySidebarProps {
  totalXp?: number;
}

export function AcademySidebar({ totalXp = 1420 }: AcademySidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Compute live level progress
  const levelInfo = levelFromXp(totalXp);

  const navItems = [
    { label: 'Home', href: '/student', icon: Home, exact: true },
    { label: 'Learn', href: '/student/learn', icon: BookOpen },
    { label: 'Rank', href: '/student/compete', icon: Trophy },
  ];

  const overallItems = [
    { label: 'Overall', href: '/student/profile', icon: PieChart },
  ];

  const accountItems = [
    { label: 'Profile settings', href: '/student/profile', icon: User },
    { label: 'Logout', href: '/login', icon: LogOut, isLogout: true },
  ];

  const renderNavLinks = () => (
    <div className="flex flex-col h-full justify-between">
      {/* Top Part: Logo & Main Navigation */}
      <div>
        {/* Logo "Academy" */}
        <div className="px-5 py-6 mb-2">
          <Link
            href="/student"
            className="group inline-flex items-center gap-3 focus:outline-none"
            onClick={() => setMobileOpen(false)}
          >
            <div className="w-10 h-10 rounded-2xl bg-[#10131E] border border-sky-400/40 flex items-center justify-center text-white shadow-lg shadow-sky-500/15 group-hover:scale-105 transition-transform">
              <Gamepad2 className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <Shuffle
                text="ACADEMY"
                tag="span"
                effect="slide"
                duration={0.35}
                stagger={0.03}
                triggerOnHover={true}
                color="#FFFFFF"
                accentColor="#7DD3FC"
                style={{ fontSize: '1.15rem', letterSpacing: '0.08em' }}
              />
              <div className="h-[2px] w-full bg-gradient-to-r from-sky-400 via-white to-transparent rounded-full mt-0.5 shadow-[0_0_8px_rgba(125,211,252,0.3)]" />
            </div>
          </Link>
        </div>

        {/* Primary Nav Items */}
        <nav aria-label="Main Navigation" className="px-3 space-y-1.5">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3.5 px-4 py-2.5 rounded-xl font-medium text-sm transition-all relative ${
                  isActive
                    ? 'bg-[#7CC4FF] text-[#06080F] shadow-[0_0_16px_rgba(124,196,255,0.4)] font-bold'
                    : 'text-[#A9B8D6] hover:text-white hover:bg-[#122452]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-transform ${
                    isActive ? 'scale-110 text-[#06080F]' : 'text-[#A9B8D6]'
                  }`}
                />
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute right-3 w-1.5 h-1.5 rounded-full bg-[#06080F]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* OVERALL Section */}
        <div className="mt-7 px-3">
          <div className="flex items-center gap-2 px-4 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C7FAD] font-pixel">
              OVERALL
            </span>
            <div className="h-[1px] flex-1 bg-[#1E3A78]/60" />
          </div>
          <div className="space-y-1">
            {overallItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3.5 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                    isActive
                      ? 'bg-[#7CC4FF] text-[#06080F] shadow-[0_0_16px_rgba(124,196,255,0.4)] font-bold'
                      : 'text-[#A9B8D6] hover:text-white hover:bg-[#122452]'
                  }`}
                >
                  <Icon className="w-4 h-4 text-[#A9B8D6]" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Part: Level Progress & Account Section */}
      <div className="px-3 pb-6 space-y-4">
        {/* Level / XP Progress Card */}
        <div className="p-3.5 rounded-2xl bg-[#081534] border border-[#1E3A78] shadow-md">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#FFB27A] fill-[#FFB27A]" />
              <span className="font-pixel font-bold text-white text-[11px]">
                LVL {levelInfo.level}
              </span>
            </div>
            <span className="text-[10px] text-[#A9B8D6] font-medium">
              {levelInfo.xpIntoLevel} / {levelInfo.xpForNextLevel} XP
            </span>
          </div>

          {/* XP Progress Bar (track #14214A, fill gradient from #7CC4FF to #FFB27A) */}
          <div
            className="w-full h-2 rounded-full bg-[#14214A] overflow-hidden p-0.5 border border-[#1E3A78]"
            role="progressbar"
            aria-valuenow={levelInfo.progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`XP progress to Level ${levelInfo.level + 1}`}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#7CC4FF] to-[#FFB27A] shadow-[0_0_8px_rgba(255,178,122,0.5)] transition-all duration-500 ease-out"
              style={{ width: `${levelInfo.progressPercent}%` }}
            />
          </div>
          <div className="text-[9px] text-right text-[#6C7FAD] mt-1">
            {levelInfo.xpForNextLevel - levelInfo.xpIntoLevel} XP to Level {levelInfo.level + 1}
          </div>
        </div>

        {/* ACCOUNT Section */}
        <div>
          <div className="flex items-center gap-2 px-4 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C7FAD] font-pixel">
              ACCOUNT
            </span>
            <div className="h-[1px] flex-1 bg-[#1E3A78]/60" />
          </div>
          <div className="space-y-1">
            {accountItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3.5 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                    item.isLogout
                      ? 'text-[#FFB27A] hover:text-[#FFCCA3] hover:bg-[#FFB27A]/10'
                      : 'text-[#A9B8D6] hover:text-white hover:bg-[#122452]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Hamburger Header (Visible only on screens < lg) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#0B1A3D] border-b border-[#7CC4FF]/25 z-40 px-4 flex items-center justify-between shadow-lg">
        <Link href="/student" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#7CC4FF] to-[#FFB27A] flex items-center justify-center text-[#06080F]">
            <Gamepad2 className="w-4 h-4 text-[#06080F]" />
          </div>
          <span className="font-pixel text-lg font-bold text-white tracking-wider">
            ACADEMY
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-xl bg-[#122452] border border-[#1E3A78] text-white hover:bg-[#7CC4FF] hover:text-[#06080F] transition-colors"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Desktop Fixed Left Sidebar (Navy #0B1A3D with #7CC4FF right edge glow) */}
      <aside
        aria-label="Desktop Sidebar Navigation"
        className="hidden lg:flex flex-col fixed top-0 left-0 bottom-0 w-[18%] min-w-[230px] max-w-[280px] bg-[#0B1A3D] border-r border-[#7CC4FF]/25 shadow-[4px_0_24px_rgba(124,196,255,0.15)] z-30 overflow-y-auto"
      >
        {renderNavLinks()}
      </aside>

      {/* Mobile Drawer (Sliding overlay) */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer Menu */}
          <aside
            aria-label="Mobile Sidebar Navigation"
            className="relative w-72 max-w-[80vw] h-full bg-[#0B1A3D] border-r border-[#7CC4FF]/30 shadow-2xl z-10 flex flex-col pt-4 overflow-y-auto"
          >
            <div className="flex justify-end px-4 mb-2">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg text-[#A9B8D6] hover:text-white"
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderNavLinks()}
          </aside>
        </div>
      )}
    </>
  );
}
