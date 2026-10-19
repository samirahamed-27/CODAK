'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import {
  getFacultyCompetitionsAction,
  createFacultyCompetitionAction,
} from '@/app/actions/practice';
import { PracticeLink } from '@/lib/practice';
import {
  Trophy,
  PlusCircle,
  ExternalLink,
  Users,
  CheckCircle2,
  Calendar,
  ArrowLeft,
  Sparkles,
  Info,
  Loader2,
  AlertCircle,
  Flame,
  Award,
  ShieldCheck,
} from 'lucide-react';
import clsx from 'clsx';

import { PracticeApprovalQueue } from '@/components/faculty/PracticeApprovalQueue';

export default function FacultyCompetitionsPage() {
  const [activeTab, setActiveTab] = useState<'challenges' | 'approval_queue'>('challenges');
  const [competitions, setCompetitions] = useState<(PracticeLink & { completionCount: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [competitionUrl, setCompetitionUrl] = useState('');
  const [topic, setTopic] = useState('Arrays & Strings');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [instructions, setInstructions] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formFeedback, setFormFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fetchCompetitions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getFacultyCompetitionsAction();
      if (res.success) {
        setCompetitions(res.competitions);
      } else {
        setError(res.error || 'Failed to load competitions.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred loading competitions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompetitions();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormFeedback(null);

    try {
      const res = await createFacultyCompetitionAction({
        title,
        competitionUrl,
        topic,
        difficulty,
        instructions: instructions.trim() || undefined,
        deadline: deadline || undefined,
      });

      if (res.success) {
        setFormFeedback({
          type: 'success',
          message: 'HackerRank competition created successfully and published to student directory!',
        });
        // Reset form
        setTitle('');
        setCompetitionUrl('');
        setInstructions('');
        setDeadline('');
        // Refresh list
        await fetchCompetitions();
      } else {
        setFormFeedback({
          type: 'error',
          message: res.error || 'Failed to create competition.',
        });
      }
    } catch (err: any) {
      setFormFeedback({
        type: 'error',
        message: err.message || 'Unexpected server error.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDifficultyBadge = (diff: string) => {
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 pb-20">
      <Navbar role="faculty" userName="Faculty Staff" />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 flex flex-col gap-8">
        {/* Top Header & Breadcrumbs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div className="space-y-1">
            <Link
              href="/faculty"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Faculty Dashboard</span>
            </Link>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Trophy className="w-3.5 h-3.5 text-purple-400" />
              Faculty Challenge Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              HackerRank Custom Competitions
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Create and manage official coding challenges on HackerRank. Students who participate and solve earn verified game XP (+25 XP).
            </p>
          </div>

          <Link
            href="/student/practice"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 transition-all self-start md:self-auto"
          >
            <span>Preview Student Directory</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </Link>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('challenges')}
            className={clsx(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all border',
              activeTab === 'challenges'
                ? 'bg-white text-black border-white shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            )}
          >
            HackerRank Challenges
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('approval_queue')}
            className={clsx(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5',
              activeTab === 'approval_queue'
                ? 'bg-white text-black border-white shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            )}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Practice Solution Claims Queue</span>
          </button>
        </div>

        {activeTab === 'approval_queue' ? (
          <PracticeApprovalQueue />
        ) : (
          /* Two-Column Grid: Form + Existing List */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Create Competition Form (5 cols) */}
          <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Create Challenge</h2>
                <span className="text-[11px] text-slate-400">Publishes live to Practice Directory</span>
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {/* Competition Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Competition Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., DSA Weekly Sprint: Stack & Trees"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-all"
                />
              </div>

              {/* HackerRank URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>HackerRank Contest URL <span className="text-rose-400">*</span></span>
                  <span className="text-[10px] text-emerald-400 font-mono">hackerrank.com</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://www.hackerrank.com/contests/your-contest"
                  value={competitionUrl}
                  onChange={(e) => setCompetitionUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-all font-mono"
                />
                <p className="text-[10px] text-slate-400">
                  Provide your contest or challenge URL hosted on HackerRank.
                </p>
              </div>

              {/* Topic & Difficulty */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Topic</label>
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500 transition-all"
                  >
                    <option value="Arrays & Strings">Arrays & Strings</option>
                    <option value="Dynamic Programming">Dynamic Programming</option>
                    <option value="Trees & Graphs">Trees & Graphs</option>
                    <option value="Sorting & Searching">Sorting & Searching</option>
                    <option value="General Coding">General Coding</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500 transition-all"
                  >
                    <option value="Easy">Easy (+25 XP)</option>
                    <option value="Medium">Medium (+25 XP)</option>
                    <option value="Hard">Hard (+25 XP)</option>
                  </select>
                </div>
              </div>

              {/* Faculty Instructions */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Instructions / Hints</span>
                  <span className="text-[10px] text-slate-500">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g., Focus on achieving O(N log N) time complexity. Ensure edge cases are handled."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-all resize-none"
                />
              </div>

              {/* Deadline */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>End Date / Deadline</span>
                  <span className="text-[10px] text-slate-500">(Optional)</span>
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500 transition-all"
                />
              </div>

              {/* Feedback Alert */}
              {formFeedback && (
                <div
                  className={clsx(
                    'p-3 rounded-xl text-xs font-semibold flex items-center gap-2',
                    formFeedback.type === 'success'
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                  )}
                >
                  {formFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  )}
                  <span>{formFeedback.message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white shadow-lg shadow-purple-600/25 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Publishing Challenge...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Publish HackerRank Competition</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Existing Competitions List (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-purple-400" />
                  Active Faculty Competitions
                </h2>
                <span className="text-xs text-slate-400">
                  {competitions.length} challenges published
                </span>
              </div>
              <button
                onClick={fetchCompetitions}
                className="text-xs text-slate-400 hover:text-white transition-colors font-mono"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400 border border-slate-800 rounded-2xl bg-slate-900/40 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                <span>Loading faculty competitions...</span>
              </div>
            ) : error ? (
              <div className="p-6 text-xs text-rose-300 border border-rose-500/30 rounded-2xl bg-rose-500/10">
                {error}
              </div>
            ) : competitions.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-2xl bg-slate-900/20 space-y-2">
                <Trophy className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="font-semibold text-slate-300">No custom competitions yet.</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Create your first HackerRank coding competition using the form on the left. It will immediately show up in the students’ practice problem directory with a +25 XP reward!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {competitions.map((comp) => (
                  <div
                    key={comp.id}
                    className="p-5 rounded-2xl bg-slate-900/80 border border-purple-500/30 hover:border-purple-400/50 transition-all flex flex-col gap-3 shadow-md shadow-purple-950/10"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/15 text-emerald-300">
                            HackerRank
                          </span>
                          <span
                            className={clsx(
                              'text-[10px] font-mono font-semibold px-2 py-0.5 rounded border',
                              getDifficultyBadge(comp.difficulty)
                            )}
                          >
                            {comp.difficulty}
                          </span>
                          <span className="text-[10px] font-mono text-purple-300 bg-purple-900/40 px-2 py-0.5 rounded border border-purple-700/50 font-bold">
                            +25 XP Reward
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-white tracking-wide mt-1">
                          {comp.title}
                        </h3>

                        <p className="text-xs text-slate-400 font-mono">
                          Topic: <span className="text-slate-300">{comp.topic}</span>
                        </p>

                        {comp.instructions && (
                          <p className="text-[11px] text-slate-300 bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-xl leading-relaxed mt-1">
                            {comp.instructions}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/40 border border-purple-800/40 text-purple-300 text-xs font-semibold">
                        <Users className="w-3.5 h-3.5" />
                        <span>{comp.completionCount} Solved</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                      <div className="flex items-center gap-2 text-[11px] font-mono">
                        {comp.deadline ? (
                          <span className="inline-flex items-center gap-1 text-amber-300/80">
                            <Calendar className="w-3 h-3" />
                            Ends {new Date(comp.deadline).toLocaleDateString()}
                          </span>
                        ) : (
                          <span>Open contest</span>
                        )}
                      </div>

                      <a
                        href={comp.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-sky-400 hover:text-sky-300 transition-colors"
                      >
                        <span>Open on HackerRank</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
    </div>
  );
}
