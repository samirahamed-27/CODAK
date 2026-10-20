'use client';

import React, { useState, useEffect } from 'react';
import { QuestionReviewItem, EnemyProfile } from '@/types/syntaxSamurai';

export interface CodeReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reviewItems: QuestionReviewItem[];
  enemy: EnemyProfile;
}

export const CodeReviewModal: React.FC<CodeReviewModalProps> = ({
  isOpen,
  onClose,
  reviewItems,
  enemy,
}) => {
  const [filter, setFilter] = useState<'all' | 'failed' | 'correct'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(
    reviewItems.find((item) => !item.isCorrect)?.question.id || reviewItems[0]?.question.id || null
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const failedItems = reviewItems.filter((item) => !item.isCorrect);
  const correctItems = reviewItems.filter((item) => item.isCorrect);

  const displayedItems =
    filter === 'failed'
      ? failedItems
      : filter === 'correct'
      ? correctItems
      : reviewItems;

  const getCompilerDiagnostic = (lang: string) => {
    switch (lang) {
      case 'python':
        return "CPython's PEG parser raises a SyntaxError during AST generation prior to bytecode compilation.";
      case 'javascript':
        return "V8's Ignition parser halts execution during the early parse phase before JIT optimization.";
      case 'cpp':
        return 'Clang and GCC compiler frontends reject this token during semantic analysis with a fatal compilation diagnostic.';
      case 'java':
        return 'The javac compiler halts compilation of bytecode classfiles due to a fatal lexical/grammar constraint.';
      default:
        return 'The compiler frontend terminates execution during syntax analysis with a fatal token error.';
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl bg-[#0a0a12] border border-zinc-800 shadow-2xl overflow-hidden font-mono"
      >
        {/* Top Header */}
        <div className="px-5 py-4 bg-zinc-950 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚔️</span>
            <div>
              <h2 id="review-modal-title" className="text-sm sm:text-base font-bold text-white tracking-wider flex items-center gap-2">
                <span>INSPECT THE BLADE</span>
                <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-normal">
                  Code Trial Archive
                </span>
              </h2>
              <p className="text-[11px] text-zinc-500 font-sans">
                Review flawed syntax wounds, compiler diagnostics, and perfected scroll repairs.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-white flex items-center justify-center transition-colors text-sm"
            title="Close review (ESC)"
          >
            ✕
          </button>
        </div>

        {/* Filter Navigation Bar */}
        <div className="px-5 py-3 bg-zinc-900/60 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-zinc-950 border border-zinc-800">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded font-bold transition-all ${
                filter === 'all'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All Trials ({reviewItems.length})
            </button>
            <button
              onClick={() => setFilter('failed')}
              className={`px-3 py-1 rounded font-bold transition-all flex items-center gap-1.5 ${
                filter === 'failed'
                  ? 'bg-red-950/80 text-red-300 border border-red-500/50 shadow-sm'
                  : 'text-zinc-400 hover:text-red-300'
              }`}
            >
              <span>✗ Flawed Strikes ({failedItems.length})</span>
            </button>
            <button
              onClick={() => setFilter('correct')}
              className={`px-3 py-1 rounded font-bold transition-all flex items-center gap-1.5 ${
                filter === 'correct'
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 shadow-sm'
                  : 'text-zinc-400 hover:text-emerald-300'
              }`}
            >
              <span>✓ Purified ({correctItems.length})</span>
            </button>
          </div>

          <div className="text-[11px] text-zinc-500">
            Click any scroll to view the side-by-side diff
          </div>
        </div>

        {/* Scrollable Trials List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {displayedItems.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-xs font-sans">
              No scrolls matching this filter category.
            </div>
          ) : (
            displayedItems.map((item, idx) => {
              const q = item.question;
              const isExpanded = expandedId === q.id;
              const lines = q.codeSnippet.split('\n');

              return (
                <div
                  key={q.id}
                  className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                    item.isCorrect
                      ? 'border-emerald-500/30 bg-emerald-950/10'
                      : 'border-red-500/40 bg-red-950/10'
                  }`}
                >
                  {/* Collapsible Accordion Header */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : q.id)}
                    className="w-full px-4 py-3 bg-zinc-950/80 hover:bg-zinc-900/80 flex items-center justify-between gap-3 text-left transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                          item.isCorrect
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-red-500/20 text-red-400 border border-red-500/40'
                        }`}
                      >
                        {item.isCorrect ? '✓' : '✗'}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white tracking-wider">
                            SCROLL {idx + 1}: {q.id}
                          </span>
                          <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                            {q.language}
                          </span>
                          <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                            {q.difficulty}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 font-sans mt-0.5">
                          {q.errorBoundingHint}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <div className="text-right hidden sm:block">
                        <div
                          className={`font-bold ${
                            item.isCorrect ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {item.isCorrect ? `+${item.xpEarned} XP` : '0 XP'}
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          {item.wasSliced ? 'BLADE SLICED' : 'BLADE MISSED'}
                        </div>
                      </div>
                      <span className="text-zinc-500 text-xs">
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    </div>
                  </button>

                  {/* Expanded Side-by-Side Diff & Explanation */}
                  {isExpanded && (
                    <div className="p-4 sm:p-5 bg-zinc-950/95 border-t border-zinc-800/80 space-y-4 animate-in fade-in duration-200">
                      {/* Side-by-Side Diff Viewer */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* LEFT: Buggy Code (Flawed Syntax) */}
                        <div className="rounded-lg border border-red-500/30 bg-[#0c0d14] overflow-hidden">
                          <div className="px-3 py-1.5 bg-red-950/40 border-b border-red-500/20 flex items-center justify-between text-[11px] text-red-300 font-bold">
                            <span className="flex items-center gap-1.5">
                              <span>✗</span>
                              <span>FLAWED CODE (BUGGY)</span>
                            </span>
                            <span className="text-[10px] text-red-400/80 uppercase font-sans">
                              Line {q.errorLineIndex + 1}
                            </span>
                          </div>

                          <div className="p-3 overflow-x-auto text-xs leading-relaxed">
                            {lines.map((lineStr, lineIdx) => {
                              const isErr = lineIdx === q.errorLineIndex;
                              const errIdx = isErr ? lineStr.indexOf(q.errorToken) : -1;

                              return (
                                <div
                                  key={lineIdx}
                                  className={`flex items-center px-1 py-0.5 rounded ${
                                    isErr ? 'bg-red-500/15 border-l-2 border-red-500' : ''
                                  }`}
                                >
                                  <span className="w-6 text-right pr-3 text-zinc-600 select-none text-[11px]">
                                    {lineIdx + 1}
                                  </span>
                                  <span className="flex-1 whitespace-pre">
                                    {isErr && errIdx !== -1 ? (
                                      <>
                                        <span className="text-zinc-400">
                                          {lineStr.substring(0, errIdx)}
                                        </span>
                                        <span className="bg-red-950 text-red-300 line-through decoration-red-500 decoration-2 font-bold px-1 rounded border border-red-500/60 shadow-[0_0_8px_rgba(239,68,68,0.4)]">
                                          {q.errorToken}
                                        </span>
                                        <span className="text-zinc-400">
                                          {lineStr.substring(errIdx + q.errorToken.length)}
                                        </span>
                                      </>
                                    ) : isErr ? (
                                      <span className="bg-red-950/70 text-red-300 font-bold px-1.5 py-0.5 rounded border border-red-500/50">
                                        {lineStr || `[flawed line: ${q.errorToken}]`}
                                      </span>
                                    ) : (
                                      <span className="text-zinc-400">{lineStr || ' '}</span>
                                    )}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* RIGHT: Corrected Code (Clean Syntax) */}
                        <div className="rounded-lg border border-emerald-500/30 bg-[#0c0d14] overflow-hidden">
                          <div className="px-3 py-1.5 bg-emerald-950/40 border-b border-emerald-500/20 flex items-center justify-between text-[11px] text-emerald-300 font-bold">
                            <span className="flex items-center gap-1.5">
                              <span>✓</span>
                              <span>PURIFIED CODE (CORRECTED)</span>
                            </span>
                            <span className="text-[10px] text-emerald-400/80 uppercase font-sans">
                              Cleaned
                            </span>
                          </div>

                          <div className="p-3 overflow-x-auto text-xs leading-relaxed">
                            {lines.map((lineStr, lineIdx) => {
                              const isErr = lineIdx === q.errorLineIndex;
                              const errIdx = isErr ? lineStr.indexOf(q.errorToken) : -1;

                              return (
                                <div
                                  key={lineIdx}
                                  className={`flex items-center px-1 py-0.5 rounded ${
                                    isErr ? 'bg-emerald-500/15 border-l-2 border-emerald-500' : ''
                                  }`}
                                >
                                  <span className="w-6 text-right pr-3 text-zinc-600 select-none text-[11px]">
                                    {lineIdx + 1}
                                  </span>
                                  <span className="flex-1 whitespace-pre">
                                    {isErr && errIdx !== -1 ? (
                                      <>
                                        <span className="text-zinc-400">
                                          {lineStr.substring(0, errIdx)}
                                        </span>
                                        <span className="bg-emerald-950 text-emerald-300 font-bold px-1 rounded border border-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.4)]">
                                          {q.correctReplacement}
                                        </span>
                                        <span className="text-zinc-400">
                                          {lineStr.substring(errIdx + q.errorToken.length)}
                                        </span>
                                      </>
                                    ) : isErr ? (
                                      <span className="bg-emerald-950/70 text-emerald-300 font-bold px-1.5 py-0.5 rounded border border-emerald-500/50">
                                        {lineStr || `[purified line: ${q.correctReplacement}]`}
                                      </span>
                                    ) : (
                                      <span className="text-zinc-400">{lineStr || ' '}</span>
                                    )}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Educational Breakdown & Compiler Diagnostic */}
                      <div className="p-3.5 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs font-sans space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="text-emerald-400 font-bold font-mono text-[11px] whitespace-nowrap">
                            [EXPLANATION]
                          </span>
                          <p className="text-zinc-300 leading-relaxed">{q.explanation}</p>
                        </div>

                        <div className="flex items-start gap-2 border-t border-zinc-800/80 pt-2">
                          <span className="text-sky-400 font-bold font-mono text-[11px] whitespace-nowrap">
                            [COMPILER NOTE]
                          </span>
                          <p className="text-zinc-400 leading-relaxed text-[11px]">
                            {getCompilerDiagnostic(q.language)}
                          </p>
                        </div>

                        {/* Player Choice Comparison */}
                        <div className="flex flex-wrap items-center gap-3 border-t border-zinc-800/80 pt-2 text-[11px] font-mono">
                          <div>
                            <span className="text-zinc-500">YOUR BLADE REPAIR: </span>
                            <span
                              className={`font-bold ${
                                item.isCorrect ? 'text-emerald-400' : 'text-red-400'
                              }`}
                            >
                              {item.selectedFix ? `"${item.selectedFix}"` : 'NONE (EXPIRED)'}
                            </span>
                          </div>
                          <span className="text-zinc-600">•</span>
                          <div>
                            <span className="text-zinc-500">CORRECT SYNTAX: </span>
                            <span className="font-bold text-emerald-400">
                              &quot;{q.correctReplacement}&quot;
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-xs">
          <div className="text-zinc-500">
            Adversary: <span className="text-white font-bold">{enemy.name}</span> ({enemy.alias})
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-200 hover:text-white font-bold transition-colors"
          >
            Close Review
          </button>
        </div>
      </div>
    </div>
  );
};

export default CodeReviewModal;
