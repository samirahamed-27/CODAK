# CODAK Architectural Ground Truth & System Specification

**Repository**: `sidd-289/CODAK`  
**Framework**: Next.js 16.4.0 (App Router, Turbopack, React 19)  
**Database**: Supabase PostgreSQL with Row Level Security (RLS) & Database Triggers  
**Testing**: Vitest with 43 test suites and 393 automated integration/unit tests  

---

## 1. System Inventory & Directory Map

```
/src
  /app
    /admin              -> Super-admin portal (XP Rules engine & transaction ledger audit)
    /faculty            -> Faculty analytics dashboard, questions review, award XP, flags
    /student            -> Student dashboard, profile, quests, practice, play, compete
    /select-campus      -> First-time student onboarding & academic profile configuration
    /login              -> Modern duotone sign-in & registration with Google OAuth support
    /api/cron           -> Background maintenance (weekly-leagues, detect-collusion, detect-spikes)
  /components           -> Modular UI components (Navbar, RankBadge, CelebrationModal, Aurora)
  /lib                  -> Domain services (leagues, streaks, ranks, campus-standings, anti-gaming)
  /types                -> TypeScript definitions matching PostgreSQL schema
/supabase/migrations    -> 25 immutable SQL migrations (001_initial_schema to 025_seed_second_subject_dsa)
/docs                   -> Architectural reports, game design manifesto, and security audits
```

---

## 2. Core Architectural Guarantees

### A. XP Ledger Immutability
- All point grants are recorded in `public.xp_events` with an enforced foreign key to `public.xp_rules(action_type)`.
- Database trigger `prevent_xp_events_tamper` blocks all raw `UPDATE` and `DELETE` queries on `xp_events`.
- Reversal of suspicious XP is strictly append-only: a counter-record with `status = 'voided'` and a `void_reason` is stored.

### B. Security Definer & RLS Lockdown
- All client queries use Row-Level Security (RLS).
- Privileged operations (`award_xp`, `void_xp`, `submit_battle_answer`) have their permissions explicitly revoked from `anon`, `authenticated`, and `PUBLIC`. They execute solely via the server-side `service_role` client.
- Students can only view their own private profile data. Peer-visible queries strictly route through `formatLeaderboardEntries` to sanitize identities.

### C. Zero-Leak Anonymous Mode
- When `is_anonymous` is toggled true on `public.profiles`, the query layer completely strips `full_name`, `roll_no`, and `campus_id` from peer-visible JSON payloads.
- Peers see "Anonymous Student" with level and rank badges, while campus standings aggregate their XP anonymously.
- Faculty retain full oversight: faculty accounts can view real student identities and roll numbers to enable timely academic mentoring.

### D. Timezone & Boundary Precision
- All daily resets, quiz locks, midnight boundaries, and weekly league cycles operate in `Asia/Kolkata` (IST, UTC+05:30).
- Streak calculation strictly measures consecutive calendar day differences in IST rather than raw UTC timestamps, preventing timezone shift errors for campus students.

---

## 3. Database Schema Overview (25 Migrations)

| Table | Purpose | RLS & Trigger Protection |
| :--- | :--- | :--- |
| `profiles` | User identity, role (`student`, `faculty`, `admin`), campus assignment | Role escalation trigger `prevent_role_change`; campus immutability trigger |
| `students` | Academic attributes (`roll_no UNIQUE`, `department`, `year_of_study`) | Linked to `profiles.id` on delete cascade |
| `campuses` | Official campus network (Delhi, Jaipur, Bengaluru, Other) | Read-only for authenticated users; admin write |
| `subjects` | Course subjects (CS101: Systems & Programming, CS102: Data Structures) | Faculty / admin managed |
| `questions` | Syllabus quiz bank with topics, choices A–D, explanation, status | RLS: students only read approved; faculty review queue |
| `quiz_attempts`| Idempotent daily attempt sessions with randomized option order | Unique index on `(student_id, quiz_date, mode)` |
| `xp_rules` | Configurable economy rules (base_xp, extra_xp, daily_limit, active) | RLS: admin write; audit trigger `log_xp_rule_change` |
| `xp_events` | Double-entry point ledger | Immutability trigger `prevent_xp_events_tamper` |
| `duels` | 1v1 asynchronous academic challenges | Expiry timestamp, status state machine |
| `battles` | Multi-student synchronous team competitions | Real-time question dispatch & live scores |

---

## 4. Verification Suite

Run full verification locally:
```bash
# 1. Type Safety Check (0 errors required)
npx tsc --noEmit

# 2. Automated Test Suite (43 suites, 393 tests passing)
npm test

# 3. Production Build Compilation (29 routes)
npm run build
```
