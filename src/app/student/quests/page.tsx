'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import Aurora from '@/components/Aurora';
import { XpChip } from '@/components/ui/game-elements';
import { Target, CheckCircle2, Circle, ArrowLeft, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { getStudentQuestsAction } from '@/app/actions/quests';
import { Quest, QuestTask } from '@/lib/quests';

export default function StudentQuestsPage() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchQuests = async () => {
    try {
      const res = await getStudentQuestsAction();
      if (res.success && res.quests) {
        setQuests(res.quests);
      }
    } catch {
      // Fallback
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
    <div className="min-h-screen flex flex-col relative pb-24 overflow-x-hidden bg-black text-zinc-100">
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
        <Navbar role="student" />

        <main className="flex-1 max-w-lg w-full mx-auto px-4 py-6 flex flex-col gap-5">
          {/* Top header navigation */}
          <div className="flex items-center justify-between">
            <Link
              href="/student/learn"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Learn</span>
            </Link>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white hover:text-zinc-300 disabled:opacity-50"
            >
              <RefreshCw className={clsx('w-3.5 h-3.5', refreshing && 'animate-spin')} />
              <span>Refresh Progress</span>
            </button>
          </div>

          {/* Hero Banner */}
          <section className="p-6 rounded-3xl bg-[#0c0c0e] border border-white/15 shadow-xl backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold block mb-1">
                  Academic Milestones
                </span>
                <h1 className="text-xl font-black text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-white" />
                  Learning Quests
                </h1>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">
                  Completed
                </span>
                <span className="text-sm font-bold text-white">
                  {completedCount} / {quests.length} Done
                </span>
              </div>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Real-world academic achievements. Every quest verifies your daily study actions and pays ledger-backed XP once per period.
            </p>
          </section>

          {/* Quests List */}
          {loading ? (
            <div className="p-8 text-center text-xs text-zinc-500">Loading active quests...</div>
          ) : quests.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500 border border-dashed border-white/15 rounded-3xl">
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
                      ? 'bg-[#0c0c0e] border-white/30 shadow-lg shadow-white/5'
                      : 'bg-[#0c0c0e]/80 border-white/15 shadow-md hover:border-white/25'
                  )}
                >
                  {/* Quest Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[9px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border bg-white/10 text-white border-white/20">
                          {quest.period === 'weekly' ? 'Weekly Quest' : 'Special Challenge'}
                        </span>
                        {quest.is_completed && (
                          <span className="text-[9px] font-bold text-white bg-white/10 border border-white/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                            Completed
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-white">{quest.title}</h3>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
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
                    <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400">
                      <span>Progress</span>
                      <span className="font-bold text-white">{quest.progress_percent || 0}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-black border border-white/10 overflow-hidden">
                      <div
                        className={clsx(
                          'h-full rounded-full transition-all duration-500',
                          quest.is_completed
                            ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]'
                            : 'bg-gradient-to-r from-zinc-500 to-zinc-300'
                        )}
                        style={{ width: `${quest.progress_percent || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Tasks Checklist */}
                  <div className="pt-2 border-t border-white/10 space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold block">
                      Required Tasks
                    </span>
                    {(quest.tasks || []).map((task: QuestTask) => (
                      <div
                        key={task.id}
                        className={clsx(
                          'p-2.5 rounded-xl border flex items-center justify-between text-xs',
                          task.is_completed
                            ? 'bg-white/10 border-white/20 text-white'
                            : 'bg-black/50 border-white/10 text-zinc-400'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {task.is_completed ? (
                            <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-zinc-600 shrink-0" />
                          )}
                          <span className={clsx(task.is_completed && 'line-through text-zinc-400')}>
                            {task.description}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-zinc-400 ml-2">
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
