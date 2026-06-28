-- Migration 028: Defense-in-depth — revoke anon SELECT on all public tables,
-- re-grant only on the three tables that legitimately need anonymous reads.
--
-- Migration 025 cut anon write privileges. SELECT was left in place because
-- removing it broadly risked breaking the cameo public renderer, the forge
-- public report viewer, and the landing-page admin dashboard.
--
-- After the 2026-06-28 audit, the actual list of tables that need anon SELECT
-- is very short and well-defined:
--   - cameo_projects, cameo_pages  → public site demo renderer at /sites/:slug
--   - forge_share_links            → public share viewer at /r/:slug
--
-- Landing pages (landing_conversations, landing_leads, landing_messages),
-- per-user data (aether_*, mfa_factors, passkeys, audit_log,
-- google_oauth_tokens, webauthn_challenges, profiles, etc.), and all
-- satellite app data have admin-only or owner-only SELECT policies. None
-- need anon SELECT — RLS already blocks unauthenticated reads, but the
-- grant was a needless extra layer for an attacker to count on.
--
-- After this migration, anon's read surface is exactly: the three tables
-- above (filtered further by their RLS policies).

REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM anon;

GRANT SELECT ON cameo_projects     TO anon;
GRANT SELECT ON cameo_pages        TO anon;
GRANT SELECT ON forge_share_links  TO anon;

-- Future tables: stay revoked. Migrations that legitimately need anon SELECT
-- must add an explicit GRANT.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE SELECT ON TABLES FROM anon;
