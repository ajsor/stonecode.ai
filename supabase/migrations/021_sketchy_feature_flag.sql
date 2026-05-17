INSERT INTO feature_flags (name, description, enabled_default)
VALUES ('sketchy', 'Access to Sketchy — comedic screenplay generator at sketchy.stonecode.ai', false)
ON CONFLICT (name) DO NOTHING;
