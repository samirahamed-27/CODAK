export type CampusId = 'HI-Tech' | 'Ratnam' | 'RGIB' | 'JUJ';
export type TrackId = 'mirai' | 'university';
export type CourseStatus = 'ON TRACK' | 'TIGHT' | 'DANGER' | 'COMPLETE';
export type SessionStatus = 'Completed' | 'In Progress' | 'Skipped' | 'Merged' | 'Cancelled';
export type WorkingSaturdayRule = 'all' | 'none' | '2nd_and_4th';

export interface SubjectProgress {
  id: string;
  name: string;
  code: string;
  campus: CampusId;
  track: TrackId;
  facultyName: string;
  facultyEmail: string;
  batch: string;
  plannedHours: number;
  coveredHours: number;
  remainingHours: number;
  availableHours: number;
  bufferRatio: number; // (availableHours - remainingHours) / remainingHours or buffer percentage
  status: CourseStatus;
  paceDeltaHours: number; // +3h ahead or -4h behind
  lastLoggedAt: string;
  nextScheduledSession: string;
  unitsTotal: number;
  unitsCompleted: number;
  topicsTotal: number;
  topicsCovered: number;
  nextTopic: string;
  nextExamName: string;
  nextExamDaysLeft: number;
  examInScopeHours: number;
  examCoveredHours: number;
}

export interface TimetableSession {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  campus: CampusId;
  track: TrackId;
  batch: string;
  facultyName: string;
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  startTime: string;
  endTime: string;
  durationHours: number;
  room: string;
  plannedUnit: string;
  plannedTopic: string;
  topicPlannedHours: number;
  examScope: ('Sessionals' | 'Mid-Term' | 'PUT' | 'End-Term')[];
  isLogged: boolean;
  loggedStatus?: SessionStatus;
  loggedPercent?: number;
  coveredSummary?: string;
  leftoverTopic?: string;
  notes?: string;
}

export interface ExamWindow {
  id: string;
  name: string;
  type: 'Sessionals' | 'Mid-Term' | 'PUT' | 'End-Term';
  campus: CampusId;
  startDate: string;
  endDate: string;
  daysRemaining: number;
  totalInScopeHours: number;
  coveredHours: number;
  status: CourseStatus;
}

export interface MissedLogAlert {
  id: string;
  facultyName: string;
  campus: CampusId;
  subjectName: string;
  sessionDate: string;
  timeSlot: string;
  batch: string;
  hoursElapsed: number;
  escalatedToCampusManager: boolean;
}

export const CAMPUSES: { id: CampusId; name: string; location: string }[] = [
  { id: 'HI-Tech', name: 'HI-Tech Campus', location: 'Hyderabad' },
  { id: 'Ratnam', name: 'Ratnam Campus', location: 'Nellore' },
  { id: 'RGIB', name: 'RGIB Campus', location: 'Bangalore' },
  { id: 'JUJ', name: 'JUJ Campus', location: 'Jaipur' },
];

export const TRACKS: { id: TrackId; name: string; description: string }[] = [
  { id: 'mirai', name: 'Mirai Track', description: 'Industry Systems, Cloud, AI & Engineering' },
  { id: 'university', name: 'University Track', description: 'Core CS Foundations, OS, Networks & Math' },
];

export const INITIAL_SUBJECTS: SubjectProgress[] = [
  // HI-Tech Mirai Track
  {
    id: 'sub-ht-m-1',
    name: 'Distributed Systems & Cloud Architecture',
    code: 'CS-M401',
    campus: 'HI-Tech',
    track: 'mirai',
    facultyName: 'Dr. Vikram Rao',
    facultyEmail: 'v.rao@msot.edu',
    batch: '2026-Batch-A',
    plannedHours: 48,
    coveredHours: 36,
    remainingHours: 12,
    availableHours: 18,
    bufferRatio: 0.5, // 50% buffer
    status: 'ON TRACK',
    paceDeltaHours: 4,
    lastLoggedAt: 'Today, 11:30 AM',
    nextScheduledSession: 'Tomorrow, 09:30 AM',
    unitsTotal: 5,
    unitsCompleted: 3,
    topicsTotal: 24,
    topicsCovered: 18,
    nextTopic: 'Raft Consensus Protocol & Leader Election',
    nextExamName: 'Mid-Term Exam',
    nextExamDaysLeft: 14,
    examInScopeHours: 32,
    examCoveredHours: 32,
  },
  {
    id: 'sub-ht-m-2',
    name: 'Deep Learning & Neural Implementations',
    code: 'AI-M302',
    campus: 'HI-Tech',
    track: 'mirai',
    facultyName: 'Prof. Ananya Sen',
    facultyEmail: 'a.sen@msot.edu',
    batch: '2026-Batch-A',
    plannedHours: 52,
    coveredHours: 24,
    remainingHours: 28,
    availableHours: 24,
    bufferRatio: -0.14, // Negative buffer = DANGER
    status: 'DANGER',
    paceDeltaHours: -6,
    lastLoggedAt: 'Yesterday, 03:00 PM',
    nextScheduledSession: 'Today, 02:00 PM',
    unitsTotal: 6,
    unitsCompleted: 2,
    topicsTotal: 26,
    topicsCovered: 11,
    nextTopic: 'Backpropagation Through Time & Transformer Attention',
    nextExamName: 'Mid-Term Exam',
    nextExamDaysLeft: 14,
    examInScopeHours: 30,
    examCoveredHours: 22,
  },
  {
    id: 'sub-ht-m-3',
    name: 'Production Full-Stack & Microservices',
    code: 'FS-M204',
    campus: 'HI-Tech',
    track: 'mirai',
    facultyName: 'Er. Rajesh Kothari',
    facultyEmail: 'r.kothari@msot.edu',
    batch: '2026-Batch-B',
    plannedHours: 45,
    coveredHours: 30,
    remainingHours: 15,
    availableHours: 16,
    bufferRatio: 0.07, // Tight buffer
    status: 'TIGHT',
    paceDeltaHours: -1,
    lastLoggedAt: 'Today, 01:15 PM',
    nextScheduledSession: 'Thursday, 11:00 AM',
    unitsTotal: 5,
    unitsCompleted: 3,
    topicsTotal: 22,
    topicsCovered: 15,
    nextTopic: 'Event-Driven Architectures with Kafka',
    nextExamName: 'Mid-Term Exam',
    nextExamDaysLeft: 14,
    examInScopeHours: 28,
    examCoveredHours: 26,
  },

  // HI-Tech University Track
  {
    id: 'sub-ht-u-1',
    name: 'Operating Systems & Concurrency',
    code: 'CS-U301',
    campus: 'HI-Tech',
    track: 'university',
    facultyName: 'Dr. Suresh Nair',
    facultyEmail: 's.nair@msot.edu',
    batch: '2026-Batch-A',
    plannedHours: 54,
    coveredHours: 42,
    remainingHours: 12,
    availableHours: 20,
    bufferRatio: 0.67,
    status: 'ON TRACK',
    paceDeltaHours: 3,
    lastLoggedAt: 'Today, 10:15 AM',
    nextScheduledSession: 'Wednesday, 09:30 AM',
    unitsTotal: 5,
    unitsCompleted: 4,
    topicsTotal: 28,
    topicsCovered: 22,
    nextTopic: 'Virtual Memory & Page Replacement Algorithms',
    nextExamName: 'Mid-Term Exam',
    nextExamDaysLeft: 14,
    examInScopeHours: 36,
    examCoveredHours: 36,
  },
  {
    id: 'sub-ht-u-2',
    name: 'Database Management Systems',
    code: 'CS-U302',
    campus: 'HI-Tech',
    track: 'university',
    facultyName: 'Prof. Meera Joshi',
    facultyEmail: 'm.joshi@msot.edu',
    batch: '2026-Batch-B',
    plannedHours: 48,
    coveredHours: 38,
    remainingHours: 10,
    availableHours: 18,
    bufferRatio: 0.8,
    status: 'ON TRACK',
    paceDeltaHours: 2,
    lastLoggedAt: 'Yesterday, 04:30 PM',
    nextScheduledSession: 'Today, 03:30 PM',
    unitsTotal: 5,
    unitsCompleted: 4,
    topicsTotal: 25,
    topicsCovered: 20,
    nextTopic: 'B+ Tree Indexing and Concurrency Control Isolation',
    nextExamName: 'Mid-Term Exam',
    nextExamDaysLeft: 14,
    examInScopeHours: 34,
    examCoveredHours: 34,
  },

  // Ratnam Campus
  {
    id: 'sub-rt-m-1',
    name: 'Distributed Systems & Cloud Architecture',
    code: 'CS-M401',
    campus: 'Ratnam',
    track: 'mirai',
    facultyName: 'Dr. C. P. Reddy',
    facultyEmail: 'cp.reddy@msot.edu',
    batch: '2026-Ratnam-1',
    plannedHours: 48,
    coveredHours: 32,
    remainingHours: 16,
    availableHours: 18,
    bufferRatio: 0.12,
    status: 'TIGHT',
    paceDeltaHours: -2,
    lastLoggedAt: 'Yesterday, 12:00 PM',
    nextScheduledSession: 'Tomorrow, 10:00 AM',
    unitsTotal: 5,
    unitsCompleted: 3,
    topicsTotal: 24,
    topicsCovered: 16,
    nextTopic: 'Consistent Hashing and Distributed Cache Design',
    nextExamName: 'Mid-Term Exam',
    nextExamDaysLeft: 16,
    examInScopeHours: 30,
    examCoveredHours: 28,
  },
  {
    id: 'sub-rt-u-1',
    name: 'Computer Networks & Protocols',
    code: 'CS-U303',
    campus: 'Ratnam',
    track: 'university',
    facultyName: 'Prof. D. Venkat',
    facultyEmail: 'd.venkat@msot.edu',
    batch: '2026-Ratnam-1',
    plannedHours: 50,
    coveredHours: 25,
    remainingHours: 25,
    availableHours: 20,
    bufferRatio: -0.2, // DANGER
    status: 'DANGER',
    paceDeltaHours: -5,
    lastLoggedAt: '3 days ago',
    nextScheduledSession: 'Today, 11:30 AM',
    unitsTotal: 5,
    unitsCompleted: 2,
    topicsTotal: 25,
    topicsCovered: 12,
    nextTopic: 'TCP Congestion Control (Reno, Cubic, BBR)',
    nextExamName: 'Mid-Term Exam',
    nextExamDaysLeft: 16,
    examInScopeHours: 32,
    examCoveredHours: 22,
  },

  // RGIB Campus
  {
    id: 'sub-rg-m-1',
    name: 'High-Performance Systems in Rust',
    code: 'SYS-M405',
    campus: 'RGIB',
    track: 'mirai',
    facultyName: 'Er. Sandeep Menon',
    facultyEmail: 's.menon@msot.edu',
    batch: '2026-RGIB-Main',
    plannedHours: 45,
    coveredHours: 35,
    remainingHours: 10,
    availableHours: 18,
    bufferRatio: 0.8,
    status: 'ON TRACK',
    paceDeltaHours: 3,
    lastLoggedAt: 'Today, 02:00 PM',
    nextScheduledSession: 'Tomorrow, 11:30 AM',
    unitsTotal: 4,
    unitsCompleted: 3,
    topicsTotal: 20,
    topicsCovered: 16,
    nextTopic: 'Zero-Cost Async Runtime & Memory Pinning',
    nextExamName: 'Mid-Term Exam',
    nextExamDaysLeft: 18,
    examInScopeHours: 28,
    examCoveredHours: 28,
  },
  {
    id: 'sub-rg-u-1',
    name: 'Discrete Mathematics & Automata',
    code: 'MA-U201',
    campus: 'RGIB',
    track: 'university',
    facultyName: 'Dr. Geeta Sharma',
    facultyEmail: 'g.sharma@msot.edu',
    batch: '2026-RGIB-Main',
    plannedHours: 52,
    coveredHours: 40,
    remainingHours: 12,
    availableHours: 22,
    bufferRatio: 0.83,
    status: 'ON TRACK',
    paceDeltaHours: 2,
    lastLoggedAt: 'Today, 09:45 AM',
    nextScheduledSession: 'Thursday, 09:00 AM',
    unitsTotal: 5,
    unitsCompleted: 4,
    topicsTotal: 26,
    topicsCovered: 21,
    nextTopic: 'Turing Machines and Decidability Reductions',
    nextExamName: 'Mid-Term Exam',
    nextExamDaysLeft: 18,
    examInScopeHours: 34,
    examCoveredHours: 34,
  },

  // JUJ Campus
  {
    id: 'sub-juj-m-1',
    name: 'Production Full-Stack & Microservices',
    code: 'FS-M204',
    campus: 'JUJ',
    track: 'mirai',
    facultyName: 'Prof. Alok Bansal',
    facultyEmail: 'a.bansal@msot.edu',
    batch: '2026-JUJ-Alpha',
    plannedHours: 46,
    coveredHours: 28,
    remainingHours: 18,
    availableHours: 16,
    bufferRatio: -0.11, // DANGER
    status: 'DANGER',
    paceDeltaHours: -4,
    lastLoggedAt: '2 days ago',
    nextScheduledSession: 'Today, 01:30 PM',
    unitsTotal: 5,
    unitsCompleted: 2,
    topicsTotal: 22,
    topicsCovered: 13,
    nextTopic: 'Database Sharding and Connection Pooling',
    nextExamName: 'Mid-Term Exam',
    nextExamDaysLeft: 12,
    examInScopeHours: 28,
    examCoveredHours: 20,
  },
  {
    id: 'sub-juj-u-1',
    name: 'Operating Systems & Concurrency',
    code: 'CS-U301',
    campus: 'JUJ',
    track: 'university',
    facultyName: 'Dr. R. K. Singhania',
    facultyEmail: 'rk.singhania@msot.edu',
    batch: '2026-JUJ-Alpha',
    plannedHours: 54,
    coveredHours: 39,
    remainingHours: 15,
    availableHours: 16,
    bufferRatio: 0.06, // TIGHT
    status: 'TIGHT',
    paceDeltaHours: -1,
    lastLoggedAt: 'Today, 11:00 AM',
    nextScheduledSession: 'Tomorrow, 02:00 PM',
    unitsTotal: 5,
    unitsCompleted: 3,
    topicsTotal: 28,
    topicsCovered: 20,
    nextTopic: 'File System Inodes and Journaling Crash Consistency',
    nextExamName: 'Mid-Term Exam',
    nextExamDaysLeft: 12,
    examInScopeHours: 35,
    examCoveredHours: 32,
  },
];

export const INITIAL_TIMETABLE_TODAY: TimetableSession[] = [
  {
    id: 'sess-today-1',
    subjectId: 'sub-ht-m-2',
    subjectName: 'Deep Learning & Neural Implementations',
    subjectCode: 'AI-M302',
    campus: 'HI-Tech',
    track: 'mirai',
    batch: '2026-Batch-A',
    facultyName: 'Prof. Ananya Sen',
    dayOfWeek: 'Monday',
    startTime: '14:00',
    endTime: '15:30',
    durationHours: 1.5,
    room: 'Lab 4B (GPU Cluster)',
    plannedUnit: 'Unit 3: Sequence Modeling',
    plannedTopic: 'Transformer Multi-Head Self-Attention Implementation',
    topicPlannedHours: 1.5,
    examScope: ['Mid-Term', 'PUT', 'End-Term'],
    isLogged: false,
  },
  {
    id: 'sess-today-2',
    subjectId: 'sub-ht-u-2',
    subjectName: 'Database Management Systems',
    subjectCode: 'CS-U302',
    campus: 'HI-Tech',
    track: 'university',
    batch: '2026-Batch-B',
    facultyName: 'Prof. Meera Joshi',
    dayOfWeek: 'Monday',
    startTime: '15:30',
    endTime: '17:00',
    durationHours: 1.5,
    room: 'Hall 201',
    plannedUnit: 'Unit 4: Transaction & Concurrency',
    plannedTopic: 'Two-Phase Locking (2PL) and Deadlock Prevention Protocols',
    topicPlannedHours: 1.5,
    examScope: ['Mid-Term', 'PUT', 'End-Term'],
    isLogged: false,
  },
  {
    id: 'sess-today-3',
    subjectId: 'sub-rt-u-1',
    subjectName: 'Computer Networks & Protocols',
    subjectCode: 'CS-U303',
    campus: 'Ratnam',
    track: 'university',
    batch: '2026-Ratnam-1',
    facultyName: 'Prof. D. Venkat',
    dayOfWeek: 'Monday',
    startTime: '11:30',
    endTime: '13:00',
    durationHours: 1.5,
    room: 'Seminar Room 3',
    plannedUnit: 'Unit 3: Transport Layer',
    plannedTopic: 'TCP Congestion Control (Reno, Cubic, BBR)',
    topicPlannedHours: 1.5,
    examScope: ['Mid-Term', 'End-Term'],
    isLogged: false,
  },
  {
    id: 'sess-today-4',
    subjectId: 'sub-juj-m-1',
    subjectName: 'Production Full-Stack & Microservices',
    subjectCode: 'FS-M204',
    campus: 'JUJ',
    track: 'mirai',
    batch: '2026-JUJ-Alpha',
    facultyName: 'Prof. Alok Bansal',
    dayOfWeek: 'Monday',
    startTime: '13:30',
    endTime: '15:00',
    durationHours: 1.5,
    room: 'Tech Hub B',
    plannedUnit: 'Unit 3: Scalable Data Pipelines',
    plannedTopic: 'Database Sharding and Connection Pooling',
    topicPlannedHours: 1.5,
    examScope: ['Mid-Term', 'PUT', 'End-Term'],
    isLogged: false,
  },
];

export const INITIAL_EXAMS: ExamWindow[] = [
  {
    id: 'exam-1',
    name: 'Mid-Term Examinations',
    type: 'Mid-Term',
    campus: 'HI-Tech',
    startDate: '2026-11-02',
    endDate: '2026-11-09',
    daysRemaining: 16,
    totalInScopeHours: 160,
    coveredHours: 148,
    status: 'TIGHT',
  },
  {
    id: 'exam-2',
    name: 'Pre-University Test (PUT)',
    type: 'PUT',
    campus: 'HI-Tech',
    startDate: '2026-11-28',
    endDate: '2026-12-05',
    daysRemaining: 42,
    totalInScopeHours: 210,
    coveredHours: 162,
    status: 'ON TRACK',
  },
  {
    id: 'exam-3',
    name: 'University End-Term Finals',
    type: 'End-Term',
    campus: 'HI-Tech',
    startDate: '2026-12-18',
    endDate: '2026-12-30',
    daysRemaining: 62,
    totalInScopeHours: 247,
    coveredHours: 170,
    status: 'ON TRACK',
  },
];

export const INITIAL_MISSED_LOG_ALERTS: MissedLogAlert[] = [
  {
    id: 'alert-1',
    facultyName: 'Prof. D. Venkat',
    campus: 'Ratnam',
    subjectName: 'Computer Networks & Protocols',
    sessionDate: 'Oct 14, 2026',
    timeSlot: '11:30 - 13:00',
    batch: '2026-Ratnam-1',
    hoursElapsed: 72,
    escalatedToCampusManager: true,
  },
  {
    id: 'alert-2',
    facultyName: 'Prof. Alok Bansal',
    campus: 'JUJ',
    subjectName: 'Production Full-Stack & Microservices',
    sessionDate: 'Oct 15, 2026',
    timeSlot: '13:30 - 15:00',
    batch: '2026-JUJ-Alpha',
    hoursElapsed: 48,
    escalatedToCampusManager: true,
  },
  {
    id: 'alert-3',
    facultyName: 'Prof. Ananya Sen',
    campus: 'HI-Tech',
    subjectName: 'Deep Learning & Neural Implementations',
    sessionDate: 'Oct 16, 2026',
    timeSlot: '14:00 - 15:30',
    batch: '2026-Batch-A',
    hoursElapsed: 26,
    escalatedToCampusManager: false,
  },
];

export const AI_CAMPUS_RECOVERY_INSIGHTS = [
  {
    campus: 'HI-Tech',
    subject: 'AI-M302 (Deep Learning)',
    faculty: 'Prof. Ananya Sen',
    deficitHours: 6,
    rootCause: 'Transformer Attention math derivations required an unexpected remedial lecture on linear projections.',
    recommendation: 'Schedule a 90-min Saturday lab block on Oct 24 and merge topics 3.4 (Decoder Masking) & 3.5 (Cross-Attention) into one session.',
    impact: 'Restores buffer ratio from -14% to +18% before Mid-Term Exam (Nov 2).',
  },
  {
    campus: 'Ratnam',
    subject: 'CS-U303 (Computer Networks)',
    faculty: 'Prof. D. Venkat',
    deficitHours: 5,
    rootCause: 'Consecutive public holidays on Mondays caused 2 class cancellations with no makeup hours booked.',
    recommendation: 'Utilize 2nd & 4th Saturday window for two 2-hour bridge sessions on socket programming & TCP.',
    impact: 'Recovers 4 hours, bringing pacing into TIGHT (+8%) status.',
  },
  {
    campus: 'JUJ',
    subject: 'FS-M204 (Full-Stack Microservices)',
    faculty: 'Prof. Alok Bansal',
    deficitHours: 4,
    rootCause: 'Docker containerization debugging took double the allocated session time during Week 5.',
    recommendation: 'Provide pre-baked Docker DevContainers as asynchronous self-study homework to skip manual setup.',
    impact: 'Saves 3.5 class hours, recovering exam syllabus deadline.',
  },
];

/**
 * Rolled-up track status rule:
 * Per specification: "Rolled-up track status shows the worst subject, not an average."
 */
export function calculateTrackWorstStatus(subjects: SubjectProgress[]): CourseStatus {
  if (subjects.length === 0) return 'COMPLETE';
  if (subjects.some((s) => s.status === 'DANGER')) return 'DANGER';
  if (subjects.some((s) => s.status === 'TIGHT')) return 'TIGHT';
  if (subjects.some((s) => s.status === 'ON TRACK')) return 'ON TRACK';
  return 'COMPLETE';
}

/**
 * Calculates buffer ratio and status for any subject:
 * bufferRatio = (availableHours - remainingHours) / remainingHours
 */
export function evaluateCourseStatus(
  availableHours: number,
  remainingHours: number,
  coveredHours: number,
  plannedHours: number
): { bufferRatio: number; status: CourseStatus } {
  if (coveredHours >= plannedHours || remainingHours <= 0) {
    return { bufferRatio: 1, status: 'COMPLETE' };
  }
  const buffer = (availableHours - remainingHours) / remainingHours;
  if (buffer < 0) {
    return { bufferRatio: buffer, status: 'DANGER' };
  } else if (buffer < 0.15) {
    return { bufferRatio: buffer, status: 'TIGHT' };
  } else {
    return { bufferRatio: buffer, status: 'ON TRACK' };
  }
}
