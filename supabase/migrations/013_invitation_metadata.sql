-- Migration 013: Add metadata JSONB column to invitations
-- Allows app-scoped invitations to carry app-specific setup data (e.g., ADAM's
-- company_id + role) that the accept-side consumes when provisioning the
-- invitee's app-specific profile. Backward compatible: existing apps
-- (mb_dashboard, relaite, aether) ignore this column.

ALTER TABLE invitations ADD COLUMN IF NOT EXISTS metadata JSONB;

COMMENT ON COLUMN invitations.metadata IS 'App-specific setup data consumed by app-accept-invitation. Example for app=adam: {"company_id": "...", "role": "internal"}.';
