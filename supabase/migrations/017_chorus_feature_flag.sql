INSERT INTO feature_flags (name, description, enabled_default)
VALUES ('chorus', 'Access to Chorus — AI customer feedback synthesis at chorus.stonecode.ai', false)
ON CONFLICT (name) DO NOTHING;
