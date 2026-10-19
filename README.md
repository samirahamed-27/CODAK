<div align="center">

# 🎮 CODAK // CODEMONS
### *Next-Gen Academic Learning Platform + Real-Time Code Battle Arena*

[![Next.js](https://img.shields.io/badge/Next.js-16.4-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20RLS-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Vitest](https://img.shields.io/badge/Vitest-Unit%20%26%20Integration-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![WebGL](https://img.shields.io/badge/WebGL-Fluid_Aurora_Shaders-792EE5?style=for-the-badge&logo=webgl&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API)

<p align="center">
  <b>Turn real academic rigor into XP, streaks, leagues, and monster-battling code duels.</b><br>
  Built with high-end micro-interactions, mathematical physics springs, and server-enforced security.
</p>

[Explore Documentation](#-architecture--features) • [Quick Start](#-quick-start) • [Codemons Engine](#-codemons-battle-arena) • [Demo Accounts](#-demo-accounts)

---

</div>

## ⚡ Highlights & Aesthetic

- 🌌 **WebGL Ambient Aurora**: Reactive GPU-powered fluid shader canvas with mouse wave physics and translucent glassmorphism cards.
- 🧲 **Magnetic Dock Navigation**: Bottom navigation bar powered by Gaussian attraction field physics (`exp(-d²/2σ²)`), semi-implicit Euler springs, and fluid cursor/touch sweep.
- 🔀 **Shuffle Cryptographic Titles**: Dynamic retro text-scrambling animations on headers and milestones.
- 📱 **Sleek Floating Menu**: GSAP-driven `<StaggeredMenu />` floating trigger with silky multi-layer panel reveals.
- 🎨 **Dusky Cyberpunk Palette**: Deep space tones (`#07080B`, `#10131E`, `#1D2233`) accented by neon sky blue (`#38BDF8`, `#7DD3FC`) and peach gold (`#FFB27A`).

---

## 🏛 Architecture & Features

```mermaid
graph TD
    User([Student / Faculty / Admin]) --> Router{Next.js 16 App Router}
    
    subgraph Frontend Experience
        Router --> Portal[Student Academy Portal]
        Router --> PlayMode[Daily Quiz & Practice Hub]
        Router --> Codemons[Codemons Battle Arena]
        Router --> Compete[Leaderboards & Leagues]
        Router --> Profile[Student Hero Profile]
    end

    subgraph Security & Ledger Core
        Portal --> Actions[Server Actions & API]
        Actions --> Supabase[(Supabase PostgreSQL)]
        Supabase --> RLS[Row Level Security]
        Supabase --> Ledger[Immutable XP Ledger]
        Supabase --> Streaks[Streak Freeze & Rules Engine]
    end
```

### 1. 🎓 Learn, Daily Quiz & Concept Match
- **Verified Academic Progression**: Daily concept quizzes drawn from reviewed faculty question banks.
- **Option B Concept Match**: Real-time term-definition matching using cryptographically separated opaque IDs (`term_...` vs `def_...`), HMAC-signed expiring round tokens, and strict server-side evaluation.
- **Streak Multipliers**: Fire streak counter with server-enforced recovery, calendar boundaries in `Asia/Kolkata` time, and streak freeze tokens.
- **Anti-Cheat Validation**: Server-side answer evaluation preventing client-side inspection or tampering.

### 2. ⚔️ Code Duels & Battle Arena
- **Real-Time Duels**: Exactly 5 questions per duel (`DUEL_QUESTIONS_COUNT = 5`). Both players solve the exact same questions with zero answer key leakage. Fair level-band matchmaking and daily pair limits (max 2 duels between same pair).
- **Battle Arena**: Balanced multi-team snake drafting based on student level. Submissions evaluated atomically via backend RPC with live score broadcasting over Supabase Realtime.

### 3. 🏆 Compete, Ranked Leagues & Quests
- **Weekly Ranked Leagues**: 4 tiers (Bronze, Silver, Gold, Diamond). Target group size 20, min group size for relegation 10. Top 5 promoted, bottom 5 relegated (groups with <10 students relegate 0).
- **Weekly League Rollover Cron**: Scheduled at `30 18 * * 0` (Sunday 18:30 UTC = Monday 00:00:00 IST). Idempotent execution skips already finalized groups.
- **Learning Quests**: Weekly quests reset on Monday 00:00:00 IST; One-time quests reward milestone progress. Capped at 5 claims per day.
- **Mathematical Level Curve**: Piecewise threshold progression:
  - Level 1: 0 XP
  - Level 2: 100 XP
  - Level 3: 250 XP
  - Level 4: 450 XP
  - Level 5: 700 XP
  - Level 6: 1000 XP
  - Level 7+: `1000 + (level - 6) * 350` XP (Level 7 = 1350, Level 8 = 1700, etc.)
- **6 Canonical Badges**:
  - *Milestone*: `first_quiz` (First Step), `streak_7` (Week of Fire)
  - *Quest*: `quest_first` (Adventurer), `quest_trio` (Quest Master)
  - *Self-Improvement*: `improvement_score` (Leveling Up - vs own 7-day average), `comeback_kid` (Phoenix - streak rebuild)
- **Anonymous Mode**: Server-enforced privacy toggle replacing student identities with anonymous gamer handles across public leaderboards, league standings, and duel histories.

### 4. 🏫 Multi-Campus Architecture & Inter-Campus Standings
- **Canonical Campus Roster**: Every student, faculty, and administrator belongs to a verified campus:
  1. *Hi-Tech Institute of Technology, Delhi*
  2. *Jagannath University, Jaipur*
  3. *Rathinam Institute of Technology, Bengaluru*
  4. *Other* (custom sanitized affiliate name, min 2 / max 60 chars)
- **Inter-Campus Standings Engine**:
  - Rather than rewarding pure raw student headcount, rankings are driven by **average weekly XP per active student** (`total_weekly_valid_xp / active_student_count`), where active students are those with weekly XP > 0.
  - **Minimum-Players Rule (`campus_min_active = 5`)**: Campuses with fewer than 5 active students during the current week receive an average score of `0` and are placed below qualified campuses.
  - **Deterministic Tie-Breaking**: Equal averages break first by total weekly XP, then by canonical campus sort order (`sort_order ASC`).
  - **Voided XP Exclusion**: Voided/flagged events are excluded from the weekly calculations, protecting aggregate campus standings from gaming.
- **Campus Immutability & Competition Integrity**:
  - Campus assignment is locked upon account creation or initial onboarding via PostgreSQL trigger `trg_prevent_campus_change`.
  - Students cannot switch campuses to exploit standings or jump between competitive leagues.
  - Only authorized administrators can reassign campuses; every modification writes an immutable audit record to `audit_logs` (`action = 'CAMPUS_CHANGE'`).

### 5. 🎖️ Academic Rank Ladder & Badges
- **7-Tier Lifetime Progression**: Apprentice (L1), Scripter (L2), Debugger (L4), Architect (L8), Strategist (L12), Innovator (L15), Grandmaster (L18).
- **Admin-Editable Database Schema**: Ranks live in `public.rank_tiers` table rather than hardcoded logic.
- **Fairness-Driven Level Banding**: Low-activity steady students (~20 XP/day) unlock Rank 2 in 5 days; average activity students (~40 XP/day) reach Architect in 6 weeks, and reach Grandmaster in a full academic semester (~4.3 months).
- **Zero-XP Rank Badges**: Each rank-up awards an idempotent rank badge with `xp_reward = 0`, eliminating XP loops and anti-gaming flag spikes.
- **Contextual Everywhere Chips**: Universal `<RankChip />` renders seamlessly across student profile, home dashboard, leaderboards, leagues, duels, and faculty roster without N+1 query overhead.
- **Anonymous Mode Preserved**: Anonymous student rows display rank and level standing without disclosing any student identity, name, or roll number.

---

## 💻 Tech Stack

| Domain | Technology | Description |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | Version 16.4.0 (Turbopack canary), React 19, Server Actions |
| **Language** | TypeScript 5 | Strict typing across schema, payloads, and components |
| **Styling** | Tailwind CSS v4 & Vanilla CSS | Custom design tokens, glassmorphism, responsive grid |
| **Animations** | Motion, GSAP, WebGL | Gaussian dock physics, staggered menus, shader waves |
| **Database** | Supabase (PostgreSQL) | 35 RLS tables, atomic XP ledger (`award_xp`), Realtime |
| **Testing** | Vitest | Integration test suites for XP math, streaks, and RLS |

---

## 📖 Operations Runbook & System Configuration

### 1. Database Migrations
> **MIGRATION RULE**: Always apply database migrations using `npm run migrate`. NEVER execute SQL migrations directly in the Supabase web dashboard, as that bypasses `schema_migrations` tracking.

- Migration runner: `scripts/run-migration.ts`
- Tracking table: `public.schema_migrations`
- `DATABASE_URL`: Must only be set in `.env.local` for local terminal migrations. **NEVER** expose `DATABASE_URL` in production hosting environments (e.g. Vercel dashboard).

```bash
# Check status of applied vs pending migrations
npm run migrate -- --status

# Apply pending migrations sequentially
npm run migrate
```

### 2. Cron Endpoints & Scheduling
- **Weekly League Rollover Endpoint**: `/api/cron/weekly-leagues` (Supports `GET` with Bearer auth and `POST` with `x-cron-secret`)
  - **Cron Schedule**: `30 18 * * 0` (Every Sunday at 18:30 UTC = Monday 00:00:00 IST).
  - **Idempotency Guarantee**: Rollover detects already-completed groups (`status = 'completed'`) and safely skips them, ensuring duplicate executions never create duplicate XP or recalculate ranks.
- **Daily XP Spike Detection Endpoint**: `/api/cron/detect-spikes` (Supports `GET` with Bearer auth and `POST` with `x-cron-secret`)
  - **Cron Schedule**: `30 18 * * *` (Daily at 18:30 UTC = midnight 00:00:00 IST).
  - **Algorithm**: Compares today's XP to the student's 14-day active average. Flags when `today > 3x average` AND `today >= 200 XP` AND `>= 5 baseline active days`.
  - **Flag Only**: Statistical flags never auto-punish or void XP automatically.
  - **Idempotency Guarantee**: Unique index on `flags` table ensures duplicate runs for the same date generate 0 duplicate flags.
- **Collusion & Win-Trading Detection Endpoint**: `/api/cron/detect-collusion` (Supports `GET` with Bearer auth and `POST` with `x-cron-secret`)
  - **Cron Schedule**: `45 18 * * *` (Daily at 18:45 UTC = 00:15:00 IST).
  - **Answer Sharing Algorithm**: Evaluates pairs of students on shared quiz/practice questions. Flags when common questions >= 10, shared WRONG choice ratio >= 60%, and submitted close in time (within 120s). Legitimate battle teammates talking during a battle are excluded from being flagged for that battle's questions. Control pairs with 10 identical correct answers are never flagged.
  - **Win-Trading Algorithm**: Flags pairs exceeding > 6 duels in a 7-day window or exhibiting >= 80% one-sided results (intentional XP farming).
  - **Flag Only**: Writes to `flags` table for faculty review. Never auto-voids XP.
  - **CLI Runner**: `npm run detect-collusion`
- **Authentication**: Secured via `CRON_SECRET`. The request must include either:
  - Header `Authorization: Bearer <CRON_SECRET>` (standard Vercel Cron format)
  - Header `x-cron-secret: <CRON_SECRET>`
- **Vercel Hobby Timing Note**: Vercel Hobby cron timing is not exact and may trigger with a slight delay or variance.
- **Vercel Cron Configuration (`vercel.json`)**:
```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-leagues",
      "schedule": "30 18 * * 0"
    },
    {
      "path": "/api/cron/detect-spikes",
      "schedule": "30 18 * * *"
    },
    {
      "path": "/api/cron/detect-collusion",
      "schedule": "45 18 * * *"
    }
  ]
}
```

```bash
# Manual trigger example with curl:
curl -X POST https://your-domain.com/api/cron/weekly-leagues \
  -H "Authorization: Bearer your-cron-secret-token" \
  -H "Content-Type: application/json"

# Trigger daily spike detection:
curl -X POST https://your-domain.com/api/cron/detect-spikes \
  -H "Authorization: Bearer your-cron-secret-token" \
  -H "Content-Type: application/json"

# Trigger collusion detection:
curl -X POST https://your-domain.com/api/cron/detect-collusion \
  -H "Authorization: Bearer your-cron-secret-token" \
  -H "Content-Type: application/json"
```

### 3. Production Server Actions Inventory
All state mutations are encapsulated in secure server actions reading caller sessions via `supabaseServer.auth.getUser()`:

| Module | Exported Actions | Access / Role Guard |
|---|---|---|
| `auth.ts` | `signOutAction` | Public (clears session and auth cookies) |
| `badges.ts` | `evaluateMyBadgesAction`, `getStudentBadgesAction` | Student / Authenticated |
| `battles.ts` | `autoSplitTeamsAction`, `createBattleAction`, `startBattleAction`, `submitBattleAnswerAction`, `finishBattleEarlyAction`, `getMyBattlesAction`, `getBattleDetailsAction` | Faculty/Admin (creation/start) & Student (submit/view) |
| `concept-match.ts` | `getConceptMatchRoundAction`, `submitConceptMatchAction` | Student / Authenticated (HMAC token validated) |
| `duels.ts` | `createOrJoinAutoMatchAction`, `challengeStudentAction`, `submitDuelAnswerAction`, `getDuelDetailsAction`, `getMyDuelsAction`, `getOpenDuelsAction`, `acceptDuelAction`, `declineDuelAction` | Student / Authenticated |
| `faculty-analytics.ts` | `getFacultyAnalyticsAction` | Faculty & Admin Only (403 for students) |
| `faculty-questions.ts` | `submitManualQuestionAction`, `editQuestionAction`, `getFacultyQuestionsAction`, `reviewQuestionAction`, `uploadQuestionsCsvAction` | Faculty & Admin Only (403 for students) |
| `leaderboard.ts` | `updateAnonymousPreferenceAction` | Student / Authenticated |
| `leagues.ts` | `getStudentLeagueAction`, `getWeeklyLeagueStandingsAction` | Student / Authenticated |
| `practice.ts` | `getPracticeLinksAction` | Authenticated |
| `quests.ts` | `getStudentQuestsAction`, `claimQuestRewardAction` | Student / Authenticated |
| `quiz.ts` | `getDailyQuizSessionAction`, `submitQuizAnswerAction`, `finalizeQuizAction`, `getPracticeQuizSessionAction`, `submitPracticeAnswerAction`, `getStudentStreakAction` | Student / Authenticated |
| `student-search.ts` | `searchStudentsAction` | Faculty & Admin Only (403 for students) |
| `xp.ts` | `awardXpAction` | Faculty & Admin Only (403 for students) |

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/sidd-289/gamify.git
cd gamify
npm install
```

### 2. Setup Environment
```bash
cp .env.example .env.local
```
Configure your Supabase credentials in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-public-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
# Direct Postgres Connection URI (Local .env.local only, NEVER in hosting/Vercel env)
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
CRON_SECRET="your-cron-secret-token"

# Server-Only Judge & Evaluator Credentials (NEVER use NEXT_PUBLIC prefix)
JUDGE_ACCESS_CODE="your-secure-judge-access-code"
DEMO_STUDENT_PASSWORD="your-strong-student-password"
DEMO_FACULTY_PASSWORD="your-strong-faculty-password"
DEMO_ADMIN_PASSWORD="your-strong-admin-password"
```

### 3. Database Migration & Seed
```bash
# Apply pending migrations and update schema_migrations
npm run migrate

# Inspect migration status
npm run migrate -- --status

# Seed initial student, faculty, admin accounts and question bank
npm run seed
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🛡️ Judge & Evaluator Access (`/judge`)

For evaluation and grading, access to pre-seeded role accounts (Student, Faculty, Admin) is managed via a dedicated, unlinked, and unindexed evaluation portal:

- **Portal URL**: `/judge` (protected by `robots: noindex, nofollow`, unlinked from public navigation).
- **Authentication**: Evaluators select their target role (`student`, `faculty`, or `admin`) and provide the secret access code.
- **Server Verification**: The code is evaluated via constant-time comparison (`crypto.timingSafeEqual`) to prevent timing side-channel attacks.
- **Fail-Closed Architecture**: If `JUDGE_ACCESS_CODE` or any role-specific password environment variable is unset, access fails closed immediately (503 Service Unavailable).
- **IP Rate Limiting**: The endpoint is guarded by a PostgreSQL-backed IP rate limiter (5 attempts per 10 minutes per IP).
- **Audit Trails**: Every successful judge login writes an immutable record to `audit_logs` tracking the authenticated user ID, role, client IP, and timestamp.
- **Client Bundle Zero-Leak**: No demo emails, fallback passwords, or judge environment variable names are embedded into client JavaScript bundles.

| Role | Target Route | Purpose |
|:---|:---|:---|
| 🧑‍🎓 **Student** | `/student` | Quests, XP ledger, quiz arena, concept match, duels, battles |
| 🧑‍🏫 **Faculty** | `/faculty` | Question bank approval queue, practice review queue, analytics |
| 🛡️ **Admin** | `/admin` | XP rule engine, audit logs, system controls, campus governance |

---

## 👥 Faculty and admin accounts

CODAK enforces a strict **zero-trust role model**: there is no public "choose your role" sign-up. Every new account begins as a `student` via database triggers, and client-side requests can never set or elevate user roles. Faculty and Administrator access is managed entirely via cryptographically secure single-use/multi-use invite codes or service-role bootstrapping.

### 1. How Invites Work
- **Invite Generation (`/admin/invites`)**: Administrators can create staff invites for either `faculty` or `admin` roles, specifying an optional campus, expiration window (default 7 days), and maximum allowed redemptions (default 1 for admin, 25 for faculty; admin-configurable).
- **Cryptographic Single-Display Token**: Invite codes are generated using cryptographically secure random bytes (32 characters base64url). The raw token is displayed **once** to the admin in a secure copy box with a clear warning. The server stores only the SHA-256 code hash (`code_hash`) in the `staff_invites` table.
- **Zero Client RLS Access**: The `staff_invites` table has Row Level Security enabled with no client access (`authenticated` and `anon` have zero SELECT/INSERT/UPDATE permissions). All operations are executed exclusively through trusted server actions using the service role.
- **Redemption Portal (`/redeem-invite`)**: Prospective faculty and administrators register a standard account via email or Google OAuth (linked directly from the login tabs via *"Sign up (invite code required)"*), verify their email, and input their invite code on `/redeem-invite`.
- **Rate Limiting & Timing Safety**: Redemptions are rate-limited to 5 attempts per 10 minutes per user and IP via the database rate limiter. Lookup is performed using constant-time hash verification. Any invalid, expired, revoked, or exhausted code returns a single generic error (*"Invalid or expired code"*) to prevent oracle enumeration.
- **Atomic State Transition (`promote_to_staff`)**: A single transactional `SECURITY DEFINER` function atomically locks the invite row, checks validity, increments `used_count`, updates `profiles.role`, inserts the `faculty` profile (with optional department, designation, and campus), and safely removes the idle `students` placeholder record only if the user has zero activity (no XP events, quiz attempts, duels, or battles). If activity exists, promotion is safely rejected.
- **Immutable Audit Logging**: Full audit trails are recorded in `audit_logs` for invite creation, redemption, revocation, and rate-limit bursts, never recording plain-text codes.

### 2. Bootstrapping the First Administrator
To establish the initial administrator account without an existing invite:
```bash
# Bootstrap an existing signed-up account to admin
npx tsx scripts/make-admin.ts <email>
```
*Note: The target user must already have created an account and verified their email. The script connects using the service role from `.env.local`, verifies account existence, elevates the profile to `admin`, cleans any idle student row, and logs a `STAFF_ADMIN_BOOTSTRAP` event in `audit_logs` without printing secrets.*

### 3. Security Notes
- **Zero-Trust Role Guard**: Trigger `prevent_role_change` prevents any non-service-role update to `profiles.role`.
- **Grant Guard Verification**: `promote_to_staff` execution privileges are strictly revoked from `PUBLIC`, `anon`, and `authenticated`, and granted solely to `service_role`.
- **Aggregation Isolation**: Promoted faculty and admin accounts are completely excluded from public leaderboards, weekly league standings, and campus performance aggregations.

---

## 📂 Project Structure

```
gamify/
├── public/
│   ├── css/style.css            # Codemons battle styling
│   ├── data/challenges.json     # Codemons challenge bank
│   ├── js/main.js & runner.js   # Sandboxed code execution engine
│   └── index.html               # Codemons interactive interface
├── src/
│   ├── app/
│   │   ├── student/             # Student dashboard, learn, play, compete, profile
│   │   ├── faculty/             # Faculty management and question approvals
│   │   ├── admin/               # System administration and ledger inspection
│   │   └── layout.tsx           # Global layout with ambient Aurora shader
│   ├── components/
│   │   ├── ui/
│   │   │   └── magnetic-dock.tsx # Motiq Gaussian magnetic navigation dock
│   │   ├── academy/             # ProfileCard, ToDoCard, Header, ScoreCard
│   │   ├── Aurora.jsx           # Custom WebGL shader canvas
│   │   ├── Shuffle.jsx          # Cryptographic scramble text component
│   │   ├── StaggeredMenu.jsx    # Floating animated menu component
│   │   └── BottomNav.tsx        # Responsive bottom navigation bar
│   └── lib/
│       ├── levels.ts            # Mathematical XP level curve calculations
│       └── supabase/            # Client, server, and admin Supabase instances
└── supabase/
    └── migrations/              # PostgreSQL schema, RLS policies, and triggers
```

---

## 🛡️ Git Workflow & Collaboration

```bash
# Check status before working
git status

# Always sync latest updates
git pull --rebase origin main

# Create clean topic branches
git checkout -b feature/my-cool-feature

# Test before submitting
npm test
```

---

<div align="center">
  <sub>Crafted with passion for <b>MSOT Student Challenge</b>. Made by the CODAK & Codemons Engineering Team.</sub>
</div>
