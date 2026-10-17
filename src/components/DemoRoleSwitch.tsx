'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IS_DEMO_MODE } from '@/lib/config';
import { Layers, UserCheck, GraduationCap, SlidersHorizontal } from 'lucide-react';

function DemoRoleSwitchContent() {
  const pathname = usePathname();

  // Non-negotiable security guard: Never render unless NEXT_PUBLIC_DEMO_MODE=true
  if (!IS_DEMO_MODE) {
    return null;
  }

  return (
    <aside
      aria-label="Demo role switcher"
      className="fixed bottom-6 left-6 z-50 bg-[#090A0F]/95 border border-white/10 rounded-2xl p-2.5 shadow-2xl backdrop-blur-md text-xs text-white"
    >
      <div className="flex items-center gap-1.5 text-sky-400 font-mono text-[10px] uppercase font-semibold px-2 py-1 mb-1">
        <span>Role Switcher</span>
      </div>
      <div className="flex flex-col gap-1">
        <Link
          href="/"
          className={`px-3 py-1.5 rounded-lg text-left transition-colors flex items-center gap-2 ${
            pathname === '/'
              ? 'bg-sky-500/20 text-sky-300 font-medium'
              : 'hover:bg-white/5 text-zinc-400'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Executive Hub</span>
        </Link>
        <Link
          href="/faculty"
          className={`px-3 py-1.5 rounded-lg text-left transition-colors flex items-center gap-2 ${
            pathname.startsWith('/faculty')
              ? 'bg-emerald-500/20 text-emerald-300 font-medium'
              : 'hover:bg-white/5 text-zinc-400'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Faculty (60s Log)</span>
        </Link>
        <Link
          href="/student"
          className={`px-3 py-1.5 rounded-lg text-left transition-colors flex items-center gap-2 ${
            pathname.startsWith('/student')
              ? 'bg-purple-500/20 text-purple-300 font-medium'
              : 'hover:bg-white/5 text-zinc-400'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Student Scope</span>
        </Link>
        <Link
          href="/admin"
          className={`px-3 py-1.5 rounded-lg text-left transition-colors flex items-center gap-2 ${
            pathname.startsWith('/admin')
              ? 'bg-amber-500/20 text-amber-300 font-medium'
              : 'hover:bg-white/5 text-zinc-400'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Semester Setup</span>
        </Link>
      </div>
    </aside>
  );
}

export function DemoRoleSwitch() {
  return (
    <Suspense fallback={null}>
      <DemoRoleSwitchContent />
    </Suspense>
  );
}
