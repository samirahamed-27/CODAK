'use client';

import React, { useState } from 'react';
import { Flame, Sparkles, Mail, Check, BellRing, LogOut } from 'lucide-react';
import { AnimatedCounter } from './AnimatedCounter';
import { StudentProfile } from '@/data/studentDashboardData';
import Shuffle from '@/components/Shuffle';

interface AcademyHeaderProps {
  profile: StudentProfile;
}

export function AcademyHeader({ profile }: AcademyHeaderProps) {
  const [showInbox, setShowInbox] = useState(false);
  const [notifications, setNotifications] = useState(profile.notifications);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 pt-1 border-b border-white/[0.06]">
      {/* Left: Student Name, Title Tag & Streak/XP Pill */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        <div>
          <div className="flex items-center gap-3">
            <Shuffle
              text={profile.name}
              tag="h1"
              effect="slide"
              duration={0.35}
              stagger={0.03}
              triggerOnHover={true}
              color="#FFFFFF"
              accentColor="#7DD3FC"
              style={{ fontSize: 'clamp(1.35rem, 2.5vw, 1.85rem)', letterSpacing: '0.02em', fontWeight: 700 }}
            />

            {/* Game Title Tag Badge */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-wide bg-sky-500/10 border border-sky-500/20 text-sky-300">
              <Sparkles className="w-3 h-3 text-sky-400" />
              {profile.titleTag}
            </span>
          </div>

          <p className="text-xs text-zinc-400 mt-1">
            Welcome back. Track your learning progression, complete quests, and compete with peers.
          </p>
        </div>

        {/* Quick Stats: Streak Flame & Total XP Badge */}
        <div className="flex items-center gap-2 mt-1 sm:mt-0 font-mono text-xs">
          {/* Day Streak */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/15 transition-all text-amber-300"
            title={`${profile.currentStreak} day learning streak`}
          >
            <Flame className="w-4 h-4 fill-amber-400/80 text-amber-400" />
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-white text-xs">
                <AnimatedCounter value={profile.currentStreak} suffix="d" />
              </span>
              <span className="text-[10px] text-zinc-400 font-sans">streak</span>
            </div>
          </div>

          {/* Total XP */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/15 transition-all text-sky-300"
            title={`Total Earned: ${profile.totalXp} XP`}
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-white text-xs">
                <AnimatedCounter value={profile.totalXp} suffix=" XP" />
              </span>
              <span className="text-[10px] text-zinc-400 font-sans">total</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Inbox/Mail Button & Log out Button */}
      <div className="flex items-center gap-2 self-end sm:self-center">
        <a
          href="/api/auth/signout"
          title="Log out"
          aria-label="Log out of student account"
          className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-zinc-400 hover:text-white hover:border-white/20 transition-all flex items-center gap-1.5 text-xs font-medium"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign out</span>
        </a>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowInbox(!showInbox)}
            aria-expanded={showInbox}
            aria-haspopup="dialog"
            aria-label="Student Notifications"
            className="relative p-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-zinc-400 hover:text-white hover:border-white/20 transition-all focus:outline-none"
          >
            <Mail className="w-4 h-4" />

            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-sky-400 text-black text-[9px] font-bold flex items-center justify-center ring-2 ring-[#07080B]"
                aria-label={`${unreadCount} unread messages`}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {/* Inbox Dropdown Modal / Popover */}
          {showInbox && (
            <div
              role="dialog"
              aria-label="Student Notifications"
              className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#0B0E17]/95 border border-white/10 shadow-2xl z-50 p-4 backdrop-blur-2xl text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <BellRing className="w-4 h-4 text-sky-400" />
                  <span className="font-semibold text-xs text-white">
                    Notifications
                  </span>
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-sky-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <Check className="w-3 h-3" /> Mark all read
                  </button>
                )}
              </div>

              <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
                {notifications.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-6">
                    No new notifications.
                  </p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 rounded-xl border text-xs transition-colors ${
                        n.unread
                          ? 'bg-sky-500/[0.06] border-sky-500/30 text-white'
                          : 'bg-white/[0.02] border-white/[0.06] text-zinc-400'
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold mb-1 text-[11px]">
                        <span className="text-sky-300">{n.sender}</span>
                        <span className="text-zinc-500 font-mono text-[10px]">
                          {n.timestamp}
                        </span>
                      </div>
                      <p className="leading-relaxed text-zinc-300">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
