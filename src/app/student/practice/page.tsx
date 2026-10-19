'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import {
  getPracticeLinksAction,
  claimPracticeProblemAction,
  PracticeCompletionStatus,
} from '@/app/actions/practice';
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
  Clock,
  AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';
import Aurora from '@/components/Aurora';

export default function StudentPracticePage() {
  const [links, setLinks] = useState<PracticeLink[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>(['LeetCode', 'HackerRank', 'Codeforces']);
  const [completedLinkIds, setCompletedLinkIds] = useState<string[]>([]);
  const [completions, setCompletions] = useState<Record<string, PracticeCompletionStatus>>({});
  const [userRole, setUserRole] = useState<string>('student');
  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('All');
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
          platform: selectedPlatform,
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
          if (res.completions) setCompletions(res.completions);
          if (res.userRole) setUserRole(res.userRole);
          if (res.topics.length > 0) {
            setTopics((prev) => (prev.length === 0 ? res.topics : prev));
          }
          if (res.platforms && res.platforms.length > 0) {
            setPlatforms((prev) => Array.from(new Set([...prev, ...(res.platforms || [])])));
          }
        }
      } catch (err) {
        console.error('Error fetching practice links:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLinks();
  }, [selectedTopic, selectedDifficulty, selectedPlatform, searchQuery, selectedType]);

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
        submissionProof: submissionProof.trim(),
      });

      if (res.success) {
        setClaimFeedback({
          type: 'success',
          message: res.message || 'Solution submitted! Your claim is pending faculty review.',
          xpAwarded: 0,
        });
        setCompletedLinkIds((prev) => [...prev, selectedProblem.id]);
        if (res.claimId) {
          setCompletions((prev) => ({
            ...prev,
            [selectedProblem.id]: {
              id: res.claimId!,
              status: 'pending',
              xpAwarded: 0,
            },
          }));
        }
        setTimeout(() => {
          setClaimModalOpen(false);
          setClaimFeedback(null);
        }, 1800);
      } else {
        setClaimFeedback({
          type: 'error',
          message: res.error || 'Failed to submit claim. Please try again.',
        });
      }
    } catch (err: any) {
      setClaimFeedback({
        type: 'error',
        message: err.message || 'Unexpected network error.',
      });
    } finally {
      setIsClaiming(false);
    }
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'Easy':
        return 'text-zinc-300 bg-zinc-800/60 border-zinc-700';
      case 'Medium':
        return 'text-zinc-200 bg-zinc-800/90 border-zinc-600 font-medium';
      case 'Hard':
        return 'text-white bg-zinc-700/90 border-zinc-500 font-bold';
      default:
        return 'text-zinc-400 bg-zinc-900 border-zinc-800';
    }
  };

  const getPlatformBadge = (platform: string) => {
    return 'text-zinc-300 bg-zinc-900/90 border-zinc-700';
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-zinc-100 relative overflow-hidden pb-24">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
        <Aurora colorStops={['#ffffff', '#27272a', '#09090b']} speed={0.4} />
      </div>

      <div className="relative z-10 flex-1 flex flex-col">
        <Navbar role="student" userName="Student" />

        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
          {/* Back Navigation & Actions */}
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/student/learn"
              className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Learn</span>
            </Link>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900/90 px-3 py-1 rounded-full border border-zinc-800">
                Phase 3 • Curated Practice
              </span>
              {(userRole === 'faculty' || userRole === 'admin') && (
                <Link
                  href="/faculty/competitions"
                  className="inline-flex items-center gap-1.5 text-[10px] font-bold text-zinc-200 bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded-full border border-zinc-700 transition-all"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-white" />
                  <span>Faculty Contests</span>
                </Link>
              )}
            </div>
          </div>

          {/* Header Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900/60 border border-zinc-800 shadow-xl backdrop-blur-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white">
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">
                  Practice Problem Directory
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mt-0.5">
                  Solve real-world coding problems & HackerRank faculty challenges. Solve on original platforms, then claim XP into your immutable ledger.
                </p>
              </div>
            </div>

            {/* Type Filter Pills (All / Practice / Faculty Competitions) */}
            <div className="flex items-center gap-1.5 p-1 bg-black/60 border border-zinc-800 rounded-2xl">
              <button
                onClick={() => setSelectedType('all')}
                className={clsx(
                  'flex-1 py-2 text-xs font-semibold rounded-xl transition-all text-center',
                  selectedType === 'all'
                    ? 'bg-white text-black font-bold shadow-md shadow-white/10'
                    : 'text-zinc-400 hover:text-white'
                )}
              >
                All Directory
              </button>
              <button
                onClick={() => setSelectedType('problems')}
                className={clsx(
                  'flex-1 py-2 text-xs font-semibold rounded-xl transition-all text-center',
                  selectedType === 'problems'
                    ? 'bg-white text-black font-bold shadow-md shadow-white/10'
                    : 'text-zinc-400 hover:text-white'
                )}
              >
                Standard (+10 XP)
              </button>
              <button
                onClick={() => setSelectedType('competitions')}
                className={clsx(
                  'flex-1 py-2 text-xs font-semibold rounded-xl transition-all text-center flex items-center justify-center gap-1.5',
                  selectedType === 'competitions'
                    ? 'bg-white text-black font-bold shadow-md shadow-white/10'
                    : 'text-zinc-400 hover:text-white'
                )}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Competitions (+25 XP)</span>
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search problems, topics, or IDs (e.g., Two Sum, leetcode:1)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-black/60 border border-zinc-800 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-all font-mono"
              />
            </div>
          </div>

          {/* Filters Card */}
          <div className="p-5 sm:p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
            {/* Topic Filter Pills */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                Filter by Topic
              </span>
              <div className="flex flex-wrap gap-1.5">
                {['All', ...topics].map((topic) => (
                  <button
                    key={topic}
                    onClick={() => setSelectedTopic(topic)}
                    className={clsx(
                      'px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all border',
                      selectedTopic === topic
                        ? 'bg-white border-white text-black font-bold shadow-md shadow-white/10'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                    )}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Filter Pills */}
            <div className="space-y-2 pt-2 border-t border-zinc-800/80">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                Filter by Difficulty
              </span>
              <div className="flex flex-wrap gap-2">
                {['All', 'Easy', 'Medium', 'Hard'].map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setSelectedDifficulty(diff)}
                    className={clsx(
                      'px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all border',
                      selectedDifficulty === diff
                        ? 'bg-white text-black font-bold border-white shadow-md shadow-white/10'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                    )}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            {/* Platform / Website Filter Pills */}
            <div className="space-y-2 pt-2 border-t border-zinc-800/80">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                Filter by Platform / Website
              </span>
              <div className="flex flex-wrap gap-2">
                {['All', ...platforms].map((plat) => (
                  <button
                    key={plat}
                    onClick={() => setSelectedPlatform(plat)}
                    className={clsx(
                      'px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all border',
                      selectedPlatform === plat
                        ? 'bg-white text-black font-bold border-white shadow-md shadow-white/10'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                    )}
                  >
                    {plat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Problems List */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-mono px-1">
              <span>Showing <strong className="text-white">{links.length}</strong> problems</span>
              <span><strong className="text-white">{completedLinkIds.length}</strong> Solved in Ledger</span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-xs text-zinc-400 border border-zinc-800 rounded-3xl bg-zinc-900/40 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Loading practice problems & challenges...</span>
              </div>
            ) : links.length === 0 ? (
              <div className="p-12 text-center text-xs text-zinc-400 border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/20">
                No practice problems found matching your filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {links.map((link) => {
                  const isSolved = completedLinkIds.includes(link.id);
                  const isComp = Boolean(link.is_competition);
                  const completion = completions[link.id];

                  return (
                    <div
                      key={link.id || link.problem_id}
                      className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col gap-4 shadow-lg shadow-black/20"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isComp && (
                              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-zinc-700 bg-zinc-800 text-white flex items-center gap-1 shadow-sm">
                                <Trophy className="w-3 h-3 text-white" />
                                Faculty Challenge • +25 XP
                              </span>
                            )}

                            {!isComp && (
                              <span className="text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full border border-zinc-700 bg-zinc-800 text-zinc-200 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-white" />
                                +10 XP
                              </span>
                            )}

                            <span
                              className={clsx(
                                'text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border',
                                getPlatformBadge(link.platform)
                              )}
                            >
                              {link.platform}
                            </span>

                            <span
                              className={clsx(
                                'text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full border',
                                getDifficultyColor(link.difficulty)
                              )}
                            >
                              {link.difficulty}
                            </span>

                            <span className="text-[10px] font-mono text-zinc-400 bg-black/60 px-2 py-0.5 rounded-md border border-zinc-800">
                              {link.problem_id}
                            </span>
                          </div>

                          <h2 className="text-base font-bold text-white tracking-wide">
                            {link.title}
                          </h2>

                          <p className="text-xs text-zinc-400 font-mono">
                            Topic: <span className="text-zinc-200">{link.topic}</span>
                          </p>

                          {link.instructions && (
                            <p className="text-xs text-zinc-300 bg-black/60 border border-zinc-800 px-3 py-2 rounded-xl leading-relaxed mt-1">
                              💡 <span className="font-semibold text-white">Faculty Instructions:</span> {link.instructions}
                            </p>
                          )}

                          {link.deadline && (
                            <div className="inline-flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
                              <Calendar className="w-3.5 h-3.5 text-zinc-300" />
                              <span>Ends: {new Date(link.deadline).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800/80">
                        <a
                          href={link.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 hover:text-white transition-all group"
                        >
                          <span>Solve on {link.platform}</span>
                          <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </a>

                        {completion?.status === 'approved' ? (
                          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Approved +{completion.xpAwarded} XP</span>
                          </span>
                        ) : completion?.status === 'pending' ? (
                          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 shadow-sm">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>Pending review</span>
                          </span>
                        ) : completion?.status === 'rejected' ? (
                          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30 shadow-sm">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                            <span>Not approved: {completion.rejectionReason || 'Rejected by reviewer'}</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleOpenClaimModal(link)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white text-black hover:bg-zinc-200 border border-white transition-all shadow-md active:scale-95"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>
                              Claim{' '}
                              {isComp
                                ? '+25 XP'
                                : link.difficulty === 'Hard'
                                ? '+40 XP'
                                : link.difficulty === 'Medium'
                                ? '+20 XP'
                                : '+10 XP'}
                            </span>
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
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-zinc-800 border border-zinc-700 text-white">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Claim Solution XP</h3>
                  <span className="text-[11px] font-mono text-zinc-400">
                    Earn game XP in the immutable ledger
                  </span>
                </div>
              </div>
              <button
                onClick={() => setClaimModalOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Problem Overview */}
            <div className="p-4 rounded-2xl bg-black/60 border border-zinc-800 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                  {selectedProblem.platform}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white font-bold border border-white/20">
                  {selectedProblem.is_competition ? '+25 XP Reward' : '+10 XP Reward'}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mt-1">{selectedProblem.title}</h4>
              <p className="text-xs text-zinc-400 font-mono">Topic: {selectedProblem.topic}</p>
            </div>

            {/* Submission Form */}
            <form onSubmit={handleClaimSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                  <span>Verified Solution Proof URL</span>
                  <span className="text-[10px] text-zinc-400 font-mono">(Required)</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://leetcode.com/submissions/... or github.com/..."
                  value={submissionProof}
                  onChange={(e) => setSubmissionProof(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-all font-mono"
                />
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  Provide an official solution link (LeetCode, HackerRank, Codeforces, GitHub). Once submitted, your solution enters the faculty approval queue.
                </p>
              </div>

              {claimFeedback && (
                <div
                  className={clsx(
                    'p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border',
                    claimFeedback.type === 'success'
                      ? 'bg-zinc-800 border-zinc-700 text-white'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-300'
                  )}
                >
                  {claimFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
                  ) : (
                    <Info className="w-4 h-4 shrink-0 text-zinc-400" />
                  )}
                  <span>{claimFeedback.message}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setClaimModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isClaiming || (claimFeedback?.type === 'success')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-white text-black hover:bg-zinc-200 border border-white disabled:opacity-50 transition-all shadow-md"
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
