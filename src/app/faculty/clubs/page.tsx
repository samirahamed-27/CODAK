'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import {
  getClubsAction,
  createClubActivityAction,
  getClubActivitiesAction,
  getActivityParticipantsAction,
  submitClubParticipationAction,
  ClubItem,
  ClubActivityItem,
  ParticipantRosterItem,
} from '@/app/actions/clubs';
import {
  Sparkles,
  ArrowLeft,
  Users,
  Calendar,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  RefreshCw,
  Award,
  Layers,
  Clock,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

export default function FacultyClubsPage() {
  const [clubs, setClubs] = useState<ClubItem[]>([]);
  const [selectedClub, setSelectedClub] = useState<ClubItem | null>(null);
  const [activities, setActivities] = useState<ClubActivityItem[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<ClubActivityItem | null>(null);
  const [roster, setRoster] = useState<ParticipantRosterItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Create Activity Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDesc, setActivityDesc] = useState('');
  const [activityDate, setActivityDate] = useState('');
  const [creatingActivity, setCreatingActivity] = useState(false);

  useEffect(() => {
    setActivityDate(new Date().toISOString().substring(0, 10));
  }, []);

  // 1. Load Clubs
  useEffect(() => {
    async function loadClubs() {
      setLoading(true);
      const res = await getClubsAction();
      if (res.success && res.clubs.length > 0) {
        setClubs(res.clubs);
        setSelectedClub(res.clubs[0]);
      } else if (res.error) {
        setFeedback({ type: 'error', message: res.error });
      }
      setLoading(false);
    }
    loadClubs();
  }, []);

  // 2. Load Activities when selected club changes
  const loadClubActivities = useCallback(async (clubId: string) => {
    setActivitiesLoading(true);
    const res = await getClubActivitiesAction(clubId);
    if (res.success) {
      setActivities(res.activities);
      if (res.activities.length > 0) {
        setSelectedActivity(res.activities[0]);
      } else {
        setSelectedActivity(null);
        setRoster([]);
      }
    }
    setActivitiesLoading(false);
  }, []);

  useEffect(() => {
    if (selectedClub) {
      loadClubActivities(selectedClub.id);
    }
  }, [selectedClub, loadClubActivities]);

  // 3. Load Participants when selected activity changes
  const loadRoster = useCallback(async (activityId: string) => {
    setRosterLoading(true);
    const res = await getActivityParticipantsAction(activityId);
    if (res.success) {
      setRoster(res.roster);
    }
    setRosterLoading(false);
  }, []);

  useEffect(() => {
    if (selectedActivity) {
      loadRoster(selectedActivity.id);
    }
  }, [selectedActivity, loadRoster]);

  // Handle Create Activity
  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClub || !activityTitle.trim()) return;

    setCreatingActivity(true);
    const res = await createClubActivityAction({
      clubId: selectedClub.id,
      title: activityTitle.trim(),
      description: activityDesc.trim() || undefined,
      activityDate,
    });

    if (res.success && res.activity) {
      setShowCreateModal(false);
      setActivityTitle('');
      setActivityDesc('');
      setFeedback({ type: 'success', message: 'Activity event created successfully!' });
      // Refresh activities
      loadClubActivities(selectedClub.id);
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to create activity.' });
    }
    setCreatingActivity(false);
  };

  // Toggle Verification for a Student
  const handleToggleStatus = (studentId: string, status: 'verified' | 'rejected') => {
    setRoster((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, status } : r))
    );
  };

  // Update Override Reason
  const handleReasonChange = (studentId: string, reason: string) => {
    setRoster((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, overrideReason: reason } : r))
    );
  };

  // Submit Verified Roster
  const handleSubmitVerification = async () => {
    if (!selectedActivity) return;

    setSubmitting(true);
    setFeedback(null);

    const entries = roster
      .filter((r) => r.status !== 'unmarked')
      .map((r) => ({
        studentId: r.studentId,
        status: r.status as 'verified' | 'rejected',
        overrideReason: r.overrideReason || undefined,
      }));

    if (entries.length === 0) {
      setFeedback({ type: 'error', message: 'Please mark at least one student before saving.' });
      setSubmitting(false);
      return;
    }

    const res = await submitClubParticipationAction({
      activityId: selectedActivity.id,
      entries,
    });

    if (res.success) {
      setFeedback({
        type: 'success',
        message: `Verified ${res.verifiedCount} student participants! +${res.totalXpAwarded} XP credited.`,
      });
      loadRoster(selectedActivity.id);
      if (selectedClub) loadClubActivities(selectedClub.id);
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to submit verification.' });
    }
    setSubmitting(false);
  };

  // Filter roster
  const filteredRoster = roster.filter(
    (s) =>
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const verifiedCount = roster.filter((r) => r.status === 'verified').length;

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
              <Award className="w-8 h-8 text-purple-400" />
              Club Activities & Extracurricular XP
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Verify student participation in workshops, hackathons, and technical club meetings (15 XP per verified event).
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {clubs.length > 0 && (
              <select
                aria-label="Select Technical Club"
                className="bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-white focus:outline-none focus:border-purple-500 transition-colors"
                value={selectedClub?.id || ''}
                onChange={(e) => {
                  const c = clubs.find((x) => x.id === e.target.value);
                  if (c) setSelectedClub(c);
                }}
              >
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-purple-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4" /> New Activity
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
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

        {/* Club Details Header */}
        {selectedClub && (
          <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {selectedClub.category}
                </span>
                <span className="text-xs text-zinc-400">
                  Faculty Advisor: <strong className="text-zinc-200">{selectedClub.leadFacultyName}</strong>
                </span>
              </div>
              <h2 className="text-lg font-bold text-white">{selectedClub.name}</h2>
              <p className="text-xs text-zinc-400 mt-1 max-w-2xl">{selectedClub.description}</p>
            </div>
            <div className="text-center sm:text-right">
              <div className="text-2xl font-black text-white">{activities.length}</div>
              <div className="text-[11px] text-zinc-400 uppercase font-semibold">Total Activities</div>
            </div>
          </div>
        )}

        {/* Main Content: Activities List & Verification Sheet */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Activities List (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-400" /> Club Events
            </h3>

            {activitiesLoading ? (
              <div className="py-12 text-center text-zinc-500">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-400" />
                <span className="text-xs">Loading activities...</span>
              </div>
            ) : activities.length === 0 ? (
              <div className="p-6 bg-zinc-900/40 border border-white/5 rounded-2xl text-center text-zinc-500 text-xs">
                No activities yet. Click "+ New Activity" above to create a club event.
              </div>
            ) : (
              activities.map((act) => {
                const isSelected = selectedActivity?.id === act.id;
                return (
                  <button
                    key={act.id}
                    onClick={() => setSelectedActivity(act)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-purple-950/40 border-purple-500/50 shadow-lg shadow-purple-500/10'
                        : 'bg-zinc-900/40 border-white/5 hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-purple-300 font-semibold">{act.activityDate}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          act.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                        }`}
                      >
                        {act.status}
                      </span>
                    </div>
                    <div className="font-bold text-white text-sm mb-1">{act.title}</div>
                    <div className="text-xs text-zinc-400 line-clamp-2 mb-2">{act.description}</div>
                    <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> {act.participantCount} verified participants
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Right: Participant Verification Sheet (8 cols) */}
          <div className="lg:col-span-8">
            {!selectedActivity ? (
              <div className="p-12 bg-zinc-900/40 border border-white/10 rounded-2xl text-center text-zinc-500 text-sm">
                Select an activity on the left to verify student participation.
              </div>
            ) : (
              <div className="bg-zinc-900/60 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                {/* Header */}
                <div className="p-6 border-b border-white/10 bg-zinc-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-purple-400">
                        {selectedClub?.name}
                      </span>
                      <span className="text-xs text-zinc-500">•</span>
                      <span className="text-xs text-zinc-400">{selectedActivity.activityDate}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white">{selectedActivity.title}</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> {verifiedCount} Verified (+15 XP each)
                    </span>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b border-white/5 bg-black/40">
                  <div className="relative max-w-sm">
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search student or roll number..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-black/90 text-xs text-zinc-400 uppercase tracking-wider border-b border-white/10 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 font-semibold">Roll No</th>
                        <th className="px-6 py-3 font-semibold">Student</th>
                        <th className="px-6 py-3 font-semibold">Status</th>
                        <th className="px-6 py-3 font-semibold">XP Credited</th>
                        <th className="px-6 py-3 font-semibold">Note / Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {filteredRoster.map((s) => {
                        const isVerified = s.status === 'verified';
                        const isRejected = s.status === 'rejected';

                        return (
                          <tr key={s.studentId} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-6 py-3.5 font-mono text-zinc-300 font-semibold">
                              {s.rollNo}
                            </td>
                            <td className="px-6 py-3.5">
                              <div className="font-semibold text-white">{s.fullName}</div>
                              <div className="text-[11px] text-zinc-500">{s.department}</div>
                            </td>
                            <td className="px-6 py-3.5">
                              <div className="inline-flex rounded-xl p-0.5 bg-black/60 border border-white/10">
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(s.studentId, 'verified')}
                                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                                    isVerified
                                      ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30'
                                      : 'text-zinc-400 hover:text-white'
                                  }`}
                                >
                                  Verified
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(s.studentId, 'rejected')}
                                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                                    isRejected
                                      ? 'bg-rose-600 text-white shadow-md shadow-rose-500/30'
                                      : 'text-zinc-400 hover:text-white'
                                  }`}
                                >
                                  Rejected
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-3.5">
                              {isVerified ? (
                                <span className="font-semibold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                                  +15 XP
                                </span>
                              ) : (
                                <span className="text-zinc-500">0 XP</span>
                              )}
                            </td>
                            <td className="px-6 py-3.5">
                              <input
                                type="text"
                                placeholder="Note / prize..."
                                value={s.overrideReason || ''}
                                onChange={(e) => handleReasonChange(s.studentId, e.target.value)}
                                className="bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-purple-500 w-36"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Submit Bar */}
                <div className="p-4 bg-zinc-950/80 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-zinc-400">
                    Changes are recorded in the immutable ledger with your faculty signature.
                  </div>
                  <button
                    onClick={handleSubmitVerification}
                    disabled={submitting}
                    className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-purple-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Verifying...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Save & Award Participation XP
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal: New Activity */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-white/15 rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-400" /> New Club Event / Workshop
              </h3>
              <p className="text-xs text-zinc-400 mb-6">
                Create an event for <strong className="text-white">{selectedClub?.name}</strong>.
              </p>

              <form onSubmit={handleCreateActivity} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                    Event Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Algorithmic Problem Solving Sprint #4"
                    value={activityTitle}
                    onChange={(e) => setActivityTitle(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={activityDate}
                    onChange={(e) => setActivityDate(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                    Description / Agenda
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Brief description of the workshop or event..."
                    value={activityDesc}
                    onChange={(e) => setActivityDesc(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-sm text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingActivity}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
                  >
                    {creatingActivity ? 'Creating...' : 'Create Event'}
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
