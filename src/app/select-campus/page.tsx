'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getStudentOnboardingInfoAction,
  assignInitialCampusAction,
} from '@/app/actions/campus';
import { formatCampusDisplayName } from '@/lib/campus';
import {
  GraduationCap,
  ArrowRight,
  AlertCircle,
  LogOut,
  User,
  Hash,
  BookOpen,
  Calendar,
  Building,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const DEPARTMENTS = [
  'COMPUTER SCIENCE CORE',
  'COMPUTER SCIENCE AI/ML',
];

export default function SelectCampusPage() {
  const router = useRouter();
  const [campuses, setCampuses] = useState<
    { id: string; name: string; city: string; is_other: boolean }[]
  >([]);
  const [selectedCampusId, setSelectedCampusId] = useState('');
  const [otherName, setOtherName] = useState('');
  const [fullName, setFullName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [department, setDepartment] = useState('COMPUTER SCIENCE CORE');
  const [customDepartment, setCustomDepartment] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState(1);
  const [fetching, setFetching] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await getStudentOnboardingInfoAction();
        if (res.success && res.campuses.length > 0) {
          setCampuses(res.campuses);
          setSelectedCampusId(res.campuses[0].id);

          if (res.user) {
            if (res.user.fullName) setFullName(res.user.fullName);
            if (res.user.rollNo) setRollNo(res.user.rollNo);
            if (res.user.department) {
              if (DEPARTMENTS.includes(res.user.department)) {
                setDepartment(res.user.department);
              } else if (
                res.user.department.toUpperCase().includes('AI') ||
                res.user.department.toUpperCase().includes('ML') ||
                res.user.department.toUpperCase().includes('DATA')
              ) {
                setDepartment('COMPUTER SCIENCE AI/ML');
              } else {
                setDepartment('COMPUTER SCIENCE CORE');
              }
            }
            if (res.user.yearOfStudy) setYearOfStudy(res.user.yearOfStudy);
            if (res.user.campusId) setSelectedCampusId(res.user.campusId);
          }
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load profile onboarding info');
      } finally {
        setFetching(false);
      }
    }
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const trimmedName = fullName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setError('Please enter your full name (minimum 2 characters).');
      setSubmitting(false);
      return;
    }

    const trimmedRoll = rollNo.trim();
    if (!trimmedRoll || trimmedRoll.length < 2) {
      setError('Please enter your student roll number or registration ID.');
      setSubmitting(false);
      return;
    }

    const finalDept = department === 'Other' ? customDepartment.trim() : department;
    if (!finalDept || finalDept.length < 2) {
      setError('Please specify your academic department or major.');
      setSubmitting(false);
      return;
    }

    if (!selectedCampusId) {
      setError('Please select an institution/campus.');
      setSubmitting(false);
      return;
    }

    const selectedCampus = campuses.find((c) => c.id === selectedCampusId);
    if (selectedCampus?.is_other && (!otherName.trim() || otherName.trim().length < 2)) {
      setError('Please enter your institution name (minimum 2 characters).');
      setSubmitting(false);
      return;
    }

    const res = await assignInitialCampusAction(
      selectedCampusId,
      selectedCampus?.is_other ? otherName.trim() : undefined,
      {
        fullName: trimmedName,
        rollNo: trimmedRoll,
        department: finalDept,
        yearOfStudy,
      }
    );

    if (!res.success) {
      setError(res.error || 'Failed to complete profile onboarding');
      setSubmitting(false);
      return;
    }

    // Hard navigation to student dashboard to refresh session and profile state
    window.location.href = '/student';
    router.refresh();
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const isOther = campuses.find((c) => c.id === selectedCampusId)?.is_other;

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black game-bg-grid p-4 text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
          <p className="text-xs font-mono text-zinc-400">Loading student profile setup...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black game-bg-grid p-4 sm:p-6 text-white selection:bg-white selection:text-black">
      <div className="w-full max-w-xl p-6 sm:p-8 rounded-3xl bg-zinc-950/90 border border-white/10 shadow-2xl backdrop-blur-2xl relative">
        {/* Header Ribbon */}
        <div className="flex items-center justify-between mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/20 text-white">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Student Onboarding • Step 1</span>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors font-mono"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
          Complete Your Student Profile
        </h1>
        <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
          Set up your student identity and link your institution to unlock peer duels, daily quizzes, and official campus leaderboards.
        </p>

        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-zinc-400" />
              Full Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={70}
              placeholder="e.g. Syed Ahmed"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-white transition-colors"
            />
          </div>

          {/* Row: Roll Number & Year of Study */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Student Roll No */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-zinc-400" />
                Roll No / Student ID <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={30}
                placeholder="e.g. 23CS042"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-white transition-colors font-mono"
              />
            </div>

            {/* Year of Study */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                Year of Study
              </label>
              <select
                value={yearOfStudy}
                onChange={(e) => setYearOfStudy(parseInt(e.target.value, 10))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-white transition-colors"
              >
                <option value={1}>1st Year (Freshman)</option>
                <option value={2}>2nd Year (Sophomore)</option>
                <option value={3}>3rd Year (Junior)</option>
                <option value={4}>4th Year (Senior)</option>
              </select>
            </div>
          </div>

          {/* Department */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
              Academic Department / Major <span className="text-rose-400">*</span>
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-white transition-colors"
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Campus Selector */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-zinc-400" />
              Institution / Campus <span className="text-rose-400">*</span>
            </label>
            <select
              value={selectedCampusId}
              onChange={(e) => setSelectedCampusId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-white transition-colors"
            >
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {formatCampusDisplayName(c)}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-zinc-500 mt-1">
              Campus affiliation is permanent once assigned to ensure league integrity.
            </p>
          </div>

          {isOther && (
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Your Institution Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={60}
                placeholder="Enter college or university name"
                value={otherName}
                onChange={(e) => setOtherName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-white transition-colors"
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || campuses.length === 0}
            className="w-full py-3 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 mt-6"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Completing Profile...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-black" />
                <span>Confirm & Enter Campus</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
