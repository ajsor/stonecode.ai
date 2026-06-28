-- Migration 030: app_launches — portal-side telemetry for satellite app use.
--
-- Logged client-side from PortalLayout.openTool() when a user clicks a
-- satellite app tile in the sidebar. Powers the admin App Utilization
-- dashboard (DAU / WAU / MAU, launches per app, adoption funnel).
--
-- One row per launch. No PII beyond the user_id FK. The shared project
-- is on the free tier — keep rows lean and let an admin RPC do the
-- aggregation server-side rather than streaming rows to the client.

CREATE TABLE IF NOT EXISTS app_launches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- App slug: 'aether', 'forge', 'cameo', etc. Free-form so new satellites
  -- can log without a schema change.
  app         TEXT NOT NULL,
  -- 'portal-sidebar' for now. Forward-compat for 'dashboard-shortcut',
  -- 'satellite-beacon', etc.
  source      TEXT NOT NULL DEFAULT 'portal-sidebar',
  launched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Filter by user (own history) and by app+window (rollups).
CREATE INDEX IF NOT EXISTS idx_app_launches_user_time
  ON app_launches(user_id, launched_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_launches_app_time
  ON app_launches(app, launched_at DESC);

ALTER TABLE app_launches ENABLE ROW LEVEL SECURITY;

-- INSERT: signed-in user can log only for themselves. Prevents forgery
-- of launches attributed to other users (same lesson as migration 026).
CREATE POLICY "app_launches_insert_own" ON app_launches
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- SELECT: own rows for the user's profile timeline; admins see all so
-- the App Utilization page can aggregate.
CREATE POLICY "app_launches_select_own" ON app_launches
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "app_launches_select_admin" ON app_launches
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- No UPDATE/DELETE for end users — launches are immutable history. Service
-- role bypasses RLS if cleanup is ever needed.

-- Required for Data API exposure per the 2026-10-30 policy change.
GRANT SELECT, INSERT ON app_launches TO authenticated;

COMMENT ON TABLE app_launches IS 'One row per satellite-app launch from the portal. Powers /portal/admin/utilization.';
