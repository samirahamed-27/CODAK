'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import {
  getFacultyCoursesAction,
  createAttendanceSessionAction,
  getSessionRosterAction,
  submitAttendanceRosterAction,
  getFacultySessionHistoryAction,
  FacultyCourseItem,
  StudentRosterAttendanceItem,
  AttendanceSessionDetails,
} from '@/app/actions/attendance';
import { AttendanceRecordStatus } from '@/types/database';
import {
  CalendarCheck2,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  ArrowLeft,
  Search,
  Plus,
  Clock,
  History,
  Check,
  RefreshCw,
  Award,
  BookOpen,
  Filter,
} from 'lucide-react';

export default function FacultyAttendancePage() {
  const [courses, setCourses] = useState<FacultyCourseItem[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<FacultyCourseItem | null>(null);
  const [activeSession, setActiveSession] = useState<AttendanceSessionDetails | null>(null);
  const [roster, setRoster] = useState<StudentRosterAttendanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New Session Modal State
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [sessionTopic, setSessionTopic] = useState('');
  const [creatingSession, setCreatingSession] = useState(false);

  // History State
  const [historySessions, setHistorySessions] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // 1. Initial Load: Get Courses
  useEffect(() => {
    async function loadCourses() {
      setLoading(true);
      const res = await getFacultyCoursesAction();
      if (res.success && res.courses.length > 0) {
        setCourses(res.courses);
        setSelectedCourse(res.courses[0]);
      } else if (res.error) {
        setFeedback({ type: 'error', message: res.error });
      }
      setLoading(false);
    }
    loadCourses();
  }, []);

  // 2. Load latest session & history when course changes
  const loadCourseData = useCallback(async (course: FacultyCourseItem) => {
    setRosterLoading(true);
    setFeedback(null);

    // Fetch history
    const histRes = await getFacultySessionHistoryAction(course.subjectId, course.section);
    if (histRes.success) {
      setHistorySessions(histRes.sessions);
      if (histRes.sessions.length > 0) {
        // Load the most recent session
        const latestSessionId = histRes.sessions[0].id;
        const rosterRes = await getSessionRosterAction(latestSessionId);
        if (rosterRes.success && rosterRes.session) {
          setActiveSession(rosterRes.session);
          setRoster(rosterRes.roster);
        }
      } else {
        setActiveSession(null);
        setRoster([]);
      }
    }
    setRosterLoading(false);
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadCourseData(selectedCourse);
    }
  }, [selectedCourse, loadCourseData]);

  // Handle Switch to Specific Historical Session
  const handleSelectSession = async (sessionId: string) => {
    setRosterLoading(true);
    const res = await getSessionRosterAction(sessionId);
    if (res.success && res.session) {
      setActiveSession(res.session);
      setRoster(res.roster);
      setShowHistory(false);
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to load session.' });
    }
    setRosterLoading(false);
  };

  // Handle Creating a New Lecture Session
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;

    setCreatingSession(true);
    const res = await createAttendanceSessionAction({
      subjectId: selectedCourse.subjectId,
      section: selectedCourse.section,
      sessionTopic: sessionTopic.trim() || undefined,
    });

    if (res.success && res.session) {
      setActiveSession(res.session);
      setShowNewSessionModal(false);
      setSessionTopic('');
      // Load roster for new session
      const rosterRes = await getSessionRosterAction(res.session.id);
      if (rosterRes.success) {
        // Default all to 'present' on newly created session for fast attendance
        setRoster(rosterRes.roster.map((r) => ({ ...r, status: 'present' })));
      }
      setFeedback({ type: 'success', message: `Active session created for ${res.session.subjectCode}. Mark attendance below.` });
      // Refresh history list
      const histRes = await getFacultySessionHistoryAction(selectedCourse.subjectId, selectedCourse.section);
      if (histRes.success) setHistorySessions(histRes.sessions);
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to create session.' });
    }
    setCreatingSession(false);
  };

  // Update Status for a Student
  const handleStatusChange = (studentId: string, status: AttendanceRecordStatus) => {
    setRoster((prev) =>
      prev.map((item) =>
        item.studentId === studentId ? { ...item, status } : item
      )
    );
  };

  // Update Override Reason for a Student
  const handleReasonChange = (studentId: string, reason: string) => {
    setRoster((prev) =>
      prev.map((item) =>
        item.studentId === studentId ? { ...item, overrideReason: reason } : item
      )
    );
  };

  // Quick Action: Mark All Present
  const handleMarkAll = (status: AttendanceRecordStatus) => {
    setRoster((prev) => prev.map((item) => ({ ...item, status })));
  };

  // Submit Attendance Roster
  const handleSubmitAttendance = async () => {
    if (!activeSession) return;

    setSubmitting(true);
    setFeedback(null);

    const entries = roster
      .filter((r) => r.status !== 'unmarked')
      .map((r) => ({
        studentId: r.studentId,
        status: r.status as AttendanceRecordStatus,
        overrideReason: r.overrideReason || undefined,
      }));

    if (entries.length === 0) {
      setFeedback({ type: 'error', message: 'Please mark attendance for at least one student.' });
      setSubmitting(false);
      return;
    }

    const res = await submitAttendanceRosterAction({
      sessionId: activeSession.id,
      entries,
    });

    if (res.success) {
      setFeedback({
        type: 'success',
        message: `Attendance submitted! ${res.presentCount} Present, ${res.absentCount} Absent. +${res.totalXpAwarded} XP credited to students.`,
      });
      // Refresh roster to show updated saved indicators
      const rosterRes = await getSessionRosterAction(activeSession.id);
      if (rosterRes.success) setRoster(rosterRes.roster);
      // Refresh history counts
      if (selectedCourse) {
        const histRes = await getFacultySessionHistoryAction(selectedCourse.subjectId, selectedCourse.section);
        if (histRes.success) setHistorySessions(histRes.sessions);
      }
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to submit attendance.' });
    }
    setSubmitting(false);
  };

  // Filtered Roster
  const filteredRoster = roster.filter(
    (s) =>
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const presentCount = roster.filter((r) => r.status === 'present').length;
  const absentCount = roster.filter((r) => r.status === 'absent').length;
  const excusedCount = roster.filter((r) => r.status === 'excused').length;
  const totalEnrolled = roster.length;
  const attendanceRate = totalEnrolled > 0 ? Math.round((presentCount / totalEnrolled) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#0B0F19] text-zinc-100 flex flex-col font-sans selection:bg-purple-500/30">
      <Navbar role="faculty" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Breadcrumb & Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <Link
              href="/faculty"
              className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Faculty Hub
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <CalendarCheck2 className="w-8 h-8 text-emerald-400" />
              Class Attendance & XP Verification
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Record daily lecture attendance. Enrolled students who attend earn 10 XP automatically.
            </p>
          </div>

          {/* Course Selector & Actions */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {courses.length > 0 && (
              <select
                aria-label="Select Assigned Course"
                className="bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-white focus:outline-none focus:border-purple-500 transition-colors"
                value={selectedCourse?.subjectId || ''}
                onChange={(e) => {
                  const c = courses.find((x) => x.subjectId === e.target.value);
                  if (c) setSelectedCourse(c);
                }}
              >
                {courses.map((c) => (
                  <option key={c.subjectId} value={c.subjectId}>
                    {c.code} — Sec {c.section} ({c.name})
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => setShowNewSessionModal(true)}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4" /> Start Session
            </button>

            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 px-3.5 py-2.5 rounded-xl text-sm transition-all"
              title="Session History"
            >
              <History className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div
            className={`p-4 rounded-xl mb-6 flex items-center justify-between text-sm ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/60 border border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-zinc-400 hover:text-white text-xs px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Historical Sessions Drawer */}
        {showHistory && (
          <div className="bg-zinc-900/90 border border-white/10 rounded-2xl p-5 mb-8 backdrop-blur-md">
            <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
              <History className="w-4 h-4 text-purple-400" /> Past Attendance Sessions for {selectedCourse?.code}
            </h2>
            {historySessions.length === 0 ? (
              <p className="text-sm text-zinc-500">No previous sessions found for this course.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {historySessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectSession(s.id)}
                    className={`text-left p-3.5 rounded-xl border transition-all ${
                      activeSession?.id === s.id
                        ? 'bg-purple-950/40 border-purple-500/50 text-white'
                        : 'bg-black/40 border-white/5 hover:border-white/20 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-zinc-200">{s.sessionDate}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10">
                        {s.presentCount}/{s.totalEnrolled} Present
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400 truncate">
                      {s.sessionTopic || 'General Lecture'}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading || rosterLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
            <RefreshCw className="w-8 h-8 animate-spin text-purple-500 mb-3" />
            <p className="text-sm">Loading attendance roster...</p>
          </div>
        ) : !activeSession ? (
          /* Empty / No Session Selected State */
          <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-12 text-center max-w-xl mx-auto my-12">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">No Active Session Selected</h2>
            <p className="text-sm text-zinc-400 mb-6">
              Create a new lecture session to record today's attendance for{' '}
              <strong className="text-zinc-200">{selectedCourse?.code} ({selectedCourse?.name})</strong>.
            </p>
            <button
              onClick={() => setShowNewSessionModal(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-6 py-3 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20"
            >
              Start Lecture Session
            </button>
          </div>
        ) : (
          /* Active Session & Roster */
          <div>
            {/* Session Summary Card */}
            <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-6 mb-6 backdrop-blur-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {activeSession.subjectCode} — Sec {activeSession.section}
                    </span>
                    <span className="text-xs text-zinc-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {activeSession.sessionDate}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    {activeSession.sessionTopic || `${activeSession.subjectName} Lecture`}
                  </h2>
                </div>

                {/* Stat Badges */}
                <div className="grid grid-cols-4 gap-2.5 sm:gap-4 text-center">
                  <div className="bg-black/50 border border-white/5 rounded-xl px-3 py-2">
                    <div className="text-[11px] text-zinc-400 uppercase font-semibold">Enrolled</div>
                    <div className="text-lg font-bold text-white">{totalEnrolled}</div>
                  </div>
                  <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl px-3 py-2">
                    <div className="text-[11px] text-emerald-400 uppercase font-semibold">Present</div>
                    <div className="text-lg font-bold text-emerald-300">{presentCount}</div>
                  </div>
                  <div className="bg-rose-950/30 border border-rose-500/20 rounded-xl px-3 py-2">
                    <div className="text-[11px] text-rose-400 uppercase font-semibold">Absent</div>
                    <div className="text-lg font-bold text-rose-300">{absentCount}</div>
                  </div>
                  <div className="bg-purple-950/30 border border-purple-500/20 rounded-xl px-3 py-2">
                    <div className="text-[11px] text-purple-400 uppercase font-semibold">Rate</div>
                    <div className="text-lg font-bold text-purple-300">{attendanceRate}%</div>
                  </div>
                </div>
              </div>

              {/* Roster Controls Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by student or roll no..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => handleMarkAll('present')}
                    className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 transition-colors"
                  >
                    Mark All Present
                  </button>
                  <button
                    onClick={() => handleMarkAll('absent')}
                    className="text-xs px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition-colors"
                  >
                    Mark All Absent
                  </button>
                </div>
              </div>
            </div>

            {/* Student Roster Table */}
            <div className="bg-zinc-900/60 border border-white/10 rounded-2xl overflow-hidden shadow-xl mb-8">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-950/70 text-xs text-zinc-400 uppercase tracking-wider border-b border-white/10">
                    <tr>
                      <th className="px-6 py-3.5 font-semibold">Roll No</th>
                      <th className="px-6 py-3.5 font-semibold">Student Name</th>
                      <th className="px-6 py-3.5 font-semibold">Attendance Status</th>
                      <th className="px-6 py-3.5 font-semibold">XP Award</th>
                      <th className="px-6 py-3.5 font-semibold">Note / Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredRoster.map((student) => {
                      const isPresent = student.status === 'present';
                      const isAbsent = student.status === 'absent';
                      const isExcused = student.status === 'excused';

                      return (
                        <tr
                          key={student.studentId}
                          className="hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="px-6 py-4 font-mono text-xs font-semibold text-zinc-300">
                            {student.rollNo}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-white">{student.fullName}</div>
                            <div className="text-xs text-zinc-500">{student.department}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="inline-flex rounded-xl p-1 bg-black/60 border border-white/10">
                              <button
                                type="button"
                                onClick={() => handleStatusChange(student.studentId, 'present')}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                                  isPresent
                                    ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/30'
                                    : 'text-zinc-400 hover:text-white'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5" /> Present
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(student.studentId, 'absent')}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                                  isAbsent
                                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                                    : 'text-zinc-400 hover:text-white'
                                }`}
                              >
                                <XCircle className="w-3.5 h-3.5" /> Absent
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(student.studentId, 'excused')}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                                  isExcused
                                    ? 'bg-zinc-700 text-zinc-100'
                                    : 'text-zinc-400 hover:text-white'
                                }`}
                              >
                                Excused
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {isPresent ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                                <Sparkles className="w-3 h-3" /> +10 XP
                              </span>
                            ) : (
                              <span className="text-xs text-zinc-500">0 XP</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              placeholder="Add override note..."
                              value={student.overrideReason || ''}
                              onChange={(e) => handleReasonChange(student.studentId, e.target.value)}
                              className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-purple-500 w-44"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Bottom Sticky Submit Bar */}
              <div className="bg-zinc-950/80 px-6 py-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-zinc-400">
                  Showing {filteredRoster.length} of {totalEnrolled} students • Changes are logged with your faculty credentials.
                </div>
                <button
                  onClick={handleSubmitAttendance}
                  disabled={submitting}
                  className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold px-8 py-3 rounded-xl text-sm transition-all shadow-xl shadow-emerald-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Recording Attendance...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Save & Award Attendance XP
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Start New Session */}
        {showNewSessionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-white/15 rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <CalendarCheck2 className="w-5 h-5 text-emerald-400" /> Start Lecture Session
              </h3>
              <p className="text-xs text-zinc-400 mb-6">
                Create a session for <strong className="text-white">{selectedCourse?.code} ({selectedCourse?.name})</strong>.
              </p>

              <form onSubmit={handleCreateSession} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                    Lecture Topic (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Binary Search Trees & AVL Rotations"
                    value={sessionTopic}
                    onChange={(e) => setSessionTopic(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowNewSessionModal(false)}
                    className="px-4 py-2 text-sm text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingSession}
                    className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                  >
                    {creatingSession ? 'Creating...' : 'Create & Open Roster'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
