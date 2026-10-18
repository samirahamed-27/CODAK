'use client';

import React, { use, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import BattleArena from '@/components/battles/BattleArena';
import { Navbar } from '@/components/Navbar';
import Aurora from '@/components/Aurora';
import { ArrowLeft } from 'lucide-react';

function BattleContent({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  return <BattleArena battleId={id} onExit={() => router.push('/student/compete')} />;
}

export default function StudentBattlePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col relative pb-24 overflow-x-hidden bg-black text-white">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black/85">
        <Aurora
          colorStops={['#ffffff', '#27272a', '#09090b']}
          amplitude={1.0}
          blend={0.5}
          height={0.5}
          speed={0.8}
          glow={0.5}
          direction="top"
        />
      </div>

      <div className="relative z-10 flex-1 flex flex-col w-full">
        <Navbar role="student" userName="Aarav Sharma" />

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/student/compete')}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Compete</span>
            </button>
          </div>

          <Suspense fallback={<div className="p-8 text-center text-zinc-400 text-xs">Loading battle arena...</div>}>
            <BattleContent params={params} />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
