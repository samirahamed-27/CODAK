'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import {
  getFacultyQuestionsAction,
  addQuestionManualAction,
  uploadQuestionsCsvAction,
  updateQuestionStatusAction,
  QuestionRecord,
} from '@/app/actions/faculty-questions';
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
} from 'lucide-react';

export default function FacultyQuestionsPage() {
  const [questions, setQuestions] = useState<QuestionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [topicFilter, setTopicFilter] = useState<string>('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);

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

  // CSV Upload State
  const [csvText, setCsvText] = useState('');
  const [csvSubmitting, setCsvSubmitting] = useState(false);
  const [csvResult, setCsvResult] = useState<{
    success?: boolean;
    error?: string;
    importedCount?: number;
    errors?: { row: number; field: string; message: string }[];
  } | null>(null);

  async function loadQuestions() {
    setLoading(true);
    const res = await getFacultyQuestionsAction();
    if (res.success) {
      setQuestions(res.questions);
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

  async function handleStatusChange(questionId: string, newStatus: 'approved' | 'rejected') {
    const res = await updateQuestionStatusAction(questionId, newStatus);
    if (res.success) {
      setQuestions((prev) =>
        prev.map((q) => (q.id === questionId ? { ...q, status: newStatus } : q))
      );
    }
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 pb-16">
      <Navbar role="faculty" userName="Dr. Priya Raman" />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Back Link & Header */}
        <div>
          <Link
            href="/faculty"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Faculty Hub
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-2">
                <BookOpen className="w-3.5 h-3.5" />
                Question Bank Curator
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                CS101 Question Repository
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Author, import from CSV, and approve concept questions for the daily learning rotation.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCsvModal(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white text-xs font-semibold transition-all shadow-sm"
              >
                <Upload className="w-4 h-4 text-slate-400" />
                <span>Upload CSV</span>
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Question</span>
              </button>
            </div>
          </div>
        </div>

        {/* Status Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <div className="text-xs font-medium text-slate-400">Total Questions</div>
            <div className="text-2xl font-bold text-white mt-1">{questions.length}</div>
          </div>
          <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
            <div className="text-xs font-medium text-emerald-400">Approved for Quizzes</div>
            <div className="text-2xl font-bold text-emerald-300 mt-1">{approvedCount}</div>
          </div>
          <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
            <div className="text-xs font-medium text-amber-400">Pending Review</div>
            <div className="text-2xl font-bold text-amber-300 mt-1">{pendingCount}</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <div className="text-xs font-medium text-slate-400">Curated Topics</div>
            <div className="text-2xl font-bold text-indigo-400 mt-1">{topics.length}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/40 border border-slate-800/60">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(['all', 'approved', 'pending', 'rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all ${
                  statusFilter === status
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {topics.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={topicFilter}
                onChange={(e) => setTopicFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-300 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Topics</option>
                {topics.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Questions List */}
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">Loading question repository...</div>
        ) : filteredQuestions.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900/20 border border-dashed border-slate-800">
            <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-300">No questions found</h3>
            <p className="text-xs text-slate-500 mt-1">
              {statusFilter !== 'all' || topicFilter !== 'all'
                ? 'Try adjusting your filters above.'
                : 'Upload questions via CSV or add one manually to get started.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredQuestions.map((q) => (
              <div
                key={q.id}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                      {q.topic}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                        q.status === 'approved'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : q.status === 'pending'
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      }`}
                    >
                      {q.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                      {q.status === 'pending' && <Clock className="w-3 h-3" />}
                      {q.status === 'rejected' && <XCircle className="w-3 h-3" />}
                      {q.status.toUpperCase()}
                    </span>
                  </div>

                  {q.status === 'pending' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleStatusChange(q.id, 'approved')}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
                      >
                        <Check className="w-3 h-3" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleStatusChange(q.id, 'rejected')}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-300 text-xs font-medium transition-colors"
                      >
                        <X className="w-3 h-3" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>

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
                  rows={2}
                  placeholder="e.g. What is the output of type(4 / 2) in Python 3?"
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
                    value={manualForm.optionD}
                    onChange={(e) => setManualForm({ ...manualForm, optionD: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Correct Option</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['A', 'B', 'C', 'D'] as const).map((key) => (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setManualForm({ ...manualForm, correctOption: key })}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                        manualForm.correctOption === key
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Option {key}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Explanation</label>
                <textarea
                  rows={2}
                  placeholder="Explain why this choice is correct so students learn from their attempt."
                  value={manualForm.explanation}
                  onChange={(e) => setManualForm({ ...manualForm, explanation: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={manualSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {manualSubmitting ? 'Saving...' : 'Publish Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Upload Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Upload Question Bank (CSV)</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Imported questions will be saved as <strong>pending review</strong> by default.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCsvModal(false);
                  setCsvResult(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Expected Headers Callout */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 font-mono">
              <span className="text-indigo-400 font-semibold font-sans">Required CSV Format:</span>
              <div className="mt-1 text-[11px] text-slate-300 select-all overflow-x-auto whitespace-nowrap">
                topic,question_text,option_a,option_b,option_c,option_d,correct_option,explanation
              </div>
            </div>

            {/* CSV File Input & Paste Area */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Paste CSV Content or select file:
              </label>
              <textarea
                rows={6}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Paste CSV rows here..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Upload Feedback */}
            {csvResult && (
              <div>
                {csvResult.success ? (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Successfully imported <strong>{csvResult.importedCount} questions</strong> for faculty review!
                    </span>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex flex-col gap-2">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{csvResult.error}</span>
                    </div>
                    {csvResult.errors && csvResult.errors.length > 0 && (
                      <ul className="list-disc pl-5 text-[11px] text-rose-200/80 space-y-1 max-h-32 overflow-y-auto">
                        {csvResult.errors.map((err, idx) => (
                          <li key={idx}>
                            Row {err.row} ({err.field}): {err.message}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => {
                  setShowCsvModal(false);
                  setCsvResult(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleCsvUpload}
                disabled={csvSubmitting || !csvText.trim()}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
              >
                {csvSubmitting ? 'Validating & Importing...' : 'Validate & Import Questions'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
