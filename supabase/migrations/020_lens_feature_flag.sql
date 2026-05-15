INSERT INTO feature_flags (name, description, enabled_default)
VALUES ('lens', 'Access to Lens — AI document chat & extractor at lens.stonecode.ai', false)
ON CONFLICT (name) DO NOTHING;
