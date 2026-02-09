-- stonecode.ai User Portal Database Schema
-- Run this migration in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- Extended user data linked to auth.users
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Service role can insert profiles (for signup)
CREATE POLICY "Service role can insert profiles"
    ON profiles FOR INSERT
    WITH CHECK (true);

-- ============================================
-- INVITATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);

-- RLS for invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Admins can manage invitations
CREATE POLICY "Admins can manage invitations"
    ON invitations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Anyone can validate invitations by token (for signup)
CREATE POLICY "Anyone can view invitations by token"
    ON invitations FOR SELECT
    USING (true);

-- ============================================
-- FEATURE FLAGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    enabled_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for feature_flags
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read feature flags
CREATE POLICY "Authenticated users can view feature flags"
    ON feature_flags FOR SELECT
    TO authenticated
    USING (true);

-- Only admins can manage feature flags
CREATE POLICY "Admins can manage feature flags"
    ON feature_flags FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
        )
    );

-- ============================================
-- USER FEATURE FLAGS TABLE
-- Per-user feature overrides
-- ============================================
CREATE TABLE IF NOT EXISTS user_feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    feature_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, feature_id)
);

-- RLS for user_feature_flags
ALTER TABLE user_feature_flags ENABLE ROW LEVEL SECURITY;

-- Users can read their own feature flags
CREATE POLICY "Users can view own feature flags"
    ON user_feature_flags FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can manage all user feature flags
CREATE POLICY "Admins can manage user feature flags"
    ON user_feature_flags FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
        )
    );

-- ============================================
-- PASSKEYS TABLE
-- WebAuthn credentials
-- ============================================
CREATE TABLE IF NOT EXISTS passkeys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    credential_id TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    counter INTEGER DEFAULT 0,
    device_type TEXT,
    backed_up BOOLEAN DEFAULT FALSE,
    transports TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

-- Index for credential lookups
CREATE INDEX IF NOT EXISTS idx_passkeys_credential_id ON passkeys(credential_id);
CREATE INDEX IF NOT EXISTS idx_passkeys_user_id ON passkeys(user_id);

-- RLS for passkeys
ALTER TABLE passkeys ENABLE ROW LEVEL SECURITY;

-- Users can manage their own passkeys
CREATE POLICY "Users can manage own passkeys"
    ON passkeys FOR ALL
    USING (auth.uid() = user_id);

-- ============================================
-- AUDIT LOG TABLE
-- Security event tracking
-- ============================================
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user audit queries
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- RLS for audit_log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs"
    ON audit_log FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs"
    ON audit_log FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Service can insert audit logs
CREATE POLICY "Service can insert audit logs"
    ON audit_log FOR INSERT
    WITH CHECK (true);

-- ============================================
-- MFA FACTORS TABLE
-- For TOTP-based MFA
-- ============================================
CREATE TABLE IF NOT EXISTS mfa_factors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    factor_type TEXT NOT NULL DEFAULT 'totp',
    friendly_name TEXT,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, factor_type)
);

-- RLS for mfa_factors
ALTER TABLE mfa_factors ENABLE ROW LEVEL SECURITY;

-- Users can manage their own MFA factors
CREATE POLICY "Users can manage own MFA factors"
    ON mfa_factors FOR ALL
    USING (auth.uid() = user_id);

-- ============================================
-- SEED DATA
-- Initial feature flags
-- ============================================
INSERT INTO feature_flags (name, description, enabled_default) VALUES
    ('admin_panel', 'Access to the admin panel', false),
    ('advanced_analytics', 'Access to advanced analytics features', false),
    ('beta_features', 'Access to beta features', false)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();
