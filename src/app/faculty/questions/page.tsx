'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import {
  getFacultyQuestionsAction,
  addQuestionManualAction,
  uploadQuestionsCsvAction,
  approveQuestionAction,
  approveAllQuestionsAction,
  rejectQuestionAction,
  editQuestionAction,
  QuestionRecord,
  EditQuestionInput,
} from '@/app/actions/faculty-questions';
import { generateQuestionsAiAction } from '@/app/actions/ai-questions';
import {
  BookOpen,
  Plus,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Check,
  X,
  FileText,
  AlertTriangle,
  ArrowLeft,
  Edit3,
  ShieldAlert,
  MessageSquare,
  CheckCheck,
  Sparkles,
} from 'lucide-react';

export default function FacultyQuestionsPage() {
  const [questions, setQuestions] = useState<QuestionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [topicFilter, setTopicFilter] = useState<string>('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionRecord | null>(null);
  const [rejectingQuestion, setRejectingQuestion] = useState<QuestionRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  // AI Question Generator Form
  const [aiTopic, setAiTopic] = useState('Dynamic Programming: 0/1 Knapsack');
  const [aiDifficulty, setAiDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [aiCount, setAiCount] = useState(3);
  const [aiFocus, setAiFocus] = useState('Optimal substructure, boundary constraints, and recurrence relations');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<{
    success?: boolean;
    count?: number;
    message?: string;
    error?: string;
    source?: string;
  } | null>(null);

  // Manual Question Form
  const [manualForm, setManualForm] = useState({
    topic: '',
    questionText: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctOption: 'A' as 'A' | 'B' | 'C' | 'D',
    explanation: '',
  });
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  // Edit Question Form
  const [editForm, setEditForm] = useState<EditQuestionInput>({
    id: '',
    topic: '',
    questionText: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctOption: 'A',
    explanation: '',
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // CSV Upload State
  const [csvText, setCsvText] = useState('');
  const [csvSubmitting, setCsvSubmitting] = useState(false);
  const [csvResult, setCsvResult] = useState<{
    success?: boolean;
    error?: string;
    importedCount?: number;
    errors?: { row: number; field: string; message: string }[];
  } | null>(null);

  // Batch Approve State
  const [approvingAll, setApprovingAll] = useState(false);
  const [showApproveAllModal, setShowApproveAllModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function loadQuestions() {
    setLoading(true);
    setActionError(null);
    const res = await getFacultyQuestionsAction();
    if (res.success) {
      setQuestions(res.questions);
    } else {
      setActionError(res.error || 'Failed to load questions.');
    }
    setLoading(false);
  }

  useEffect(() => {
    loadQuestions();
  }, []);

  const topics = Array.from(new Set(questions.map((q) => q.topic))).filter(Boolean);

  const filteredQuestions = questions.filter((q) => {
    const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
    const matchesTopic = topicFilter === 'all' || q.topic === topicFilter;
    return matchesStatus && matchesTopic;
  });

  const pendingCount = questions.filter((q) => q.status === 'pending').length;
  const approvedCount = questions.filter((q) => q.status === 'approved').length;
  const rejectedCount = questions.filter((q) => q.status === 'rejected').length;
  const pendingInCurrentView = filteredQuestions.filter((q) => q.status === 'pending');

  async function handleConfirmApproveAll() {
    if (pendingInCurrentView.length === 0) return;
    setApprovingAll(true);
    setActionError(null);
    const targetIds = pendingInCurrentView.map((q) => q.id);
    const res = await approveAllQuestionsAction({ questionIds: targetIds });
    setApprovingAll(false);
    setShowApproveAllModal(false);

    if (res.success) {
      const approvedIds = new Set(targetIds);
      const nowIso = new Date().toISOString();
      setQuestions((prev) =>
        prev.map((q) =>
          approvedIds.has(q.id)
            ? { ...q, status: 'approved', approved_at: nowIso, rejection_reason: null }
            : q
        )
      );
      setSuccessMessage(`Successfully approved ${res.approvedCount} question(s)!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      setActionError(res.error || 'Failed to batch approve questions.');
    }
  }

  async function handleApprove(questionId: string) {
    const res = await approveQuestionAction(questionId);
    if (res.success) {
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? { ...q, status: 'approved', approved_at: new Date().toISOString(), rejection_reason: null }
            : q
        )
      );
    } else {
      setActionError(res.error || 'Failed to approve question.');
    }
  }

  async function handleRejectSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectingQuestion) return;
    if (!rejectionReason.trim()) {
      setActionError('A rejection reason is strictly required.');
      return;
    }

    const res = await rejectQuestionAction(rejectingQuestion.id, rejectionReason.trim());
    if (res.success) {
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === rejectingQuestion.id
            ? { ...q, status: 'rejected', rejection_reason: rejectionReason.trim(), approved_at: null }
            : q
        )
      );
      setRejectingQuestion(null);
      setRejectionReason('');
    } else {
      setActionError(res.error || 'Failed to reject question.');
    }
  }

  function openEditModal(q: QuestionRecord) {
    setEditingQuestion(q);
    setEditForm({
      id: q.id,
      topic: q.topic,
      questionText: q.question_text,
      optionA: q.option_a,
      optionB: q.option_b,
      optionC: q.option_c,
      optionD: q.option_d,
      correctOption: q.correct_option as 'A' | 'B' | 'C' | 'D',
      explanation: q.explanation,
    });
    setEditError(null);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEditSubmitting(true);
    setEditError(null);

    const res = await editQuestionAction(editForm);
    setEditSubmitting(false);

    if (!res.success) {
      setEditError(res.error || 'Failed to save edits.');
      return;
    }

    setEditingQuestion(null);
    loadQuestions();
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    setManualError(null);
    setManualSubmitting(true);

    const res = await addQuestionManualAction(manualForm);
    setManualSubmitting(false);

    if (!res.success) {
      setManualError(res.error || 'Failed to add question');
      return;
    }

    setShowAddModal(false);
    setManualForm({
      topic: '',
      questionText: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctOption: 'A',
      explanation: '',
    });
    loadQuestions();
  }

  async function handleCsvUpload() {
    if (!csvText.trim()) return;
    setCsvSubmitting(true);
    setCsvResult(null);

    const res = await uploadQuestionsCsvAction(csvText);
    setCsvSubmitting(false);
    setCsvResult(res);

    if (res.success) {
      loadQuestions();
    }
  }

  async function handleAiGenerate(e: React.FormEvent) {
    e.preventDefault();
    setAiGenerating(true);
    setAiResult(null);

    const res = await generateQuestionsAiAction({
      topic: aiTopic,
      difficulty: aiDifficulty,
      count: aiCount,
      focus: aiFocus,
    });

    setAiGenerating(false);
    setAiResult(res);

    if (res.success) {
      setStatusFilter('pending');
      setSuccessMessage(`✨ ${res.message || `Generated ${res.count} questions!`}`);
      loadQuestions();
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 pb-16 text-slate-100">
      <Navbar role="faculty" />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Back Link & Header */}
        <div>
          <Link
            href="/faculty"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Faculty Dashboard
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/20 text-white mb-2">
                <BookOpen className="w-3.5 h-3.5" />
                Question Bank & Review Queue
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                CS101 Question Review & Curation
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Review pending imported questions, author new concept questions, and audit explanations.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {pendingCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowApproveAllModal(true)}
                  disabled={approvingAll || pendingInCurrentView.length === 0}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                  title="Batch approve pending questions in the current view"
                >
                  <CheckCheck className="w-4 h-4 text-emerald-400" />
                  <span>Approve All {pendingInCurrentView.length > 0 ? `(${pendingInCurrentView.length})` : ''}</span>
                </button>
              )}
              <button
                onClick={() => {
                  setShowAiModal(true);
                  setAiResult(null);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold transition-all shadow-sm group"
              >
                <Sparkles className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                <span>Generate with AI</span>
              </button>
              <button
                onClick={() => setShowCsvModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-white text-xs font-semibold transition-all shadow-sm"
              >
                <Upload className="w-4 h-4 text-white" />
                <span>Import CSV</span>
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all shadow-lg shadow-white/10"
              >
                <Plus className="w-4 h-4" />
                <span>Add Question</span>
              </button>
            </div>
          </div>
        </div>

        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3 animate-in fade-in">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-bold">{successMessage}</span>
          </div>
        )}

        {actionError && (
          <div className="p-4 rounded-2xl bg-white/10 border border-white/20 text-zinc-200 text-xs flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-white shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block text-sm mb-0.5">Notice</strong>
              <span>{actionError}</span>
            </div>
          </div>
        )}

        {/* Filter Bar with Status Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0c0c0e] border border-white/15">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                statusFilter === 'pending'
                  ? 'bg-white text-black shadow-sm font-bold'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Review Queue ({pendingCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter('approved')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                statusFilter === 'approved'
                  ? 'bg-white text-black shadow-sm font-bold'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Approved ({approvedCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter('rejected')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                statusFilter === 'rejected'
                  ? 'bg-white text-black shadow-sm font-bold'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Rejected ({rejectedCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'all'
                  ? 'bg-white text-black shadow-sm font-bold'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              All ({questions.length})
            </button>
          </div>

          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Topics</option>
              {topics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Batch Action Banner when viewing pending queue */}
        {statusFilter === 'pending' && pendingInCurrentView.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-300">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>{pendingInCurrentView.length} questions</strong> currently awaiting faculty review
                {topicFilter !== 'all' ? ` for topic "${topicFilter}"` : ''}.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowApproveAllModal(true)}
              disabled={approvingAll}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition-all shadow-md shrink-0 flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Approve All {pendingInCurrentView.length}</span>
            </button>
          </div>
        )}

        {/* Question Cards Feed */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <span className="text-xs">Loading questions...</span>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="py-16 text-center rounded-2xl bg-slate-900/40 border border-slate-800 p-8">
            <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-white">No questions in this filter</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {statusFilter === 'pending'
                ? 'All questions have been reviewed! New imports will appear here.'
                : 'Try adjusting your topic or status filter.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredQuestions.map((q) => (
              <div
                key={q.id}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col gap-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 border border-white/20 text-white">
                      {q.topic}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                        q.status === 'approved'
                          ? 'bg-white/10 border-white/20 text-white'
                          : q.status === 'pending'
                          ? 'bg-zinc-800 border-white/10 text-zinc-300'
                          : 'bg-zinc-900 border-white/10 text-zinc-400'
                      }`}
                    >
                      {q.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                      {q.status === 'pending' && <Clock className="w-3 h-3" />}
                      {q.status === 'rejected' && <XCircle className="w-3 h-3" />}
                      {q.status.toUpperCase()}
                    </span>

                    {q.approved_at && (
                      <span className="text-[10px] text-zinc-400">
                        Approved: {new Date(q.approved_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* Actions: Approve / Edit / Reject */}
                  <div className="flex items-center gap-2 shrink-0">
                    {q.status !== 'approved' && (
                      <button
                        onClick={() => handleApprove(q.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve
                      </button>
                    )}

                    <button
                      onClick={() => openEditModal(q)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-white text-xs font-semibold transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>

                    {q.status !== 'rejected' && (
                      <button
                        onClick={() => {
                          setRejectingQuestion(q);
                          setRejectionReason('');
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-zinc-300 hover:text-white text-xs font-medium transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    )}
                  </div>
                </div>

                {q.rejection_reason && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold block mb-0.5">Rejection Reason:</strong>
                      <span>{q.rejection_reason}</span>
                    </div>
                  </div>
                )}

                <h3 className="text-sm sm:text-base font-semibold text-white leading-relaxed">
                  {q.question_text}
                </h3>

                {/* 4 Choices */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
                    const text = q[`option_${optKey.toLowerCase()}` as keyof QuestionRecord];
                    const isCorrect = q.correct_option === optKey;
                    return (
                      <div
                        key={optKey}
                        className={`px-3 py-2 rounded-xl text-xs flex items-center gap-2 border ${
                          isCorrect
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200 font-medium'
                            : 'bg-slate-950/50 border-slate-800/80 text-slate-400'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0 ${
                            isCorrect ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {optKey}
                        </span>
                        <span className="truncate">{text}</span>
                        {isCorrect && (
                          <span className="ml-auto text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                            Correct
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">Explanation: </span>
                  {q.explanation}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Reject Question Modal */}
      {rejectingQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-400" />
                Reject Question
              </h2>
              <button
                onClick={() => setRejectingQuestion(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Provide a clear reason for rejecting this question. The author will be notified to revise or discard it.
            </p>

            <form onSubmit={handleRejectSubmit} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Rejection Reason (Required)
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Ambiguous wording in option B, or factual error in answer key."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setRejectingQuestion(null)}
                  className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-xs font-bold text-black"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Question Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Edit Question</h2>
                <span className="text-[11px] text-amber-400">
                  Notice: Editing will move this question back to 'pending' for re-review.
                </span>
              </div>
              <button
                onClick={() => setEditingQuestion(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Topic</label>
                <input
                  type="text"
                  required
                  value={editForm.topic}
                  onChange={(e) => setEditForm({ ...editForm, topic: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Question Text</label>
                <textarea
                  rows={2}
                  required
                  value={editForm.questionText}
                  onChange={(e) => setEditForm({ ...editForm, questionText: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Option A</label>
                  <input
                    type="text"
                    required
                    value={editForm.optionA}
                    onChange={(e) => setEditForm({ ...editForm, optionA: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Option B</label>
                  <input
                    type="text"
                    required
                    value={editForm.optionB}
                    onChange={(e) => setEditForm({ ...editForm, optionB: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Option C</label>
                  <input
                    type="text"
                    required
                    value={editForm.optionC}
                    onChange={(e) => setEditForm({ ...editForm, optionC: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Option D</label>
                  <input
                    type="text"
                    required
                    value={editForm.optionD}
                    onChange={(e) => setEditForm({ ...editForm, optionD: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Correct Answer</label>
                <select
                  value={editForm.correctOption}
                  onChange={(e) =>
                    setEditForm({ ...editForm, correctOption: e.target.value as 'A' | 'B' | 'C' | 'D' })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                >
                  <option value="A">Option A</option>
                  <option value="B">Option B</option>
                  <option value="C">Option C</option>
                  <option value="D">Option D</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Pedagogical Explanation</label>
                <textarea
                  rows={2}
                  required
                  value={editForm.explanation}
                  onChange={(e) => setEditForm({ ...editForm, explanation: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setEditingQuestion(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-xs font-bold text-black shadow-md disabled:opacity-50"
                >
                  {editSubmitting ? 'Saving Changes...' : 'Save & Move to Pending'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Add Question Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Add New Concept Question</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {manualError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {manualError}
              </div>
            )}

            <form onSubmit={handleManualSubmit} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Topic</label>
                <input
                  type="text"
                  placeholder="e.g. Variables & Types, Loops, Functions"
                  value={manualForm.topic}
                  onChange={(e) => setManualForm({ ...manualForm, topic: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Question Text</label>
                <textarea
                  placeholder="Enter the concept check or code tracing prompt..."
                  rows={2}
                  value={manualForm.questionText}
                  onChange={(e) => setManualForm({ ...manualForm, questionText: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Option A</label>
                  <input
                    type="text"
                    placeholder="Choice A text"
                    value={manualForm.optionA}
                    onChange={(e) => setManualForm({ ...manualForm, optionA: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Option B</label>
                  <input
                    type="text"
                    placeholder="Choice B text"
                    value={manualForm.optionB}
                    onChange={(e) => setManualForm({ ...manualForm, optionB: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Option C</label>
                  <input
                    type="text"
                    placeholder="Choice C text"
                    value={manualForm.optionC}
                    onChange={(e) => setManualForm({ ...manualForm, optionC: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Option D</label>
                  <input
                    type="text"
                    placeholder="Choice D text"
                    value={manualForm.optionD}
                    onChange={(e) => setManualForm({ ...manualForm, optionD: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Correct Answer</label>
                <select
                  value={manualForm.correctOption}
                  onChange={(e) =>
                    setManualForm({ ...manualForm, correctOption: e.target.value as 'A' | 'B' | 'C' | 'D' })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="A">Option A</option>
                  <option value="B">Option B</option>
                  <option value="C">Option C</option>
                  <option value="D">Option D</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Pedagogical Explanation
                </label>
                <textarea
                  placeholder="Explain why the answer is correct..."
                  rows={2}
                  value={manualForm.explanation}
                  onChange={(e) => setManualForm({ ...manualForm, explanation: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={manualSubmitting}
                className="w-full mt-2 py-3 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all shadow-md shadow-white/10 disabled:opacity-50"
              >
                {manualSubmitting ? 'Validating & Publishing...' : 'Publish Approved Question'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-[#0c0c0e] border border-white/15 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Import Questions via CSV</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Imported questions are placed in the Review Queue as Pending.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCsvModal(false);
                  setCsvResult(null);
                }}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {csvResult && (
              <div
                className={`p-4 rounded-xl text-xs flex flex-col gap-2 ${
                  csvResult.success
                    ? 'bg-white/10 border border-white/20 text-white'
                    : 'bg-white/5 border border-white/15 text-zinc-300'
                }`}
              >
                <div className="font-semibold">
                  {csvResult.success
                    ? `Successfully imported ${csvResult.importedCount} questions into Pending review queue!`
                    : csvResult.error}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <label className="block text-xs font-medium text-zinc-300">
                Paste CSV Content with Header:
              </label>
              <textarea
                rows={8}
                placeholder="topic,question_text,option_a,option_b,option_c,option_d,correct_option,explanation..."
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="w-full p-3 font-mono text-[11px] rounded-xl bg-black border border-white/15 text-white focus:outline-none focus:border-white"
              />

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  onClick={() => setShowCsvModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-white/10"
                >
                  Close
                </button>
                <button
                  onClick={handleCsvUpload}
                  disabled={csvSubmitting || !csvText.trim()}
                  className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold shadow-md shadow-white/10 disabled:opacity-50"
                >
                  {csvSubmitting ? 'Validating CSV...' : 'Validate & Import to Queue'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Approve Confirmation Modal */}
      {showApproveAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-[#0c0c0e] border border-white/20 p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCheck className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Batch Approve Questions</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowApproveAllModal(false)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Are you sure you want to approve all <strong>{pendingInCurrentView.length}</strong> pending question(s)
              {topicFilter !== 'all' ? ` for topic "${topicFilter}"` : ''}?
              Approved questions will immediately become available in the active daily quiz and practice sets.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowApproveAllModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={approvingAll}
                onClick={handleConfirmApproveAll}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {approvingAll ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-black border-t-transparent animate-spin" />
                    <span>Approving...</span>
                  </>
                ) : (
                  <>
                    <CheckCheck className="w-4 h-4" />
                    <span>Confirm & Approve All</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Question Generator Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="max-w-xl w-full bg-[#0c0c0e] border border-purple-500/30 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                    Generate Questions with AI
                  </h2>
                  <p className="text-[11px] text-zinc-400">
                    Drafted with Gemini 3.8 Flash &amp; routed into your Pending Review Queue
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {aiResult && !aiResult.success && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{aiResult.error || 'Failed to generate questions.'}</span>
              </div>
            )}

            {aiResult && aiResult.success && (
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-200 text-xs flex flex-col gap-2">
                <div className="flex items-center gap-2 font-bold text-sm text-purple-300">
                  <CheckCircle className="w-4 h-4 text-purple-400" />
                  <span>{aiResult.message}</span>
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Notice: Questions are held in <strong className="text-white">Pending Status</strong> until approved by faculty, ensuring complete academic oversight before students can attempt them.
                </p>
                <div className="flex items-center justify-end gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setShowAiModal(false)}
                    className="px-3.5 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-400 text-black text-xs font-bold transition-all"
                  >
                    View in Review Queue
                  </button>
                </div>
              </div>
            )}

            {!aiResult?.success && (
              <form onSubmit={handleAiGenerate} className="flex flex-col gap-4 text-xs">
                {/* Topic Selector */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wide">
                    Curriculum Topic
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dynamic Programming: Knapsack, Binary Search, Graph Dijkstra..."
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/15 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-purple-400"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[
                      'Dynamic Programming: Knapsack',
                      'Binary Search Trees',
                      'Graph Dijkstra Algorithm',
                      'OS: Paging & Virtual Memory',
                      'DBMS: Normalization',
                    ].map((sample) => (
                      <button
                        key={sample}
                        type="button"
                        onClick={() => setAiTopic(sample)}
                        className="px-2 py-0.5 rounded-lg text-[10px] bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition-colors"
                      >
                        {sample}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Difficulty */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wide">
                      Target Difficulty
                    </label>
                    <select
                      value={aiDifficulty}
                      onChange={(e) => setAiDifficulty(e.target.value as 'Easy' | 'Medium' | 'Hard')}
                      style={{ colorScheme: 'dark' }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/15 text-white text-xs focus:outline-none focus:border-purple-400 font-medium"
                    >
                      <option value="Easy">Easy (Fundamentals &amp; Definitions)</option>
                      <option value="Medium">Medium (Application &amp; Tracing)</option>
                      <option value="Hard">Hard (Edge Cases &amp; Complex Analysis)</option>
                    </select>
                  </div>

                  {/* Question Count */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wide">
                      Question Count (1–5)
                    </label>
                    <select
                      value={aiCount}
                      onChange={(e) => setAiCount(Number(e.target.value))}
                      style={{ colorScheme: 'dark' }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/15 text-white text-xs focus:outline-none focus:border-purple-400 font-medium"
                    >
                      <option value={1}>1 Question (Quick test)</option>
                      <option value={2}>2 Questions</option>
                      <option value={3}>3 Questions (Recommended)</option>
                      <option value={4}>4 Questions</option>
                      <option value={5}>5 Questions (Full Daily Set)</option>
                    </select>
                  </div>
                </div>

                {/* Specific Pedagogical Focus */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wide">
                    Pedagogical Focus &amp; Learning Objectives (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Focus on edge cases, off-by-one errors, time/space complexity trade-offs..."
                    value={aiFocus}
                    onChange={(e) => setAiFocus(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/15 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-zinc-400 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">Strict Faculty Governance:</strong> AI-generated questions will never appear in student quizzes until you review and approve them in the Pending Queue.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowAiModal(false)}
                    className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={aiGenerating}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50 transition-all active:scale-95"
                  >
                    {aiGenerating ? (
                      <>
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        <span>Generating Conceptual Questions...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Generate &amp; Queue for Review</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
