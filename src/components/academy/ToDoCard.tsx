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

  // Hydrate quests from localStorage on client mount
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
      className="game-card p-5 flex flex-col justify-between relative h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 text-xs">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400 block mb-0.5">
            Missions & To-Do
          </span>
          <div className="flex items-center gap-2">
            <Shuffle
              text="Tasks"
              tag="h2"
              effect="slide"
              duration={0.35}
              stagger={0.03}
              triggerOnHover={true}
              color="#FFFFFF"
              accentColor="#7DD3FC"
              style={{ fontSize: '1.15rem', letterSpacing: '0.02em', fontWeight: 600 }}
            />
          </div>
        </div>

        {/* Counter Chip */}
        <div
          suppressHydrationWarning
          className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-[11px] font-mono text-sky-300"
        >
          <Sparkles className="w-3 h-3 text-sky-400" />
          <span suppressHydrationWarning>
            {completedCount}/{quests.length} Done
          </span>
        </div>
      </div>

      {/* Quest List */}
      <div className="flex-1 my-2 space-y-2 max-h-56 overflow-y-auto pr-1">
        {quests.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-zinc-400 mb-2">
              <Swords className="w-5 h-5 text-zinc-500" />
            </div>
            <p className="text-xs font-semibold text-white">No active tasks.</p>
            <p className="text-[11px] text-zinc-500">Add one below to earn +10 XP</p>
          </div>
        ) : (
          quests.map((quest) => {
            const isAnimating = animatingQuestId === quest.id;

            return (
              <div
                key={quest.id}
                className={`group relative flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                  quest.completed
                    ? 'bg-white/[0.01] border-white/[0.04] text-zinc-500'
                    : 'bg-white/[0.03] border-white/[0.08] hover:border-white/20 text-white'
                }`}
              >
                {/* Floating "+10 XP" Particle */}
                {isAnimating && (
                  <div
                    aria-hidden="true"
                    className="absolute -top-3 left-6 font-mono text-xs font-bold text-sky-300 animate-float-xp pointer-events-none z-30"
                  >
                    +{quest.xpReward} XP!
                  </div>
                )}

                {/* Left: Circular Checkbox */}
                <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                  <button
                    type="button"
                    onClick={() => handleToggle(quest.id)}
                    aria-checked={quest.completed}
                    role="checkbox"
                    aria-label={`Mark quest "${quest.title}" as ${
                      quest.completed ? 'incomplete' : 'complete'
                    }`}
                    className={`w-5 h-5 shrink-0 rounded-full border flex items-center justify-center transition-all ${
                      quest.completed
                        ? 'bg-sky-400 border-sky-400 text-black shadow-sm'
                        : 'border-white/20 bg-zinc-900 hover:border-sky-400'
                    }`}
                  >
                    {quest.completed && <Check className="w-3 h-3 stroke-[3] text-black" />}
                  </button>

                  <span
                    className={`text-xs font-medium leading-snug break-words ${
                      quest.completed
                        ? 'line-through text-zinc-500'
                        : 'text-zinc-200'
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
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-zinc-500 hover:text-rose-400 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Add Quest Form */}
      <form onSubmit={handleAddQuest} className="mt-2 pt-2.5 border-t border-white/[0.06] flex gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New task (e.g. Master DP)..."
          maxLength={80}
          className="flex-1 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-sky-400"
        />
        <button
          type="submit"
          className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-semibold text-xs flex items-center justify-center gap-1 shrink-0 transition-colors"
          aria-label="Add task"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add</span>
        </button>
      </form>
    </article>
  );
}
