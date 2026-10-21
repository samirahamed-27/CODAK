# CODAK Architectural & Operational Ground Truth

> **Audit Date**: 2026-10-20  
> **Repository**: `sidd-289/CODAK` (`codak`)  
> **Investigation Mode**: Strictly Read-Only (Static Analysis & Live PostgreSQL SELECT Queries)  
> **Database Host**: Supabase PostgreSQL (Remote)  
> **Framework**: Next.js 16.4.0 (React 19.3.0, Turbopack)  

---

## Question 1: Product Identity, Framework & Full Route List

### 1.1 Product Name Sources
- **`package.json`**: `"name": "codak"` (`package.json:2`)
- **`README.md`**: `# 🎮 CODAK // CODEMONS` (`README.md:1`)
- **UI Metadata (`layout.tsx`)**: `title: 'CODAK - Gamified Learning Platform'` (`src/app/layout.tsx:16-17`)
- **Web App Manifest (`manifest.ts`)**: `name: 'CODAK - Gamified Academic Progression Platform'`, `short_name: 'CODAK'` (`src/app/manifest.ts:5-6`)

### 1.2 Next.js Version
- **`package.json:27`**: `"next": "16.4.0"`
- **Build Output**: `▲ Next.js 16.4.0 (Turbopack)`

### 1.3 Full Route List from Production Build with Allowed Roles
Compiled via `next build` (39 routes generated). Access control is enforced by `src/middleware.ts` and `src/lib/auth/role-redirect.ts`:

```
┌ Route (app)                                 │ Type      │ Allowed Roles / Gating
├─────────────────────────────────────────────┼───────────┼──────────────────────────────────────────
├ /                                           │ Static    │ Public (Landing & entry point)
├ /_not-found                                 │ Static    │ Public (404 Error handler)
├ /login                                      │ Static    │ Public (Unauthenticated only; auth redirects)
├ /auth/callback                              │ Dynamic   │ Public (OAuth redirect handler)
├ /redeem-invite                              │ Static    │ Public (Staff invite redemption)
├ /judge                                      │ Static    │ Public (Evaluator access with access code)
├ /select-campus                              │ Static    │ student only (First-time campus onboarding)
├ /student                                    │ Static    │ student only
├ /student/compete                            │ Static    │ student only
├ /student/compete/battles/[id]               │ Partial   │ student only (Battle participant / live viewer)
├ /student/learn                              │ Static    │ student only
├ /student/play                               │ Static    │ student only
├ /student/play/syntax-samurai                │ Static    │ student only
├ /student/practice                           │ Static    │ student only
├ /student/profile                            │ Static    │ student only
├ /student/quests                             │ Static    │ student only
├ /faculty                                    │ Static    │ faculty, admin
├ /faculty/award-xp                           │ Static    │ faculty, admin
├ /faculty/competitions                       │ Static    │ faculty, admin
├ /faculty/flags                              │ Static    │ faculty, admin
├ /faculty/leaderboard                        │ Static    │ faculty, admin
├ /faculty/questions                          │ Static    │ faculty, admin
├ /faculty/questions/review                   │ Static    │ faculty, admin
├ /admin                                      │ Static    │ admin only
├ /admin/audit                                │ Static    │ admin only
├ /admin/flags                                │ Static    │ admin only
├ /admin/invites                              │ Static    │ admin only
├ /admin/leaderboard                          │ Static    │ admin only
├ /admin/rules                                │ Static    │ admin only
├ /api/auth/signout                           │ Dynamic   │ Authenticated users
├ /api/leaderboard                            │ Dynamic   │ Public / Authenticated (peer-anonymized)
├ /api/cron/detect-spikes                     │ Dynamic   │ Service Cron (Vercel Cron / CRON_SECRET)
├ /api/cron/detect-collusion                  │ Dynamic   │ Service Cron (Vercel Cron / CRON_SECRET)
├ /api/cron/weekly-leagues                    │ Dynamic   │ Service Cron (Vercel Cron / CRON_SECRET)
├ /manifest.webmanifest                       │ Static    │ Public (PWA Manifest)
├ /icon.png                                   │ Static    │ Public
├ /apple-icon.png                             │ Static    │ Public
└─────────────────────────────────────────────┴───────────┴──────────────────────────────────────────
```

#### Raw Evidence: Role Redirection Middleware
```typescript
// src/lib/auth/role-redirect.ts:31-64
export function getRoleRedirectUrl(role: UserRole, currentPath: string): string | null {
  const isAuthRoute =
    currentPath === '/login' ||
    currentPath === '/register' ||
    currentPath === '/' ||
    currentPath === '/auth/callback';

  if (isAuthRoute) {
    switch (role) {
      case 'student': return '/student';
      case 'faculty': return '/faculty';
      case 'admin': return '/admin';
    }
  }

  if (currentPath.startsWith('/student') && role !== 'student') {
    return role === 'faculty' ? '/faculty' : '/admin';
  }
  if (currentPath.startsWith('/faculty') && role !== 'faculty' && role !== 'admin') {
    return role === 'student' ? '/student' : '/admin';
  }
  if (currentPath.startsWith('/admin') && role !== 'admin') {
    return role === 'faculty' ? '/faculty' : '/student';
  }
  return null;
}
```

---

## Question 2: Levels, Ranks & Celebrations

### 2.1 Exact Level Function & Thresholds
Defined in `src/lib/levels.ts:1-55`:
- **Base Thresholds (Levels 1 to 6)**:
  `BASE_LEVEL_THRESHOLDS = [0, 100, 250, 450, 700, 1000]`
- **Scaling above Level 6**:
  Linear scaling of **+350 XP per level**: `1000 + (level - 6) * 350`.

```typescript
// src/lib/levels.ts:7-27
export const BASE_LEVEL_THRESHOLDS = [0, 100, 250, 450, 700, 1000];
export const XP_PER_LEVEL_AFTER_BASE = 350;

export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level <= BASE_LEVEL_THRESHOLDS.length) {
    return BASE_LEVEL_THRESHOLDS[level - 1];
  }
  const baseLevels = BASE_LEVEL_THRESHOLDS.length;
  const baseThreshold = BASE_LEVEL_THRESHOLDS[baseLevels - 1];
  return baseThreshold + (level - baseLevels) * XP_PER_LEVEL_AFTER_BASE;
}
```

| Level | XP Threshold | Band XP Needed |
| :--- | :--- | :--- |
| **Level 1** | 0 XP | 100 XP |
| **Level 2** | 100 XP | 150 XP |
| **Level 3** | 250 XP | 200 XP |
| **Level 4** | 450 XP | 250 XP |
| **Level 5** | 700 XP | 300 XP |
| **Level 6** | 1000 XP | 350 XP |
| **Level 7** | 1350 XP | 350 XP |
| **Level 8** | 1700 XP | 350 XP |

### 2.2 The 7 Rank Tiers & Level Ranges
Defined in `src/lib/ranks.ts:7-50` and the `rank_tiers` database table:

```
Tier 1: Apprentice    -> Level 1 – 1    (min_level: 1,  slug: apprentice,  color: #71717A)
Tier 2: Scripter      -> Level 2 – 3    (min_level: 2,  slug: scripter,    color: #38BDF8)
Tier 3: Debugger      -> Level 4 – 7    (min_level: 4,  slug: debugger,    color: #34D399)
Tier 4: Architect     -> Level 8 – 11   (min_level: 8,  slug: architect,   color: #A78BFA)
Tier 5: Strategist    -> Level 12 – 14  (min_level: 12, slug: strategist,  color: #FBBF24)
Tier 6: Innovator     -> Level 15 – 17  (min_level: 15, slug: innovator,   color: #F43F5E)
Tier 7: Grandmaster   -> Level 18+      (min_level: 18, slug: grandmaster, color: #F59E0B)
```

### 2.3 Celebration Implementation
- **Files**: `src/components/animations/CelebrationModal.tsx` and `src/app/actions/celebrations.ts`.
- **Mechanism**: **CSS / SVG ONLY**.
- **Particles**: **NONE**. Confetti or particle libraries (such as `canvas-confetti`) are NOT installed in `package.json` and are NOT used in code.
- **Animations**: Driven strictly by scoped CSS keyframes (`celebrationFadeIn`, `pulseRing`, `emblemFlip`, `fillBar`, `floatUp`), SVG glows, and `@media (prefers-reduced-motion: reduce)` accessibility overrides.

#### Raw Evidence: Celebration Styling
```tsx
// src/components/animations/CelebrationModal.tsx:88-124
<style>{`
  @keyframes celebrationFadeIn {
    from { opacity: 0; transform: scale(0.92); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes pulseRing {
    0% { transform: scale(0.85); opacity: 0.8; }
    50% { transform: scale(1.15); opacity: 0.2; }
    100% { transform: scale(0.85); opacity: 0.8; }
  }
  @keyframes emblemFlip {
    0% { transform: rotateY(90deg) scale(0.6); opacity: 0; }
    60% { transform: rotateY(-10deg) scale(1.05); opacity: 1; }
    100% { transform: rotateY(0deg) scale(1); opacity: 1; }
  }
`}</style>
```

---

## Question 3: Complete Inventory of `xp_rules`

Live query from PostgreSQL `public.xp_rules`: exactly 19 rules exist, all active (`active: true`).

```sql
SELECT action_type, base_xp, extra_xp, daily_limit, active 
FROM public.xp_rules 
ORDER BY action_type;
```

```
       action_type       | base_xp | extra_xp | daily_limit | active 
-------------------------+---------+----------+-------------+--------
 BATTLE_PARTICIPATION    |      10 |        0 |           3 | t
 BATTLE_WIN              |      40 |        0 |           2 | t
 BUG_BOUNTY              |      50 |        0 |           1 | t
 CODE_REVIEW_HELP        |      15 |        0 |           3 | t
 COMMUNITY_MENTOR        |      25 |        0 |           2 | t
 COMPETITION_FIRST       |     100 |        0 |           1 | t
 COMPETITION_PARTICIPATION|     15 |        0 |           1 | t
 COMPETITION_SECOND      |      75 |        0 |           1 | t
 COMPETITION_THIRD       |      50 |        0 |           1 | t
 CONCEPT_MATCH           |      10 |        0 |           3 | t
 DUEL_PARTICIPATION      |       5 |        0 |           5 | t
 DUEL_WIN                |      25 |        0 |           5 | t
 FACULTY_BONUS           |      20 |        0 |           5 | t
 HACKERRANK_COMPETITION  |      25 |        0 |           2 | t
 MANUAL_ADJUSTMENT       |       0 |        0 |           5 | t
 PRACTICE_SUBMISSION     |      20 |        0 |           3 | t
 QUEST_COMPLETION        |      10 |        0 |           5 | t
 QUIZ_COMPLETION         |      15 |        5 |           1 | t
 STREAK_7_BONUS          |      50 |        0 |           1 | t
(19 rows)
```

---

## Question 4: Daily Quiz Specification & Question Bank

### 4.1 Daily Quiz Configuration
- **Minimum questions per day**: **3 questions**. If a date has fewer than 3 approved questions available, the platform treats the date as an excused/exempt day (`quiz_exempt_dates` fallback in `src/app/actions/quiz.ts:251-274`).
- **Maximum questions per day**: **5 questions**, governed by `app_settings` key `questions_per_daily_quiz` (default `5`, `src/app/actions/quiz.ts:285-296`).
- **Option Letter Logic**: Letters `A`, `B`, `C`, `D` are assigned alphabetically based on array position `['A', 'B', 'C', 'D'][idx]` (`src/app/actions/quiz.ts:601`).
- **XP Formula**:
  $$\text{XP Awarded} = \text{base\_xp} + (\text{extra\_xp} \times \text{correct\_answers}) = 15 + (5 \times \text{score})$$
  (Perfect score: $15 + 25 = 40\text{ XP}$, `src/app/actions/quiz.ts:899`).
- **Expiry**: **Midnight (23:59:59) in `Asia/Kolkata`**. Uncompleted attempts transition to `status = 'expired'`.
- **Exempt Dates**: Evaluated through `public.quiz_exempt_dates` table. Quizzes on exempt dates do not penalize streaks.

### 4.2 Approved Question Count per Subject
Live database count from `public.questions WHERE status = 'approved'`:

```
 subject_code |           subject_title            | approved_questions 
--------------+------------------------------------+--------------------
 CS101        | Systems & Programming Core         |                 30 
 CS102        | Data Structures & Algorithms (DSA) |                 15 
(Total: 45 approved questions across 11 syllabus topics)
```

### 4.3 "Approve All" Button in Faculty UI
- **Exists**: **YES**.
- **Location**: `src/app/faculty/questions/page.tsx:301, 421, 986, 1013`.
- **Behavior**: Calls `bulkApproveQuestionsAction` in `src/app/actions/faculty-questions.ts:284`, which approves all pending questions in the filtered queue and logs a `BULK_APPROVE_QUESTIONS` entry in `public.audit_logs`.

---

## Question 5: Streak Engine Rules

Defined in `src/lib/streaks.ts:1-240`:

### 5.1 Streak Freeze Rules
- **Monthly Quota**: **2 freeze days per calendar month** in `Asia/Kolkata` (`YYYY-MM`), configured in `app_settings` key `max_freeze_days_per_month` (`src/lib/streaks.ts:74`).
- **Atomic Gap Coverage Rule**: Freezes are consumed **ONLY** if the entire unexcused gap between the student's last active quiz date and today can be covered. If `gapDays > remainingFreezes`, the streak resets to `1` and **0 freezes are consumed** (`src/lib/streaks.ts:182-192`).

### 5.2 7-Day Bonus Rule
- When `newStreak > 0 && newStreak % 7 === 0`, an additional **50 XP** bonus is awarded under `STREAK_7_BONUS`.
- Enforced with an idempotent reference ID: `streak_7_bonus_${studentId}_${streakStartDate}` (`src/lib/streaks.ts:211`).

### 5.3 No-Quiz-Day Handling
- Dates registered in `quiz_exempt_dates` or dates where the platform had fewer than 3 approved questions are subtracted from the calendar day difference before freeze consumption is evaluated (`src/lib/streaks.ts:148-164`).

---

## Question 6: Badges & Quests Inventory

### 6.1 Badges Full List (`public.badges`)
Live query output from PostgreSQL:

```
        id         |        name         | rule_type  | rule_value | xp_reward |  category   
-------------------+---------------------+------------+------------+-----------+-------------
 first_quiz        | First Step          | quiz_count |          1 |        10 | quiz
 streak_7          | Week Warrior        | streak_days|          7 |        25 | streak
 quest_first       | First Quest         | quest_count|          1 |        15 | quest
 quest_trio        | Quest Master        | quest_count|          3 |        30 | quest
 improvement_score | Quick Learner       | score_delta|          2 |        20 | achievement
 comeback_kid      | Never Give Up       | freeze_count|         1 |        15 | streak
 rank_apprentice   | Rank: Apprentice    | rank_tier  |          1 |        50 | rank
 rank_scripter     | Rank: Scripter      | rank_tier  |          2 |        50 | rank
 rank_debugger     | Rank: Debugger      | rank_tier  |          4 |        50 | rank
 rank_architect    | Rank: Architect     | rank_tier  |          8 |        50 | rank
 rank_strategist   | Rank: Strategist    | rank_tier  |         12 |        50 | rank
 rank_innovator    | Rank: Innovator     | rank_tier  |         15 |        50 | rank
 rank_grandmaster  | Rank: Grandmaster   | rank_tier  |         18 |        50 | rank
(13 rows)
```

### 6.2 Quests Full List (`public.quests`)
Live query output from PostgreSQL:

```
         id          |       title        |  period  | xp_reward | active 
---------------------+--------------------+----------+-----------+--------
 weekly_scholar      | Weekly Scholar     | weekly   |        50 | t
 knowledge_marathon  | Knowledge Marathon | weekly   |        75 | t
 academy_initiation  | Academy Initiation | one_time |        30 | t
(3 rows)
```

---

## Question 7: Leagues, Cron & Leaderboards

### 7.1 League Tiers & Configuration
- **Tiers (4 total)**:
  1. `bronze`: Tier Order 1, Min Level 1
  2. `silver`: Tier Order 2, Min Level 3
  3. `gold`: Tier Order 3, Min Level 6
  4. `diamond`: Tier Order 4, Min Level 10
- **Group Size**: Target size of **20 students** per group (`target_group_size: 20` in `league_config`).
- **Promotion & Relegation Counts**:
  - `promotion_count`: **Top 5 students** promote to next tier.
  - `relegation_count`: **Bottom 5 students** relegate to previous tier.
  - **Edge Cases**:
    - Groups with $< 10$ students (`min_group_size_for_relegation`) have **NO relegation**.
    - Top tier (`diamond`) cannot promote; bottom tier (`bronze`) cannot relegate.
    - Students with **0 XP are NEVER promoted** (`src/lib/leagues.ts:100-107`).

### 7.2 Cron Schedule & Week Boundary
- **`vercel.json:3-6`**:
  ```json
  {
    "path": "/api/cron/weekly-leagues",
    "schedule": "30 18 * * 0"
  }
  ```
  *(Sunday 18:30 UTC = Monday 00:00:00 IST)*
- **Week Boundary**: Monday 00:00:00 IST to Sunday 23:59:59.999 IST (`getIstWeekDetails`).

### 7.3 Leaderboards & Opt-Out
- **Leaderboards Available**:
  1. Campus Leaderboard (`scope: 'my_campus'`)
  2. Global / Inter-Campus Leaderboard (`scope: 'all_campuses'`)
  3. Batch Leaderboard (`scope: 'batch'`, filtered by `department` and `year_of_study`)
  4. Academic Faculty/Admin Cross-Campus Standings (`src/app/actions/academic-leaderboard.ts`)
- **Opt-Out**:
  - **Does a total opt-out exist?** **NO**. There is no column or switch to completely remove a student from leaderboard rankings.
  - **Anonymous Mode**: Students can toggle `is_anonymous: true` in their profile (`src/app/actions/leaderboard.ts:121`). This masks their `full_name`, `roll_no`, and `campus_name` as `"Anonymous"` to peers, while their score remains counted in campus totals.

---

## Question 8: Duels & Battles Specification

### 8.1 Async Duels
- **Questions per duel**: Exactly **5 approved questions** (`src/app/actions/duels.ts:170, 243`).
- **Expiry window**: **24 hours** from challenge creation (`Date.now() + 24 * 60 * 60 * 1000`).
- **XP Payout**:
  - Winner: `DUEL_WIN` (**25 XP**)
  - Loser: `DUEL_PARTICIPATION` (**5 XP**)
  - Tie / Draw: Both receive `DUEL_PARTICIPATION` (**5 XP**)
  - Losing never deducts XP.
- **Per-Pair Daily Cap**: Maximum **2 XP-earning duels per student pair per calendar day** in `Asia/Kolkata` (`app_settings` key `max_duel_xp_per_pair_daily`, default 2).
- **Level Band**: Matchmaking restricts challenges to within **$\pm 2$ levels** (`app_settings` key `duel_matchmaking_level_band`, default 2).

### 8.2 Live Battles
- **Format**: Synchronous, multi-team academic competition managed by faculty/admin.
- **Team Split Logic**: `balancedSnakeDraft` (pure function in `src/lib/battles.ts:59-97`): sorts students descending by level and XP, then alternates assignment direction (0, 1, 2, then 2, 1, 0) to ensure equal skill balance.
- **XP Payout**:
  - Participants who answered $\ge 1$ question: `BATTLE_PARTICIPATION` (**10 XP**)
  - Winning team members: `BATTLE_WIN` (**40 XP**)
- **Tables in Realtime**:
  **ONLY `public.battle_scores`** is added to the `supabase_realtime` publication (`supabase/migrations/012_battles.sql:372` and `src/components/battles/LiveScoreboard.tsx:51-60`). `battle_submissions` is explicitly excluded to prevent live answer packet snooping.

---

## Question 9: Concept Match, Codemons, Practice & Competitions

### 9.1 Concept Match
- **XP Reward**: **10 XP** (`CONCEPT_MATCH`) awarded upon achieving a perfect round (4 out of 4 correct matches, `src/app/actions/concept-match.ts:251-268`).
- **Daily Cap**: **3 perfect rounds per day** (`daily_limit: 3` in `xp_rules`, maximum 30 XP/day).

### 9.2 Does Codemons Award XP?
- **Answer**: **NO**.
- **Ground Truth**: Codemons is an offline, client-side HTML5/JS canvas game located at `public/play.html` and `public/index.html`. While the promotional UI badge displays `+50 XP`, there is **no backend server action, no API route, and no `CODEMON` entry in `xp_rules` or `xp_events`**. Zero XP is credited to the database ledger.

### 9.3 Practice XP Flow
- **Flow**:
  1. Student solves problem externally and submits claim with proof URL via `claimPracticeProblemAction`.
  2. Record created in `student_practice_completions` with `status: 'pending'` and `xp_awarded: 0`. **Zero XP is awarded at claim time**.
  3. Anti-gaming checks flag rapid submission velocity ($\ge 5$ in 1 hour) or duplicate proof URLs across students.
  4. Faculty or Admin reviews the claim at `/faculty/competitions` or `/faculty/practice`.
  5. Upon approval via `approvePracticeClaimAction`, XP is awarded via `award_xp` based on problem difficulty:
     - Easy: `PRACTICE_EASY` (**10 XP**)
     - Medium: `PRACTICE_MEDIUM` (**20 XP**)
     - Hard: `PRACTICE_HARD` (**40 XP**)
  6. Writes an entry to `public.audit_logs`.
- **Daily Cap**: **40 XP per calendar day** in `Asia/Kolkata` (`app_settings` key `daily_practice_xp_cap`).
- **Proof URL Required?**: **YES**. `validateProofUrl` in `src/lib/practice-validation.ts:1-32` requires a URL from authorized domains (`leetcode.com`, `hackerrank.com`, `codeforces.com`, `github.com`, `atcoder.jp`, `kaggle.com`, `geeksforgeeks.org`).

### 9.4 HackerRank Competition Flow
- Faculty/admin creates competition via `createFacultyCompetitionAction` (`src/app/actions/practice.ts:834`), validated by `validateHackerRankCompetitionUrl` (must contain `hackerrank.com`).
- Appears in student practice board with `is_competition: true`.
- When approved by faculty, awards `HACKERRANK_COMPETITION` (**25 XP**), which is **exempt** from the 40 XP daily practice cap.

---

## Question 10: Anti-Gaming Engine, Ceilings & Void Mechanism

### 10.1 Anti-Gaming Thresholds & Windows
Defined in `src/lib/anti-gaming/` and `public.app_settings`:

| Engine | Target Window | Key Thresholds | Severity Triggers |
| :--- | :--- | :--- | :--- |
| **Spike Detection** | Prior 14 active days in IST | Today XP $\ge 200$ (`spike_min_xp`), Ratio $> 3.0\times$ (`spike_ratio_threshold`), $\ge 5$ baseline days (`spike_min_baseline_days`) | Ratio $\ge 5.0\times$: `high`<br>Ratio $3.0 - 4.9\times$: `medium` |
| **Answer Sharing** | Last 7 calendar days | $\ge 10$ common questions (`answer_sharing_min_common`), $\Delta t \le 120\text{s}$, $\ge 60\%$ identical wrong choices (`answer_sharing_wrong_threshold`) | Wrong ratio $\ge 85\%$ or $\ge 10$ identical wrong: `high`<br>Otherwise: `medium` |
| **Win Trading** | Last 7 calendar days | $> 6$ duels per pair (`win_trading_max_duels_window`) OR ($\ge 4$ duels with $\ge 80\%$ one-sided wins) | $\ge 10$ duels or $\ge 90\%$ one-sided: `high`<br>Otherwise: `medium` |

### 10.2 Daily Ceilings (from `app_settings`)
- **`daily_xp_ceiling`**: **1000 XP** (Overall student ceiling per day in IST, excluding manual faculty awards).
- **`daily_game_xp_ceiling`**: **350 XP** (Duels, battles, concept match combined).
- **`daily_learning_xp_ceiling`**: **800 XP** (Daily quizzes, streaks, quests).
- **`daily_practice_xp_cap`**: **40 XP** (Coding practice problem solves).

### 10.3 Cron Routes and Schedules
Defined in `vercel.json:1-16`:
1. `/api/cron/detect-spikes`: `"schedule": "30 18 * * *"` (Daily 18:30 UTC = 00:00 IST)
2. `/api/cron/detect-collusion`: `"schedule": "45 18 * * *"` (Daily 18:45 UTC = 00:15 IST)
3. `/api/cron/weekly-leagues`: `"schedule": "30 18 * * 0"` (Sundays 18:30 UTC = Monday 00:00 IST)

### 10.4 Void Mechanism
- **Nature**: **SOFT VOID**. The original row in `public.xp_events` is **NEVER deleted**. Its `status` column is updated from `'valid'` to `'voided'`, and `void_reason` is populated.
- **Code Path**:
  `src/app/actions/flags.ts:204` (`voidFlaggedXpAction`) $\longrightarrow$ calls SECURITY DEFINER PostgreSQL procedure `public.void_xp(p_event_id, p_reason, p_actor)` (`supabase/migrations/018_anti_gaming_core.sql:489-575`).
- **Audit Integration**: Writes directly to `public.audit_logs` with `action = 'void_xp'`.

### 10.5 Flag Tables
- **Table**: `public.flags`.
- **Columns**: `id`, `kind`, `severity`, `student_id`, `second_student_id`, `window_start`, `window_end`, `evidence`, `status`, `created_at`, `reviewed_by`, `reviewed_at`, `review_note`.
- **Allowed Kinds**: `'spike'`, `'answer_sharing'`, `'win_trading'`, `'rate_limit'`, `'duplicate_proof'`, `'practice_velocity'`.

---

## Question 11: Faculty Analytics Dashboard

Defined in `src/lib/faculty-analytics.ts:1-400`:

### 11.1 Quiet-Days Threshold
- **Value**: **5 calendar days** (`app_settings` key `quiet_student_days`, `src/lib/faculty-analytics.ts:113`).
- **Rule**: A student is classified as "Quiet / Disengaged" if they have earned 0 valid XP in `xp_events` for $\ge 5$ consecutive calendar days relative to the target analysis date in IST.

### 11.2 Weak-Topic Rule & Minimum Answers
- **Minimum Answers**: **20 total answers** required per topic (`app_settings` key `weak_topic_min_answers`, `src/lib/faculty-analytics.ts:110`).
- **Ranking Formula**: Topics with $\ge 20$ submissions are ranked ascending by accuracy rate:
  $$\text{Accuracy Rate} = \frac{\text{correct\_answers}}{\text{total\_answers}} \times 100$$
  Secondary tie-break: Higher `total_answers` ranks as weaker. Top 3 lowest accuracy topics are displayed as `topWeakTopics` (`src/lib/faculty-analytics.ts:320-323`).

### 11.3 List of Faculty Pages (7 total)
1. `/faculty` (`src/app/faculty/page.tsx`): Overview Analytics & Cohort Metrics
2. `/faculty/award-xp` (`src/app/faculty/award-xp/page.tsx`): Manual XP Granting Tool
3. `/faculty/competitions` (`src/app/faculty/competitions/page.tsx`): HackerRank Competitions & Practice Review
4. `/faculty/flags` (`src/app/faculty/flags/page.tsx`): Anti-Gaming & Collusion Review Hub
5. `/faculty/leaderboard` (`src/app/faculty/leaderboard/page.tsx`): Inter-Campus Academic Leaderboard
6. `/faculty/questions` (`src/app/faculty/questions/page.tsx`): Question Bank Manager
7. `/faculty/questions/review` (`src/app/faculty/questions/review/page.tsx`): Dedicated Question Review Queue

---

## Question 12: Admin Pages, Invites & Audit Logs

### 12.1 Admin Pages (6 total)
1. `/admin` (`src/app/admin/page.tsx`): Executive System Metrics & Overview
2. `/admin/audit` (`src/app/admin/audit/page.tsx`): Immutable System Audit Log
3. `/admin/flags` (`src/app/admin/flags/page.tsx`): Anti-Gaming & Investigation Hub
4. `/admin/invites` (`src/app/admin/invites/page.tsx`): Staff Registration Invite Code Generator
5. `/admin/leaderboard` (`src/app/admin/leaderboard/page.tsx`): Institutional Standings
6. `/admin/rules` (`src/app/admin/rules/page.tsx`): XP Economy Rule Engine

### 12.2 Staff Invites Specification
Defined in `src/app/actions/invites.ts:1-570`:
- **Hashing**: Cryptographic **SHA-256**. The raw code (`inv_` + 24 cryptographically random bytes in base64url ~ 36 characters) is returned to the creating admin **once** and never stored. The database stores strictly `code_hash = sha256(rawCode)`.
- **Expiry**: Default is **7 days** (`expiresDays = Math.max(1, input.expiresDays ?? 7)`).
- **Max Uses**:
  - Admin invite: Default **1 use**
  - Faculty invite: Default **25 uses** (`input.role === 'admin' ? 1 : 25`)
  - Incremented on redemption (`used_count`); blocked when `used_count >= max_uses`.

### 12.3 Actions That Write to `public.audit_logs`
Every privileged state modification writes an immutable row to `public.audit_logs`:
1. `void_xp` (`supabase/migrations/018_anti_gaming_core.sql:542`)
2. `CAMPUS_CHANGE` (`supabase/migrations/019_campus_core.sql:102`)
3. `judge_login` (`src/app/actions/judge.ts:122`)
4. `approve_practice_claim` (`src/app/actions/practice.ts:630`)
5. `bulk_approve_practice_claims` (`src/app/actions/practice.ts:714`)
6. `reject_practice_claim` (`src/app/actions/practice.ts:811`)
7. `invite_created` (`src/app/actions/invites.ts:144`)
8. `invite_revoked` (`src/app/actions/invites.ts:345`)
9. `invite_failed_attempts_burst` (`src/app/actions/invites.ts:440`)
10. `invite_redeemed` (`src/app/actions/invites.ts:549`)
11. `MANUAL_XP_AWARD` (`src/app/actions/xp.ts:181`)
12. `UPDATE_XP_RULE` (`src/app/actions/rules.ts:57`)
13. `DISMISS_FLAG` (`src/app/actions/flags.ts:183`)
14. `VOID_FLAGGED_XP` (`src/app/actions/flags.ts:303`)
15. `APPROVE_QUESTION` (`src/app/actions/faculty-questions.ts:258`)
16. `BULK_APPROVE_QUESTIONS` (`src/app/actions/faculty-questions.ts:309`)
17. `REJECT_QUESTION` (`src/app/actions/faculty-questions.ts:352`)

---

## Question 13: Demo Access & Security Configuration

### 13.1 Demo Access Buttons
- **Public / Layout Switcher**: `<DemoRoleSwitch />` (`src/components/DemoRoleSwitch.tsx:3`) returns `null` (no public buttons).
- **Evaluator Portal**: Available at `/judge` (`src/app/judge/page.tsx` & `src/app/judge/JudgeLoginForm.tsx`). Evaluators enter a server access code (`JUDGE_ACCESS_CODE`) to log in via server action `judgeLoginAction` (`src/app/actions/judge.ts:30`).

### 13.2 Credentials in Production Bundle
- **Status in `.next/static`**: **DO NOT APPEAR**. Passwords are read strictly server-side from `process.env.DEMO_*_PASSWORD` inside the server action (`src/app/actions/judge.ts:79-81`).
- **References in Dev Sourcemaps**: Referenced in development sourcemap file `.next/dev/static/chunks/_18n1dr508vud6._.js.map:22`.
- **Demo Emails**: Hardcoded demo email strings appear as input placeholders (`student@demo.edu`, `faculty@demo.edu`, `admin@demo.edu`).

### 13.3 What `NEXT_PUBLIC_DEMO_MODE` Does
- Defined in `src/lib/config.ts:15`: `export const IS_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';`.
- Imported in `src/app/login/page.tsx:12`.
- **Current Effect**: **Inert**. It is defined as a feature flag constant but currently has no conditional render branches attached in `login/page.tsx`.

### 13.4 Session Cookie Max-Age
- **Configuration**: Explicitly set to **31,536,000 seconds (1 year / 365 days)**:
  - `src/middleware.ts:33`: `maxAge: options?.maxAge ?? 60 * 60 * 24 * 365`
  - `src/lib/supabase/client.ts:17`: `maxAge: 60 * 60 * 24 * 365`
  - `src/lib/supabase/server.ts:28`: `maxAge: options?.maxAge ?? 60 * 60 * 24 * 365`

---

## Question 14: Hard-Coded or Mock Data Inventory

Every instance of hard-coded or mock values in client-facing components and pages:

1. `src/data/studentDashboardData.ts:114-146`: `mockActivityCalendar` (pre-populated October 2026 daily XP numbers).
2. `src/data/studentDashboardData.ts:151-180`: `initialQuests` (hard-coded quest tasks including `"Challenge Priya to an Async Quiz Duel"` at line 175).
3. `src/data/studentDashboardData.ts:186-222`: `initialSubjectScores` (hard-coded scores: DSA 89 vs 72, WEB 94 vs 65, ALGO 84 vs 78, DBMS 74 vs 81, CNET 88 vs 68).
4. `src/components/academy/ScoreCard.tsx:12`: Defaults to `scores = initialSubjectScores`.
5. `src/app/student/page.tsx:239`: `<ScoreCard />` rendered without props, defaulting to `initialSubjectScores`.
6. `src/components/academy/ToDoCard.tsx:5`: Initializes local state with `initialQuests`.
7. `src/app/student/profile/page.tsx:101-112`: Fallback query fetching first student row if user session is absent.
8. `src/app/actions/student-dashboard.ts:169`: Hard-coded rank string `#1 in ${department}` if unranked.
9. `src/app/actions/student-dashboard.ts:173-182`: Hard-coded mock notification (`unreadNotifications: 1`, `welcome_notif`).
10. `src/components/Navbar.tsx:20-29`: `isGenericPlaceholder` checks for placeholder strings: `'aarav sharma'`, `'faculty staff'`, `'vikram singh'`, `'vikram singh (admin)'`, `'system administrator'`, `'student user'`, `'student'`.
11. `src/app/login/page.tsx:401`: Input placeholder `"e.g. Aarav Sharma"`; line 414: `"CS-2026-042"`.
12. `src/app/select-campus/page.tsx:207`: Input placeholder `"e.g. Syed Ahmed"`; line 226: `"e.g. 23CS042"`.
13. `src/app/redeem-invite/page.tsx:224`: Input placeholder `"e.g., Dr. Jane Doe"`; line 303: `"e.g., FAC-1029"`.

---

## Question 15: Database Inventory (Migrations, RLS & Functions)

### 15.1 Migrations 001 to 030 Purpose Summary

| Migration | File Name | Core Purpose |
| :--- | :--- | :--- |
| **001** | `001_initial_schema.sql` | Core relational schema (`profiles`, `students`, `subjects`, `questions`, `xp_events`, `xp_rules`, `campuses`) |
| **002** | `002_xp_core.sql` | Immutable XP ledger, double-entry trigger, atomic `award_xp` and `void_xp` procedures |
| **003** | `003_daily_quiz_streaks.sql` | Daily quiz attempts, answer tracking, streak calculation, and freeze day quotas |
| **004** | `004_consolidate_finalization.sql` | Consolidates quiz finalization exclusively into Next.js server actions |
| **005** | `005_quiz_exempt_dates.sql` | Creates `quiz_exempt_dates` to excuse campus holidays without streak breaks |
| **006** | `006_badges.sql` | `badges` and `student_badges` tables with milestone evaluation triggers |
| **007** | `007_quests.sql` | Quests and tasks engine with period-based completion tracking |
| **008** | `008_leagues.sql` | Weekly leagues schema (`league_tiers`, `league_config`, `league_groups`, `league_members`) |
| **009** | `009_duels.sql` | Asynchronous 1v1 quiz duels schema (`duels`, `duel_questions`, `duel_answers`) |
| **010** | `010_practice_links.sql` | Curated coding practice problems directory (metadata and external links only) |
| **011** | `011_concept_match.sql` | Configures `CONCEPT_MATCH` action in `xp_rules` with daily cap |
| **012** | `012_battles.sql` | Live synchronous team battle engine (`battles`, `battle_teams`, `battle_scores`, Realtime publication) |
| **013** | `013_battle_answer_key_alignment.sql` | Aligns `submit_battle_answer` answer verification with `questions` column schema |
| **014** | `014_faculty_features.sql` | Adds question rejection reasons and analytics settings to `app_settings` |
| **015** | `015_audit_fixes.sql` | Tightens SECURITY DEFINER execution grants and restores canonical XP rules |
| **016** | `016_lockdown_helper_functions.sql` | Enforces caller validation on `get_student_xp` and creates `trg_prevent_xp_events_tamper` |
| **017** | `017_fix_helper_function_service_role.sql`| Refines `prevent_xp_events_tamper` and `get_student_xp` for service_role maintenance |
| **018** | `018_anti_gaming_core.sql` | Creates `audit_logs`, `flags`, rate-limit procedures, and daily category XP caps |
| **019** | `019_campus_core.sql` | Hardens campus assignment immutability with trigger `trg_prevent_campus_reassignment` |
| **020** | `020_rank_tiers.sql` | Creates `rank_tiers` table and seeds the 7 canonical rank levels |
| **021** | `021_celebration_markers.sql` | Adds server-side level and rank celebration markers to prevent duplicate popups |
| **022** | `022_lockdown_celebration_trigger.sql` | Revokes public execute grants on celebration trigger functions |
| **023** | `023_ensure_student_records.sql` | Auto-backfills missing `students` rows on user profile creation |
| **024** | `024_practice_and_competitions.sql` | Adds `PRACTICE_SOLVE` and `HACKERRANK_COMPETITION` rules to `xp_rules` |
| **025** | `025_seed_second_subject_dsa.sql` | Seeds second subject (CS102: Data Structures & Algorithms) with 15 questions |
| **026** | `026_practice_approval_and_caps.sql`| Practice approval queue, `ip_rate_limits`, and difficulty-tiered XP rules |
| **027** | `027_extend_flags_kind.sql` | Extends `flags.kind` check constraint to include `duplicate_proof` and `practice_velocity` |
| **028** | `028_award_xp_practice_daily_cap.sql`| Enforces daily practice XP cap atomically inside `award_xp` procedure |
| **029** | `029_staff_invites.sql` | Creates `staff_invites`, `staff_invite_redemptions`, and `promote_to_staff` procedure |
| **030** | `030_staff_invites_fixes.sql` | Fixes foreign key references on `staff_invites` for PostgREST relation joins |

### 15.2 Table Count & RLS Status
- **Table Count**: Exactly **44 tables** in `public` schema.
- **Row-Level Security (RLS)**: **100% ENABLED** (`rowsecurity = true` on all 44 tables).

### 15.3 SECURITY DEFINER Functions & Grants
Queried from PostgreSQL `pg_proc`: exactly 14 SECURITY DEFINER functions exist.

```
       Function Name       |                   Execution Grants                    
---------------------------+-------------------------------------------------------
 award_xp                  | {postgres=X, service_role=X}                          
 check_action_rate_limit   | {postgres=X, service_role=X}                          
 check_ip_rate_limit       | {postgres=X, service_role=X}                          
 get_my_role               | {postgres=X, authenticated=X, service_role=X}         
 get_student_xp            | {postgres=X, authenticated=X, service_role=X}         
 handle_new_user           | {postgres=X, anon=X, authenticated=X, service_role=X} 
 log_xp_rule_change        | {postgres=X, anon=X, authenticated=X, service_role=X} 
 prevent_campus_change     | {postgres=X, anon=X, authenticated=X, service_role=X} 
 prevent_direct_celebration| {postgres=X, service_role=X}                          
 prevent_role_change       | {postgres=X, anon=X, authenticated=X, service_role=X} 
 promote_to_staff          | {postgres=X, service_role=X}                          
 rls_auto_enable           | {postgres=X, anon=X, authenticated=X, service_role=X} 
 submit_battle_answer      | {postgres=X, service_role=X}                          
 void_xp                   | {postgres=X, service_role=X}                          
```

### 15.4 Functions Executable by `anon`
Exactly **5 functions** have execute grants for `anon`. **All 5 are trigger functions** executed implicitly by PostgreSQL table triggers during user lifecycle events; **zero RPC data modification functions** are callable by `anon`:
1. `handle_new_user()`
2. `log_xp_rule_change()`
3. `prevent_campus_change()`
4. `prevent_role_change()`
5. `rls_auto_enable()`

### 15.5 Immutability Trigger on `xp_events`
- **Trigger Name**: **`trg_prevent_xp_events_tamper`**
- **Trigger Function**: `prevent_xp_events_tamper()`
- **Timing**: `BEFORE UPDATE OR DELETE ON public.xp_events FOR EACH ROW`

---

## Question 16: Verification Suite (tsc, Build, Tests)

### 16.1 TypeScript Compiler (`npx tsc --noEmit`)
```
Command: npx tsc --noEmit
Exit Code: 0
Errors: 0
```

### 16.2 Production Build (`npm run build`)
```
Command: npm run build
Exit Code: 0
Compilation Time: 647ms (Turbopack)
TypeScript Check Time: 867ms
Generated Routes: 39 / 39 static & dynamic pages successfully generated
```

### 16.3 Test Suite Status (`npm test`)
- **Framework**: Vitest v3.2.7
- **Pure Unit Tests**: **83 passed / 83 total across 4 test suites in 4.35s** (`levels.test.ts`, `syntax-samurai.test.ts`, `role-redirect.test.ts`, `concept-match.test.ts`).
- **Full Integration Suite**: 49 test suites configured with `fileParallelism: false`.
  - When executed against the live remote database, sequential remote DB operations and a 300-user battle load test triggered network timeouts (120s limit).
  - To honor the mandatory **READ-ONLY investigation constraint** (no test-driven inserts/deletions on the live production database), the full mutating integration test job was stopped.

---

## Question 17: Contradiction Table in PDF

- **Target Document**: `Gamify_Feature_List_and_Workflow.pdf`
- **Result**: **NOT FOUND**

#### Raw Search Evidence
```bash
find /Users/sidd/Documents/gamify -iname "*contradiction*" -o -iname "*Gamify_Feature_List*"
# Exit code: 0, Output: (empty)

find /Users/sidd/Documents /Users/sidd/Downloads /Users/sidd/Desktop -iname "*Gamify_Feature_List_and_Workflow.pdf*" 2>/dev/null
# Exit code: 0, Output: (empty)
```
*Note: A different document (`Gamify_Codemons_Project_Summary.pdf`) exists in the repository, but contains no contradiction table. Per hard rules, no speculation is made.*

---

## Question 18: PWA State (Manifest, Service Worker, Safe Area)

### 18.1 Web App Manifest
- **File**: `src/app/manifest.ts`
- **Contents**:
  ```typescript
  // src/app/manifest.ts:3-25
  export default function manifest(): MetadataRoute.Manifest {
    return {
      name: 'CODAK - Gamified Academic Progression Platform',
      short_name: 'CODAK',
      description: 'Turn everyday learning into a game: points, streaks, quests, leagues, and battles.',
      start_url: '/',
      display: 'standalone',
      background_color: '#000000',
      theme_color: '#000000',
      icons: [
        {
          src: '/assets/icons/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/assets/icons/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    };
  }
  ```

### 18.2 Service Worker
- **Status**: **NOT FOUND**.
- **Evidence**: No service worker script (`sw.js`) or registration code (`navigator.serviceWorker.register`) exists in `src/` or `public/`.

### 18.3 Safe-Area CSS
- **File**: `src/app/globals.css:390-395`
- **Implementation**:
  ```css
  /* Safe-area insets for mobile notched devices and home bars */
  .safe-area-bottom {
    padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
  }
  .safe-area-top {
    padding-top: max(0.75rem, env(safe-area-inset-top));
  }
  ```
