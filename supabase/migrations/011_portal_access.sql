-- Migration 011: profiles.portal_access
-- Separates "can sign into the stonecode.ai portal" from "can use <app>".
-- Existing users are all portal users (they were invited by admin) — backfilled to true.
-- New users arriving via app invite flows (relaite, aether, mb-dashboard) stay at
-- default false; the portal admin grants portal_access when appropriate.

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS portal_access BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: every profile that exists today was created through the portal
-- (or via admin invite), so grant portal access to all of them.
UPDATE profiles SET portal_access = TRUE WHERE portal_access = FALSE;

-- The handle_new_user trigger does not set portal_access, so new rows
-- default to FALSE. No trigger changes needed.

COMMENT ON COLUMN profiles.portal_access IS
    'True if user can sign into /portal/* on stonecode.ai. False for app-only users (e.g. invited to RELAiTE by another RELAiTE user). Orthogonal to per-app feature flags.';
