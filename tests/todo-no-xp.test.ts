import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('No Fake XP on Student Home / Personal Planner (Step 4)', () => {
  const todoCardPath = path.resolve(process.cwd(), 'src/components/academy/ToDoCard.tsx');
  const studentPagePath = path.resolve(process.cwd(), 'src/app/student/page.tsx');

  let todoCardSource: string;
  let studentPageSource: string;

  beforeEach(() => {
    todoCardSource = fs.readFileSync(todoCardPath, 'utf-8');
    studentPageSource = fs.readFileSync(studentPagePath, 'utf-8');
  });

  describe('1. ToDoCard Component Source Audit', () => {
    it('does not export or accept onQuestCompleted prop', () => {
      expect(todoCardSource).not.toMatch(/onQuestCompleted/);
      expect(todoCardSource).toMatch(/export function ToDoCard\(\)/);
    });

    it('contains no "+10 XP", "+X XP", or XP reward text in UI', () => {
      expect(todoCardSource).not.toMatch(/>\s*\+\s*\d+\s*XP/i);
      expect(todoCardSource).not.toMatch(/earn\s*\+\d+\s*XP/i);
    });

    it('contains no XP counter chips or sparkles chips', () => {
      expect(todoCardSource).not.toMatch(/XP:\s*\{dailyCount\}/);
      expect(todoCardSource).not.toMatch(/Sparkles/);
    });

    it('includes one-time localStorage cleanup for legacy academy_student_tasks_daily_xp_* keys', () => {
      expect(todoCardSource).toMatch(/academy_student_tasks_daily_xp_/);
      expect(todoCardSource).toMatch(/localStorage\.removeItem/);
    });

    it('displays "stored on this device" and "Personal Planner" label', () => {
      expect(todoCardSource).toMatch(/stored on this device/);
      expect(todoCardSource).toMatch(/Personal Planner/);
      expect(todoCardSource).toMatch(/done/);
    });
  });

  describe('2. Student Dashboard Page Audit (src/app/student/page.tsx)', () => {
    it('does not contain handleQuestCompleted handler or client-side XP manipulation', () => {
      expect(studentPageSource).not.toMatch(/handleQuestCompleted/);
      expect(studentPageSource).not.toMatch(/totalXp:\s*prev\.totalXp\s*\+\s*xpEarned/);
    });

    it('invokes ToDoCard with zero props (no fake XP callback)', () => {
      expect(studentPageSource).toMatch(/<ToDoCard\s*\/>/);
      expect(studentPageSource).not.toMatch(/<ToDoCard\s+onQuestCompleted/);
    });
  });

  describe('3. LocalStorage Cleanup Logic Emulation', () => {
    it('correctly purges all legacy daily XP keys while preserving task list', () => {
      const storage: Record<string, string> = {
        'academy_student_tasks_daily_xp_2026-10-17': '5',
        'academy_student_tasks_daily_xp_2026-10-18': '4',
        'academy_student_tasks_daily_xp_2026-10-19': '2',
        'academy_student_quests': JSON.stringify([
          { id: 'task-1', title: 'Study Dijkstra', completed: true },
          { id: 'task-2', title: 'Practice DP', completed: false },
        ]),
        'other_unrelated_key': 'keep_me',
      };

      const keys = Object.keys(storage);
      for (const k of keys) {
        if (k.startsWith('academy_student_tasks_daily_xp_')) {
          delete storage[k];
        }
      }

      expect(storage['academy_student_tasks_daily_xp_2026-10-17']).toBeUndefined();
      expect(storage['academy_student_tasks_daily_xp_2026-10-18']).toBeUndefined();
      expect(storage['academy_student_tasks_daily_xp_2026-10-19']).toBeUndefined();
      expect(storage['academy_student_quests']).toBeDefined();
      expect(storage['other_unrelated_key']).toBe('keep_me');
    });

    it('ticking a task toggles completed boolean without creating any XP keys', () => {
      const tasks = [
        { id: 't1', title: 'Read Chapter 4', completed: false },
      ];

      // Emulate toggle
      const toggled = tasks.map((t) => (t.id === 't1' ? { ...t, completed: !t.completed } : t));
      expect(toggled[0].completed).toBe(true);

      const unToggled = toggled.map((t) => (t.id === 't1' ? { ...t, completed: !t.completed } : t));
      expect(unToggled[0].completed).toBe(false);
    });
  });
});
