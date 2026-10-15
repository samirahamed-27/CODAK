/**
 * ==============================================================================
 * ACADEMY STUDENT DASHBOARD - MOCK DATA & CONFIGURATION
 * ==============================================================================
 * This file serves as the centralized source of truth for the student dashboard.
 * When integrating with a real backend (Supabase, PostgreSQL, or REST API):
 * 1. Replace `studentProfileData` with a query to the `profiles` & `xp_ledger` tables.
 * 2. Replace `monthlyHeatmapData` with an RPC aggregating daily XP for the selected month.
 * 3. Replace `studentQuests` with CRUD operations on a `student_tasks` or `quests` table.
 * 4. Replace `subjectScores` with classroom gradebook or test assessment tables.
 * 5. Replace `deadlinesData` with classroom assignments / homework tables.
 * ==============================================================================
 */

export interface StudentProfile {
  id: string;
  name: string;
  titleTag: string; // e.g. "Code Apprentice", "Algorithm Knight"
  avatarUrl: string | null;
  rank: string; // e.g. "#3 in Computer Science"
  level: number;
  totalXp: number;
  currentStreak: number;
  unreadNotifications: number;
  notifications: Array<{
    id: string;
    sender: string;
    message: string;
    timestamp: string;
    unread: boolean;
  }>;
}

export interface DayActivity {
  date: string; // YYYY-MM-DD
  xp: number;
  questsCompleted: number;
}

export interface QuestItem {
  id: string;
  title: string;
  completed: boolean;
  xpReward: number;
  createdAt: string;
}

export interface SubjectScore {
  id: string;
  subject: string;
  shortCode: string;
  classAverage: number; // 0 - 100
  studentScore: number; // 0 - 100
}

export interface DeadlineItem {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'late';
  points: number;
}

/**
 * Work Report Heatmap Color Thresholds (5 Levels - New Palette)
 * Level 0: 0 XP (empty slot) -> #14214A
 * Level 1: 1 - 40 XP -> #1F4E8C
 * Level 2: 41 - 80 XP -> #4A97D6
 * Level 3: 81 - 120 XP -> #8FD0FF
 * Level 4: 121+ XP -> #FFB27A (with soft glow)
 */
export const HEATMAP_THRESHOLDS = {
  level0: { max: 0, color: '#14214A', label: '0 XP' },
  level1: { min: 1, max: 40, color: '#1F4E8C', label: '1 - 40 XP' },
  level2: { min: 41, max: 80, color: '#4A97D6', label: '41 - 80 XP' },
  level3: { min: 81, max: 120, color: '#8FD0FF', label: '81 - 120 XP' },
  level4: { min: 121, color: '#FFB27A', label: '121+ XP' },
} as const;

export function getHeatmapColorLevel(xp: number): {
  level: number;
  color: string;
  hasGlow: boolean;
} {
  if (xp <= 0) return { level: 0, color: '#14214A', hasGlow: false };
  if (xp <= 40) return { level: 1, color: '#1F4E8C', hasGlow: false };
  if (xp <= 80) return { level: 2, color: '#4A97D6', hasGlow: false };
  if (xp <= 120) return { level: 3, color: '#8FD0FF', hasGlow: false };
  return { level: 4, color: '#FFB27A', hasGlow: true };
}

/**
 * Mock Student Profile Data
 */
export const initialStudentProfile: StudentProfile = {
  id: 'usr_student_042',
  name: 'Aarav Sharma',
  titleTag: 'Code Apprentice',
  avatarUrl: null, // Default avatar will be rendered if null
  rank: '#3 in Computer Science',
  level: 7,
  totalXp: 1420,
  currentStreak: 12,
  unreadNotifications: 2,
  notifications: [
    {
      id: 'notif_1',
      sender: 'Prof. Ananya Sen',
      message: 'Great work on the Binary Search Tree duel quest! +30 XP awarded.',
      timestamp: '2 hours ago',
      unread: true,
    },
    {
      id: 'notif_2',
      sender: 'Campus Arena',
      message: 'Weekly League Reset in 3 days. You are currently in Gold Tier!',
      timestamp: 'Yesterday',
      unread: true,
    },
    {
      id: 'notif_3',
      sender: 'Peer Hub',
      message: 'Rohan Mehta requested peer assistance for Dynamic Programming.',
      timestamp: '2 days ago',
      unread: false,
    },
  ],
};

/**
 * Pre-populated activity data for October 2026.
 * (Dynamic days can be fetched or modified for prev/next months)
 */
export const mockActivityCalendar: Record<string, number> = {
  '2026-10-01': 25,
  '2026-10-02': 45,
  '2026-10-03': 15,
  '2026-10-04': 0,
  '2026-10-05': 85,
  '2026-10-06': 110,
  '2026-10-07': 40,
  '2026-10-08': 95,
  '2026-10-09': 140, // Level 4
  '2026-10-10': 35,
  '2026-10-11': 0,
  '2026-10-12': 120,
  '2026-10-13': 160, // Level 4
  '2026-10-14': 75,
  '2026-10-15': 50, // Today
  '2026-10-16': 0,
  '2026-10-17': 0,
  '2026-10-18': 0,
  '2026-10-19': 0,
  '2026-10-20': 0,
  '2026-10-21': 0,
  '2026-10-22': 0,
  '2026-10-23': 0,
  '2026-10-24': 0,
  '2026-10-25': 0,
  '2026-10-26': 0,
  '2026-10-27': 0,
  '2026-10-28': 0,
  '2026-10-29': 0,
  '2026-10-30': 0,
  '2026-10-31': 0,
};

/**
 * Initial Quests for the To-Do Card
 */
export const initialQuests: QuestItem[] = [
  {
    id: 'quest_1',
    title: 'Solve 3 Graph DFS Practice Problems',
    completed: false,
    xpReward: 10,
    createdAt: '2026-10-15T08:00:00Z',
  },
  {
    id: 'quest_2',
    title: 'Complete Daily Concept Quiz: Hash Maps',
    completed: true,
    xpReward: 10,
    createdAt: '2026-10-15T09:30:00Z',
  },
  {
    id: 'quest_3',
    title: 'Review React 19 Compiler Architecture Slides',
    completed: false,
    xpReward: 10,
    createdAt: '2026-10-15T11:00:00Z',
  },
  {
    id: 'quest_4',
    title: 'Challenge Priya to an Async Quiz Duel',
    completed: false,
    xpReward: 10,
    createdAt: '2026-10-15T13:15:00Z',
  },
];

/**
 * Real College Subject Performance (Grouped Bar Chart)
 * Compares "Class average" vs "Yours".
 */
export const initialSubjectScores: SubjectScore[] = [
  {
    id: 'sub_1',
    subject: 'Data Structures',
    shortCode: 'DSA',
    classAverage: 72,
    studentScore: 89, // Beats average -> ⭐
  },
  {
    id: 'sub_2',
    subject: 'Web Technologies',
    shortCode: 'WEB',
    classAverage: 65,
    studentScore: 94, // Beats average -> ⭐
  },
  {
    id: 'sub_3',
    subject: 'Algorithms',
    shortCode: 'ALGO',
    classAverage: 78,
    studentScore: 84, // Beats average -> ⭐
  },
  {
    id: 'sub_4',
    subject: 'Database Systems',
    shortCode: 'DBMS',
    classAverage: 81,
    studentScore: 74,
  },
  {
    id: 'sub_5',
    subject: 'Computer Networks',
    shortCode: 'CNET',
    classAverage: 68,
    studentScore: 88, // Beats average -> ⭐
  },
];

/**
 * Deadlines Placeholder Data Structure
 * Currently empty per prompt requirements ("Summary/deadlines: placeholder only for now").
 * The schema is ready for teachers/faculty to inject items later.
 */
export const initialDeadlines: DeadlineItem[] = [];
