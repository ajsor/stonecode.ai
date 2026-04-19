-- Migration 012: App-scoped invitations
-- Adds `app` + `message` columns to the shared invitations table so that
-- satellite apps (mb_dashboard, relaite, aether) can issue invites that
-- grant ONLY that app's feature flag, without unlocking the portal.
--
-- Backward compatibility: all existing rows default to app='portal', which
-- matches the admin Invitations UI behavior on stonecode.ai today.

ALTER TABLE invitations ADD COLUMN IF NOT EXISTS app TEXT NOT NULL DEFAULT 'portal';
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS message TEXT;

CREATE INDEX IF NOT EXISTS idx_invitations_email_app ON invitations(email, app);
CREATE INDEX IF NOT EXISTS idx_invitations_app ON invitations(app);

COMMENT ON COLUMN invitations.app IS 'Which app this invitation grants access to: portal, mb_dashboard, relaite, aether, adam. App-scoped invites DO NOT grant portal_access.';
COMMENT ON COLUMN invitations.message IS 'Optional personal note from inviter, shown on the accept page.';
