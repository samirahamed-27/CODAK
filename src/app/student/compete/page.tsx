'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import { getStudentLeagueAction, StudentLeagueData } from '@/app/actions/leagues';
import { XpChip } from '@/components/ui/game-elements';
import {
  Trophy,
  Shield,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Users,
  EyeOff,
  Medal,
  RefreshCw,
  Swords,
  Award,
} from 'lucide-react';
import clsx from 'clsx';
import Aurora from '@/components/Aurora';

export default function StudentCompetePage() {
  const [activeTab, setActiveTab] = useState<'league' | 'leaderboard' | 'duels'>('league');
  const [leagueData, setLeagueData] = useState<StudentLeagueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeague = async () => {
    try {
      const res = await getStudentLeagueAction();
      if (res.success && res.data) {
        setLeagueData(res.data);
      }
    } catch (e) {
      console.error('Error fetching league data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeague();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLeague();
  };

  const getTierColor = (tierId: string) => {
    switch (tierId) {
      case 'diamond':
        return {
          bg: 'from-cyan-500/20 to-blue-600/20 border-cyan-500/40 text-cyan-300',
          badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        };
      case 'gold':
        return {
          bg: 'from-amber-500/20 to-yellow-600/20 border-amber-500/40 text-amber-300',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        };
      case 'silver':
        return {
          bg: 'from-slate-400/20 to-zinc-500/20 border-slate-400/40 text-slate-200',
          badge: 'bg-slate-400/20 text-slate-200 border-slate-400/30',
        };
      case 'bronze':
      default:
        return {
          bg: 'from-orange-700/20 to-amber-900/20 border-amber-700/40 text-amber-400',
          badge: 'bg-amber-700/20 text-amber-400 border-amber-700/30',
        };
    }
  };

  const tierColors = leagueData ? getTierColor(leagueData.tierId) : getTierColor('bronze');

  return (
    <div className="min-h-screen flex flex-col relative pb-24 overflow-x-hidden bg-[#07080B]">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#07080b]/85">
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
          {/* Top navigation tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-xl">
            <button
              onClick={() => setActiveTab('league')}
              className={clsx(
                'flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5',
                activeTab === 'league'
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Weekly League</span>
            </button>

            <button
              onClick={() => setActiveTab('leaderboard')}
              className={clsx(
                'flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5',
                activeTab === 'leaderboard'
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Leaderboards</span>
            </button>

            <button
              onClick={() => setActiveTab('duels')}
              className={clsx(
                'flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5',
                activeTab === 'duels'
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Duels</span>
            </button>
          </div>

          {/* TAB 1: WEEKLY LEAGUE */}
          {activeTab === 'league' && (
            <div className="flex flex-col gap-4">
              {/* Header Card */}
              {leagueData && (
                <section
                  className={clsx(
                    'p-6 rounded-3xl border bg-gradient-to-b shadow-xl backdrop-blur-xl',
                    tierColors.bg
                  )}
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <span className={clsx('text-[10px] font-mono uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border', tierColors.badge)}>
                        {leagueData.weekKey} • Group {leagueData.groupNumber}
                      </span>
                      <h1 className="text-2xl font-black text-white mt-1.5 flex items-center gap-2">
                        <Shield className="w-6 h-6 text-amber-400" />
                        {leagueData.tierName}
                      </h1>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                        Reset in
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1 justify-end">
                        <Clock className="w-3.5 h-3.5" />
                        {leagueData.daysRemaining}d {leagueData.hoursRemaining}h
                      </span>
                    </div>
                  </div>

                  {/* My Performance Summary */}
                  <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-800/80 text-center">
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                      <span className="text-[10px] uppercase font-medium text-slate-400 block">My Rank</span>
                      <span className="text-base font-black text-white">#{leagueData.myRank}</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                      <span className="text-[10px] uppercase font-medium text-slate-400 block">Weekly XP</span>
                      <span className="text-base font-black text-indigo-400">{leagueData.myWeeklyXp}</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                      <span className="text-[10px] uppercase font-medium text-slate-400 block">Cohort Size</span>
                      <span className="text-base font-black text-slate-300">{leagueData.totalMembers}</span>
                    </div>
                  </div>
                </section>
              )}

              {/* Zone Legend */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px]">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Top 5: Promoted</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  <span>Safe</span>
                </div>
                <div className="flex items-center gap-1.5 text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span>Bottom 5: Relegated</span>
                </div>
              </div>

              {/* Standings List */}
              <section className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-xl space-y-2">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-400" />
                    <h2 className="text-sm font-bold text-white">Group Standings</h2>
                  </div>

                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <RefreshCw className={clsx('w-3.5 h-3.5', refreshing && 'animate-spin')} />
                    <span>Refresh</span>
                  </button>
                </div>

                {loading ? (
                  <p className="text-xs text-slate-500 text-center py-6">Loading league cohort...</p>
                ) : !leagueData || leagueData.standings.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">No students assigned to this group yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {leagueData.standings.map((member) => {
                      const isPromotion = member.zone === 'promotion';
                      const isRelegation = member.zone === 'relegation';

                      return (
                        <div
                          key={member.studentId}
                          className={clsx(
                            'p-3 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 text-xs',
                            member.isMe
                              ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg shadow-indigo-500/10'
                              : isPromotion
                              ? 'bg-emerald-950/15 border-emerald-500/30 text-slate-200'
                              : isRelegation
                              ? 'bg-rose-950/15 border-rose-500/30 text-slate-300'
                              : 'bg-slate-950/40 border-slate-800/60 text-slate-400'
                          )}
                        >
                          {/* Rank & Identity */}
                          <div className="flex items-center gap-3">
                            <span
                              className={clsx(
                                'w-6 text-center font-mono font-bold text-xs',
                                member.rank === 1
                                  ? 'text-amber-400 font-black'
                                  : member.rank === 2
                                  ? 'text-slate-300 font-bold'
                                  : member.rank === 3
                                  ? 'text-amber-600 font-bold'
                                  : 'text-slate-500'
                              )}
                            >
                              #{member.rank}
                            </span>

                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className={clsx('font-bold', member.isMe ? 'text-white' : 'text-slate-200')}>
                                  {member.name}
                                </span>
                                {member.isMe && (
                                  <span className="text-[9px] font-mono font-bold bg-indigo-500 text-white px-1.5 py-0.2 rounded">
                                    YOU
                                  </span>
                                )}
                                {member.isAnonymous && !member.isMe && (
                                  <span title="Anonymous Student">
                                    <EyeOff className="w-3 h-3 text-slate-500" />
                                  </span>
                                )}
                              </div>
                              {member.rollNo && (
                                <span className="text-[10px] text-slate-500 block font-mono">
                                  {member.rollNo}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Zone Indicator & XP */}
                          <div className="flex items-center gap-3">
                            {isPromotion && (
                              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5">
                                <TrendingUp className="w-3 h-3" />
                                <span className="hidden sm:inline">Promote</span>
                              </span>
                            )}
                            {isRelegation && (
                              <span className="text-[10px] font-bold text-rose-400 flex items-center gap-0.5">
                                <TrendingDown className="w-3 h-3" />
                                <span className="hidden sm:inline">Relegate</span>
                              </span>
                            )}
                            {!isPromotion && !isRelegation && (
                              <Minus className="w-3 h-3 text-slate-600" />
                            )}

                            <XpChip amount={member.weeklyXp} label="XP" size="sm" variant={member.isMe ? 'indigo' : 'emerald'} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* TAB 2: LEADERBOARD PLACEHOLDER */}
          {activeTab === 'leaderboard' && (
            <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-3xl">
              Loading Leaderboards (Campus & Batch)...
            </div>
          )}

          {/* TAB 3: DUELS PLACEHOLDER */}
          {activeTab === 'duels' && (
            <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-3xl">
              Loading Async Quiz Duels...
            </div>
          )}
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
