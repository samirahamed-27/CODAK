'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import { User, ShieldCheck, EyeOff, Award, Sparkles } from 'lucide-react';

export default function StudentProfilePage() {
  const [isAnonymous, setIsAnonymous] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 pb-20">
      <Navbar role="student" userName="Aarav Sharma" />

      <main className="flex-1 max-w-md w-full mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Profile Header */}
        <section
          aria-label="Student profile card"
          className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 mx-auto flex items-center justify-center text-3xl shadow-xl shadow-indigo-500/25 mb-4">
            👨‍🎓
          </div>
          <h1 className="text-xl font-bold text-white mb-1">Aarav Sharma</h1>
          <p className="text-xs text-indigo-400 font-semibold mb-4">CS-2026-042 • Year 1</p>

          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-800 text-left">
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-medium">Department</span>
              <span className="text-xs text-slate-300 font-semibold">Computer Science</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-medium">Timezone</span>
              <span className="text-xs text-slate-300 font-semibold">Asia/Kolkata</span>
            </div>
          </div>
        </section>

        {/* Server-Enforced Anonymous Mode Toggle */}
        <section
          aria-label="Anonymous mode toggle"
          className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                <EyeOff className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Anonymous Mode</h2>
                <p className="text-[11px] text-slate-400">Opt out of public leaderboard names</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsAnonymous(!isAnonymous)}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${
                isAnonymous ? 'bg-indigo-600' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  isAnonymous ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
            <strong className="text-slate-300 block mb-0.5">Server-Enforced Privacy:</strong>
            When enabled, your name is replaced by a fun avatar (e.g., <em>"Anonymous Falcon"</em>) on the server before reaching any API responses.
          </div>
        </section>

        {/* Placeholder: Badges & Personal Bests */}
        <section
          aria-label="Badges and personal bests preview"
          className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              Badges & Personal Bests
            </h2>
            <span className="text-[10px] text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              Phase 3
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Improvement badges, streak milestones, and peer appreciation trophies will unlock in Phase 3.
          </p>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
