# Academic Rank Ladder & Badges (Game Design Document Draft)

## 1. Overview & Campus Theme

As students progress through real coursework, coding exercises, quizzes, streaks, and battles on our campus, their lifetime learning effort is recognized through a structured **Academic Rank Ladder**. 

Unlike weekly leagues that reset every Monday, ranks represent **permanent lifetime mastery** derived directly from verified (non-voided) XP ledger events. The ranks and badges are rooted in our computer science and college learning culture:

1. **Apprentice (Level 1, 0 XP, `#94A3B8`)**: Fundamental syntax, orientation, and setting up initial development environments.
2. **Scripter (Level 2, 100 XP, `#38BDF8`)**: Writing functional scripts, completing daily quizzes, and initial algorithmic routines.
3. **Debugger (Level 4, 450 XP, `#34D399`)**: Edge-case resolution, mastering core data structures, and establishing learning streaks.
4. **Architect (Level 8, 1,700 XP, `#818CF8`)**: System-level algorithmic design, asynchronous flows, and team code battles.
5. **Strategist (Level 12, 3,100 XP, `#F59E0B`)**: Advanced data structures, contest optimization, and tactical duel performance.
6. **Innovator (Level 15, 4,150 XP, `#EC4899`)**: High-velocity breakthroughs, research topics, and campus contest leadership.
7. **Grandmaster (Level 18, 5,200 XP, `#A855F7`)**: Highest academic mastery, campus luminary, and inter-campus competitive contender.

---

## 2. Why the Ladder is Fair: Pacing & Progression Table

The progression curve follows our piecewise level model:
- Levels 1–6: L1 = 0, L2 = 100, L3 = 250, L4 = 450, L5 = 700, L6 = 1000 XP
- Level 7+: $1000 + (L - 6) \times 350$ XP

| Rank | Level Range | Cumulative XP Needed | Days @ 20 XP/day (Low Activity) | Days @ 40 XP/day (Normal Activity) | Days @ 60 XP/day (High Activity) | Pacing Milestone |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Apprentice** | Level 1–1 | 0 XP | Day 1 | Day 1 | Day 1 | Immediate onboarding |
| **Scripter** | Level 2–3 | 100 XP | **5.0 days** (< 1 week) | **2.5 days** (~3 days) | 1.7 days | First rank-up reachable in week 1 |
| **Debugger** | Level 4–7 | 450 XP | 22.5 days (~3 weeks) | 11.3 days (~1.5 weeks) | 7.5 days | Early streak milestone |
| **Architect** | Level 8–11 | 1,700 XP | 85.0 days (~12 weeks) | **42.5 days (6.0 weeks)** | **28.3 days (4.0 weeks)** | Middle rank reached in 4–6 weeks |
| **Strategist** | Level 12–14 | 3,100 XP | 155.0 days | 77.5 days (~11 weeks) | 51.7 days (~7.5 weeks) | Mid-semester milestone |
| **Innovator** | Level 15–17 | 4,150 XP | 207.5 days | 103.8 days (~15 weeks) | 69.2 days (~10 weeks) | Advanced semester milestone |
| **Grandmaster** | Level 18+ | 5,200 XP | 260.0 days | **130.0 days (~4.3 months)** | 86.7 days (~2.8 months) | Top rank reachable after full semester |

### Fairness Principles:
- A student investing just 5–10 minutes a day (~20 XP/day) comfortably unlocks Rank 2 (`Scripter`) and its badge in 5 days, within their first week.
- A steady student earning 40 XP/day achieves the middle rank (`Architect`) in 6 weeks, and reaches `Grandmaster` after approximately 18 weeks (a standard university semester).
- No grind wall: anti-gaming daily caps ensure steady, deliberate daily learning outpaces botting or unverified spikes.

---

## 3. Ranks vs. Leagues: Key Differences

Students frequently ask how Ranks differ from Leagues:
- **Rank (Lifetime Standing)**: Derived from the student's cumulative level and valid ledger XP. Ranks never decay, are never reset on weekly rollovers, and reflect total campus journey.
- **League (Weekly Sprint)**: 4 divisions (Bronze, Silver, Gold, Diamond) with 20 peers per group. Measures weekly XP race only, with promotions and relegations occurring every Monday at 00:00:00 IST.

The UI displays this exact clarification:
> *"Rank: Lifetime level progression based on total XP. League: Weekly competitive division based on this week's XP"*

---

## 4. Academic Integrity & Non-Feedback Rules

1. **Ranks never alter XP, caps, or grades**: Rank tiers are strictly display milestones. They never boost XP earn rates, never grant special allowances on daily caps, and have zero impact on academic grading.
2. **Zero-XP Rank Badges**: Rank badges carry `xp_reward = 0` to prevent feedback loops where awarding a rank badge generates XP that triggers subsequent rank-ups.
3. **Voided XP Behavior**: If faculty void an illegitimate or administrative XP event, the student's valid XP drops, and their displayed rank immediately reflects their revised level. Previously earned badges are preserved in the student's showcase record to prevent database thrashing.
4. **Admin-Editable Tiers**: Rank thresholds live in the database (`rank_tiers` table with RLS) rather than hardcoded client logic.
