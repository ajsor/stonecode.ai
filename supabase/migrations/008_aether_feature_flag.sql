INSERT INTO feature_flags (name, description, enabled_default)
VALUES ('aether', 'Access to the Aether dream journal at aether.stonecode.ai', false)
ON CONFLICT (name) DO NOTHING;
