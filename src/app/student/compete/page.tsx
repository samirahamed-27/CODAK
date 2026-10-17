'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import { getStudentLeagueAction, StudentLeagueData } from '@/app/actions/leagues';
import { getLeaderboardAction } from '@/app/actions/leaderboard';
import { LeaderboardEntry } from '@/lib/leaderboards';
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
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Timer,
  Zap,
} from 'lucide-react';
import clsx from 'clsx';
import Aurora from '@/components/Aurora';
import {
  getMyDuelsAction,
  createOrJoinAutoMatchAction,
  getDuelSessionAction,
  submitDuelAnswersAction,
  DuelSummary,
} from '@/app/actions/duels';
import { SafeDuelQuestion } from '@/lib/duels';
import { getMyBattlesAction } from '@/app/actions/battles';
import { Battle } from '@/lib/battles';
import Link from 'next/link';

export default function StudentCompetePage() {
  const [activeTab, setActiveTab] = useState<'league' | 'leaderboard' | 'duels' | 'battles'>('league');
  const [leagueData, setLeagueData] = useState<StudentLeagueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [lbScope, setLbScope] = useState<'campus' | 'batch'>('campus');
  const [lbTimeframe, setLbTimeframe] = useState<'weekly' | 'all-time'>('weekly');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(false);

  // Duels state
  const [duels, setDuels] = useState<DuelSummary[]>([]);
  const [duelsLoading, setDuelsLoading] = useState(false);
  const [quickMatching, setQuickMatching] = useState(false);
  const [quickMatchMsg, setQuickMatchMsg] = useState<string | null>(null);

  // Battles state
  const [battles, setBattles] = useState<{
    live: Battle[];
    upcoming: Battle[];
    finished: Battle[];
    enrolledBattleIds: string[];
  }>({ live: [], upcoming: [], finished: [], enrolledBattleIds: [] });
  const [battlesLoading, setBattlesLoading] = useState(false);

  // Active duel playing state
  const [playingDuelId, setPlayingDuelId] = useState<string | null>(null);
  const [duelQuestions, setDuelQuestions] = useState<SafeDuelQuestion[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedChoices, setSelectedChoices] = useState<Record<string, string>>({});
  const [questionStartTimes, setQuestionStartTimes] = useState<Record<string, number>>({});
  const [questionDurations, setQuestionDurations] = useState<Record<string, number>>({});
  const [duelStartTime, setDuelStartTime] = useState<number>(0);
  const [submittingAnswers, setSubmittingAnswers] = useState(false);
  const [duelResult, setDuelResult] = useState<{
    score: number;
    isCompleted?: boolean;
    isWinner?: boolean;
    isDraw?: boolean;
  } | null>(null);
  const [duelError, setDuelError] = useState<string | null>(null);

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

  const fetchLeaderboard = async (scope = lbScope, timeframe = lbTimeframe) => {
    setLbLoading(true);
    try {
      const res = await getLeaderboardAction({ scope, timeframe });
      if (res.success) {
        setLeaderboard(res.leaderboard);
      }
    } catch (e) {
      console.error('Error fetching leaderboard:', e);
    } finally {
      setLbLoading(false);
    }
  };

  const fetchDuels = async () => {
    setDuelsLoading(true);
    try {
      const res = await getMyDuelsAction();
      if (res.success) {
        setDuels(res.duels);
      }
    } catch (e) {
      console.error('Error fetching duels:', e);
    } finally {
      setDuelsLoading(false);
    }
  };

  const fetchBattles = async () => {
    setBattlesLoading(true);
    try {
      const res = await getMyBattlesAction();
      if (res.success) {
        setBattles({
          live: res.live,
          upcoming: res.upcoming,
          finished: res.finished,
          enrolledBattleIds: res.enrolledBattleIds,
        });
      }
    } catch (e) {
      console.error('Error fetching battles:', e);
    } finally {
      setBattlesLoading(false);
    }
  };

  useEffect(() => {
    fetchLeague();
  }, []);

  useEffect(() => {
    if (activeTab === 'leaderboard') {
      fetchLeaderboard(lbScope, lbTimeframe);
    } else if (activeTab === 'duels') {
      fetchDuels();
    } else if (activeTab === 'battles') {
      fetchBattles();
    }
  }, [activeTab, lbScope, lbTimeframe]);

  const handleRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'league') {
      fetchLeague();
    } else if (activeTab === 'leaderboard') {
      fetchLeaderboard(lbScope, lbTimeframe);
    } else if (activeTab === 'duels') {
      fetchDuels().finally(() => setRefreshing(false));
    } else if (activeTab === 'battles') {
      fetchBattles().finally(() => setRefreshing(false));
    }
  };

  const handleQuickMatch = async () => {
    setQuickMatching(true);
    setQuickMatchMsg(null);
    try {
      const res = await createOrJoinAutoMatchAction();
      if (res.success && res.duelId) {
        setQuickMatchMsg(
          res.isNew
            ? 'New open duel created! Waiting for a peer to match.'
            : 'Matched with an opponent! Starting duel now...'
        );
        await fetchDuels();
        if (!res.isNew) {
          handleStartDuel(res.duelId);
        }
      } else {
        setQuickMatchMsg(res.error || 'Failed to find match');
      }
    } catch (e: any) {
      setQuickMatchMsg(e.message || 'Matchmaking error');
    } finally {
      setQuickMatching(false);
    }
  };

  const handleStartDuel = async (duelId: string) => {
    setDuelError(null);
    setDuelResult(null);
    setSubmittingAnswers(false);
    try {
      const res = await getDuelSessionAction(duelId);
      if (res.success && res.questions && res.questions.length > 0) {
        setPlayingDuelId(duelId);
        setDuelQuestions(res.questions);
        setCurrentQuestionIdx(0);
        setSelectedChoices({});
        const now = Date.now();
        setDuelStartTime(now);
        setQuestionStartTimes({ [res.questions[0].id]: now });
        setQuestionDurations({});
      } else {
        setDuelError(res.error || 'Could not load questions for this duel');
      }
    } catch (e: any) {
      setDuelError(e.message || 'Error opening duel');
    }
  };

  const handleSelectChoice = (questionId: string, choiceKey: string) => {
    setSelectedChoices((prev) => ({ ...prev, [questionId]: choiceKey }));
  };

  const handleNextQuestion = () => {
    const currentQ = duelQuestions[currentQuestionIdx];
    const now = Date.now();
    const duration = Math.round((now - (questionStartTimes[currentQ.id] || now)) / 1000);
    setQuestionDurations((prev) => ({ ...prev, [currentQ.id]: duration }));

    if (currentQuestionIdx < duelQuestions.length - 1) {
      const nextQ = duelQuestions[currentQuestionIdx + 1];
      setCurrentQuestionIdx((prev) => prev + 1);
      setQuestionStartTimes((prev) => ({ ...prev, [nextQ.id]: Date.now() }));
    }
  };

  const handleSubmitDuel = async () => {
    if (!playingDuelId) return;
    setSubmittingAnswers(true);
    setDuelError(null);

    const currentQ = duelQuestions[currentQuestionIdx];
    const now = Date.now();
    const finalDuration = Math.round((now - (questionStartTimes[currentQ.id] || now)) / 1000);
    const updatedDurations = { ...questionDurations, [currentQ.id]: finalDuration };
    const totalTime = Math.round((now - duelStartTime) / 1000);

    const answersPayload = duelQuestions.map((q) => ({
      questionId: q.id,
      selectedChoice: selectedChoices[q.id] || '',
      timeSpentSeconds: updatedDurations[q.id] || 0,
    }));

    try {
      const res = await submitDuelAnswersAction({
        duelId: playingDuelId,
        answers: answersPayload,
        totalTimeSeconds: totalTime,
      });

      if (res.success) {
        setDuelResult({
          score: res.score ?? 0,
          isCompleted: res.isCompleted,
          isWinner: res.isWinner,
          isDraw: res.isDraw,
        });
        await fetchDuels();
      } else {
        setDuelError(res.error || 'Failed to submit answers');
      }
    } catch (e: any) {
      setDuelError(e.message || 'Submission error');
    } finally {
      setSubmittingAnswers(false);
    }
  };

  const handleCloseDuelModal = () => {
    setPlayingDuelId(null);
    setDuelQuestions([]);
    setDuelResult(null);
    setDuelError(null);
    fetchDuels();
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

            <button
              onClick={() => setActiveTab('battles')}
              className={clsx(
                'flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5',
                activeTab === 'battles'
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Battles</span>
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

          {/* TAB 2: LEADERBOARDS (Campus & Batch, Weekly & All-Time, Anonymous Mode) */}
          {activeTab === 'leaderboard' && (
            <div className="flex flex-col gap-4">
              {/* Filter Controls Card */}
              <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-xl flex flex-col gap-3">
                {/* Scope Selection */}
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold block mb-1.5">
                    Leaderboard Scope
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setLbScope('campus')}
                      className={clsx(
                        'flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all',
                        lbScope === 'campus'
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-white'
                      )}
                    >
                      Campus Wide
                    </button>
                    <button
                      type="button"
                      onClick={() => setLbScope('batch')}
                      className={clsx(
                        'flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all',
                        lbScope === 'batch'
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-white'
                      )}
                    >
                      My Batch / Department
                    </button>
                  </div>
                </div>

                {/* Timeframe Selection */}
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold block mb-1.5">
                    Timeframe
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setLbTimeframe('weekly')}
                      className={clsx(
                        'flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all',
                        lbTimeframe === 'weekly'
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                          : 'bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-white'
                      )}
                    >
                      This Week (IST)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLbTimeframe('all-time')}
                      className={clsx(
                        'flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all',
                        lbTimeframe === 'all-time'
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                          : 'bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-white'
                      )}
                    >
                      All-Time Ledger
                    </button>
                  </div>
                </div>
              </div>

              {/* Leaderboard List Section */}
              <section className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-xl space-y-2">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <h2 className="text-sm font-bold text-white">
                      {lbScope === 'campus' ? 'Campus Standing' : 'Batch Standing'} •{' '}
                      {lbTimeframe === 'weekly' ? 'Weekly' : 'All-Time'}
                    </h2>
                  </div>

                  <button
                    onClick={handleRefresh}
                    disabled={refreshing || lbLoading}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <RefreshCw className={clsx('w-3.5 h-3.5', (refreshing || lbLoading) && 'animate-spin')} />
                    <span>Refresh</span>
                  </button>
                </div>

                {lbLoading ? (
                  <p className="text-xs text-slate-500 text-center py-6">Aggregating ledger XP...</p>
                ) : leaderboard.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">No leaderboard records found.</p>
                ) : (
                  <div className="space-y-1.5">
                    {leaderboard.map((student) => (
                      <div
                        key={student.studentId}
                        className={clsx(
                          'p-3 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 text-xs',
                          student.isMe
                            ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg shadow-indigo-500/10'
                            : student.rank <= 3
                            ? 'bg-amber-950/15 border-amber-500/30 text-slate-200'
                            : 'bg-slate-950/40 border-slate-800/60 text-slate-300'
                        )}
                      >
                        {/* Rank & Profile */}
                        <div className="flex items-center gap-3">
                          <span
                            className={clsx(
                              'w-6 text-center font-mono font-bold text-xs',
                              student.rank === 1
                                ? 'text-amber-400 font-black flex items-center justify-center'
                                : student.rank === 2
                                ? 'text-slate-300 font-bold flex items-center justify-center'
                                : student.rank === 3
                                ? 'text-amber-600 font-bold flex items-center justify-center'
                                : 'text-slate-500'
                            )}
                          >
                            {student.rank === 1 ? '🥇' : student.rank === 2 ? '🥈' : student.rank === 3 ? '🥉' : `#${student.rank}`}
                          </span>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className={clsx('font-bold', student.isMe ? 'text-white' : 'text-slate-200')}>
                                {student.name}
                              </span>
                              {student.isMe && (
                                <span className="text-[9px] font-mono font-bold bg-indigo-500 text-white px-1.5 py-0.2 rounded">
                                  YOU
                                </span>
                              )}
                              {student.isAnonymous && !student.isMe && (
                                <span title="Anonymous Student">
                                  <EyeOff className="w-3 h-3 text-slate-500" />
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                              {student.rollNo && <span>{student.rollNo}</span>}
                              {student.department && <span>• {student.department}</span>}
                            </div>
                          </div>
                        </div>

                        {/* XP Amount */}
                        <div className="shrink-0">
                          <XpChip
                            amount={student.totalXp}
                            label="XP"
                            size="sm"
                            variant={student.isMe ? 'indigo' : student.rank <= 3 ? 'amber' : 'emerald'}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* TAB 3: ASYNC QUIZ DUELS */}
          {activeTab === 'duels' && (
            <div className="space-y-6">
              {/* Quick Match Action Card */}
              <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-950/40 via-purple-950/30 to-slate-900/40 border border-indigo-500/30 shadow-xl space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
                      <Swords className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        Async Quiz Duels
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                          +25 XP Win
                        </span>
                      </h2>
                      <p className="text-xs text-slate-400">
                        Identical 5 approved questions • 24h timer • Speed tie-breaker • No XP deducted on loss
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    onClick={handleQuickMatch}
                    disabled={quickMatching}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4 text-amber-300" />
                    {quickMatching ? 'Finding Match...' : '⚡ Quick Match / Create Duel'}
                  </button>

                  {quickMatchMsg && (
                    <span className="text-xs text-indigo-300 font-mono animate-fade-in text-center sm:text-left">
                      {quickMatchMsg}
                    </span>
                  )}
                </div>
              </div>

              {/* Duels List Section */}
              <div className="space-y-4">
                {duelsLoading ? (
                  <div className="p-8 text-center text-xs text-slate-500 border border-slate-800 rounded-3xl">
                    Loading your duels...
                  </div>
                ) : duels.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-3xl space-y-2">
                    <Swords className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="font-medium text-slate-300">No active or past duels found.</p>
                    <p className="text-slate-500">
                      Hit Quick Match above to challenge a peer student on a 5-question battle!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Active & Open Matches */}
                    {duels.filter((d) => d.status === 'open' || d.status === 'active').length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">
                          Active & Open Duels ({duels.filter((d) => d.status === 'open' || d.status === 'active').length})
                        </h3>

                        {duels
                          .filter((d) => d.status === 'open' || d.status === 'active')
                          .map((duel) => (
                            <div
                              key={duel.id}
                              className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-200">
                                    vs. {duel.opponentName}
                                  </span>
                                  {duel.opponentRollNo && (
                                    <span className="text-[10px] font-mono text-slate-500">
                                      ({duel.opponentRollNo})
                                    </span>
                                  )}
                                  <span
                                    className={clsx(
                                      'text-[10px] font-mono px-2 py-0.5 rounded-full border',
                                      duel.status === 'open'
                                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                        : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                                    )}
                                  >
                                    {duel.status === 'open' ? 'Open Matchmaking' : 'Active Duel'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                                  <Clock className="w-3 h-3" />
                                  <span>Expires: {new Date(duel.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(duel.expiresAt).toLocaleDateString()})</span>
                                </div>
                              </div>

                              <div>
                                {!duel.mySubmitted ? (
                                  <button
                                    onClick={() => handleStartDuel(duel.id)}
                                    className="px-4 py-2 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                                  >
                                    <Play className="w-3.5 h-3.5" />
                                    Play Duel (5 Qs)
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-2 text-indigo-300 bg-indigo-950/40 border border-indigo-500/30 px-3 py-1.5 rounded-xl font-mono text-[11px]">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>You: {duel.myScore}/5 ({duel.myTime}s) • Waiting for opponent</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Completed Matches History */}
                    {duels.filter((d) => d.status === 'completed').length > 0 && (
                      <div className="space-y-2 pt-2">
                        <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                          Completed History ({duels.filter((d) => d.status === 'completed').length})
                        </h3>

                        {duels
                          .filter((d) => d.status === 'completed')
                          .map((duel) => (
                            <div
                              key={duel.id}
                              className={clsx(
                                'p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs',
                                duel.isWinner
                                  ? 'bg-emerald-950/20 border-emerald-500/30'
                                  : duel.isDraw
                                  ? 'bg-amber-950/20 border-amber-500/30'
                                  : 'bg-slate-900/40 border-slate-800/80'
                              )}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={clsx(
                                      'text-[10px] font-mono font-bold px-2 py-0.5 rounded border',
                                      duel.isWinner
                                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                        : duel.isDraw
                                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                        : 'bg-slate-800 border-slate-700 text-slate-300'
                                    )}
                                  >
                                    {duel.isWinner ? '🏆 VICTORY (+25 XP)' : duel.isDraw ? '🤝 DRAW (+10 XP)' : '⚔️ COMPLETED (+10 XP)'}
                                  </span>
                                  <span className="font-bold text-slate-200">
                                    vs. {duel.opponentName}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                                  <span>You: <strong className="text-white">{duel.myScore}/5</strong> ({duel.myTime}s)</span>
                                  <span>Opponent: <strong className="text-white">{duel.opponentScore}/5</strong> ({duel.opponentTime}s)</span>
                                </div>
                              </div>

                              <div className="text-[10px] text-slate-500 font-mono">
                                {new Date(duel.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* INTERACTIVE DUEL PLAY MODAL */}
              {playingDuelId && (
                <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
                  <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-6 animate-scale-in">
                    {duelResult ? (
                      /* Duel Result Screen */
                      <div className="text-center space-y-4 py-4">
                        <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
                          {duelResult.isWinner ? (
                            <Trophy className="w-8 h-8 text-amber-400" />
                          ) : (
                            <Swords className="w-8 h-8 text-indigo-400" />
                          )}
                        </div>

                        <div>
                          <h3 className="text-lg font-bold text-white">
                            {duelResult.isCompleted
                              ? duelResult.isWinner
                                ? '🎉 Victory!'
                                : duelResult.isDraw
                                ? '🤝 It’s a Draw!'
                                : '⚔️ Duel Completed!'
                              : '✅ Round Completed!'}
                          </h3>
                          <p className="text-xs text-slate-400 mt-1">
                            Your Score:{' '}
                            <strong className="text-indigo-400 font-bold font-mono">
                              {duelResult.score} / 5
                            </strong>
                          </p>
                          <p className="text-xs text-slate-500 mt-2">
                            {duelResult.isCompleted
                              ? duelResult.isWinner
                                ? '+25 XP Victory bonus awarded to your ledger!'
                                : '+10 XP Participation reward added to your ledger!'
                              : 'Your answers have been securely recorded. When your opponent finishes within 24 hours, the winner will be determined!'}
                          </p>
                        </div>

                        <button
                          onClick={handleCloseDuelModal}
                          className="w-full py-3 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/20"
                        >
                          Return to Duels
                        </button>
                      </div>
                    ) : duelQuestions.length > 0 ? (
                      /* Active Question Flow */
                      <div className="space-y-4">
                        {/* Progress Header */}
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-indigo-400 font-bold">
                            Question {currentQuestionIdx + 1} of {duelQuestions.length}
                          </span>
                          <span className="text-slate-400 flex items-center gap-1">
                            <Timer className="w-3.5 h-3.5 text-amber-400" />
                            Timed Battle
                          </span>
                        </div>

                        {/* Question Text */}
                        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                          <p className="text-sm font-semibold text-slate-100 leading-relaxed">
                            {duelQuestions[currentQuestionIdx].question_text}
                          </p>
                        </div>

                        {/* Choices */}
                        <div className="space-y-2">
                          {[
                            { key: 'a', text: duelQuestions[currentQuestionIdx].choice_a },
                            { key: 'b', text: duelQuestions[currentQuestionIdx].choice_b },
                            { key: 'c', text: duelQuestions[currentQuestionIdx].choice_c },
                            { key: 'd', text: duelQuestions[currentQuestionIdx].choice_d },
                          ].map((choice) => {
                            const isSelected =
                              selectedChoices[duelQuestions[currentQuestionIdx].id] === choice.key;
                            return (
                              <button
                                key={choice.key}
                                onClick={() =>
                                  handleSelectChoice(
                                    duelQuestions[currentQuestionIdx].id,
                                    choice.key
                                  )
                                }
                                className={clsx(
                                  'w-full p-3 rounded-xl text-left text-xs font-medium border transition-all flex items-center justify-between',
                                  isSelected
                                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                                    : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:border-slate-700'
                                )}
                              >
                                <span>
                                  <strong className="font-mono uppercase mr-2 text-indigo-400">
                                    {choice.key}.
                                  </strong>
                                  {choice.text}
                                </span>
                                {isSelected && (
                                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {duelError && (
                          <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{duelError}</span>
                          </div>
                        )}

                        {/* Navigation / Submit Action */}
                        <div className="pt-2 flex items-center justify-between gap-3">
                          <button
                            onClick={handleCloseDuelModal}
                            className="px-4 py-2.5 rounded-xl text-xs font-mono text-slate-400 hover:text-slate-200"
                          >
                            Cancel
                          </button>

                          {currentQuestionIdx < duelQuestions.length - 1 ? (
                            <button
                              onClick={handleNextQuestion}
                              disabled={
                                !selectedChoices[duelQuestions[currentQuestionIdx].id]
                              }
                              className="px-6 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-40"
                            >
                              Next Question →
                            </button>
                          ) : (
                            <button
                              onClick={handleSubmitDuel}
                              disabled={
                                submittingAnswers ||
                                !selectedChoices[duelQuestions[currentQuestionIdx].id]
                              }
                              className="px-6 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition-all disabled:opacity-40 flex items-center gap-2"
                            >
                              {submittingAnswers ? 'Evaluating...' : 'Submit Duel ⚔️'}
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 space-y-4">
                        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                        <p className="text-xs text-slate-300">
                          {duelError || 'Failed to load duel questions.'}
                        </p>
                        <button
                          onClick={handleCloseDuelModal}
                          className="px-4 py-2 rounded-xl text-xs bg-slate-800 text-slate-200"
                        >
                          Close
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TEAM BATTLES */}
          {activeTab === 'battles' && (
            <div className="space-y-6">
              {/* Battles Header Card */}
              <div className="p-5 rounded-3xl bg-gradient-to-br from-purple-950/40 via-indigo-950/30 to-slate-900/40 border border-purple-500/30 shadow-xl space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-400">
                      <Zap className="w-5 h-5 text-amber-300" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        Live Faculty Battles
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300">
                          Realtime Team Arena
                        </span>
                      </h2>
                      <p className="text-xs text-slate-400">
                        Balanced snake teams • Average points per member fairness • Live broadcast scoreboard
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-purple-900/40 text-[11px]">
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Participation: <strong>+15 XP</strong></span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-300 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Victory Bonus: <strong>+35 XP</strong></span>
                  </div>
                </div>
              </div>

              {/* Battles List Content */}
              {battlesLoading ? (
                <div className="p-8 text-center text-xs text-slate-500 border border-slate-800 rounded-3xl">
                  Loading campus battles...
                </div>
              ) : (
                <div className="space-y-6">
                  {/* 1. Live Battles */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                        Live Right Now ({battles.live.length})
                      </h3>
                      <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                      >
                        <RefreshCw className={clsx('w-3.5 h-3.5', refreshing && 'animate-spin')} />
                        <span>Refresh</span>
                      </button>
                    </div>

                    {battles.live.length === 0 ? (
                      <p className="text-xs text-slate-500 p-4 rounded-2xl bg-slate-900/30 border border-slate-800/60 text-center">
                        No battles are currently live. Check upcoming battles below.
                      </p>
                    ) : (
                      battles.live.map((b) => {
                        const isEnrolled = battles.enrolledBattleIds.includes(b.id);
                        return (
                          <div
                            key={b.id}
                            className="p-5 rounded-3xl bg-slate-900/80 border border-purple-500/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 border border-rose-500/40 text-rose-300">
                                  LIVE
                                </span>
                                <h4 className="text-sm font-bold text-white">{b.title}</h4>
                              </div>
                              <p className="text-xs text-slate-400 font-mono">Topic: {b.topic}</p>
                              {b.ends_at && (
                                <p className="text-[11px] text-amber-300 flex items-center gap-1 font-mono">
                                  <Clock className="w-3 h-3" />
                                  <span>Ends at: {new Date(b.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </p>
                              )}
                            </div>

                            <Link
                              href={`/student/compete/battles/${b.id}`}
                              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-600/30"
                            >
                              <Zap className="w-4 h-4 text-amber-300" />
                              <span>{isEnrolled ? 'Enter Battle Arena ⚔️' : 'Watch Live Scoreboard'}</span>
                            </Link>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* 2. Upcoming / Scheduled Battles */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider px-1">
                      Upcoming Battles ({battles.upcoming.length})
                    </h3>

                    {battles.upcoming.length === 0 ? (
                      <p className="text-xs text-slate-500 p-4 rounded-2xl bg-slate-900/30 border border-slate-800/60 text-center">
                        No upcoming battles scheduled yet.
                      </p>
                    ) : (
                      battles.upcoming.map((b) => (
                        <div
                          key={b.id}
                          className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1">
                            <h4 className="font-bold text-slate-200">{b.title}</h4>
                            <p className="text-slate-400">{b.topic}</p>
                            {b.starts_at && (
                              <p className="text-[10px] text-slate-500 font-mono">
                                Scheduled: {new Date(b.starts_at).toLocaleString()}
                              </p>
                            )}
                          </div>

                          <Link
                            href={`/student/compete/battles/${b.id}`}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 text-center transition-colors"
                          >
                            Lobby & Teams
                          </Link>
                        </div>
                      ))
                    )}
                  </div>

                  {/* 3. Finished Battles */}
                  {battles.finished.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider px-1">
                        Recent Finished Battles ({battles.finished.length})
                      </h3>

                      {battles.finished.slice(0, 5).map((b) => (
                        <div
                          key={b.id}
                          className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <h4 className="font-bold text-slate-300">{b.title}</h4>
                            <p className="text-[11px] text-slate-500 font-mono">{b.topic}</p>
                          </div>

                          <Link
                            href={`/student/compete/battles/${b.id}`}
                            className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
                          >
                            Scoreboard
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
