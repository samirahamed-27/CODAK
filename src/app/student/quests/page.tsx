'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import { getStudentQuestsAction } from '@/app/actions/quests';
import { Quest } from '@/lib/quests';
import { XpChip } from '@/components/ui/game-elements';
import { Target, CheckCircle2, Circle, Calendar, Sparkles, ArrowLeft, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import Aurora from '@/components/Aurora';

export default function StudentQuestsPage() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchQuests = async () => {
    try {
      const res = await getStudentQuestsAction();
      if (res.success) {
        setQuests(res.quests);
      }
    } catch (e) {
      console.error('Error loading quests:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchQuests();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchQuests();
  };

  const completedCount = quests.filter((q) => q.is_completed).length;

  return (
    <div className="min-h-screen flex flex-col relative pb-24 overflow-x-hidden bg-[#07080B]">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#07080b]/80">
        <Aurora
          colorStops={['#1e1b4b', '#0f172a', '#1e293b']}
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

        <main className="flex-1 max-w-lg w-full mx-auto px-4 py-6 flex flex-col gap-5">
          {/* Top header navigation */}
          <div className="flex items-center justify-between">
            <Link
              href="/student/learn"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Learn</span>
            </Link>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
            >
              <RefreshCw className={clsx('w-3.5 h-3.5', refreshing && 'animate-spin')} />
              <span>Refresh Progress</span>
            </button>
          </div>

          {/* Hero Banner */}
          <section className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 shadow-xl backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-bold block mb-1">
                  Academic Milestones
                </span>
                <h1 className="text-xl font-black text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-400" />
                  Learning Quests
                </h1>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                  Completed
                </span>
                <span className="text-sm font-bold text-emerald-400">
                  {completedCount} / {quests.length} Done
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real-world academic achievements. Every quest verifies your daily study actions and pays ledger-backed XP once per period.
            </p>
          </section>

          {/* Quests List */}
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading active quests...</div>
          ) : quests.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-3xl">
              No quests currently available. Check back on Monday!
            </div>
          ) : (
            <div className="space-y-4">
              {quests.map((quest) => (
                <div
                  key={quest.id}
                  className={clsx(
                    'p-5 rounded-3xl border transition-all duration-300 backdrop-blur-xl flex flex-col gap-4',
                    quest.is_completed
                      ? 'bg-slate-900/80 border-emerald-500/30 shadow-lg shadow-emerald-500/5'
                      : 'bg-slate-900/60 border-slate-800/80 shadow-md hover:border-slate-700'
                  )}
                >
                  {/* Quest Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className={clsx(
                            'text-[9px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border',
                            quest.period === 'weekly'
                              ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          )}
                        >
                          {quest.period === 'weekly' ? 'Weekly Quest' : 'Special Challenge'}
                        </span>
                        {quest.is_completed && (
                          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Completed
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-white">{quest.title}</h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {quest.description}
                      </p>
                    </div>

                    <div className="shrink-0">
                      <XpChip
                        amount={quest.reward_xp}
                        label="XP"
                        variant={quest.is_completed ? 'emerald' : 'indigo'}
                      />
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
                      <span>Progress</span>
                      <span className="font-bold text-slate-300">{quest.progress_percent || 0}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                      <div
                        className={clsx(
                          'h-full rounded-full transition-all duration-500',
                          quest.is_completed
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                            : 'bg-gradient-to-r from-indigo-500 to-violet-500'
                        )}
                        style={{ width: `${quest.progress_percent || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Tasks Checklist */}
                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold block">
                      Required Tasks
                    </span>
                    {(quest.tasks || []).map((task) => (
                      <div
                        key={task.id}
                        className={clsx(
                          'p-2.5 rounded-xl border flex items-center justify-between text-xs',
                          task.is_completed
                            ? 'bg-emerald-950/20 border-emerald-500/20 text-slate-200'
                            : 'bg-slate-950/40 border-slate-800/60 text-slate-400'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {task.is_completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-600 shrink-0" />
                          )}
                          <span className={clsx(task.is_completed && 'line-through text-slate-400')}>
                            {task.description}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-slate-400 ml-2">
                          {task.current_count || 0} / {task.target_count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
