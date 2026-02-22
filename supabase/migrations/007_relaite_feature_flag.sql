-- Add relaite feature flag
-- This controls which portal users see the RELAiTE entry in the sidebar

INSERT INTO feature_flags (name, description, enabled_default)
VALUES (
  'relaite',
  'Access to the RELAiTE relationship intelligence app at relaite.stonecode.ai',
  false
)
ON CONFLICT (name) DO NOTHING;
