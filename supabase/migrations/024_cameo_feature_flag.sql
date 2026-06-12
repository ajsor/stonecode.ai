INSERT INTO feature_flags (name, description, enabled_default)
VALUES ('cameo', 'Access to Cameo — AI website builder that turns social references into a portable demo site at cameo.stonecode.ai', false)
ON CONFLICT (name) DO NOTHING;
