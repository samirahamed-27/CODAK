'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BattleScore, rankTeamsByScore } from '@/lib/battles';
import { getBattleScoresAction } from '@/app/actions/battles';
import { Trophy, Users, CheckCircle, Wifi, RefreshCw, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

interface LiveScoreboardProps {
  battleId: string;
  initialScores?: BattleScore[];
  myTeamId?: string;
  className?: string;
}

export default function LiveScoreboard({
  battleId,
  initialScores = [],
  myTeamId,
  className,
}: LiveScoreboardProps) {
  const [scores, setScores] = useState<BattleScore[]>(initialScores);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'polling'>('connected');
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Poll fallback
  const fetchScores = useCallback(async () => {
    const res = await getBattleScoresAction(battleId);
    if (res.success && res.scores) {
      setScores(res.scores);
    }
  }, [battleId]);

  useEffect(() => {
    let supabase: any = null;
    try {
      supabase = createClient();
    } catch {
      // Offline / SSR fallback
    }

    if (!supabase) {
      setConnectionStatus('polling');
      pollingRef.current = setInterval(fetchScores, 3000);
      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    }

    // Subscribe ONLY to battle_scores table (NEVER battle_submissions)
    const channel = supabase
      .channel(`battle_scores_${battleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'battle_scores',
          filter: `battle_id=eq.${battleId}`,
        },
        async () => {
          // Fetch updated scores to get fresh team names & clean tie-break ranks
          await fetchScores();
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        } else if (status === 'TIMED_OUT' || status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionStatus('reconnecting');
          // Start 3-second fallback polling
          if (!pollingRef.current) {
            pollingRef.current = setInterval(fetchScores, 3000);
          }
        }
      });

    return () => {
      supabase.removeChannel(channel);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [battleId, fetchScores]);

  return (
    <div
      className={clsx(
        'rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-md p-5 text-white shadow-xl',
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-sm tracking-wide uppercase text-slate-200">
            Live Team Scoreboard
          </h3>
        </div>

        {/* Realtime / Polling Status indicator */}
        <div className="flex items-center gap-2">
          {connectionStatus === 'connected' && (
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Realtime
            </span>
          )}
          {connectionStatus === 'reconnecting' && (
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 rounded-full">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Reconnecting... (Polling)
            </span>
          )}
          {connectionStatus === 'polling' && (
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-sky-400 bg-sky-950/60 border border-sky-800/80 px-2 py-0.5 rounded-full">
              <RefreshCw className="w-3 h-3" />
              3s Polling
            </span>
          )}
        </div>
      </div>

      {scores.length === 0 ? (
        <div className="text-center py-6 text-xs text-slate-400">
          No scores recorded yet. Submissions will appear in real time!
        </div>
      ) : (
        <div className="space-y-3">
          {scores.map((score, index) => {
            const isMyTeam = myTeamId && score.team_id === myTeamId;
            const rank = score.rank ?? index + 1;

            return (
              <div
                key={score.team_id}
                className={clsx(
                  'flex items-center justify-between p-3 rounded-xl border transition-all',
                  isMyTeam
                    ? 'bg-purple-950/40 border-purple-500/50 shadow-md shadow-purple-900/20'
                    : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={clsx(
                      'w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs',
                      rank === 1
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                        : rank === 2
                        ? 'bg-slate-300/20 text-slate-200 border border-slate-300/40'
                        : rank === 3
                        ? 'bg-amber-700/20 text-amber-500 border border-amber-600/40'
                        : 'bg-slate-800 text-slate-400'
                    )}
                  >
                    #{rank}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs sm:text-sm text-slate-100">
                        {score.team_name || `Team ${index + 1}`}
                      </span>
                      {isMyTeam && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-500 text-white">
                          Your Team
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-slate-500" />
                        {score.member_count} {score.member_count === 1 ? 'member' : 'members'}
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-slate-500" />
                        {score.answered_count} answered
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                    {score.avg_points.toFixed(1)}{' '}
                    <span className="text-[11px] font-normal text-slate-400">avg pts</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {score.total_points} total pts
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
