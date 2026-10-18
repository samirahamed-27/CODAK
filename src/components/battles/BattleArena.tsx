'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  getBattleLobbyAction,
  submitBattleAnswerAction,
  finalizeBattleAction,
} from '@/app/actions/battles';
import { Battle, SafeBattleQuestion, BattleScore } from '@/lib/battles';
import LiveScoreboard from './LiveScoreboard';
import {
  Trophy,
  Users,
  Timer,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Shield,
  Zap,
  RotateCcw,
  Sparkles,
  Award,
} from 'lucide-react';
import clsx from 'clsx';

interface BattleArenaProps {
  battleId: string;
  onExit?: () => void;
}

export default function BattleArena({ battleId, onExit }: BattleArenaProps) {
  const [loading, setLoading] = useState(true);
  const [battle, setBattle] = useState<Battle | null>(null);
  const [teams, setTeams] = useState<{ id: string; name: string; memberCount: number }[]>([]);
  const [myTeamId, setMyTeamId] = useState<string | undefined>();
  const [questions, setQuestions] = useState<SafeBattleQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answeredMap, setAnsweredMap] = useState<Record<string, { isCorrect: boolean; points: number }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [lastFeedback, setLastFeedback] = useState<{ isCorrect: boolean; points: number } | null>(null);

  // Time remaining in battle
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [battleFinished, setBattleFinished] = useState(false);
  const [finalRankings, setFinalRankings] = useState<BattleScore[]>([]);

  // Load Battle data
  const loadBattle = useCallback(async () => {
    setLoading(true);
    const res = await getBattleLobbyAction(battleId);
    if (res.success && res.battle) {
      setBattle(res.battle);
      setTeams(res.teams || []);
      setMyTeamId(res.myTeamId);
      setQuestions(res.questions || []);

      // Pre-populate answered questions for reconnect-safety
      const preAnswered: Record<string, { isCorrect: boolean; points: number }> = {};
      (res.answeredQuestionIds || []).forEach((qId) => {
        preAnswered[qId] = { isCorrect: true, points: 10 };
      });
      setAnsweredMap(preAnswered);

      // Find first unanswered question
      const firstUnanswered = (res.questions || []).findIndex(
        (q) => !preAnswered[q.id]
      );
      if (firstUnanswered !== -1) {
        setCurrentQIndex(firstUnanswered);
      } else if (res.questions && res.questions.length > 0) {
        setCurrentQIndex(res.questions.length - 1);
      }

      // Calculate time remaining if live
      if (res.battle.status === 'live' && res.battle.ends_at) {
        const diffSecs = Math.max(0, Math.floor((new Date(res.battle.ends_at).getTime() - Date.now()) / 1000));
        setSecondsRemaining(diffSecs);
      } else if (res.battle.status === 'finished') {
        setBattleFinished(true);
      }
    }
    setLoading(false);
  }, [battleId]);

  useEffect(() => {
    loadBattle();
  }, [battleId, loadBattle]);

  // Countdown timer effect
  useEffect(() => {
    if (battle?.status !== 'live' || secondsRemaining <= 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setBattleFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [battle?.status, secondsRemaining]);

  async function handleSubmitAnswer() {
    if (!selectedChoice || submitting || !questions[currentQIndex]) return;
    const currentQ = questions[currentQIndex];

    setSubmitting(true);
    // Unique submissionId for strict server-side idempotency
    const submissionId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sub-${Date.now()}`;

    const res = await submitBattleAnswerAction({
      battleId,
      questionId: currentQ.id,
      answer: selectedChoice,
      submissionId,
    });

    setSubmitting(false);

    if (res.success) {
      const isCorrect = res.isCorrect ?? false;
      const points = res.points ?? 0;

      setLastFeedback({ isCorrect, points });
      setAnsweredMap((prev) => ({
        ...prev,
        [currentQ.id]: { isCorrect, points },
      }));

      // Auto-advance after 1.5 seconds if more questions exist
      setTimeout(() => {
        setLastFeedback(null);
        setSelectedChoice(null);
        if (currentQIndex < questions.length - 1) {
          setCurrentQIndex((idx) => idx + 1);
        }
      }, 1500);
    }
  }

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-zinc-400">
        <RotateCcw className="w-8 h-8 animate-spin mb-3 text-white" />
        <p className="text-sm">Connecting to battle arena...</p>
      </div>
    );
  }

  if (!battle) {
    return (
      <div className="p-8 text-center text-zinc-300">
        <p>Battle not found or has been archived.</p>
        {onExit && (
          <button
            onClick={onExit}
            className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-bold text-white"
          >
            Back to Compete
          </button>
        )}
      </div>
    );
  }

  // 1. FINISHED SCREEN
  if (battleFinished || battle.status === 'finished') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="p-6 rounded-3xl bg-[#0c0c0e] border border-white/15 text-center relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Battle Completed!
          </h2>
          <p className="text-xs sm:text-sm text-zinc-300 mt-1 max-w-md mx-auto">
            All team scores and averages have been calculated. XP rewards have been deposited into the ledger!
          </p>

          <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto mt-6">
            <div className="p-3 rounded-2xl bg-black/60 border border-white/10">
              <span className="text-[11px] text-zinc-400 block">Participation XP</span>
              <span className="text-lg font-black text-white">+15 XP</span>
            </div>
            <div className="p-3 rounded-2xl bg-black/60 border border-white/10">
              <span className="text-[11px] text-zinc-400 block">Winning Team Bonus</span>
              <span className="text-lg font-black text-white">+35 XP</span>
            </div>
          </div>

          {onExit && (
            <button
              onClick={onExit}
              className="mt-6 px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs transition-all shadow-lg shadow-white/10"
            >
              Return to Competitions
            </button>
          )}
        </div>

        {/* Live Scoreboard in final state */}
        <LiveScoreboard battleId={battleId} myTeamId={myTeamId} />
      </div>
    );
  }

  // 2. SCHEDULED / LOBBY SCREEN (waiting for start)
  if (battle.status === 'scheduled' || battle.status === 'draft') {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="p-6 rounded-3xl bg-[#0c0c0e] border border-white/15 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold mb-3">
            <Clock className="w-3.5 h-3.5" />
            <span>Scheduled Battle</span>
          </div>

          <h2 className="text-2xl font-black text-white">{battle.title}</h2>
          <p className="text-xs text-zinc-400 mt-1">{battle.topic}</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-md mx-auto mt-6 text-left">
            <div className="p-3 rounded-xl bg-black/60 border border-white/10">
              <span className="text-[10px] text-zinc-400 block uppercase font-bold">Teams</span>
              <span className="text-sm font-bold text-white">{teams.length} Teams</span>
            </div>
            <div className="p-3 rounded-xl bg-black/60 border border-white/10">
              <span className="text-[10px] text-zinc-400 block uppercase font-bold">Questions</span>
              <span className="text-sm font-bold text-white">{questions.length} Questions</span>
            </div>
            <div className="p-3 rounded-xl bg-black/60 border border-white/10 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-zinc-400 block uppercase font-bold">Scoring</span>
              <span className="text-sm font-bold text-white">Avg pts / member</span>
            </div>
          </div>

          <p className="text-xs text-zinc-400 mt-6">
            Waiting for faculty to trigger live start. Page will update automatically.
          </p>

          {onExit && (
            <button
              onClick={onExit}
              className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-bold text-white"
            >
              Back to Compete
            </button>
          )}
        </div>
      </div>
    );
  }

  // 3. LIVE BATTLE ARENA SCREEN
  const currentQ = questions[currentQIndex];
  const isAnswered = currentQ ? Boolean(answeredMap[currentQ.id]) : false;
  const answeredInfo = currentQ ? answeredMap[currentQ.id] : undefined;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#0c0c0e] border border-white/15">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
            Live Battle • {battle.topic}
          </span>
          <h1 className="text-lg font-black text-white">{battle.title}</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Battle Countdown Timer */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
            <Timer className="w-4 h-4 text-amber-400" />
            <span className="font-mono text-sm font-bold text-amber-300">
              {formatTimer(secondsRemaining)}
            </span>
          </div>

          {onExit && (
            <button
              onClick={onExit}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors"
            >
              Exit
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Question Arena */}
        <div className="lg:col-span-2 space-y-4">
          {/* Question Nav Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {questions.map((q, idx) => {
              const answered = Boolean(answeredMap[q.id]);
              const isCurrent = idx === currentQIndex;

              return (
                <button
                  key={q.id}
                  onClick={() => {
                    setCurrentQIndex(idx);
                    setSelectedChoice(null);
                    setLastFeedback(null);
                  }}
                  className={clsx(
                    'w-8 h-8 rounded-lg font-mono text-xs font-bold flex items-center justify-center transition-all shrink-0',
                    isCurrent
                      ? 'bg-white text-black ring-2 ring-white/50'
                      : answered
                      ? 'bg-white/10 border border-white/20 text-white'
                      : 'bg-black/60 border border-white/10 text-zinc-400 hover:border-white/20'
                  )}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {currentQ && (
            <div className="p-6 rounded-3xl bg-[#0c0c0e] border border-white/15 shadow-xl relative overflow-hidden">
              <div className="text-[11px] font-bold text-zinc-400 mb-2">
                Question {currentQIndex + 1} of {questions.length}
              </div>

              <h2 className="text-base sm:text-lg font-bold text-white mb-6 leading-relaxed">
                {currentQ.question_text}
              </h2>

              {/* Choices */}
              <div className="space-y-3">
                {(['a', 'b', 'c', 'd'] as const).map((opt) => {
                  const choiceText = (currentQ as any)[`choice_${opt}`];
                  const isSelected = selectedChoice === opt;

                  return (
                    <button
                      key={opt}
                      disabled={isAnswered || submitting}
                      onClick={() => setSelectedChoice(opt)}
                      className={clsx(
                        'w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3',
                        isAnswered
                          ? 'opacity-80 cursor-not-allowed bg-black/60 border-white/10 text-zinc-400'
                          : isSelected
                          ? 'bg-white/15 border-white text-white ring-1 ring-white/40'
                          : 'bg-black/40 border-white/10 hover:border-white/30 text-zinc-200'
                      )}
                    >
                      <span
                        className={clsx(
                          'w-6 h-6 rounded-lg uppercase flex items-center justify-center font-bold text-xs shrink-0',
                          isSelected
                            ? 'bg-white text-black'
                            : 'bg-zinc-800 text-zinc-400'
                        )}
                      >
                        {opt}
                      </span>
                      <span className="text-xs sm:text-sm pt-0.5">{choiceText}</span>
                    </button>
                  );
                })}
              </div>

              {/* Action Button & Feedback */}
              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                <div>
                  {lastFeedback && (
                    <div
                      className={clsx(
                        'flex items-center gap-1.5 text-xs font-bold animate-in fade-in',
                        lastFeedback.isCorrect ? 'text-emerald-400' : 'text-rose-400'
                      )}
                    >
                      {lastFeedback.isCorrect ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Correct! +{lastFeedback.points} pts for team</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" />
                          <span>Incorrect (0 pts). Team average updated.</span>
                        </>
                      )}
                    </div>
                  )}
                  {isAnswered && !lastFeedback && (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Submitted
                    </span>
                  )}
                </div>

                {!isAnswered ? (
                  <button
                    disabled={!selectedChoice || submitting}
                    onClick={handleSubmitAnswer}
                    className={clsx(
                      'px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all',
                      !selectedChoice || submitting
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        : 'bg-white hover:bg-zinc-200 text-black shadow-lg shadow-white/10'
                    )}
                  >
                    {submitting ? 'Evaluating...' : 'Submit Answer'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  currentQIndex < questions.length - 1 && (
                    <button
                      onClick={() => {
                        setCurrentQIndex((idx) => idx + 1);
                        setSelectedChoice(null);
                        setLastFeedback(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5"
                    >
                      <span>Next Question</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Live Scoreboard */}
        <div className="lg:col-span-1">
          <LiveScoreboard battleId={battleId} myTeamId={myTeamId} />
        </div>
      </div>
    </div>
  );
}
