'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IS_DEMO_MODE } from '@/lib/config';
import { Wrench } from 'lucide-react';

function DemoRoleSwitchContent() {
  const pathname = usePathname();

  // Non-negotiable security guard: Never render unless NEXT_PUBLIC_DEMO_MODE=true
  if (!IS_DEMO_MODE) {
    return null;
  }

  return (
    <aside
      aria-label="Demo role switcher"
      className="fixed top-20 right-4 z-50 bg-slate-900/90 border border-amber-500/30 rounded-2xl p-3 shadow-2xl backdrop-blur-md text-xs text-white"
    >
      <div className="flex items-center gap-1.5 text-amber-400 font-semibold mb-2">
        <Wrench className="w-3.5 h-3.5" />
        <span>Demo Switcher (Dev Mode)</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <Link
          href="/student"
          className={`px-3 py-1.5 rounded-lg text-left transition-colors ${
            pathname.startsWith('/student')
              ? 'bg-emerald-500/20 text-emerald-300 font-medium'
              : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          🎓 Student View
        </Link>
        <Link
          href="/faculty"
          className={`px-3 py-1.5 rounded-lg text-left transition-colors ${
            pathname.startsWith('/faculty')
              ? 'bg-purple-500/20 text-purple-300 font-medium'
              : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          👨‍🏫 Faculty View
        </Link>
        <Link
          href="/admin"
          className={`px-3 py-1.5 rounded-lg text-left transition-colors ${
            pathname.startsWith('/admin')
              ? 'bg-rose-500/20 text-rose-300 font-medium'
              : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          🛡️ Admin View
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
