'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Check, Sparkles, Swords } from 'lucide-react';
import { initialQuests, QuestItem } from '@/data/studentDashboardData';
import Shuffle from '@/components/Shuffle';

interface ToDoCardProps {
  onQuestCompleted?: (xpEarned: number) => void;
}

const STORAGE_KEY = 'academy_student_quests';

export function ToDoCard({ onQuestCompleted }: ToDoCardProps) {
  const [quests, setQuests] = useState<QuestItem[]>(initialQuests);
  const [newTitle, setNewTitle] = useState('');
  const [animatingQuestId, setAnimatingQuestId] = useState<string | null>(null);

  // Hydrate quests from localStorage on client mount to prevent server-client HTML mismatch
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setQuests(parsed);
        }
      }
    } catch {
      // Storage unavailable
    }
  }, []);

  // Save to localStorage on change
  const saveQuests = (updated: QuestItem[]) => {
    setQuests(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Storage unavailable
    }
  };

  const handleToggle = (id: string) => {
    const targetQuest = quests.find((q) => q.id === id);
    if (!targetQuest) return;

    const willBeCompleted = !targetQuest.completed;

    if (willBeCompleted) {
      // Trigger pop and floating +10 XP animation (Pastel Orange #FFB27A)
      setAnimatingQuestId(id);
      setTimeout(() => setAnimatingQuestId(null), 900);
      onQuestCompleted?.(targetQuest.xpReward || 10);
    }

    const updated = quests.map((q) =>
      q.id === id ? { ...q, completed: willBeCompleted } : q
    );
    saveQuests(updated);
  };

  const handleAddQuest = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    const newQuest: QuestItem = {
      id: `quest_${Date.now()}`,
      title: trimmed,
      completed: false,
      xpReward: 10,
      createdAt: new Date().toISOString(),
    };

    const updated = [newQuest, ...quests];
    saveQuests(updated);
    setNewTitle('');
  };

  const handleDeleteQuest = (id: string) => {
    const updated = quests.filter((q) => q.id !== id);
    saveQuests(updated);
  };

  const completedCount = quests.filter((q) => q.completed).length;

  return (
    <article
      aria-label="Student Quests and To-Do List"
      className="game-card p-6 flex flex-col justify-between relative animate-card-pop"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="font-pixel text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            DAILY MISSIONS
          </span>
          <div className="flex items-center gap-2">
            <Shuffle
              text="To do"
              tag="h2"
              effect="slide"
              duration={0.35}
              stagger={0.03}
              triggerOnHover={true}
              color="#FFFFFF"
              accentColor="#7DD3FC"
              style={{ fontSize: '1.25rem', letterSpacing: '0.04em' }}
            />
            <span className="px-2 py-0.5 rounded-md bg-[#10131E] border border-sky-400/40 text-sky-300 text-[10px] font-pixel font-bold">
              QUESTS
            </span>
          </div>
        </div>

        {/* Counter Chip (Pastel Orange #FFB27A) */}
        <div
          suppressHydrationWarning
          className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#081534] border border-[#1E3A78] text-xs font-semibold text-[#FFB27A]"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span suppressHydrationWarning>
            {completedCount}/{quests.length} Done
          </span>
        </div>
      </div>

      {/* Quest List */}
      <div className="flex-1 my-2 space-y-2.5 max-h-56 overflow-y-auto pr-1">
        {quests.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#081534] border border-[#1E3A78] flex items-center justify-center text-[#A9B8D6] mb-2">
              <Swords className="w-6 h-6 text-[#6C7FAD]" />
            </div>
            <p className="text-sm font-semibold text-white">No quests yet.</p>
            <p className="text-xs text-[#6C7FAD]">Add one below to earn +10 XP!</p>
          </div>
        ) : (
          quests.map((quest) => {
            const isAnimating = animatingQuestId === quest.id;

            return (
              <div
                key={quest.id}
                className={`group relative flex items-center justify-between p-3 rounded-2xl border transition-all ${
                  quest.completed
                    ? 'bg-[#081534]/60 border-[#1E3A78]/50 text-[#6C7FAD]'
                    : 'bg-[#081534] border-[#1E3A78] text-white hover:border-[#7CC4FF]'
                }`}
              >
                {/* Floating "+10 XP" Particle in Pastel Orange #FFB27A */}
                {isAnimating && (
                  <div
                    aria-hidden="true"
                    className="absolute -top-3 left-6 font-pixel text-xs font-bold text-[#FFB27A] shadow-md animate-float-xp pointer-events-none z-30 drop-shadow-[0_0_8px_rgba(255,178,122,0.8)]"
                  >
                    +{quest.xpReward} XP! ⚡
                  </div>
                )}

                {/* Left: Circular Checkbox (Filled orange #FFB27A with black check mark #06080F) */}
                <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                  <button
                    type="button"
                    onClick={() => handleToggle(quest.id)}
                    aria-checked={quest.completed}
                    role="checkbox"
                    aria-label={`Mark quest "${quest.title}" as ${
                      quest.completed ? 'incomplete' : 'complete'
                    }`}
                    className={`w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${
                      quest.completed
                        ? 'bg-[#FFB27A] border-[#FFB27A] text-[#06080F] shadow-[0_0_10px_rgba(255,178,122,0.5)]'
                        : 'border-[#1E3A78] bg-[#06080F] hover:border-[#7CC4FF]'
                    }`}
                  >
                    {quest.completed && <Check className="w-3.5 h-3.5 stroke-[3] text-[#06080F]" />}
                  </button>

                  <span
                    className={`text-xs font-medium leading-snug break-words ${
                      quest.completed
                        ? 'line-through text-[#6C7FAD]'
                        : 'text-slate-100'
                    }`}
                  >
                    {quest.title}
                  </span>
                </div>

                {/* Right: Delete button */}
                <button
                  type="button"
                  onClick={() => handleDeleteQuest(quest.id)}
                  aria-label={`Delete quest: ${quest.title}`}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[#6C7FAD] hover:text-[#FFB27A] hover:bg-[#FFB27A]/15 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Add Quest Form */}
      <form onSubmit={handleAddQuest} className="mt-3 pt-3 border-t border-[#1E3A78]/70 flex gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New quest (e.g. Master DP)..."
          maxLength={80}
          className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#06080F] border border-[#1E3A78] text-xs text-white placeholder:text-[#6C7FAD] focus:outline-none focus:border-[#7CC4FF] focus:ring-1 focus:ring-[#7CC4FF]"
        />
        <button
          type="submit"
          className="btn-arcade-primary px-3.5 py-2.5 text-xs flex items-center justify-center gap-1 shrink-0"
          aria-label="Add quest"
        >
          <Plus className="w-4 h-4 text-[#06080F]" />
          <span className="hidden sm:inline">Add</span>
        </button>
      </form>
    </article>
  );
}
