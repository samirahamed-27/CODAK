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
  ClientQuizQuestion,
  DailyQuizSessionResult,
} from '@/app/actions/quiz';
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
} from 'lucide-react';
import Shuffle from '@/components/Shuffle';

export default function StudentPlayPage() {
  const [activeTab, setActiveTab] = useState<'daily' | 'practice'>('daily');

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

  // Practice Mode State
  const [practiceQuestions, setPracticeQuestions] = useState<
    {
      id: string;
      topic: string;
      questionText: string;
      options: { id: 'A' | 'B' | 'C' | 'D'; text: string }[];
      correctOption: string;
      explanation: string;
    }[]
  >([]);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<number, string>>({});
  const [practiceLoading, setPracticeLoading] = useState(false);

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
    const res = await getPracticeQuizSessionAction();
    if (res.success) {
      setPracticeQuestions(res.questions);
    }
    setPracticeLoading(false);
  }

  useEffect(() => {
    if (activeTab === 'daily') {
      loadDailyQuiz();
    } else {
      loadPracticeQuiz();
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
    }
  }

  const currentDailyQuestion: ClientQuizQuestion | undefined =
    dailyState?.questions && dailyState.questions[dailyIndex];

  const allDailyQuestionsAnswered =
    dailyState?.questions && dailyState.questions.every((q) => q.isAnswered);

  return (
    <div className="min-h-screen flex flex-col bg-[#07080B] pb-24 text-slate-100">
      <Navbar role="student" userName="Aarav Sharma" />

      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-6 flex flex-col gap-5">
        <div>
          <Shuffle
            text="PLAY AREA"
            tag="h1"
            effect="slide"
            duration={0.35}
            stagger={0.03}
            triggerOnHover={true}
            color="#FFFFFF"
            accentColor="#7DD3FC"
            style={{ fontSize: '1.25rem', letterSpacing: '0.05em' }}
          />
          <p className="text-xs text-slate-400 mt-1">
            Test your mastery with daily scored quizzes and unlimited practice.
          </p>
        </div>

        {/* Mode Toggle Switch */}
        <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'daily'
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Daily Quiz (Scored)</span>
          </button>
          <button
            onClick={() => setActiveTab('practice')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'practice'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Practice Mode</span>
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
              <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <span>{dailyState.error}</span>
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
                    className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-300"
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

                  {/* 4 Choices */}
                  <div className="flex flex-col gap-2.5">
                    {currentDailyQuestion.options.map((opt) => {
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
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white text-xs font-bold transition-all shadow-md shadow-rose-500/20 disabled:opacity-40"
                      >
                        {submittingAnswer ? 'Verifying with Server...' : 'Submit Answer'}
                      </button>
                    ) : dailyIndex + 1 < (dailyState?.totalQuestions ?? 5) ? (
                      <button
                        onClick={() => {
                          setDailyIndex(dailyIndex + 1);
                          setSelectedOption(null);
                        }}
                        className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2"
                      >
                        <span>Next Question</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={handleFinalizeDailyQuiz}
                        disabled={finalizing}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
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

                  {/* 4 Choices */}
                  <div className="flex flex-col gap-2.5">
                    {practiceQuestions[practiceIndex].options.map((opt) => {
                      const hasAnswered = practiceAnswers[practiceIndex] !== undefined;
                      const isStudentChoice = practiceAnswers[practiceIndex] === opt.id;
                      const isCorrectChoice =
                        practiceQuestions[practiceIndex].correctOption === opt.id;

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
                          disabled={hasAnswered}
                          onClick={() => {
                            setPracticeAnswers({ ...practiceAnswers, [practiceIndex]: opt.id });
                          }}
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

                  {/* Explanation feedback */}
                  {practiceAnswers[practiceIndex] !== undefined && (
                    <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 leading-relaxed">
                      <div className="font-bold text-indigo-300 mb-1">
                        {practiceAnswers[practiceIndex] === practiceQuestions[practiceIndex].correctOption
                          ? '✅ Correct!'
                          : `❌ Correct choice is option ${practiceQuestions[practiceIndex].correctOption}.`}
                      </div>
                      <p className="text-slate-300">{practiceQuestions[practiceIndex].explanation}</p>
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
      </main>

      <BottomNav />
    </div>
  );
}
