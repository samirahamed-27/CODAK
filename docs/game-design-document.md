# CODAK: Game Design & Economy Manifesto

**Platform**: CODAK (Campus Online Demonstration & Academic Knowledge)  
**Target Institution**: MSOT (Multi-Campus Academic Network)  
**Architecture**: Event-Based Immutable Ledger, Real-time Multiplayer, Zero-Leak Privacy  

---

## 1. Core Principles & Philosophy

CODAK turns everyday academic learning into an intrinsically rewarding progression loop without trivializing academic rigor. The architecture strictly adheres to three non-negotiable principles:

1. **Learning First (No Idle Points)**: Every point in CODAK maps directly to a verified academic accomplishment—completing syllabus micro-challenges, maintaining consecutive-day study streaks, submitting verified algorithmic code, or participating in scheduled section battles. Zero points are awarded for passive clicks, browsing, or cosmetic activity.
2. **Fair & Inclusive Progression**: Standard leaderboards reward only the top 5% of hyper-competitive students. CODAK breaks students into dynamic **20-student weekly cohorts (Bronze, Silver, Gold, Diamond)** based on current tier. A student struggling at the bottom quartile competes only against peers at their current level, with accessible promotion thresholds (top 5 promoted weekly) and milestone badges that reward personal improvement.
3. **Decoupled from Official Grades**: Game points and levels never alter official university marks. While academic milestones (e.g. bi-weekly test performance) feed into the XP engine as achievements, game progression is strictly developmental and motivational.

---

## 2. Points Economy & Anti-Farming Model

### Configurable Economy Parameters
The XP economy is managed dynamically via the PostgreSQL `xp_rules` engine and `/admin/rules` portal, allowing administrators to balance point velocity without code redeployment.

| Action Type | Base XP | Extra / Scaling | Daily Cap | Justification & Anti-Farming Safeguard |
| :--- | :---: | :---: | :---: | :--- |
| **DAILY_QUIZ** | 15 XP | +5 XP / correct | 1 / day | Daily micro-challenge (up to 40 XP). Idempotent session lock prevents re-taking the quiz for duplicate points on the same calendar day. |
| **STREAK_7_BONUS** | 50 XP | 0 | 1 / week | Encourages sustained daily engagement. Protected by monthly freeze days (max 2) in Asia/Kolkata timezone. |
| **PRACTICE_SOLVE** | 10 XP | Difficulty-based | 5 / day | Capped at 50 XP/day. Requires verifiable submission URL (LeetCode, HackerRank, Codeforces, GitHub) to prevent automated clicking. |
| **HACKERRANK_COMPETITION** | 25 XP | 0 | 2 / day | Rewards participating in faculty-hosted coding challenges. Capped at 50 XP/day. |
| **DUEL_PARTICIPATION** | 10 XP | 0 | 5 / day | Capped at 50 XP/day. Anti-collusion algorithm detects reciprocal throwing between identical student pairs. |
| **DUEL_WIN** | 25 XP | 0 | 5 / day | Rewards peer victory on 5 syllabus questions. Tied to 5 daily duel limit. |
| **BATTLE_PARTICIPATION** | 15 XP | 0 | 3 / day | Scheduled section-vs-section or campus-vs-campus events with live synchronous scoreboards. |
| **BATTLE_WIN** | 35 XP | 0 | 3 / day | Rewards team victory in high-stakes campus arena battles. |
| **CONCEPT_MATCH** | 10 XP | 0 | 2 / day | Timed cognitive term-definition matchmaking, protected by HMAC round tokens. |
| **PEER_HELP** | 15 XP | 0 | 3 / day | Faculty or peer-accepted answers on academic problem boards (max 45 XP/day). |
| **ATTENDANCE** | 10 XP | 0 | Official sync | Awarded strictly via faculty verification or SIS integration per lecture. |
| **ASSIGNMENT_ON_TIME** | 20 XP | 0 | Per due date | Verifiable assignment submission prior to midnight deadline. |

### Mathematical Ceiling on Daily XP
- **Average Active Daily Earner**: ~60–80 XP (1 Quiz + 2 Practice Solves + 1 Duel).
- **Hard Daily Ceiling**: ~230 XP across all capped activities.
- **Economic Invariance**: Because all actions are ledgered with a strict daily cap, a malicious bot script running continuously cannot generate more than the mathematical daily ceiling.

---

## 3. Anti-Gaming, Fraud Prevention & Auditability

CODAK treats academic integrity with the same engineering rigor as financial ledgers:

1. **Option Permutation Defense (Peeking Protection)**:
   - In daily quizzes, the server generates a randomized permutation of options (`options_order: ['C', 'A', 'D', 'B']`) stored only in the session attempt.
   - Two students taking the quiz side-by-side in a campus lab have completely different positional choices for Option A, B, C, and D, eliminating screen peeking.
2. **Anti-Collusion Dueling Ring Detection**:
   - Automated cron service (`/api/cron/detect-collusion`) executes continuous graph analysis on duel matchups.
   - Pairs of students who duel each other more than 3 times in a rolling 24-hour window with alternating win/loss patterns are flagged for faculty review.
3. **Anomalous Spike Detection**:
   - Background cron (`/api/cron/detect-spikes`) audits the immutable ledger for sudden bursts of XP (>150 XP earned within 10 minutes).
   - Flagged incidents populate the Faculty `/faculty/flags` queue and Admin `/admin/audit` panel.
4. **PostgreSQL Immutability Trigger**:
   - Trigger `prevent_xp_events_tamper` immediately raises an exception on any SQL `UPDATE` or `DELETE` against `public.xp_events`.
   - Once awarded, an XP event cannot be altered—suspicious events can only be cancelled by an authorized faculty or admin writing a counter-transaction (`status = 'voided'` with a logged rationale).
5. **Zero-Leak Anonymous Mode**:
   - Students can toggle `is_anonymous: true` in their profile.
   - The query layer (`src/lib/leaderboards.ts`) scrubs real name, roll number, and campus from all peer API responses, replacing identity with "Anonymous Student" while preserving cohort standings.

---

## 4. League Tiering & Dynamic Promotion/Relegation

To sustain momentum across a 15-week semester, CODAK runs weekly league cycles:

```
[ Bronze League ]  <--->  [ Silver League ]  <--->  [ Gold League ]  <--->  [ Diamond League ]
 (Starting Tier)           (Intermediate)             (Advanced)             (Elite Mastery)
```

### Cohort Algorithm & Fairness Edge Cases
- **Cohort Size**: ~20 students per group at similar XP levels.
- **Promotion Zone**: Top 5 students in each cohort advance to the next tier on Monday at 00:00 IST.
  - *Edge Case 1*: Students with 0 weekly XP are **never promoted**, even if ranked in top 5 of a dormant cohort.
  - *Edge Case 2*: Diamond League students retain their tier upon placing top 5 (cannot promote beyond Diamond).
- **Relegation Zone**: Bottom 5 students drop one tier.
  - *Edge Case 3*: Cohorts with fewer than 10 active students have **zero relegation** to avoid penalizing sparse groups.
  - *Edge Case 4*: Bronze League students retain Bronze upon placing in bottom 5 (cannot relegate below Bronze).
- **Streak Freeze Days**: Each student receives 2 freeze days per month in Asia/Kolkata calendar time. If an illness or emergency occurs, the streak counter is preserved automatically without penalizing the student.

---

## 5. Multi-Campus Architecture & Scalability

CODAK is architectured for multi-campus deployments (Delhi, Jaipur, Bengaluru, and affiliated campuses):

- **Campus Standings**: Campuses compete on **Average Weekly XP per Active Student** (`totalWeeklyXp / activeStudentCount`), preventing large campuses from dominating simply due to student headcount. A minimum quorum of 5 active students is required for official ranking.
- **Inter-Campus Battles**: Synchronous multiplayer battles leverage real-time Supabase channels and optimistic UI updates, ensuring sub-2-second scoreboard sync under high concurrency.
- **Database Indexing**: Compound indexes on `(student_id, status)`, `(created_at, status)`, and `(campus_id, is_active)` guarantee sub-50ms query latency across 1,000+ active students.

---
*CODAK Engineering Team • MSOT Gamified Learning Challenge 2026*
