-- Migration 025: Remove the historical Supabase blanket DML grants to `anon`.
--
-- 2026-06-28 audit found that every table in `public` had GRANT INSERT,
-- UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER to `anon` (the old Supabase
-- default). Today the only thing keeping anon from writing is RLS — a single
-- mistaken policy or a forgotten `ENABLE ROW LEVEL SECURITY` opens any table
-- to anonymous writes. Defense-in-depth requires the role itself not to have
-- the privilege.
--
-- This migration:
--   1. Revokes all destructive privileges from anon on every existing table.
--      SELECT is preserved — apps like cameo's public renderer, forge's share
--      links, the landing pages, and feature_flags need anon SELECT through
--      their RLS policies.
--   2. Alters the default privileges for new tables in `public` so future
--      migrations can't accidentally re-introduce the grant.
--
-- After this, anon's effective write surface is exactly zero. No client-side
-- INSERT/UPDATE/DELETE works for unauthenticated users on any public table.
-- All writes must come through either an authenticated session (RLS applies)
-- or a service-role edge function.

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON ALL TABLES IN SCHEMA public FROM anon;

-- Future tables — keep anon out of write privileges by default.
-- Tables that legitimately need anon SELECT must add it explicitly per migration.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM anon;
