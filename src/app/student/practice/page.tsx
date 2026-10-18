'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import { getPracticeLinksAction, claimPracticeProblemAction } from '@/app/actions/practice';
import { PracticeLink } from '@/lib/practice';
import {
  ExternalLink,
  Code2,
  Filter,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  BookOpen,
  Search,
  Trophy,
  Calendar,
  Info,
  X,
  PlusCircle,
  Loader2,
  Award,
} from 'lucide-react';
import clsx from 'clsx';
import Aurora from '@/components/Aurora';

export default function StudentPracticePage() {
  const [links, setLinks] = useState<PracticeLink[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [completedLinkIds, setCompletedLinkIds] = useState<string[]>([]);
  const [userRole, setUserRole] = useState<string>('student');
  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<'all' | 'problems' | 'competitions'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Claim XP modal state
  const [claimModalOpen, setClaimModalOpen] = useState<boolean>(false);
  const [selectedProblem, setSelectedProblem] = useState<PracticeLink | null>(null);
  const [submissionProof, setSubmissionProof] = useState<string>('');
  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  const [claimFeedback, setClaimFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    xpAwarded?: number;
  } | null>(null);

  useEffect(() => {
    async function loadLinks() {
      setLoading(true);
      try {
        const res = await getPracticeLinksAction({
          topic: selectedTopic,
          difficulty: selectedDifficulty,
          search: searchQuery,
          isCompetition:
            selectedType === 'competitions'
              ? true
              : selectedType === 'problems'
              ? false
              : 'All',
        });
        if (res.success) {
          setLinks(res.links);
          setCompletedLinkIds(res.completedLinkIds || []);
          if (res.userRole) setUserRole(res.userRole);
          if (res.topics.length > 0) {
            setTopics((prev) => (prev.length === 0 ? res.topics : prev));
          }
        }
      } catch (err) {
        console.error('Error fetching practice links:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLinks();
  }, [selectedTopic, selectedDifficulty, searchQuery, selectedType]);

  const handleOpenClaimModal = (problem: PracticeLink) => {
    setSelectedProblem(problem);
    setSubmissionProof('');
    setClaimFeedback(null);
    setClaimModalOpen(true);
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProblem) return;

    setIsClaiming(true);
    setClaimFeedback(null);

    try {
      const res = await claimPracticeProblemAction({
        practiceLinkId: selectedProblem.id,
        submissionProof: submissionProof.trim() || undefined,
      });

      if (res.success) {
        setClaimFeedback({
          type: 'success',
          message: `Great job! You claimed +${res.xpAwarded} XP!`,
          xpAwarded: res.xpAwarded,
        });
        // Add to completed links immediately in local state
        setCompletedLinkIds((prev) => [...prev, selectedProblem.id]);
        setTimeout(() => {
          setClaimModalOpen(false);
          setClaimFeedback(null);
        }, 1800);
      } else {
        setClaimFeedback({
          type: 'error',
          message: res.error || 'Failed to claim XP. Please try again.',
        });
      }
    } catch (err: any) {
      setClaimFeedback({
        type: 'error',
        message: err.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsClaiming(false);
    }
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'Easy':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'Medium':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'Hard':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
    }
  };

  const getPlatformBadge = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'leetcode':
        return 'text-amber-300 bg-amber-500/15 border-amber-500/30';
      case 'codeforces':
        return 'text-blue-300 bg-blue-500/15 border-blue-500/30';
      case 'hackerrank':
        return 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30';
      default:
        return 'text-indigo-300 bg-indigo-500/15 border-indigo-500/30';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#07080B] text-slate-100 relative overflow-hidden pb-24">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
        <Aurora colorStops={['#0284c7', '#4f46e5', '#9333ea']} speed={0.4} />
      </div>

      <div className="relative z-10 flex-1 flex flex-col">
        <Navbar role="student" userName="Student" />

        <main className="flex-1 max-w-xl w-full mx-auto px-4 py-6 flex flex-col gap-5">
          {/* Back Navigation & Header */}
          <div className="flex items-center justify-between">
            <Link
              href="/student/learn"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Learn</span>
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-full border border-slate-800">
                Phase 3 • Curated Practice
              </span>
              {(userRole === 'faculty' || userRole === 'admin') && (
                <Link
                  href="/faculty/competitions"
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-300 bg-purple-900/50 hover:bg-purple-800/60 px-2.5 py-1 rounded-full border border-purple-600/40 transition-all"
                >
                  <PlusCircle className="w-3 h-3 text-purple-400" />
                  <span>Faculty Contests</span>
                </Link>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <Code2 className="w-5 h-5 text-sky-400" />
              Practice Problem Directory
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Solve real-world coding problems & HackerRank faculty challenges. Solve on external platforms, then claim your game XP into the immutable ledger!
            </p>
          </div>

          {/* Type Filter Pills (All / Practice / Faculty Competitions) */}
          <div className="flex items-center gap-2 p-1 bg-slate-900/80 border border-slate-800/90 rounded-2xl">
            <button
              onClick={() => setSelectedType('all')}
              className={clsx(
                'flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all text-center',
                selectedType === 'all'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              All Directory
            </button>
            <button
              onClick={() => setSelectedType('problems')}
              className={clsx(
                'flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all text-center',
                selectedType === 'problems'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              Standard (+10 XP)
            </button>
            <button
              onClick={() => setSelectedType('competitions')}
              className={clsx(
                'flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all text-center flex items-center justify-center gap-1.5',
                selectedType === 'competitions'
                  ? 'bg-purple-500/25 text-purple-200 border border-purple-500/50 font-bold shadow-sm shadow-purple-500/20'
                  : 'text-purple-400/80 hover:text-purple-300'
              )}
            >
              <Trophy className="w-3 h-3 text-purple-400" />
              <span>Competitions (+25 XP)</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search problems, topics, or IDs (e.g., Two Sum, leetcode:1)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500/60 transition-all font-mono"
            />
          </div>

          {/* Topic Filter Pills */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Topics
            </span>
            <div className="flex flex-wrap gap-1.5">
              {['All', ...topics].map((topic) => (
                <button
                  key={topic}
                  onClick={() => setSelectedTopic(topic)}
                  className={clsx(
                    'px-3 py-1.5 rounded-xl text-xs font-medium transition-all border',
                    selectedTopic === topic
                      ? 'bg-sky-500/20 border-sky-400/60 text-sky-300 font-bold shadow-md shadow-sky-500/10'
                      : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  )}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Filter Pills */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Difficulty
            </span>
            <div className="flex gap-2">
              {['All', 'Easy', 'Medium', 'Hard'].map((diff) => (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(diff)}
                  className={clsx(
                    'px-3 py-1 rounded-xl text-xs font-mono transition-all border',
                    selectedDifficulty === diff
                      ? 'bg-slate-100 text-slate-950 font-bold border-white'
                      : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200'
                  )}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          {/* Problems List */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Showing {links.length} problems</span>
              <span>{completedLinkIds.length} Solved in Ledger</span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400 border border-slate-800/80 rounded-2xl bg-slate-900/40 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                <span>Loading practice problems & challenges...</span>
              </div>
            ) : links.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
                No practice problems found matching your filters.
              </div>
            ) : (
              <div className="space-y-3">
                {links.map((link) => {
                  const isSolved = completedLinkIds.includes(link.id);
                  const isComp = Boolean(link.is_competition);

                  return (
                    <div
                      key={link.id || link.problem_id}
                      className={clsx(
                        'p-4 rounded-2xl border transition-all flex flex-col gap-3 shadow-lg shadow-black/20',
                        isComp
                          ? 'bg-gradient-to-br from-purple-950/40 via-slate-900/80 to-slate-900/90 border-purple-500/40 hover:border-purple-400/60 shadow-purple-950/20'
                          : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700'
                      )}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isComp && (
                              <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded border border-purple-400/50 bg-purple-500/20 text-purple-300 flex items-center gap-1 shadow-sm">
                                <Trophy className="w-3 h-3 text-amber-400" />
                                Faculty Challenge • +25 XP
                              </span>
                            )}

                            {!isComp && (
                              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded border border-sky-400/30 bg-sky-500/10 text-sky-300 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-sky-400" />
                                +10 XP
                              </span>
                            )}

                            <span
                              className={clsx(
                                'text-[10px] font-mono font-bold px-2 py-0.5 rounded border',
                                getPlatformBadge(link.platform)
                              )}
                            >
                              {link.platform}
                            </span>

                            <span
                              className={clsx(
                                'text-[10px] font-mono font-semibold px-2 py-0.5 rounded border',
                                getDifficultyColor(link.difficulty)
                              )}
                            >
                              {link.difficulty}
                            </span>

                            <span className="text-[10px] font-mono text-slate-500">
                              {link.problem_id}
                            </span>
                          </div>

                          <h2 className="text-sm font-bold text-white tracking-wide">
                            {link.title}
                          </h2>

                          <p className="text-[11px] text-slate-400 font-mono">
                            Topic: <span className="text-slate-300">{link.topic}</span>
                          </p>

                          {link.instructions && (
                            <p className="text-[11px] text-purple-300/90 bg-purple-950/40 border border-purple-800/50 px-2.5 py-1.5 rounded-xl leading-relaxed mt-1">
                              💡 <span className="font-semibold text-purple-200">Faculty Instructions:</span> {link.instructions}
                            </p>
                          )}

                          {link.deadline && (
                            <div className="inline-flex items-center gap-1 text-[10px] text-amber-300/90 font-mono">
                              <Calendar className="w-3 h-3 text-amber-400" />
                              <span>Ends: {new Date(link.deadline).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
                        <a
                          href={link.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 transition-all group"
                        >
                          <span>Solve on {link.platform}</span>
                          <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </a>

                        {isSolved ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Solved • XP Claimed</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleOpenClaimModal(link)}
                            className={clsx(
                              'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md',
                              isComp
                                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/30'
                                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black shadow-amber-500/20'
                            )}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Claim {isComp ? '+25 XP' : '+10 XP'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        <BottomNav />
      </div>

      {/* Claim XP Modal */}
      {claimModalOpen && selectedProblem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Claim Solution XP</h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    Earn game XP in the immutable ledger
                  </span>
                </div>
              </div>
              <button
                onClick={() => setClaimModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Problem Overview */}
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {selectedProblem.platform}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-bold">
                  {selectedProblem.is_competition ? '+25 XP Reward' : '+10 XP Reward'}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mt-1">{selectedProblem.title}</h4>
              <p className="text-xs text-slate-400 font-mono">Topic: {selectedProblem.topic}</p>
            </div>

            {/* Submission Form */}
            <form onSubmit={handleClaimSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Solution URL / Profile Handle</span>
                  <span className="text-[10px] text-slate-500">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., https://hackerrank.com/submissions/... or username"
                  value={submissionProof}
                  onChange={(e) => setSubmissionProof(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-all font-mono"
                />
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Honor system verification: confirming your solve immediately awards XP. Daily limits apply (5 practice, 2 competitions).
                </p>
              </div>

              {claimFeedback && (
                <div
                  className={clsx(
                    'p-3 rounded-xl text-xs font-semibold flex items-center gap-2',
                    claimFeedback.type === 'success'
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                  )}
                >
                  {claimFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  ) : (
                    <Info className="w-4 h-4 shrink-0 text-rose-400" />
                  )}
                  <span>{claimFeedback.message}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setClaimModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isClaiming || (claimFeedback?.type === 'success')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 disabled:opacity-50 text-white shadow-lg shadow-sky-500/20 transition-all"
                >
                  {isClaiming ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Recording to Ledger...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Confirm & Claim XP</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
