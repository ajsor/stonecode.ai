-- Migration 029: Document the three RLS-enabled, zero-policy tables as
-- intentionally service-role-only.
--
-- The 2026-06-28 audit flagged:
--   - aether_debug_log    → development debug log; only the aether
--                           generate-image / transcribe-dream edge functions
--                           write to it via service role
--   - feature_requests    → adam worker writes via service role
--                           (per adam/supabase/migrations/004_*)
--   - prompt_library      → adam worker writes via service role (same)
--
-- These were intentional designs (see adam migration 004 for full context).
-- RLS-enabled + zero-policies = deny-by-default for anon and authenticated
-- roles; service role bypasses RLS, so the responsible callers still work.
--
-- This migration adds COMMENT ON TABLE so the design intent is visible in
-- the database itself. No policy changes.

COMMENT ON TABLE aether_debug_log IS
  'Service-role only (RLS enabled, no policies). Written by aether edge functions for dev/debug visibility.';

COMMENT ON TABLE feature_requests IS
  'Service-role only (RLS enabled, no policies). Adam worker manages reads/writes; see adam migration 004.';

COMMENT ON TABLE prompt_library IS
  'Service-role only (RLS enabled, no policies). Adam worker manages reads/writes; see adam migration 004.';
