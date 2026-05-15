INSERT INTO feature_flags (name, description, enabled_default)
VALUES ('mosaic', 'Access to Mosaic — AI brand identity studio at mosaic.stonecode.ai', false)
ON CONFLICT (name) DO NOTHING;
