-- Migration 027: Close the feature_flags enumeration leak.
--
-- The 2026-06-09 audit flagged that the SELECT policy on feature_flags was
-- USING (true) for all authenticated users. That meant a user invited only
-- to one satellite app (say, aether) could query feature_flags and see the
-- names of every unreleased satellite (forge, cameo, lens, recon, etc.).
--
-- New policy: a user can read a feature flag row iff
--   (a) they're a portal admin, OR
--   (b) the flag is enabled by default for everyone, OR
--   (c) they have an explicit user_feature_flags entry for it.
--
-- This preserves the FeatureFlagProvider's getUserFeatureFlags() flow —
-- it still pulls user_feature_flags joined with feature_flags AND a bare
-- feature_flags read for the defaults merge. Both queries still return
-- the rows that user is entitled to see. Admins on /portal/admin/features
-- continue to see everything.

DROP POLICY IF EXISTS "Authenticated users can view feature flags" ON feature_flags;

CREATE POLICY "feature_flags_select_entitled"
  ON feature_flags FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
    OR enabled_default = TRUE
    OR EXISTS (
      SELECT 1 FROM user_feature_flags
      WHERE user_id = auth.uid() AND feature_id = feature_flags.id
    )
  );
