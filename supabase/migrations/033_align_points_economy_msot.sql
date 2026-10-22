-- ==============================================================================
-- Migration 033: Align Points Economy with MSOT Competition Rubric
-- ==============================================================================
-- 1. Attend a class: 10 XP (per class, official attendance only)
-- 2. Club activity participation: 25 XP (per verified club day)
-- ==============================================================================

UPDATE public.xp_rules
SET base_xp = 10,
    display_name = 'Class Attendance (Verified)',
    daily_limit = 6,
    active = true
WHERE action_type = 'ATTENDANCE_MARKED';

UPDATE public.xp_rules
SET base_xp = 25,
    display_name = 'Club Activity (Verified)',
    daily_limit = 2,
    active = true
WHERE action_type = 'CLUB_ACTIVITY';
