INSERT INTO feature_flags (name, description, enabled_default)
VALUES ('forge', 'Access to Forge — AI SMB optimization reports + priced SOWs at forge.stonecode.ai', false)
ON CONFLICT (name) DO NOTHING;
