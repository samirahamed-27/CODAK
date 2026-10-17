'use client';

import React, { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { levelFromXp } from '@/lib/levels';
import StaggeredMenu, { StaggeredMenuItem } from '@/components/StaggeredMenu';

interface AcademySidebarProps {
  totalXp?: number;
}

export function AcademySidebar({ totalXp = 1420 }: AcademySidebarProps) {
  const levelInfo = levelFromXp(totalXp);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const menuItems: StaggeredMenuItem[] = [
    { label: 'Home', ariaLabel: 'Go to student home', link: '/student' },
    { label: 'Learn', ariaLabel: 'Go to learning hub', link: '/student/learn' },
    { label: 'Rank', ariaLabel: 'Go to compete and leaderboard', link: '/student/compete' },
    { label: 'Play Quiz', ariaLabel: 'Go to daily quiz and practice', link: '/student/play' },
    { label: 'Overall', ariaLabel: 'View performance overview', link: '/student/profile' },
    { label: 'Log out', ariaLabel: 'Sign out of student account', link: '/api/auth/signout' },
  ];

  const accountLinks = [
    { label: 'Profile settings', link: '/student/profile' },
    { label: 'Log out', link: '/api/auth/signout' },
  ];

  const renderLevelCard = () => (
    <div className="p-4 rounded-2xl bg-[#10131E] border border-[#1D2233] shadow-lg mt-2">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-[#FFB27A] fill-[#FFB27A]" />
          <span className="font-pixel font-bold text-white text-[12px]">
            LVL {levelInfo.level}
          </span>
        </div>
        <span className="text-[11px] text-[#A9B8D6] font-medium">
          {levelInfo.xpIntoLevel} / {levelInfo.xpForNextLevel} XP
        </span>
      </div>

      <div
        className="w-full h-2 rounded-full bg-[#14214A] overflow-hidden p-0.5 border border-[#1E3A78]"
        role="progressbar"
        aria-valuenow={levelInfo.progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`XP progress to Level ${levelInfo.level + 1}`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-400 via-[#7CC4FF] to-[#FFB27A] shadow-[0_0_8px_rgba(255,178,122,0.5)] transition-all duration-500 ease-out"
          style={{ width: `${levelInfo.progressPercent}%` }}
        />
      </div>
      <div className="text-[10px] text-right text-[#6C7FAD] mt-1">
        {levelInfo.xpForNextLevel - levelInfo.xpIntoLevel} XP to Level {levelInfo.level + 1}
      </div>
    </div>
  );

  return (
    <div className="fixed top-5 left-5 z-40" suppressHydrationWarning>
      {mounted && (
        <StaggeredMenu
          position="left"
          headerTitle="ACADEMY"
          items={menuItems}
          socialItems={accountLinks}
          displaySocials={true}
          displayItemNumbering={true}
          colors={['#081024', '#101B3B', '#162854']}
          accentColor="#7DD3FC"
          menuButtonColor="#F1F5F9"
          openMenuButtonColor="#7DD3FC"
        >
          {renderLevelCard()}
        </StaggeredMenu>
      )}
    </div>
  );
}
