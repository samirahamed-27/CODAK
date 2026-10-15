'use client';

import React, { useState } from 'react';
import { Flame, Sparkles, Mail, Check, BellRing } from 'lucide-react';
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
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 pt-2 border-b border-[#1D2233]">
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
              style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', letterSpacing: '0.04em' }}
            />

            {/* Game Title Tag Badge */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#10131E] border border-sky-400/40 text-sky-300 shadow-[0_0_12px_rgba(125,211,252,0.18)]">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              {profile.titleTag}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-body">
            Welcome back to the arena. Your daily quests and academic duels await!
          </p>
        </div>

        {/* Quick Stats: Streak Flame & Total XP Badge */}
        <div className="flex items-center gap-2.5 mt-1 sm:mt-0">
          {/* Day Streak (Pastel Orange #FFB27A) */}
          <div
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-[#0F2350] border-2 border-[#FFB27A]/60 shadow-[0_4px_0_#050B1E] text-[#FFB27A]"
            title={`${profile.currentStreak} day learning streak`}
          >
            <Flame className="w-5 h-5 fill-[#FFB27A] text-[#FFB27A] animate-pulse" />
            <div className="flex flex-col leading-none">
              <span className="font-pixel text-xs sm:text-sm font-bold text-white">
                <AnimatedCounter value={profile.currentStreak} suffix=" Days" />
              </span>
              <span className="text-[9px] uppercase tracking-wider text-[#FFB27A] font-bold">
                Streak 🔥
              </span>
            </div>
          </div>

          {/* Total XP (Pastel Orange #FFB27A) */}
          <div
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-[#0F2350] border-2 border-[#1E3A78] shadow-[0_4px_0_#050B1E] text-[#FFB27A]"
            title={`Total Earned: ${profile.totalXp} XP`}
          >
            <Sparkles className="w-4 h-4 text-[#FFB27A]" />
            <div className="flex flex-col leading-none">
              <span className="font-pixel text-xs sm:text-sm font-bold text-white">
                <AnimatedCounter value={profile.totalXp} suffix=" XP" />
              </span>
              <span className="text-[9px] uppercase tracking-wider text-[#FFB27A] font-bold">
                Total XP
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Inbox/Mail Button with Pastel Orange Badge */}
      <div className="relative self-end sm:self-center">
        <button
          type="button"
          onClick={() => setShowInbox(!showInbox)}
          aria-expanded={showInbox}
          aria-haspopup="dialog"
          aria-label="Student Inbox & Quest Alerts"
          className="relative p-3 rounded-2xl bg-[#0F2350] border-2 border-[#1E3A78] text-[#A9B8D6] hover:text-white hover:border-[#7CC4FF] shadow-[0_4px_0_#050B1E] active:translate-y-1 active:shadow-none transition-all focus:outline-none focus:ring-2 focus:ring-[#7CC4FF]"
        >
          <Mail className="w-5 h-5" />

          {/* Pastel Orange Notification Dot (#FFB27A with black text) */}
          {unreadCount > 0 && (
            <span
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#FFB27A] text-[#06080F] text-[10px] font-black font-pixel flex items-center justify-center shadow-[0_0_10px_rgba(255,178,122,0.6)] ring-2 ring-[#06080F] animate-bounce"
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
            className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl bg-[#0F2350] border-2 border-[#1E3A78] shadow-2xl z-50 p-4 animate-card-pop text-left"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#1E3A78]">
              <div className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-[#FFB27A]" />
                <span className="font-bold text-sm text-white font-pixel">
                  Academy Inbox
                </span>
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[11px] text-[#7CC4FF] hover:underline flex items-center gap-1 font-medium"
                >
                  <Check className="w-3 h-3" /> Mark all read
                </button>
              )}
            </div>

            <div className="mt-3 space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <p className="text-xs text-[#A9B8D6] text-center py-6">
                  No notifications yet.
                </p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 rounded-xl border text-xs transition-colors ${
                      n.unread
                        ? 'bg-[#12285C] border-[#7CC4FF]/50 text-white'
                        : 'bg-[#081534] border-[#1E3A78]/50 text-[#A9B8D6]'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold mb-1">
                      <span className="text-[#FFB27A]">{n.sender}</span>
                      <span className="text-[10px] text-[#6C7FAD]">
                        {n.timestamp}
                      </span>
                    </div>
                    <p className="leading-relaxed">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
