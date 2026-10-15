<div align="center">

# 🎮 GAMIFY // CODEMONS
### *The "Duolingo for College" + Real-Time Code Battle Arena*

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

### 1. 🎓 Learn & Daily Quiz
- **Verified Academic Progression**: Daily concept quizzes drawn from reviewed faculty question banks.
- **Streak Multipliers**: Fire streak counter with server-enforced recovery and streak freeze tokens.
- **Anti-Cheat Validation**: Server-side answer evaluation preventing client-side inspection or tampering.

### 2. ⚔️ Codemons Battle Arena
- **In-Browser Code Duel**: Real-time turn-based battle where code correctness and test suites dictate attack power and elemental advantages.
- **Safe Sandbox Execution**: In-browser sandboxed evaluation with timeout limits, syntax highlighting, and live battle terminal output.
- **Dynamic Challenges**: Algorithmic problem bank ranging from string parsers to dynamic programming.

### 3. 🏆 Compete & Ranked Leagues
- **Weekly League Resets**: Bronze, Silver, Gold, Platinum, Diamond, and Champion tiers.
- **Zero-Sum Immunity**: Zero-penalty casual play to encourage learning without exam fatigue.
- **Anonymous Mode**: Server-enforced privacy toggle replacing student identities with anonymous gamer handles.

---

## 💻 Tech Stack

| Domain | Technology | Description |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | Turbopack compilation, React 19, Server Actions |
| **Language** | TypeScript 5 | Strict typing across schema, payloads, and components |
| **Styling** | Tailwind CSS v4 & Vanilla CSS | Custom design tokens, glassmorphism, responsive grid |
| **Animations** | Motion, GSAP, WebGL | Gaussian dock physics, staggered menus, shader waves |
| **Database** | Supabase (PostgreSQL) | RLS policies, atomic XP transactions, auth sessions |
| **Testing** | Vitest | Integration test suites for XP math, streaks, and RLS |

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
NEXT_PUBLIC_DEMO_MODE="true"
```

### 3. Database Migration & Seed
```bash
# Seed initial student, faculty, admin accounts and question bank
npm run seed
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🧪 Demo Accounts

When `NEXT_PUBLIC_DEMO_MODE="true"`, use the floating **Role Switcher** widget or log in with any seeded demo account (Password: `Password123!`):

| Role | Email | Password | Landing Route | Focus Area |
|:---|:---|:---|:---|:---|
| 🧑‍🎓 **Student** | `student@demo.edu` | `Password123!` | `/student` | Daily Quests, Hero Profile, Quiz Arena, Leagues |
| 🧑‍🏫 **Faculty** | `faculty@demo.edu` | `Password123!` | `/faculty` | Question Bank Queue, Flagged XP Review |
| 🛡️ **Admin** | `admin@demo.edu` | `Password123!` | `/admin` | Rule Configurator, Ledger Audit, System Controls |

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
  <sub>Crafted with passion for <b>MSOT Student Challenge</b>. Made by the Gamify & Codemons Engineering Team.</sub>
</div>
