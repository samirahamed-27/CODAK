'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import { getPracticeLinksAction } from '@/app/actions/practice';
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
} from 'lucide-react';
import clsx from 'clsx';
import Aurora from '@/components/Aurora';

export default function StudentPracticePage() {
  const [links, setLinks] = useState<PracticeLink[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadLinks() {
      setLoading(true);
      try {
        const res = await getPracticeLinksAction({
          topic: selectedTopic,
          difficulty: selectedDifficulty,
          search: searchQuery,
        });
        if (res.success) {
          setLinks(res.links);
          if (res.topics.length > 0 && topics.length === 0) {
            setTopics(res.topics);
          }
        }
      } catch (err) {
        console.error('Error fetching practice links:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLinks();
  }, [selectedTopic, selectedDifficulty, searchQuery]);

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
            <span className="text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-full border border-slate-800">
              Phase 3 • Curated Practice
            </span>
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <Code2 className="w-5 h-5 text-sky-400" />
              Practice Problem Directory
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Solve real-world coding problems on original platforms. We store verified problem metadata and links only — no statement copies.
            </p>
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
              <span>External Platforms</span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400 border border-slate-800/80 rounded-2xl bg-slate-900/40">
                Loading practice problems...
              </div>
            ) : links.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
                No practice problems found matching your filters.
              </div>
            ) : (
              <div className="space-y-2.5">
                {links.map((link) => (
                  <div
                    key={link.id || link.problem_id}
                    className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-black/20"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
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

                        <span className="text-[10px] font-mono text-slate-400">
                          {link.problem_id}
                        </span>
                      </div>

                      <h2 className="text-sm font-bold text-white tracking-wide">
                        {link.title}
                      </h2>

                      <p className="text-[11px] text-slate-400 font-mono">
                        Topic: <span className="text-slate-300">{link.topic}</span>
                      </p>
                    </div>

                    <div className="shrink-0 pt-1 sm:pt-0">
                      <a
                        href={link.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/30 text-sky-300 transition-all shadow-sm group"
                      >
                        <span>Solve on {link.platform}</span>
                        <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
