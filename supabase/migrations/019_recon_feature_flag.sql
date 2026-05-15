INSERT INTO feature_flags (name, description, enabled_default)
VALUES ('recon', 'Access to Recon — AI meeting prep briefs at recon.stonecode.ai', false)
ON CONFLICT (name) DO NOTHING;
