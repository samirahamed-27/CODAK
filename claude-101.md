# Claude-101: Engineering Log & System Audit

This document records all audits, identified issues, root-cause analyses, architectural decisions, and verification steps for the CODAK gamification platform.

---

## 1. Audit & Implementation Status (2026-10-19)

### 1.1 Root-Cause Analysis of Current Issues

#### Issue 1: Floating Reticle / UI Glitch on `/student/compete`
- **Observed Behavior**: A stray circular icon with 4 quarter-circle corner arcs and a center dot appears floating on the right side of the screen at (x: ~82%, y: ~45%).
- **Root Cause**: `TargetCursor` from `src/components/ui/TargetCursor.tsx` was globally injected in `src/app/layout.tsx:75-81`. Custom DOM cursors using fixed positioning and mix-blend-mode freeze at cursor coordinates upon mouse-out, alt-tabbing, touch gestures, or screenshot capture, leaving a confusing orphaned widget that looks like a misplaced button or UI defect.
- **Resolution**: Removed `TargetCursor` from `src/app/layout.tsx`. Restored clean, hardware-accelerated, accessible native cursor control across all desktop and mobile devices.

#### Issue 2: Faculty and Admin Login Access
- **Observed Behavior**: Evaluators and users had no clear pathway to sign in as Faculty or Admin on `/login`. Demo accounts were hidden unless `NEXT_PUBLIC_DEMO_MODE=true` was manually configured, and the login card only referenced general learning accounts with a link to Student Sign Up.
- **Root Cause**:
  1. `src/components/ui/modern-stunning-sign-in.tsx` lacked portal context/role tabs.
  2. `src/app/auth/callback/route.ts` defaulted OAuth redirection to `'/'` instead of reading `profiles.role` to direct users to `/faculty`, `/admin`, or `/student`.
  3. `src/lib/auth/role-redirect.ts` unconditionally redirected any authenticated user without a campus (`hasCampus === false`) to `/select-campus`. Since faculty/admin accounts do not necessarily have student campus IDs, this trapped them on student registration.
- **Resolution**:
  1. Added a responsive Portal Switcher (`[ 🎓 Student | 👨‍🏫 Faculty | 🛡️ Admin ]`) on `SignIn1` with customized portal titles, subtitles, placeholders, and explanatory context.
  2. Provided 1-click evaluation access buttons for Faculty (`faculty@demo.edu`), Admin (`admin@demo.edu`), and Student (`student@demo.edu`) so any evaluator can test in seconds.
  3. Updated `src/lib/auth/role-redirect.ts` so `hasCampus === false` only routes to `/select-campus` for students (`role === 'student'`).
  4. Updated `src/app/auth/callback/route.ts` to inspect the authenticated user's role and route directly to `/faculty`, `/admin`, or `/student`.
  5. Added direct navigation links in `src/app/page.tsx` header and footer to access Faculty and Admin portals directly.

---

## 2. Execution Log

- [x] Initialized `claude-101.md` tracking log.
- [x] Audited full codebase and verified `tests/campus-feature.test.ts` (10/10 passed in 58s).
- [x] Audited `tests/practice-links.test.ts` and `tests/practice-competitions.test.ts` (all passed).
- [x] Removed `TargetCursor` from `src/app/layout.tsx`.
- [x] Patched `src/lib/auth/role-redirect.ts` to exempt faculty and admin from student campus onboarding.
- [x] Patched `src/app/auth/callback/route.ts` to redirect authenticated users to their role-specific dashboard.
- [x] Implemented Portal Switcher & 1-click demo evaluation buttons in `src/components/ui/modern-stunning-sign-in.tsx` and `src/app/login/page.tsx`.
- [x] Added 5 unit tests in `tests/role-redirect.test.ts` to assert student campus onboarding and faculty/admin exemption (24/24 passed).
- [x] Ran `npx tsc --noEmit` (0 errors).
- [x] Ran `npm run build` (30/30 routes compiled successfully).

---

## 3. Staff Sign-Up Architecture: Faculty and Admin via Invite Codes (2026-10-19)

### 3.1 Architecture & Threat Modeling
- **Zero-Trust Sign-Up Retention**: Maintained base sign-up trigger assigning `role = 'student'` on all new accounts. Client-side requests cannot specify or mutate roles (guarded by `prevent_role_change` trigger).
- **Cryptographic Staff Invites**: Generated 32-character base64url random invite codes. Displayed once to admins at `/admin/invites`, stored exclusively as SHA-256 hashes (`code_hash`) in `public.staff_invites`.
- **Zero-Access RLS**: `staff_invites` table RLS enabled with zero client policies. Touched exclusively via server actions with `supabaseAdmin` service role.
- **Redemption & Atomicity**: Server action `redeemInviteAction` requires email verification, enforces IP/user rate limiting (5 attempts per 10m), performs constant-time hash verification, and calls `SECURITY DEFINER` function `promote_to_staff`.
- **Single-Use Concurrency**: Row-level locking (`FOR UPDATE`) within `promote_to_staff` guarantees that concurrent redemptions of a single-use code produce exactly one success.
- **Student Data Clean-Up**: If a user has zero activity (no XP events, quiz attempts, duels, or battles), the initial placeholder student row is deleted. If activity exists, promotion is safely refused.
- **Grant Guard Compliance**: `promote_to_staff` has execute permissions explicitly revoked from `PUBLIC`, `anon`, and `authenticated`, and granted solely to `service_role`.
- **Admin Bootstrap**: Created `scripts/make-admin.ts <email>` using service role with audit logging (`STAFF_ADMIN_BOOTSTRAP`) to promote an initial existing user.
- **Exclusion From Student Aggregations**: Promoted faculty and admin profiles are omitted from public leaderboards, weekly leagues, and campus student standings.
