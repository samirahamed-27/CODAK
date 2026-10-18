'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCampusesAction, assignInitialCampusAction } from '@/app/actions/campus';
import { formatCampusDisplayName } from '@/lib/campus';
import { School, ArrowRight, AlertCircle, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function SelectCampusPage() {
  const router = useRouter();
  const [campuses, setCampuses] = useState<{ id: string; name: string; city: string; is_other: boolean }[]>([]);
  const [selectedCampusId, setSelectedCampusId] = useState('');
  const [otherName, setOtherName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCampuses() {
      const res = await getCampusesAction();
      if (res.success && res.campuses.length > 0) {
        setCampuses(res.campuses);
        setSelectedCampusId(res.campuses[0].id);
      }
    }
    loadCampuses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!selectedCampusId) {
      setError('Please select a campus.');
      setLoading(false);
      return;
    }

    const selectedCampus = campuses.find((c) => c.id === selectedCampusId);
    if (selectedCampus?.is_other && (!otherName.trim() || otherName.trim().length < 2)) {
      setError('Please enter your campus name (minimum 2 characters).');
      setLoading(false);
      return;
    }

    const res = await assignInitialCampusAction(
      selectedCampusId,
      selectedCampus?.is_other ? otherName.trim() : undefined
    );

    if (!res.success) {
      setError(res.error || 'Failed to set campus');
      setLoading(false);
      return;
    }

    // Refresh and navigate to home / role page
    router.push('/');
    router.refresh();
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const isOther = campuses.find((c) => c.id === selectedCampusId)?.is_other;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 text-slate-100">
      <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl relative">
        <div className="flex items-center justify-between mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <School className="w-3.5 h-3.5" />
            Campus Onboarding
          </div>
          <button
            onClick={handleSignOut}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Select Your Campus</h1>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          To enable campus-specific leaderboards, leagues, and battles, please link your profile to an institution. Note: Campus assignment is permanent once confirmed.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Institution / Campus
            </label>
            <select
              value={selectedCampusId}
              onChange={(e) => setSelectedCampusId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
            >
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {formatCampusDisplayName(c)}
                </option>
              ))}
            </select>
          </div>

          {isOther && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Your Institution Name
              </label>
              <input
                type="text"
                required
                maxLength={60}
                placeholder="Enter college or university name"
                value={otherName}
                onChange={(e) => setOtherName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading || campuses.length === 0}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 mt-4"
          >
            {loading ? (
              <span>Saving campus...</span>
            ) : (
              <>
                <span>Confirm & Continue</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
