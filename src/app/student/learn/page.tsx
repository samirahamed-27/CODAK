'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import {
  getDailyQuizSessionAction,
  submitQuizAnswerAction,
  finalizeQuizAction,
  getPracticeQuizSessionAction,
  submitPracticeAnswerAction,
  ClientQuizQuestion,
  DailyQuizSessionResult,
} from '@/app/actions/quiz';
import {
  getConceptMatchRoundAction,
  submitConceptMatchAction,
} from '@/app/actions/concept-match';
import { ConceptMatchRound, ConceptMatchReviewItem } from '@/lib/concept-match';
import {
  Flame,
  Award,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  BookOpen,
  Calendar,
  ShieldAlert,
  Snowflake,
  Puzzle,
  Zap,
} from 'lucide-react';
import Shuffle from '@/components/Shuffle';
import clsx from 'clsx';
import { CelebrationManager, triggerCelebrationCheck } from '@/components/animations/CelebrationManager';

export default function StudentLearnPage() {
  const [activeTab, setActiveTab] = useState<'daily' | 'practice' | 'match'>('daily');

  // Daily Quiz State
  const [dailyState, setDailyState] = useState<DailyQuizSessionResult | null>(null);
  const [dailyIndex, setDailyIndex] = useState(0);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [finalResult, setFinalResult] = useState<{
    score: number;
    totalQuestions: number;
    xpAwarded: number;
    currentStreak: number;
    longestStreak: number;
    streakEventType?: string;
    bonusAwarded?: boolean;
    notes?: string;
  } | null>(null);

  // Practice Mode State (Zero answer keys in state before server response)
  const [practiceQuestions, setPracticeQuestions] = useState<
    {
      id: string;
      topic: string;
      questionText: string;
      options: { id: 'A' | 'B' | 'C' | 'D'; text: string }[];
    }[]
  >([]);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<number, string>>({});
  const [practiceFeedback, setPracticeFeedback] = useState<
    Record<number, { isCorrect: boolean; correctOption: string; explanation: string }>
  >({});
  const [practiceSubmitting, setPracticeSubmitting] = useState(false);
  const [practiceLoading, setPracticeLoading] = useState(false);

  // Concept Match State
  const [matchRound, setMatchRound] = useState<ConceptMatchRound | null>(null);
  const [matchToken, setMatchToken] = useState<string | null>(null);
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [userMatches, setUserMatches] = useState<Record<string, string>>({});
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchSubmitting, setMatchSubmitting] = useState(false);
  const [matchResult, setMatchResult] = useState<{
    correctCount: number;
    totalCount: number;
    isPerfect: boolean;
    xpAwarded?: number;
    review?: ConceptMatchReviewItem[];
  } | null>(null);

  // Load Daily Quiz on mount
  async function loadDailyQuiz() {
    setDailyLoading(true);
    setFinalResult(null);
    const res = await getDailyQuizSessionAction();
    setDailyState(res);
    setDailyLoading(false);

    if (res.status === 'active' && res.questions) {
      // Find first unanswered question
      const firstUnanswered = res.questions.findIndex((q) => !q.isAnswered);
      setDailyIndex(firstUnanswered !== -1 ? firstUnanswered : 0);
    }
  }

  // Load Practice Quiz
  async function loadPracticeQuiz() {
    setPracticeLoading(true);
    setPracticeIndex(0);
    setPracticeAnswers({});
    setPracticeFeedback({});
    const res = await getPracticeQuizSessionAction();
    if (res.success) {
      setPracticeQuestions(res.questions);
    }
    setPracticeLoading(false);
  }

  // Load Concept Match Round
  async function loadConceptMatch() {
    setMatchLoading(true);
    setSelectedTermId(null);
    setUserMatches({});
    setMatchResult(null);
    const res = await getConceptMatchRoundAction();
    if (res.success && res.round) {
      setMatchRound(res.round);
      setMatchToken(res.roundToken || null);
    }
    setMatchLoading(false);
  }

  function handleTermClick(termId: string) {
    if (matchResult) return;
    setSelectedTermId(termId === selectedTermId ? null : termId);
  }

  function handleDefinitionClick(defId: string) {
    if (matchResult || !selectedTermId) return;
    setUserMatches((prev) => ({
      ...prev,
      [selectedTermId]: defId,
    }));
    setSelectedTermId(null);
  }

  function handleRemoveMatch(termId: string) {
    if (matchResult) return;
    setUserMatches((prev) => {
      const next = { ...prev };
      delete next[termId];
      return next;
    });
  }

  async function handleSubmitConceptMatch() {
    if (!matchRound || matchSubmitting) return;
    const matchesArray = Object.entries(userMatches).map(([termId, definitionId]) => ({
      termId,
      definitionId,
    }));

    if (matchesArray.length < matchRound.terms.length) return;

    setMatchSubmitting(true);
    const res = await submitConceptMatchAction(matchesArray, matchToken || undefined);
    setMatchSubmitting(false);

    if (res.success) {
      setMatchResult({
        correctCount: res.correctCount,
        totalCount: res.totalCount,
        isPerfect: res.isPerfect,
        xpAwarded: res.xpAwarded,
        review: res.review,
      });
      // Check celebration after concept match result
      triggerCelebrationCheck();
    }
  }

  // Handle Practice Option Submission (Server-side evaluation)
  async function handlePracticeOptionSelect(optId: 'A' | 'B' | 'C' | 'D') {
    if (practiceAnswers[practiceIndex] !== undefined || practiceSubmitting) return;
    const currentQ = practiceQuestions[practiceIndex];
    if (!currentQ) return;

    setPracticeSubmitting(true);
    const res = await submitPracticeAnswerAction({
      questionId: currentQ.id,
      selectedOption: optId,
    });
    setPracticeSubmitting(false);

    if (res.success) {
      setPracticeAnswers((prev) => ({ ...prev, [practiceIndex]: optId }));
      setPracticeFeedback((prev) => ({
        ...prev,
        [practiceIndex]: {
          isCorrect: res.isCorrect ?? false,
          correctOption: res.correctOption ?? '',
          explanation: res.explanation ?? '',
        },
      }));
    }
  }

  useEffect(() => {
    if (activeTab === 'daily') {
      loadDailyQuiz();
    } else if (activeTab === 'practice') {
      loadPracticeQuiz();
    } else if (activeTab === 'match') {
      loadConceptMatch();
    }
  }, [activeTab]);

  // Handle Daily Answer Submission
  async function handleDailyAnswerSubmit() {
    if (!dailyState?.attemptId || !selectedOption || !currentDailyQuestion) return;

    setSubmittingAnswer(true);
    const res = await submitQuizAnswerAction({
      attemptId: dailyState.attemptId,
      questionId: currentDailyQuestion.id,
      selectedOption,
    });
    setSubmittingAnswer(false);

    if (res.success && dailyState.questions) {
      const updatedQuestions = [...dailyState.questions];
      updatedQuestions[dailyIndex] = {
        ...currentDailyQuestion,
        isAnswered: true,
        selectedOption,
        isCorrect: res.isCorrect,
        correctOption: res.correctOption,
        explanation: res.explanation,
      };

      setDailyState({
        ...dailyState,
        questions: updatedQuestions,
      });
      setSelectedOption(null);
    }
  }

  // Handle Daily Quiz Finalization
  async function handleFinalizeDailyQuiz() {
    if (!dailyState?.attemptId) return;

    setFinalizing(true);
    const res = await finalizeQuizAction({ attemptId: dailyState.attemptId });
    setFinalizing(false);

    if (res.success) {
      setFinalResult({
        score: res.score ?? 0,
        totalQuestions: res.totalQuestions ?? 5,
        xpAwarded: res.xpAwarded ?? 0,
        currentStreak: res.currentStreak ?? 0,
        longestStreak: res.longestStreak ?? 0,
        streakEventType: res.streakEventType,
        bonusAwarded: res.bonusAwarded,
        notes: res.notes,
      });
      // Check for celebration right after quiz finalized
      triggerCelebrationCheck();
    }
  }

  const currentDailyQuestion: ClientQuizQuestion | undefined =
    dailyState?.questions && dailyState.questions[dailyIndex];

  const allDailyQuestionsAnswered =
    dailyState?.questions && dailyState.questions.every((q) => q.isAnswered);

  return (
    <div className="min-h-screen flex flex-col bg-black pb-24 text-zinc-100">
      {/* Celebration Modal Manager */}
      <CelebrationManager />

      <Navbar role="student" />

      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-6 flex flex-col gap-5">
        <div>
          <Shuffle
            text="ACADEMIC LEARNING HUB"
            tag="h1"
            effect="slide"
            duration={0.35}
            stagger={0.03}
            triggerOnHover={true}
            color="#FFFFFF"
            accentColor="#A1A1AA"
            style={{ fontSize: '1.25rem', letterSpacing: '0.05em' }}
          />
          <p className="text-xs text-zinc-400 mt-1">
            Test your mastery with daily scored quizzes, practice problem sets, and concept matchmaking.
          </p>
        </div>

        {/* Mode Toggle Switch */}
        <div className="grid grid-cols-3 p-1.5 rounded-2xl bg-[#0c0c0e] border border-white/15 gap-1">
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'daily'
                ? 'bg-white text-black font-bold shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Daily Quiz</span>
          </button>
          <button
            onClick={() => setActiveTab('practice')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'practice'
                ? 'bg-white text-black font-bold shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Practice</span>
          </button>
          <button
            onClick={() => setActiveTab('match')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'match'
                ? 'bg-white text-black font-bold shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Puzzle className="w-3.5 h-3.5" />
            <span>Match</span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: DAILY QUIZ                                              */}
        {/* ============================================================== */}
        {activeTab === 'daily' && (
          <div>
            {dailyLoading ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                Preparing today&apos;s daily quiz session...
              </div>
            ) : finalResult ? (
              /* Quiz Completion Celebration Card */
              <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl flex flex-col items-center text-center gap-5">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mt-2">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                <div>
                  <h2 className="text-xl font-extrabold text-white">Daily Quiz Completed!</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Your answers were submitted and scored on the server.
                  </p>
                </div>

                {/* Score & XP Rewards Banner */}
                <div className="grid grid-cols-2 gap-3 w-full">
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Your Score
                    </div>
                    <div className="text-2xl font-black text-white mt-1">
                      {finalResult.score} / {finalResult.totalQuestions}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                    <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                      XP Awarded
                    </div>
                    <div className="text-2xl font-black text-amber-300 mt-1">
                      +{finalResult.xpAwarded} XP
                    </div>
                  </div>
                </div>

                {/* Streak Feedback Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-800 w-full flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                    <Flame className="w-6 h-6" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Streak: {finalResult.currentStreak} Days</span>
                      {finalResult.currentStreak >= 7 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400">
                          🔥 On Fire
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{finalResult.notes}</p>
                  </div>
                </div>

                {finalResult.bonusAwarded && (
                  <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs w-full flex items-center gap-2.5">
                    <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
                    <span>
                      🎉 <strong>7-Day Streak Milestone Reached!</strong> Extra +50 XP bonus awarded!
                    </span>
                  </div>
                )}

                <div className="flex flex-col gap-2.5 w-full mt-2">
                  <button
                    onClick={() => setActiveTab('practice')}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2"
                  >
                    <span>Practice More Questions (Unlimited)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <Link
                    href="/student"
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold text-center transition-colors"
                  >
                    Return to Dashboard
                  </Link>
                </div>
              </div>
            ) : dailyState?.status === 'completed' ? (
              /* Already Completed Earlier Today */
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 text-center flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Today&apos;s Quiz is Done!</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    You scored <strong>{dailyState.score} / {dailyState.totalQuestions}</strong> and earned{' '}
                    <strong>+{dailyState.xpAwarded} XP</strong> today ({dailyState.quizDate}).
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 w-full flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-rose-500" />
                    <span className="font-semibold text-slate-300">
                      Current Streak: {dailyState.streak?.currentStreak} Days
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Snowflake className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{dailyState.streak?.freezeDaysRemaining} Freezes Left</span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('practice')}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
                >
                  Switch to Practice Mode
                </button>
              </div>
            ) : dailyState?.status === 'error' ? (
              <div className="p-6 rounded-3xl bg-slate-900/80 border border-rose-500/30 flex flex-col items-center text-center gap-4">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Daily Quiz Unavailable</h3>
                  <p className="text-xs text-rose-300/80 mt-1 max-w-md">{dailyState.error}</p>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <button
                    onClick={() => loadDailyQuiz()}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/20 flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retry Daily Quiz</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('practice')}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                  >
                    Switch to Practice
                  </button>
                </div>
              </div>
            ) : currentDailyQuestion ? (
              /* Active Daily Quiz Question Screen */
              <div className="flex flex-col gap-4">
                {/* Progress Bar & Header */}
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-200">
                    Question {dailyIndex + 1} of {dailyState?.totalQuestions ?? 5}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    {currentDailyQuestion.topic}
                  </span>
                </div>

                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-300 shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                    style={{
                      width: `${((dailyIndex + 1) / (dailyState?.totalQuestions ?? 5)) * 100}%`,
                    }}
                  />
                </div>

                {/* Question Card */}
                <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col gap-4">
                  <h2 className="text-base sm:text-lg font-bold text-white leading-relaxed">
                    {currentDailyQuestion.questionText}
                  </h2>

                  {/* 4 Choices (Strict A, B, C, D order) */}
                  <div className="flex flex-col gap-2.5">
                    {currentDailyQuestion.options
                      .slice()
                      .sort((a, b) => a.id.localeCompare(b.id))
                      .map((opt) => {
                      const isSelected = selectedOption === opt.id;
                      const isAnswered = currentDailyQuestion.isAnswered;
                      const isStudentChoice = currentDailyQuestion.selectedOption === opt.id;
                      const isCorrectChoice = currentDailyQuestion.correctOption === opt.id;

                      let cardStyle =
                        'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-300';

                      if (isAnswered) {
                        if (isCorrectChoice) {
                          cardStyle = 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200 font-medium';
                        } else if (isStudentChoice && !currentDailyQuestion.isCorrect) {
                          cardStyle = 'bg-rose-500/15 border-rose-500/50 text-rose-200';
                        } else {
                          cardStyle = 'bg-slate-950/30 border-slate-800/40 text-slate-500 opacity-60';
                        }
                      } else if (isSelected) {
                        cardStyle =
                          'bg-indigo-600/20 border-indigo-500 text-white font-semibold ring-1 ring-indigo-500';
                      }

                      return (
                        <button
                          key={opt.id}
                          disabled={isAnswered}
                          onClick={() => setSelectedOption(opt.id)}
                          className={`w-full p-3.5 rounded-2xl border text-xs sm:text-sm text-left flex items-center justify-between gap-3 transition-all ${cardStyle}`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                isAnswered && isCorrectChoice
                                  ? 'bg-emerald-500 text-slate-950'
                                  : isAnswered && isStudentChoice && !currentDailyQuestion.isCorrect
                                  ? 'bg-rose-500 text-white'
                                  : isSelected
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {opt.id}
                            </span>
                            <span>{opt.text}</span>
                          </div>

                          {isAnswered && isCorrectChoice && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          )}
                          {isAnswered && isStudentChoice && !currentDailyQuestion.isCorrect && (
                            <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Immediate Explanation Feedback (Shown ONLY after answering) */}
                  {currentDailyQuestion.isAnswered && (
                    <div
                      className={`p-4 rounded-2xl border text-xs flex flex-col gap-1 animate-fadeIn ${
                        currentDailyQuestion.isCorrect
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-200'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1.5">
                        {currentDailyQuestion.isCorrect ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Correct answer!</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-rose-400" />
                            <span>Incorrect. Correct answer is option {currentDailyQuestion.correctOption}.</span>
                          </>
                        )}
                      </div>
                      <p className="text-slate-300 mt-1 leading-relaxed">
                        {currentDailyQuestion.explanation}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-2 flex items-center justify-between gap-3">
                    {!currentDailyQuestion.isAnswered ? (
                      <button
                        onClick={handleDailyAnswerSubmit}
                        disabled={!selectedOption || submittingAnswer}
                        className="w-full py-3 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all shadow-md shadow-white/10 disabled:opacity-40"
                      >
                        {submittingAnswer ? 'Verifying with Server...' : 'Submit Answer'}
                      </button>
                    ) : dailyIndex + 1 < (dailyState?.totalQuestions ?? 5) ? (
                      <button
                        onClick={() => {
                          setDailyIndex(dailyIndex + 1);
                          setSelectedOption(null);
                        }}
                        className="w-full py-3 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all shadow-md shadow-white/10 flex items-center justify-center gap-2"
                      >
                        <span>Next Question</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={handleFinalizeDailyQuiz}
                        disabled={finalizing}
                        className="w-full py-3 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all shadow-lg shadow-white/10 flex items-center justify-center gap-2"
                      >
                        <span>{finalizing ? 'Scoring Quiz...' : 'Finish & Claim XP'}</span>
                        <Award className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: UNLIMITED PRACTICE MODE                                */}
        {/* ============================================================== */}
        {activeTab === 'practice' && (
          <div>
            {practiceLoading ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                Generating practice questions...
              </div>
            ) : practiceQuestions.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400">
                No questions available for practice right now.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Practice Progress Bar */}
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-200">
                    Practice Question {practiceIndex + 1} of {practiceQuestions.length}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    {practiceQuestions[practiceIndex].topic}
                  </span>
                </div>

                <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col gap-4">
                  <h2 className="text-base sm:text-lg font-bold text-white leading-relaxed">
                    {practiceQuestions[practiceIndex].questionText}
                  </h2>

                  {/* 4 Choices (Strict A, B, C, D order) */}
                  <div className="flex flex-col gap-2.5">
                    {practiceQuestions[practiceIndex].options
                      .slice()
                      .sort((a, b) => a.id.localeCompare(b.id))
                      .map((opt) => {
                      const hasAnswered = practiceAnswers[practiceIndex] !== undefined;
                      const isStudentChoice = practiceAnswers[practiceIndex] === opt.id;
                      const feedback = practiceFeedback[practiceIndex];
                      const isCorrectChoice = feedback && feedback.correctOption === opt.id;

                      let style =
                        'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-300';
                      if (hasAnswered) {
                        if (isCorrectChoice) {
                          style = 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200 font-medium';
                        } else if (isStudentChoice) {
                          style = 'bg-rose-500/15 border-rose-500/50 text-rose-200';
                        } else {
                          style = 'bg-slate-950/30 border-slate-800/40 text-slate-500 opacity-60';
                        }
                      }

                      return (
                        <button
                          key={opt.id}
                          disabled={hasAnswered || practiceSubmitting}
                          onClick={() => handlePracticeOptionSelect(opt.id)}
                          className={`w-full p-3.5 rounded-2xl border text-xs sm:text-sm text-left flex items-center justify-between gap-3 transition-all ${style}`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                hasAnswered && isCorrectChoice
                                  ? 'bg-emerald-500 text-slate-950'
                                  : hasAnswered && isStudentChoice
                                  ? 'bg-rose-500 text-white'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {opt.id}
                            </span>
                            <span>{opt.text}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {practiceSubmitting && (
                    <div className="text-center py-2 text-xs text-indigo-400 animate-pulse">
                      Checking answer with server...
                    </div>
                  )}

                  {/* Explanation feedback (Server revealed post-submission) */}
                  {practiceAnswers[practiceIndex] !== undefined && practiceFeedback[practiceIndex] && (
                    <div
                      className={`p-4 rounded-2xl border text-xs leading-relaxed animate-fadeIn ${
                        practiceFeedback[practiceIndex].isCorrect
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-200'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1.5 mb-1">
                        {practiceFeedback[practiceIndex].isCorrect ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Correct answer!</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-rose-400" />
                            <span>
                              Incorrect. Correct choice is option {practiceFeedback[practiceIndex].correctOption}.
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-slate-300">{practiceFeedback[practiceIndex].explanation}</p>
                    </div>
                  )}

                  {/* Next / Restart */}
                  {practiceAnswers[practiceIndex] !== undefined && (
                    <div className="mt-2">
                      {practiceIndex + 1 < practiceQuestions.length ? (
                        <button
                          onClick={() => setPracticeIndex(practiceIndex + 1)}
                          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20"
                        >
                          <span>Next Question</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={loadPracticeQuiz}
                          className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Practice 5 New Questions</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: CONCEPT MATCH MINI-GAME                                */}
        {/* ============================================================== */}
        {activeTab === 'match' && (
          <div className="space-y-4">
            {/* Header / Intro banner */}
            <div className="p-4 rounded-2xl bg-[#0c0c0e] border border-white/15 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/10 border border-white/20 text-white">
                  <Puzzle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Concept Match
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-white">
                      +10 XP
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Pair each term with its correct definition. Match all 4 to earn XP (Max 2/day).
                  </p>
                </div>
              </div>
            </div>

            {matchLoading ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                Generating concept match pairs...
              </div>
            ) : matchResult ? (
              /* Round Result Screen */
              <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl flex flex-col items-center text-center gap-5">
                <div className="w-14 h-14 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  {matchResult.isPerfect ? (
                    <Sparkles className="w-8 h-8 text-amber-400" />
                  ) : (
                    <Puzzle className="w-8 h-8 text-sky-400" />
                  )}
                </div>

                <div>
                  <h2 className="text-xl font-extrabold text-white">
                    {matchResult.isPerfect ? '🎉 Perfect Match!' : 'Round Completed'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Score:{' '}
                    <strong className="text-sky-300 font-bold font-mono">
                      {matchResult.correctCount} / {matchResult.totalCount}
                    </strong>{' '}
                    matches correct
                  </p>
                </div>

                {matchResult.xpAwarded ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs w-full flex items-center justify-center gap-2 font-mono font-bold">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span>+{matchResult.xpAwarded} XP awarded to your ledger!</span>
                  </div>
                ) : matchResult.isPerfect ? (
                  <p className="text-xs text-slate-500">
                    Daily match limit reached. Excellent practice!
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">
                    Review the correct answers and conceptual explanations below to master these concepts!
                  </p>
                )}

                {/* Explanations and Answer Keys Section */}
                {matchResult.review && matchResult.review.length > 0 && (
                  <div className="w-full text-left space-y-3.5 mt-2">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                        <span>Answers & Explanations</span>
                      </h3>
                      <span className="text-[11px] font-mono font-semibold text-slate-400">
                        {matchResult.correctCount}/{matchResult.totalCount} Correct
                      </span>
                    </div>

                    <div className="space-y-3">
                      {matchResult.review.map((item, idx) => (
                        <div
                          key={item.termId || idx}
                          className={clsx(
                            'p-4 rounded-2xl border transition-all text-xs flex flex-col gap-2.5',
                            item.isCorrect
                              ? 'bg-emerald-500/[0.04] border-emerald-500/25'
                              : 'bg-rose-500/[0.04] border-rose-500/25'
                          )}
                        >
                          {/* Term Title & Status */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-white font-mono">{item.term}</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/10 border border-sky-500/20 text-sky-300">
                                {item.topic}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] font-bold shrink-0">
                              {item.isCorrect ? (
                                <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Matched</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Missed</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* If Incorrect: show user's choice */}
                          {!item.isCorrect && (
                            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-rose-500/20 text-[11px] space-y-1">
                              <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
                                <XCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>Your Selected Definition:</span>
                              </div>
                              <p className="text-slate-400 pl-5 italic">{item.userDefinition || 'Unmatched'}</p>
                            </div>
                          )}

                          {/* Correct Definition */}
                          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-emerald-500/20 text-[11px] space-y-1">
                            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>Correct Definition:</span>
                            </div>
                            <p className="text-slate-200 pl-5">{item.correctDefinition}</p>
                          </div>

                          {/* Conceptual Explanation */}
                          <div className="p-3 rounded-xl bg-sky-950/30 border border-sky-500/20 text-[11px] text-sky-200/90 leading-relaxed">
                            <div className="flex items-center gap-1.5 font-bold text-sky-300 mb-1 text-[11px]">
                              <Sparkles className="w-3 h-3 text-sky-400" />
                              <span>Concept Explanation:</span>
                            </div>
                            <p className="pl-4">{item.explanation}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full mt-2">
                  <button
                    onClick={loadConceptMatch}
                    className="w-full sm:flex-1 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-md shadow-sky-600/20 flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Play Another Round</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('daily')}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                  >
                    Daily Quiz
                  </button>
                </div>
              </div>
            ) : matchRound ? (
              <div className="space-y-4">
                {/* Instructions */}
                <p className="text-xs text-slate-400 text-center font-mono">
                  {selectedTermId
                    ? '👉 Now click the matching definition on the right.'
                    : '1. Select a Term on the left, then 2. Click its matching definition.'}
                </p>

                {/* Terms and Definitions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column: Terms */}
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-mono font-bold text-sky-400 uppercase tracking-wider">
                      Concepts
                    </h4>
                    {matchRound.terms.map((t) => {
                      const isSelected = selectedTermId === t.id;
                      const matchedDefId = userMatches[t.id];

                      return (
                        <div
                          key={t.id}
                          onClick={() => handleTermClick(t.id)}
                          className={clsx(
                            'p-3.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between',
                            isSelected
                              ? 'bg-sky-500/20 border-sky-400 text-white shadow-md shadow-sky-500/20'
                              : matchedDefId
                              ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200'
                              : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                          )}
                        >
                          <span className="font-bold">{t.term}</span>
                          {matchedDefId && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveMatch(t.id);
                              }}
                              className="text-[10px] font-mono text-rose-400 hover:text-rose-300 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20"
                              title="Unlink"
                            >
                              Unlink
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Right Column: Definitions */}
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-mono font-bold text-sky-400 uppercase tracking-wider">
                      Definitions
                    </h4>
                    {matchRound.definitions.map((d) => {
                      const matchedTermId = Object.keys(userMatches).find(
                        (tId) => userMatches[tId] === d.id
                      );

                      return (
                        <div
                          key={d.id}
                          onClick={() => handleDefinitionClick(d.id)}
                          className={clsx(
                            'p-3.5 rounded-xl border text-xs cursor-pointer transition-all leading-relaxed',
                            matchedTermId
                              ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200'
                              : selectedTermId
                              ? 'bg-slate-900/90 border-sky-500/40 hover:border-sky-400 text-slate-200'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400'
                          )}
                        >
                          {matchedTermId && (
                            <span className="block text-[10px] font-mono font-bold text-sky-400 mb-1">
                              ✓ Paired with: {matchRound.terms.find((t) => t.id === matchedTermId)?.term}
                            </span>
                          )}
                          <p className="text-[11px]">{d.definition}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    onClick={handleSubmitConceptMatch}
                    disabled={
                      Object.keys(userMatches).length < matchRound.terms.length ||
                      matchSubmitting
                    }
                    className="w-full py-3 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all disabled:opacity-40 shadow-lg shadow-white/10 flex items-center justify-center gap-2"
                  >
                    <span>{matchSubmitting ? 'Verifying Matches...' : 'Submit Matches'}</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
