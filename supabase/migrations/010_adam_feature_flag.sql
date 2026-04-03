INSERT INTO feature_flags (name, description, enabled_default)
VALUES (
  'adam',
  'Access to ADAM — Acolyte Digital Asset Manager at adam.stonecode.ai',
  false
)
ON CONFLICT (name) DO NOTHING;
