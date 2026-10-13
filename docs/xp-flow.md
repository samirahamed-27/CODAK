# ⚡ The XP Flow Architecture (`award_xp`)

> **Golden Rule:** Every XP point is an immutable ledger entry. Total XP is strictly calculated as `SUM(xp_amount)` of valid entries. No code path may write XP other than `award_xp`.

---

## 🧭 Visual Flowchart

```mermaid
flowchart TD
    %% Styling
    classDef startNode fill:#4f46e5,stroke:#312e81,stroke-width:2px,color:#fff
    classDef checkNode fill:#0284c7,stroke:#0369a1,stroke-width:2px,color:#fff
    classDef lockNode fill:#d97706,stroke:#b45309,stroke-width:2px,color:#fff
    classDef successNode fill:#059669,stroke:#047857,stroke-width:2px,color:#fff
    classDef errorNode fill:#dc2626,stroke:#991b1b,stroke-width:2px,color:#fff

    Start["1. Server Action calls award_xp(student_id, action_type, reference_id, extra_units, actor)"]:::startNode --> RuleCheck{"2. Lookup Rule in xp_rules"}:::checkNode

    RuleCheck -- "Rule not found" --> ErrNotFound["Return { status: 'rule_not_found', xp: 0 }"]:::errorNode
    RuleCheck -- "Rule is inactive" --> ErrInactive["Return { status: 'rule_inactive', xp: 0 }"]:::errorNode
    RuleCheck -- "Active rule found" --> Lock["3. Acquire pg_advisory_xact_lock(hashtext(student), hashtext(action))"]:::lockNode

    Lock --> LimitCheck{"4. Count student's valid events today in Asia/Kolkata timezone"}:::checkNode

    LimitCheck -- "Count >= daily_limit" --> ErrLimit["Return { status: 'limit_reached', xp: 0 }"]:::errorNode
    LimitCheck -- "Count < daily_limit (or limit is null)" --> Calc["5. Calculate XP = base_xp + (extra_xp * extra_units)"]:::checkNode

    Calc --> Insert["6. INSERT INTO xp_events (student, action, ref, xp, 'valid') ON CONFLICT DO NOTHING"]:::checkNode

    Insert -- "Duplicate (student, action, reference)" --> ErrDup["Return { status: 'duplicate', xp: 0 } (Constraint Prevents Double-Tap)"]:::errorNode
    Insert -- "Row inserted successfully" --> Sum["7. Sum all valid rows for student: SELECT SUM(xp_amount) FROM xp_events WHERE status = 'valid'"]:::checkNode

    Sum --> Success["8. Return { status: 'awarded', xp_awarded, new_total, event_id }"]:::successNode
```

---

## 📝 Step-by-Step Plain English Explanation

1. **Server-Side Invocation:** The trusted server action verifies the caller's credentials (faculty or admin) and executes `award_xp` via the service role key; direct client calls are blocked with permission denied.
2. **Rule Verification:** The database looks up the action in `xp_rules` to ensure the rule exists and is currently active.
3. **Advisory Lock Serialization:** A transaction-level advisory lock serializes concurrent requests for this student and action, guaranteeing that two simultaneous double-taps cannot slip past the daily limit.
4. **Timezone Calendar Limit Check:** The database evaluates the current calendar day at midnight in `Asia/Kolkata` time and counts prior valid events to enforce the configured daily cap.
5. **Point Calculation:** Points are computed dynamically from the database rule formula: `base_xp + (extra_xp * extra_units)`.
6. **Ledger Insert:** The event is written into the immutable `xp_events` ledger table with `status = 'valid'`.
7. **Constraint Protection:** If the exact same `(student_id, action_type, reference_id)` already exists, `ON CONFLICT DO NOTHING` prevents duplicate payouts and returns `duplicate` without crashing.
8. **Total XP Computation:** The student's new total is recalculated on the fly from the sum of all valid ledger rows and returned in the JSON payload.
