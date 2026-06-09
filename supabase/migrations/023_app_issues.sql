-- Migration 023: app_issues
-- Centralized warning/error log shared across all satellite apps (aether,
-- forge, sketchy, chorus, mosaic, recon, lens, adam, etc.) and stonecode.ai
-- itself. Surfaced in the admin portal "App Issues" dashboard card + page.
-- Any authenticated user can insert (apps log errors as they happen); only
-- admins can read, update, or delete.

CREATE TABLE IF NOT EXISTS app_issues (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- App slug: 'aether', 'forge', 'sketchy', 'stonecode', etc. Free-form so
  -- new apps can log without a schema change.
  app         TEXT NOT NULL,
  severity    TEXT NOT NULL CHECK (severity IN ('warning', 'error')),
  message     TEXT NOT NULL,
  -- Stack trace, request payload, or other free-form context the fix prompt
  -- can include verbatim. Truncated by the client before insert if needed.
  details     TEXT,
  -- Where it came from: 'client', 'edge_function', 'background_job', etc.
  source      TEXT,
  -- Optional path/route that triggered the issue, useful for the fix prompt.
  location    TEXT,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved    BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Index for the unresolved-count badge + admin page (most-recent first).
CREATE INDEX IF NOT EXISTS idx_app_issues_unresolved
  ON app_issues(created_at DESC)
  WHERE resolved = FALSE;

CREATE INDEX IF NOT EXISTS idx_app_issues_app_severity
  ON app_issues(app, severity, created_at DESC);

ALTER TABLE app_issues ENABLE ROW LEVEL SECURITY;

-- INSERT: any authenticated user can log an issue. Apps run in the user's
-- session, so we trust the session to log on their behalf. Admin alerting
-- happens via the admin UI; we don't allow anon inserts to avoid log-flood
-- abuse from unauthenticated clients.
DROP POLICY IF EXISTS "app_issues_insert_authenticated" ON app_issues;
CREATE POLICY "app_issues_insert_authenticated" ON app_issues
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "app_issues_select_admin" ON app_issues;
CREATE POLICY "app_issues_select_admin" ON app_issues
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

DROP POLICY IF EXISTS "app_issues_update_admin" ON app_issues;
CREATE POLICY "app_issues_update_admin" ON app_issues
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

DROP POLICY IF EXISTS "app_issues_delete_admin" ON app_issues;
CREATE POLICY "app_issues_delete_admin" ON app_issues
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Explicit GRANTs: new tables on the shared project need them to be exposed
-- via the PostgREST Data API since the 2026-10-30 default change.
GRANT SELECT, INSERT, UPDATE, DELETE ON app_issues TO authenticated;

COMMENT ON TABLE app_issues IS 'Centralized warning/error log across stonecode.ai and all satellite apps. Surfaced in /portal/admin/app-issues.';
