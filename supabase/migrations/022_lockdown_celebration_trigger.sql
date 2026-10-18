-- Migration 022: Lockdown Celebration Trigger Function
-- Revokes EXECUTE grants on prevent_direct_celebration_update from PUBLIC, anon, and authenticated
-- to ensure full compliance with the automated Security Definer Grant Regression Guard.

REVOKE EXECUTE ON FUNCTION public.prevent_direct_celebration_update() FROM PUBLIC, anon, authenticated;
