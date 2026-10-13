# 📘 Git Cheat Sheet for Beginners (With Plain English Analogies)

Think of Git like a **time machine + multiplayer save system** for code.

---

## 🔑 Core Concepts & Everyday Commands

| Command | Real-Life Analogy | What It Actually Does |
|---|---|---|
| `git clone <url>` | Downloading a copy of a shared Google Doc to your laptop. | Copies a remote GitHub repository to your local computer for the first time. |
| `git status` | Glancing at your study table to see what papers are messy. | Shows which files were edited, created, or ready to be saved. Run this constantly! |
| `git branch <name>` | Opening a scratchpad so you don't ruin the real notebook. | Creates a separate workspace branch so you can test code without affecting `main`. |
| `git checkout -b <name>` (or `git switch -c <name>`) | Grabbing that new scratchpad and sitting down with it. | Creates a new branch and immediately switches you into it. |
| `git add <file>` | Putting selected photos into an envelope before sealing it. | Stages changes. Tells Git: "I want these exact changes to be in my next snapshot." |
| `git commit -m "msg"` | Sealing the envelope and writing a date/title on top. | Creates a permanent checkpoint in your local history with a descriptive message. |
| `git push origin <branch>` | Mailing your sealed envelopes to the shared team cloud drive. | Uploads your local commits to GitHub so teammates can see and review them. |
| `git pull origin main` | Downloading the latest edits your friend made to the shared doc. | Fetches recent updates from GitHub and merges them into your current local branch. |
| `git merge <branch>` | Pasting notes from your scratchpad into the main notebook. | Combines the history of another branch into your current branch. |
| `git rebase <branch>` | Moving your scratchpad edits to sit neatly on top of the newest main notes. | Replays your commits on top of another branch for a clean, linear history. |

---

## 🚨 Common Emergencies & How to Fix Them

| Scenario / Error | Why It Happened | The Safe Fix |
|---|---|---|
| **Rejected Push (`[rejected - non-fast-forward]`)** | A teammate pushed new code to GitHub while you were working. Your local branch is behind. | Run `git pull --rebase origin <branch>`. Once your commits replay on top of theirs, run `git push origin <branch>` again. |
| **Merge Conflict (`CONFLICT (content)`)** | You and a teammate edited the exact same line in the same file. Git doesn't know whose version to keep. | Open the file. Look for `<<<<<<< HEAD`, `=======`, and `>>>>>>>`. Delete the markers, choose the correct code with your teammate, save the file, then run `git add <file>` and `git commit -m "fix: resolve merge conflict"`. |
| **Committed a Secret / Password / API Key** | You accidentally committed `.env.local` or an API key into Git history. | **CRITICAL:** Deleting the key in a new commit does NOT make it safe (it remains in history!). **Immediately go to Supabase/service dashboard, revoke/regenerate the key!** Then add the file to `.gitignore`. |
| **Accidentally Worked on the Wrong Branch (`main`)** | You made edits directly on `main` before creating a feature branch, but haven't committed yet. | Simply run `git switch -c feature/my-feature`. Git moves all your uncommitted edits over to the new branch safely! |
| **Detached HEAD State** | You checked out a specific old commit rather than a branch name (`HEAD is at abc123`). | Don't panic. To go back to safety, run `git switch main`. |

---

## 💡 Golden Habit
Before you start writing code every morning:
```bash
git switch main
git pull origin main
git switch -c my-new-feature
```
*(You start fresh with the latest team code every single time!)*
