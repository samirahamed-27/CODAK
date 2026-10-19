'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Check, Swords } from 'lucide-react';
import { initialQuests, QuestItem } from '@/data/studentDashboardData';
import Shuffle from '@/components/Shuffle';

const STORAGE_KEY = 'academy_student_quests';
const LEGACY_DAILY_XP_PREFIX = 'academy_student_tasks_daily_xp_';

export function ToDoCard() {
  const [quests, setQuests] = useState<QuestItem[]>(initialQuests);
  const [newTitle, setNewTitle] = useState('');

  // Hydrate personal planner tasks and purge legacy daily XP keys on mount
  useEffect(() => {
    try {
      // 1. One-time localStorage cleanup of legacy daily XP keys
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith(LEGACY_DAILY_XP_PREFIX)) {
          localStorage.removeItem(key);
        }
      }

      // 2. Load stored personal tasks
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
    const updated = quests.map((q) =>
      q.id === id ? { ...q, completed: !q.completed } : q
    );
    saveQuests(updated);
  };

  const handleAddQuest = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    const newQuest: QuestItem = {
      id: `task_${Date.now()}`,
      title: trimmed,
      completed: false,
      xpReward: 0,
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
      aria-label="Student Study Planner and Tasks"
      className="game-card p-5 flex flex-col justify-between relative h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 text-xs">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400 block mb-0.5">
            Personal Planner
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
              accentColor="#A1A1AA"
              style={{ fontSize: '1.15rem', letterSpacing: '0.02em', fontWeight: 600 }}
            />
          </div>
        </div>

        {/* Counter and Local Storage Badge */}
        <div className="flex flex-col items-end gap-1">
          <div
            suppressHydrationWarning
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-[11px] font-mono text-zinc-300"
          >
            <span suppressHydrationWarning>
              {completedCount}/{quests.length} done
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-500">
            stored on this device
          </span>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 my-2 space-y-2 max-h-56 overflow-y-auto pr-1">
        {quests.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-zinc-400 mb-2">
              <Swords className="w-5 h-5 text-zinc-500" />
            </div>
            <p className="text-xs font-semibold text-white">No active tasks.</p>
            <p className="text-[11px] text-zinc-500">Add a task below to plan your study session</p>
          </div>
        ) : (
          quests.map((quest) => (
            <div
              key={quest.id}
              className={`group relative flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                quest.completed
                  ? 'bg-white/[0.01] border-white/[0.04] text-zinc-500'
                  : 'bg-white/[0.03] border-white/[0.08] hover:border-white/20 text-white'
              }`}
            >
              {/* Left: Checkbox & Title */}
              <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                <button
                  type="button"
                  onClick={() => handleToggle(quest.id)}
                  aria-checked={quest.completed}
                  role="checkbox"
                  aria-label={`Mark task "${quest.title}" as ${
                    quest.completed ? 'incomplete' : 'complete'
                  }`}
                  className={`w-5 h-5 shrink-0 rounded-full border flex items-center justify-center transition-all ${
                    quest.completed
                      ? 'bg-white border-white text-black shadow-sm'
                      : 'border-white/20 bg-zinc-900 hover:border-white'
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
                aria-label={`Delete task: ${quest.title}`}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-zinc-500 hover:text-white transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add Task Form */}
      <form onSubmit={handleAddQuest} className="mt-2 pt-2.5 border-t border-white/[0.06] flex gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New personal task (e.g. Master DP)..."
          maxLength={80}
          className="flex-1 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-white"
        />
        <button
          type="submit"
          className="px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs flex items-center justify-center gap-1 shrink-0 transition-colors"
          aria-label="Add task"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add</span>
        </button>
      </form>
    </article>
  );
}
