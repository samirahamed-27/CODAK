# Gamified Learning Platform 🎮📚

> **A "Duolingo for College" where students Learn, Play, and Compete.**  
> Built for MSOT Student Challenge (Problem 4).

---

## 🚀 The Vision
Turn real, verifiable learning activities (class attendance, daily quizzes, coursework, peer tutoring) into XP, streaks, quests, league tiers, and team battles.

- **Learn:** Daily concept quiz, topic practice with instant feedback, learning quests.
- **Play:** Casual practice mode, head-to-head async quiz duels (zero-penalty, fair matchmaking).
- **Compete:** Weekly leagues with fresh resets, batch leaderboards, live team battles.

---

## 🛠 Tech Stack
- **Frontend & Routing:** Next.js (App Router, TypeScript)
- **Styling:** Tailwind CSS (Mobile-first design)
- **Backend & Database:** Supabase (PostgreSQL, Row Level Security, Auth, Realtime)
- **Testing:** Vitest (Unit & Live integration tests)

---

## 💻 How to Run Locally

```bash
# 1. Clone the repository
git clone https://github.com/sidd-289/gamify.git
cd gamify

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local
# (Edit .env.local and add your Supabase credentials)

# 4. Run the database migration
# Copy supabase/migrations/001_initial_schema.sql into Supabase SQL Editor and execute.

# 5. Seed test accounts (Student, Faculty, Admin)
npm run seed

# 6. Run automated tests
npm test

# 7. Start the local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Demo Test Accounts

The following seeded accounts are available for local testing (Password for all: `Password123!`):

| Role | Email | Password | Landing Page | Key Features |
|---|---|---|---|---|
| **Student** | `student@demo.edu` | `Password123!` | `/student` | Daily Quiz hero, Streak flame, Learn/Play/Compete tabs, Anonymous toggle |
| **Faculty** | `faculty@demo.edu` | `Password123!` | `/faculty` | Quiz questions review queue, Flagged XP queue |
| **Admin** | `admin@demo.edu` | `Password123!` | `/admin` | System admin hub, `xp_rules` live viewer, ledger audit |

*(When `NEXT_PUBLIC_DEMO_MODE="true"` is set in `.env.local`, a floating Demo Switcher widget is also rendered on the screen for instant 1-click role swapping).*

---

## 👥 Team Rules & Git Workflow (Beginner Friendly)

To make sure our code stays clean and nobody accidentally breaks the project:

### 1. `main` Branch is Sacred
- The `main` branch **must always work**. Never push untested or broken code directly to `main`.
- Everyone works on their own **feature branch** (e.g., `phase-0-setup`, `feature/daily-quiz`, `fix/navbar-mobile`).
- When your feature is done and tested, open a **Pull Request (PR)** on GitHub to merge it into `main`.

### 2. Commit Style: Short and Clear
Write commit messages that tell a quick story:
- `feat: add student quiz card` (new feature)
- `fix: correct streak midnight reset logic` (bug fix)
- `docs: update readme with setup steps` (documentation)
- `test: add role redirect test cases` (testing)

### 3. How to Add Teammates as Collaborators
1. Go to your repository on GitHub: `https://github.com/sidd-289/gamify`
2. Click **Settings** (tab at the top right).
3. In the left sidebar, click **Collaborators** (under "Access").
4. Click the green **"Add people"** button.
5. Search by your teammate's GitHub username or email, and click **"Add to this repository"**.
6. Teammates must accept the invite from their email or notification bell on GitHub.

### 4. Daily Habits for Peace of Mind
- **Start your day:** Run `git pull origin main` to get the latest work from teammates before writing any new code.
- **Commit often:** Commit small steps with meaningful messages instead of one giant commit at midnight.
- **Check status:** Run `git status` frequently to see what files changed.
