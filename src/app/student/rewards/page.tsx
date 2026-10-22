'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import {
  getRewardsCatalogAction,
  redeemRewardAction,
  RewardPerk,
  StudentRedemptionRecord,
} from '@/app/actions/rewards';
import {
  Gift,
  Coins,
  Ticket,
  Users,
  ShieldCheck,
  Shirt,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Copy,
  Clock,
  ArrowRight,
  Loader2,
  ExternalLink,
} from 'lucide-react';

export default function StudentRewardsPage() {
  const [rewards, setRewards] = useState<RewardPerk[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [redemptions, setRedemptions] = useState<StudentRedemptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'catalog' | 'history'>('catalog');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal State
  const [confirmingReward, setConfirmingReward] = useState<RewardPerk | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successRedemption, setSuccessRedemption] = useState<{
    claimCode: string;
    reward: RewardPerk;
    newBalance: number;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const res = await getRewardsCatalogAction();
      if (res.success) {
        setRewards(res.rewards);
        setBalance(res.currentBalance);
        setRedemptions(res.redemptions);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const categories = ['all', ...Array.from(new Set(rewards.map((r) => r.category)))];

  const filteredRewards =
    selectedCategory === 'all'
      ? rewards
      : rewards.filter((r) => r.category === selectedCategory);

  const handleOpenConfirm = (reward: RewardPerk) => {
    setErrorMsg(null);
    setConfirmingReward(reward);
  };

  const handleExecuteRedeem = async () => {
    if (!confirmingReward) return;
    setRedeeming(true);
    setErrorMsg(null);

    try {
      const res = await redeemRewardAction(confirmingReward.id);
      if (res.success && res.claimCode && res.reward && res.redemption) {
        setBalance(res.newBalance ?? (balance - confirmingReward.cost));
        setRedemptions((prev) => [res.redemption!, ...prev]);
        setSuccessRedemption({
          claimCode: res.claimCode,
          reward: res.reward,
          newBalance: res.newBalance ?? (balance - confirmingReward.cost),
        });
        setConfirmingReward(null);
      } else {
        setErrorMsg(res.error || 'Failed to redeem perk. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred during redemption.');
    } finally {
      setRedeeming(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 pb-24">
      <Navbar role="student" />

      <main className="max-w-6xl mx-auto px-4 pt-8">
        {/* Header Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 via-black to-zinc-950 p-6 md:p-8 mb-8 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-400/10 text-amber-300 border border-amber-400/30 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Official MSOT Perk Store
                </span>
                <span className="text-xs text-zinc-400">Non-Academic Rewards</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                Rewards & Perks Store
              </h1>
              <p className="text-sm text-zinc-400 mt-2 max-w-xl">
                Redeem your hard-earned academic and quiz XP for exclusive college perks, 1-on-1 alumni
                mentorship, fest VIP passes, and custom department merch.
              </p>
            </div>

            {/* Live XP Balance Display */}
            <div className="bg-white/5 border border-white/15 rounded-2xl p-5 flex items-center gap-4 backdrop-blur-md shadow-lg">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                <Coins className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold block">
                  Available Balance
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl md:text-3xl font-black text-white font-mono">
                    {loading ? '...' : balance.toLocaleString()}
                  </span>
                  <span className="text-sm font-bold text-amber-400">XP</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-3 mt-6 pt-6 border-t border-white/10">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'catalog'
                  ? 'bg-white text-black shadow-lg'
                  : 'bg-white/5 text-zinc-400 hover:text-white border border-white/10'
              }`}
            >
              <Gift className="w-4 h-4" />
              Browse Perks
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'history'
                  ? 'bg-white text-black shadow-lg'
                  : 'bg-white/5 text-zinc-400 hover:text-white border border-white/10'
              }`}
            >
              <Clock className="w-4 h-4" />
              My Redemptions
              {redemptions.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-400 text-black font-bold">
                  {redemptions.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab 1: Catalog */}
        {activeTab === 'catalog' && (
          <div>
            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all capitalize ${
                    selectedCategory === cat
                      ? 'bg-amber-400 text-black font-semibold shadow-md'
                      : 'bg-white/5 text-zinc-400 hover:text-white border border-white/10'
                  }`}
                >
                  {cat === 'all' ? 'All Rewards' : cat}
                </button>
              ))}
            </div>

            {/* Rewards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredRewards.map((reward) => {
                const canAfford = balance >= reward.cost;
                const deficit = reward.cost - balance;

                return (
                  <div
                    key={reward.id}
                    className="group rounded-3xl border border-white/10 bg-zinc-900/60 backdrop-blur-xl p-6 flex flex-col justify-between hover:border-amber-400/40 hover:bg-zinc-900/80 transition-all duration-300 shadow-xl relative overflow-hidden"
                  >
                    <div>
                      {/* Top Row: Icon & Tag */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/15 flex items-center justify-center text-3xl shadow-inner group-hover:scale-105 transition-transform">
                          {reward.icon}
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400/10 text-amber-300 border border-amber-400/20">
                            {reward.tag}
                          </span>
                          <span className="text-[11px] text-zinc-500 font-medium">
                            {reward.category}
                          </span>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <h3 className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
                        {reward.title}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                        {reward.description}
                      </p>

                      {/* Perk Bullet Points */}
                      <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                        {reward.perks.map((p, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-zinc-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            <span>{p}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Row: Price & Action */}
                    <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-white font-mono">
                          {reward.cost}
                        </span>
                        <span className="text-xs font-bold text-amber-400">XP</span>
                      </div>

                      <button
                        onClick={() => handleOpenConfirm(reward)}
                        disabled={!canAfford}
                        className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                          canAfford
                            ? 'bg-amber-400 hover:bg-amber-300 text-black shadow-lg shadow-amber-400/20 active:scale-95 cursor-pointer'
                            : 'bg-white/5 text-zinc-500 border border-white/10 cursor-not-allowed'
                        }`}
                      >
                        {canAfford ? (
                          <>
                            <span>Redeem Perk</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <span>Need +{deficit} XP</span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: My Redemptions History */}
        {activeTab === 'history' && (
          <div className="rounded-3xl border border-white/10 bg-zinc-900/60 p-6 backdrop-blur-xl">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Ticket className="w-5 h-5 text-amber-400" />
              Claimed Vouchers & Redemptions
            </h2>

            {redemptions.length === 0 ? (
              <div className="text-center py-16 text-zinc-500 text-sm">
                <Gift className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>You haven&apos;t redeemed any perks yet.</p>
                <p className="text-xs text-zinc-600 mt-1">
                  Earn XP from daily quizzes, battles, and practice drills to unlock rewards!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {redemptions.map((red) => (
                  <div
                    key={red.id}
                    className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-400/10 text-emerald-300 border border-emerald-400/20 uppercase tracking-wider">
                          {red.status}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {new Date(red.redeemedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-white">{red.rewardTitle}</h4>
                      <p className="text-xs text-zinc-400 mt-0.5">{red.notes}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="px-3.5 py-2 rounded-xl bg-black border border-white/20 font-mono text-sm text-amber-300 font-bold tracking-wider flex items-center gap-2">
                        <span>{red.claimCode}</span>
                        <button
                          onClick={() => handleCopyCode(red.claimCode)}
                          className="hover:text-white transition-colors"
                          title="Copy Claim Code"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Confirmation Modal */}
      {confirmingReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-white/20 bg-zinc-950 p-6 sm:p-8 shadow-2xl relative">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-400/30 mx-auto flex items-center justify-center text-3xl mb-3">
                {confirmingReward.icon}
              </div>
              <h3 className="text-xl font-bold text-white">Confirm Perk Redemption</h3>
              <p className="text-xs text-zinc-400 mt-1">
                You are about to redeem{' '}
                <span className="text-white font-semibold">{confirmingReward.title}</span>.
              </p>
            </div>

            {/* Ledger Impact Calculation */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 space-y-2 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Current XP Balance:</span>
                <span className="font-mono text-white font-semibold">
                  {balance.toLocaleString()} XP
                </span>
              </div>
              <div className="flex justify-between text-rose-400 font-medium">
                <span>Perk Cost (Deduction):</span>
                <span className="font-mono">-{confirmingReward.cost} XP</span>
              </div>
              <div className="pt-2 border-t border-white/10 flex justify-between font-bold text-amber-300">
                <span>Projected New Balance:</span>
                <span className="font-mono">
                  {(balance - confirmingReward.cost).toLocaleString()} XP
                </span>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-400/30 text-rose-300 text-xs mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                disabled={redeeming}
                onClick={() => setConfirmingReward(null)}
                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={redeeming}
                onClick={handleExecuteRedeem}
                className="flex-1 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold transition-all shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                {redeeming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Confirm & Deduct XP</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal with Claim Code */}
      {successRedemption && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-emerald-400/30 bg-zinc-950 p-6 sm:p-8 shadow-2xl relative text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 mx-auto flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-2xl font-black text-white">Perk Redeemed!</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              {successRedemption.reward.title} has been successfully registered on your academic ledger.
            </p>

            {/* Voucher Card */}
            <div className="mt-6 p-5 rounded-2xl bg-white/5 border border-white/15 text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block mb-1">
                Your Exclusive Claim Code
              </span>
              <div className="font-mono text-2xl font-black text-amber-300 tracking-wider py-2">
                {successRedemption.claimCode}
              </div>

              <button
                onClick={() => handleCopyCode(successRedemption.claimCode)}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedCode ? 'Copied to Clipboard!' : 'Copy Claim Code'}</span>
              </button>
            </div>

            <p className="text-[11px] text-zinc-500 mt-4 leading-normal">
              Present this code to your department faculty coordinator or student council secretary to claim your pass/merchandise.
            </p>

            <button
              onClick={() => setSuccessRedemption(null)}
              className="mt-6 w-full py-3 rounded-xl bg-white text-black font-bold text-xs hover:bg-zinc-200 transition-colors"
            >
              Done & Return to Store
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
