'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Home, BookOpen, Gamepad2, Trophy, User } from 'lucide-react';
import MagneticDock, { DockItem } from '@/components/ui/magnetic-dock';

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { id: '/student', label: 'Home', icon: <Home className="w-6 h-6" />, exact: true },
    { id: '/student/learn', label: 'Learn', icon: <BookOpen className="w-6 h-6" /> },
    { id: '/student/play', label: 'Play', icon: <Gamepad2 className="w-6 h-6" /> },
    { id: '/student/compete', label: 'Compete', icon: <Trophy className="w-6 h-6" /> },
    { id: '/student/profile', label: 'Profile', icon: <User className="w-6 h-6" /> },
  ];

  const dockItems: DockItem[] = navItems.map((item) => {
    const isActive = item.exact ? pathname === item.id : pathname.startsWith(item.id);
    return {
      id: item.id,
      label: item.label,
      icon: item.icon,
      active: isActive,
      tint: isActive 
        ? (['#38BDF8', '#0284C7'] as [string, string])
        : (['#161B26', '#0D111A'] as [string, string]),
    };
  });

  const handleSelect = (id: string) => {
    if (id !== pathname) {
      router.push(id);
    }
  };

  return (
    <div
      aria-label="Bottom Navigation Bar"
      className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none flex justify-center pb-4 px-4 sm:px-6"
    >
      <div className="pointer-events-auto w-full max-w-lg sm:max-w-xl flex justify-center">
        <MagneticDock
          items={dockItems}
          magnetRadius={135}
          maxScale={1.5}
          lift={16}
          idleWave={false}
          tooltip={true}
          onSelect={handleSelect}
          barClassName="w-full justify-between sm:justify-around px-6 sm:px-10"
          wrapperClassName="pt-0 pb-0 w-full"
        />
      </div>
    </div>
  );
}
