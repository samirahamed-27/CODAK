'use client';

import React, { useState, useEffect } from 'react';
import {
  getFacultySubjectAllocationsAction,
  assignFacultySubjectAction,
  removeFacultySubjectAction,
  getAdminAttendanceRecordsAction,
  adminOverrideAttendanceRecordAction,
  getAdminClubParticipationsAction,
  adminOverrideClubParticipationAction,
  FacultyAllocationItem,
  AttendanceAdminRecordItem,
  ClubParticipationAdminItem,
} from '@/app/actions/admin-allocations';
import { AttendanceRecordStatus, ClubParticipationStatus } from '@/types/database';
import {
  BookOpen,
  CalendarCheck2,
  Award,
  Plus,
  Trash2,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit3,
  ShieldAlert,
  Users,
} from 'lucide-react';
import clsx from 'clsx';

export function AdminAllocationsView() {
  const [subTab, setSubTab] = useState<'courses' | 'attendance' | 'clubs'>('courses');

  // 1. Course Allocations State
  const [allocations, setAllocations] = useState<FacultyAllocationItem[]>([]);
  const [availableFaculty, setAvailableFaculty] = useState<Array<{ id: string; fullName: string; department: string }>>([]);
  const [availableSubjects, setAvailableSubjects] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [allocLoading, setAllocLoading] = useState(true);

  // Assign Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedSection, setSelectedSection] = useState('A');
  const [assigning, setAssigning] = useState(false);

  // 2. Attendance Records State
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceAdminRecordItem[]>([]);
  const [attSearch, setAttSearch] = useState('');
  const [attLoading, setAttLoading] = useState(false);

  // Attendance Override Modal State
  const [selectedAttRecord, setSelectedAttRecord] = useState<AttendanceAdminRecordItem | null>(null);
  const [attNewStatus, setAttNewStatus] = useState<AttendanceRecordStatus>('present');
  const [attOverrideReason, setAttOverrideReason] = useState('');
  const [attOverriding, setAttOverriding] = useState(false);

  // 3. Club Participations State
  const [clubParticipations, setClubParticipations] = useState<ClubParticipationAdminItem[]>([]);
  const [clubSearch, setClubSearch] = useState('');
  const [clubLoading, setClubLoading] = useState(false);

  // Club Override Modal State
  const [selectedClubPart, setSelectedClubPart] = useState<ClubParticipationAdminItem | null>(null);
  const [clubNewStatus, setClubNewStatus] = useState<ClubParticipationStatus>('verified');
  const [clubOverrideReason, setClubOverrideReason] = useState('');
  const [clubOverriding, setClubOverriding] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load Course Allocations
  async function loadAllocations() {
    setAllocLoading(true);
    const res = await getFacultySubjectAllocationsAction();
    if (res.success) {
      setAllocations(res.allocations);
      setAvailableFaculty(res.availableFaculty);
      setAvailableSubjects(res.availableSubjects);
      if (res.availableFaculty.length > 0) setSelectedFacultyId(res.availableFaculty[0].id);
      if (res.availableSubjects.length > 0) setSelectedSubjectId(res.availableSubjects[0].id);
    }
    setAllocLoading(false);
  }

  // Load Attendance Records
  async function loadAttendanceRecords(query?: string) {
    setAttLoading(true);
    const res = await getAdminAttendanceRecordsAction(query);
    if (res.success) {
      setAttendanceRecords(res.records);
    }
    setAttLoading(false);
  }

  // Load Club Participations
  async function loadClubParticipations(query?: string) {
    setClubLoading(true);
    const res = await getAdminClubParticipationsAction(query);
    if (res.success) {
      setClubParticipations(res.participations);
    }
    setClubLoading(false);
  }

  useEffect(() => {
    loadAllocations();
    loadAttendanceRecords();
    loadClubParticipations();
  }, []);

  // Handle Assign Faculty
  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacultyId || !selectedSubjectId) return;

    setAssigning(true);
    const res = await assignFacultySubjectAction({
      facultyId: selectedFacultyId,
      subjectId: selectedSubjectId,
      section: selectedSection,
    });

    if (res.success) {
      setShowAssignModal(false);
      setFeedback({ type: 'success', message: 'Faculty assigned to subject successfully!' });
      loadAllocations();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to assign subject.' });
    }
    setAssigning(false);
  };

  // Handle Remove Allocation
  const handleRemoveAllocation = async (id: string) => {
    if (!confirm('Are you sure you want to remove this course allocation?')) return;
    const res = await removeFacultySubjectAction(id);
    if (res.success) {
      setFeedback({ type: 'success', message: 'Allocation removed successfully.' });
      loadAllocations();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to remove allocation.' });
    }
  };

  // Handle Submit Attendance Override
  const handleSubmitAttOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttRecord || !attOverrideReason.trim()) return;

    setAttOverriding(true);
    const res = await adminOverrideAttendanceRecordAction({
      recordId: selectedAttRecord.id,
      newStatus: attNewStatus,
      overrideReason: attOverrideReason.trim(),
    });

    if (res.success) {
      setSelectedAttRecord(null);
      setAttOverrideReason('');
      setFeedback({ type: 'success', message: 'Attendance record overridden and XP ledger updated!' });
      loadAttendanceRecords(attSearch);
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to override attendance.' });
    }
    setAttOverriding(false);
  };

  // Handle Submit Club Override
  const handleSubmitClubOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClubPart || !clubOverrideReason.trim()) return;

    setClubOverriding(true);
    const res = await adminOverrideClubParticipationAction({
      participationId: selectedClubPart.id,
      newStatus: clubNewStatus,
      overrideReason: clubOverrideReason.trim(),
    });

    if (res.success) {
      setSelectedClubPart(null);
      setClubOverrideReason('');
      setFeedback({ type: 'success', message: 'Club participation overridden and XP ledger updated!' });
      loadClubParticipations(clubSearch);
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to override club participation.' });
    }
    setClubOverriding(false);
  };

  return (
    <div className="space-y-6">
      {/* Sub Tabs Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-2 rounded-2xl bg-[#0c0c0e] border border-white/15">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab('courses')}
            className={clsx(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all',
              subTab === 'courses'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Faculty Subjects ({allocations.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('attendance')}
            className={clsx(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all',
              subTab === 'attendance'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            <CalendarCheck2 className="w-3.5 h-3.5" />
            <span>Class Attendance Overrides</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('clubs')}
            className={clsx(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all',
              subTab === 'clubs'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Club Activity Overrides</span>
          </button>
        </div>

        {subTab === 'courses' && (
          <button
            onClick={() => setShowAssignModal(true)}
            className="flex items-center gap-1.5 bg-white hover:bg-zinc-200 text-black px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" /> Assign Subject
          </button>
        )}
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl flex items-center justify-between text-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/60 border border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-zinc-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-PANEL 1: FACULTY SUBJECT ALLOCATIONS                              */}
      {/* ===================================================================== */}
      {subTab === 'courses' && (
        <div className="rounded-2xl bg-[#0c0c0e] border border-white/15 overflow-hidden shadow-xl">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Faculty Course & Section Allocations</h3>
              <p className="text-xs text-zinc-400">
                Determines which courses each faculty member is authorized to take attendance and manage.
              </p>
            </div>
            <button
              onClick={loadAllocations}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white"
            >
              <RefreshCw className={clsx('w-3.5 h-3.5', allocLoading && 'animate-spin')} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/90 text-zinc-400 uppercase text-[10px] font-mono tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Faculty Member</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Section</th>
                  <th className="py-3 px-4">Academic Year</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {allocLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-500">
                      Loading allocations...
                    </td>
                  </tr>
                ) : allocations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-500">
                      No course allocations found.
                    </td>
                  </tr>
                ) : (
                  allocations.map((a) => (
                    <tr key={a.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{a.facultyName}</div>
                        <div className="text-[11px] text-zinc-500 font-mono">{a.facultyEmail}</div>
                      </td>
                      <td className="py-3 px-4 text-zinc-400">{a.facultyDepartment}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 mr-2">
                          {a.subjectCode}
                        </span>
                        <span className="text-zinc-200">{a.subjectName}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-zinc-300">Sec {a.section}</td>
                      <td className="py-3 px-4 text-zinc-400">{a.academicYear}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleRemoveAllocation(a.id)}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Remove allocation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-PANEL 2: ATTENDANCE RECORDS & ADMIN OVERRIDES                     */}
      {/* ===================================================================== */}
      {subTab === 'attendance' && (
        <div className="rounded-2xl bg-[#0c0c0e] border border-white/15 overflow-hidden shadow-xl space-y-4">
          <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white">Class Attendance Records (Campus-Wide)</h3>
              <p className="text-xs text-zinc-400">
                As an Administrator, you can override any class attendance record. XP is adjusted automatically.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search student or roll no..."
                value={attSearch}
                onChange={(e) => {
                  setAttSearch(e.target.value);
                  loadAttendanceRecords(e.target.value);
                }}
                className="w-full bg-black border border-white/15 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/90 text-zinc-400 uppercase text-[10px] font-mono tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Roll No</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4">XP</th>
                  <th className="py-3 px-4">Recorded By</th>
                  <th className="py-3 px-4 text-right">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {attLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-zinc-500">
                      Loading attendance records...
                    </td>
                  </tr>
                ) : attendanceRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-zinc-500">
                      No attendance records found.
                    </td>
                  </tr>
                ) : (
                  attendanceRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-mono text-zinc-400">{r.sessionDate}</td>
                      <td className="py-3 px-4 font-mono font-bold text-purple-400">{r.subjectCode}</td>
                      <td className="py-3 px-4 font-medium text-white">{r.studentName}</td>
                      <td className="py-3 px-4 font-mono text-zinc-400">{r.studentRollNo}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            r.status === 'present'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : r.status === 'absent'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-emerald-400">+{r.xpAwarded} XP</td>
                      <td className="py-3 px-4 text-zinc-400">{r.markedByName}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedAttRecord(r);
                            setAttNewStatus(r.status === 'present' ? 'absent' : 'present');
                            setAttOverrideReason(r.overrideReason || '');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-200 text-xs font-semibold transition-colors"
                        >
                          <Edit3 className="w-3 h-3" /> Override
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-PANEL 3: CLUB PARTICIPATIONS & ADMIN OVERRIDES                   */}
      {/* ===================================================================== */}
      {subTab === 'clubs' && (
        <div className="rounded-2xl bg-[#0c0c0e] border border-white/15 overflow-hidden shadow-xl space-y-4">
          <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white">Club Activity Participations (Campus-Wide)</h3>
              <p className="text-xs text-zinc-400">
                As an Administrator, you can verify or reject student participation in any club activity.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search student or activity..."
                value={clubSearch}
                onChange={(e) => {
                  setClubSearch(e.target.value);
                  loadClubParticipations(e.target.value);
                }}
                className="w-full bg-black border border-white/15 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/90 text-zinc-400 uppercase text-[10px] font-mono tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Club</th>
                  <th className="py-3 px-4">Activity Title</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Roll No</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">XP</th>
                  <th className="py-3 px-4">Verified By</th>
                  <th className="py-3 px-4 text-right">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {clubLoading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-zinc-500">
                      Loading club participations...
                    </td>
                  </tr>
                ) : clubParticipations.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-zinc-500">
                      No club participation records found.
                    </td>
                  </tr>
                ) : (
                  clubParticipations.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-mono text-zinc-400">{p.activityDate}</td>
                      <td className="py-3 px-4 font-mono font-bold text-purple-400">{p.clubCode}</td>
                      <td className="py-3 px-4 text-white font-medium">{p.activityTitle}</td>
                      <td className="py-3 px-4 font-medium text-white">{p.studentName}</td>
                      <td className="py-3 px-4 font-mono text-zinc-400">{p.studentRollNo}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            p.status === 'verified'
                              ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-purple-300">+{p.xpAwarded} XP</td>
                      <td className="py-3 px-4 text-zinc-400">{p.verifiedByName}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedClubPart(p);
                            setClubNewStatus(p.status === 'verified' ? 'rejected' : 'verified');
                            setClubOverrideReason(p.overrideReason || '');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-200 text-xs font-semibold transition-colors"
                        >
                          <Edit3 className="w-3 h-3" /> Override
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: ASSIGN FACULTY SUBJECT                                         */}
      {/* ===================================================================== */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/15 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-400" /> Assign Faculty to Subject
            </h3>
            <p className="text-xs text-zinc-400 mb-6">
              Authorize a faculty member to manage and record attendance for a course section.
            </p>

            <form onSubmit={handleAssign} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-300 uppercase mb-1">Select Faculty Member</label>
                <select
                  value={selectedFacultyId}
                  onChange={(e) => setSelectedFacultyId(e.target.value)}
                  className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
                >
                  {availableFaculty.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.fullName} ({f.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 uppercase mb-1">Select Subject</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
                >
                  {availableSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 uppercase mb-1">Section</label>
                <input
                  type="text"
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value.toUpperCase())}
                  placeholder="A"
                  className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white uppercase focus:outline-none focus:border-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-3 py-1.5 text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning}
                  className="bg-white hover:bg-zinc-200 text-black font-bold px-4 py-2 rounded-xl text-xs shadow-md disabled:opacity-50"
                >
                  {assigning ? 'Assigning...' : 'Confirm Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: OVERRIDE ATTENDANCE RECORD                                     */}
      {/* ===================================================================== */}
      {selectedAttRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/15 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" /> Admin Attendance Override
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Overriding attendance for <strong className="text-white">{selectedAttRecord.studentName}</strong> ({selectedAttRecord.studentRollNo}) for {selectedAttRecord.subjectCode}.
            </p>

            <form onSubmit={handleSubmitAttOverride} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-300 uppercase mb-1">New Attendance Status</label>
                <select
                  value={attNewStatus}
                  onChange={(e) => setAttNewStatus(e.target.value as AttendanceRecordStatus)}
                  className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white font-medium"
                >
                  <option value="present">Present (+5 XP)</option>
                  <option value="absent">Absent (0 XP / Void)</option>
                  <option value="excused">Excused (0 XP / Void)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 uppercase mb-1">
                  Audit Override Reason (Required)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g., Medical leave approved by department head..."
                  value={attOverrideReason}
                  onChange={(e) => setAttOverrideReason(e.target.value)}
                  className="w-full bg-black border border-white/15 rounded-xl p-3 text-white placeholder-zinc-600 focus:outline-none focus:border-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedAttRecord(null)}
                  className="px-3 py-1.5 text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={attOverriding}
                  className="bg-amber-400 hover:bg-amber-300 text-black font-bold px-4 py-2 rounded-xl text-xs shadow-md disabled:opacity-50"
                >
                  {attOverriding ? 'Saving...' : 'Apply Admin Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: OVERRIDE CLUB PARTICIPATION                                    */}
      {/* ===================================================================== */}
      {selectedClubPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/15 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-purple-400" /> Admin Club Participation Override
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Overriding participation for <strong className="text-white">{selectedClubPart.studentName}</strong> in "{selectedClubPart.activityTitle}".
            </p>

            <form onSubmit={handleSubmitClubOverride} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-300 uppercase mb-1">New Participation Status</label>
                <select
                  value={clubNewStatus}
                  onChange={(e) => setClubNewStatus(e.target.value as ClubParticipationStatus)}
                  className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white font-medium"
                >
                  <option value="verified">Verified (+15 XP)</option>
                  <option value="rejected">Rejected (0 XP / Void)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 uppercase mb-1">
                  Audit Override Reason (Required)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g., Verified via external competition certificate..."
                  value={clubOverrideReason}
                  onChange={(e) => setClubOverrideReason(e.target.value)}
                  className="w-full bg-black border border-white/15 rounded-xl p-3 text-white placeholder-zinc-600 focus:outline-none focus:border-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedClubPart(null)}
                  className="px-3 py-1.5 text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={clubOverriding}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md disabled:opacity-50"
                >
                  {clubOverriding ? 'Saving...' : 'Apply Admin Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
