# Multi-Campus Architecture & Inter-Campus Competition Engine

## 1. Overview
The Gamify platform (MSOT Problem 4) connects students across multiple institutions into a unified competitive learning network. Every student, faculty member, and administrator is assigned to a verified campus. The platform balances institutional pride with mathematical fairness, preventing larger universities from dominating purely through student count.

---

## 2. Canonical Campus Roster
The system seeds four initial campuses with deterministic slugs and canonical sort orders:
1. **Hi-Tech Institute of Technology, Delhi** (`hi-tech-delhi`, `sort_order: 10`)
2. **Jagannath University, Jaipur** (`jagannath-jaipur`, `sort_order: 20`)
3. **Rathinam Institute of Technology, Bengaluru** (`rathinam-bengaluru`, `sort_order: 30`)
4. **Other** (`other`, `is_other: true`, `sort_order: 100`)
   - For affiliate or visiting institutions. Requires a sanitized custom campus name (2–60 characters).
   - In inter-campus aggregate standings, all custom selections group cleanly under the label `"Other campuses"`.

---

## 3. Data Model & Database Architecture

### `public.campuses` Table
```sql
CREATE TABLE IF NOT EXISTS public.campuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_other BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
- **Row-Level Security (RLS)**: Public read access enabled for both `anon` and `authenticated` roles (`SELECT`); write operations (`INSERT`, `UPDATE`, `DELETE`) restricted strictly to administrators.

### Profile Campus Relationship & Performance Indexing
- `profiles.campus_id`: Foreign key referencing `campuses(id) ON DELETE RESTRICT`.
- `profiles.campus_other_name`: Text field storing sanitized custom campus names when `is_other = true`.
- **Index**: `CREATE INDEX idx_profiles_campus_id ON public.profiles(campus_id);`
  - Guarantees sub-millisecond execution times (`0.624 ms` benchmarked on 1,000 synthetic students) for campus leaderboard filters and joined student queries.

---

## 4. Sign-Up, Validation & Onboarding Flow

### Sign-up Screen
- The authentication screen (`src/app/login/page.tsx`) incorporates a required campus dropdown populated dynamically from `getActiveCampuses()`.
- Selecting `"Other"` triggers an inline input with placeholder `"Enter your campus name"`.
- **Validation Rules (`src/lib/campus.ts`)**:
  - Minimum 2 characters, maximum 60 characters.
  - Strips leading/trailing whitespace.
  - Strips `<script>`, `<style>`, and HTML markup tags.
  - Rejects empty, too short, or too long inputs both client-side and server-side.

### Existing Account Onboarding
- Authenticated accounts lacking a `campus_id` are intercepted by Next.js middleware (`src/middleware.ts`) and redirected to `/select-campus`.
- API endpoints (`/api/*`), auth callbacks, static assets, and logout actions are exempt from redirection to prevent deadlocks.
- Submitting `/select-campus` calls `assignInitialCampusAction`, writing the initial campus immutably and routing the user to their respective role dashboard.

---

## 5. Security, Trigger Immutability & Audit Logging

### Immutability Trigger (`trg_prevent_campus_change`)
To protect competitive integrity and prevent students from jumping between campuses:
```sql
CREATE OR REPLACE FUNCTION public.prevent_campus_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If campus_id was previously NULL, permit initial assignment
  IF OLD.campus_id IS NULL AND NEW.campus_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Allow service_role or admin to update campus
  IF (OLD.campus_id IS DISTINCT FROM NEW.campus_id OR OLD.campus_other_name IS DISTINCT FROM NEW.campus_other_name) THEN
    IF auth.role() = 'service_role' OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      -- Record administrative modification in immutable audit_logs
      INSERT INTO public.audit_logs (user_id, action, target_type, target_id, details)
      VALUES (
        auth.uid(),
        'CAMPUS_CHANGE',
        'PROFILE',
        NEW.id,
        jsonb_build_object(
          'old_campus_id', OLD.campus_id,
          'new_campus_id', NEW.campus_id,
          'old_other_name', OLD.campus_other_name,
          'new_other_name', NEW.campus_other_name
        )
      );
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Campus assignment is permanent and cannot be modified by students.';
  END IF;

  RETURN NEW;
END;
$$;
```

---

## 6. Inter-Campus Standings Engine

### Fairness Formula
A raw XP sum favors institutions with larger student bodies. The platform evaluates campus standings using **Average Weekly XP per Active Student**:
$$\text{Average Weekly XP} = \frac{\sum \text{Valid Weekly XP of Active Students}}{\text{Count of Active Students}}$$
where an *active student* is defined as a student who has earned at least 1 valid XP during the current IST calendar week.

### Minimum-Players Rule (`campus_min_active = 5`)
- Campuses with fewer than 5 active students during the current week receive an average score of `0.00`.
- Such campuses are positioned below qualified campuses with an informational badge (`"Needs min 5 active (currently X)"`).
- The threshold is stored dynamically in `app_settings` (`campus_min_active: 5`).

### Deterministic Tie-Breaking
Ties between campuses are resolved deterministically:
1. Higher average weekly XP (`avg_weekly_xp DESC`).
2. Higher total weekly valid XP (`total_weekly_xp DESC`).
3. Canonical campus sort order (`sort_order ASC`).

### Voided XP Ledger Exclusion
The standings aggregation queries exclusively against `xp_events WHERE status = 'valid'`, automatically ignoring voided or suspicious activity flagged by faculty or anti-gaming spike/collusion detection scripts.

---

## 7. Compete Pages & Battle Arena Integrations

### Leaderboard Scope Selector
Students can toggle between three competitive scopes on `/student/compete`:
1. **My Campus**: Filters leaderboard entries strictly to students belonging to the requester's campus.
2. **All Campuses**: Inter-institutional leaderboard displaying campus chips for every participant.
3. **My Batch**: Department and year-of-study peer group rankings.

### Privacy-Preserving Anonymous Mode
- Anonymous students toggle `is_anonymous = true`.
- On all public boards, peer students receive scrubbed data:
  - Real name is replaced with `"Anonymous"`.
  - Roll number is omitted (`undefined`).
  - Campus name and campus chips are scrubbed (`undefined`).
- Crucially, the student's XP **still counts** towards their campus's aggregate weekly standings, preserving competitive fairness without revealing identity.

### Campus vs Campus Battles
- Faculty and administrators can initiate inter-campus battles (`createCampusVsCampusBattleAction`).
- Automatically organizes students into distinct teams mapped to their home campuses.
- Battle scoring operates on `avg_points` (average points per team member), ensuring fair matches even when team sizes differ.

### Faculty Dashboard Filtering
- Faculty members default to viewing analytics (average XP, quiz completion, flag reviews, quiet students) scoped to their own campus.
- Administrators can switch between individual campuses or inspect platform-wide aggregates.

---

## 8. Performance Benchmark & Telemetry
A 1,000 synthetic student benchmark (`scripts/benchmark-campus-perf.ts`) was executed against the database:
- **Index Scan**: Confirmed `Bitmap Index Scan on idx_profiles_campus_id`.
- **Database Leaderboard Query Execution Time**: `0.624 ms` (requirement: `< 50 ms`).
- **Database Standings Calculation Time**: `1.769 ms`.
- **Zero Artifact Leaks**: All 1,000 synthetic benchmark records purged cleanly post-test.
