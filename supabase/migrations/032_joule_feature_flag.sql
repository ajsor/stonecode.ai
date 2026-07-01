INSERT INTO feature_flags (name, description, enabled_default)
VALUES ('joule', 'Access to Joule — EV shopping & comparison with weighted preferences, dealer deal-hunting, and 5-year TCO analysis at joule.stonecode.ai', false)
ON CONFLICT (name) DO NOTHING;
