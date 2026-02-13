-- Fix Supabase Advisor security and performance warnings
-- Security: function search paths, overly permissive RLS policies
-- Performance: auth.uid() re-evaluation, multiple permissive policies

-- ============================================
-- 1. FIX FUNCTION SEARCH PATHS (2 security issues)
-- Set search_path to prevent search path injection
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- ============================================
-- 2. FIX PROFILES RLS (security + performance)
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON profiles;

-- Recreate with (select auth.uid()) for performance
-- Merge user + admin SELECT into one policy to avoid multiple permissive
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (
        (select auth.uid()) = id
        OR EXISTS (
            SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.is_admin = true
        )
    );

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING ((select auth.uid()) = id);

-- Restrict INSERT to authenticated users creating their own profile
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK ((select auth.uid()) = id);

-- ============================================
-- 3. FIX INVITATIONS RLS (performance)
-- Split admin FOR ALL to avoid overlap with public SELECT
-- ============================================

DROP POLICY IF EXISTS "Admins can manage invitations" ON invitations;
DROP POLICY IF EXISTS "Anyone can view invitations by token" ON invitations;

-- Public can read invitations (needed for token validation during signup)
CREATE POLICY "Anyone can view invitations by token"
    ON invitations FOR SELECT
    USING (true);

-- Admin write operations only (no SELECT overlap)
CREATE POLICY "Admins can insert invitations"
    ON invitations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND is_admin = true
        )
    );

CREATE POLICY "Admins can update invitations"
    ON invitations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND is_admin = true
        )
    );

CREATE POLICY "Admins can delete invitations"
    ON invitations FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND is_admin = true
        )
    );

-- ============================================
-- 4. FIX FEATURE_FLAGS RLS (performance)
-- Split admin FOR ALL to avoid overlap with authenticated SELECT
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can view feature flags" ON feature_flags;
DROP POLICY IF EXISTS "Admins can manage feature flags" ON feature_flags;

-- Authenticated users can read
CREATE POLICY "Authenticated users can view feature flags"
    ON feature_flags FOR SELECT
    TO authenticated
    USING (true);

-- Admin write operations only
CREATE POLICY "Admins can insert feature flags"
    ON feature_flags FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND is_admin = true
        )
    );

CREATE POLICY "Admins can update feature flags"
    ON feature_flags FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND is_admin = true
        )
    );

CREATE POLICY "Admins can delete feature flags"
    ON feature_flags FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND is_admin = true
        )
    );

-- ============================================
-- 5. FIX USER_FEATURE_FLAGS RLS (performance)
-- Merge SELECT, split admin writes
-- ============================================

DROP POLICY IF EXISTS "Users can view own feature flags" ON user_feature_flags;
DROP POLICY IF EXISTS "Admins can manage user feature flags" ON user_feature_flags;

-- Merged SELECT: own flags OR admin sees all
CREATE POLICY "Users can view own feature flags"
    ON user_feature_flags FOR SELECT
    USING (
        (select auth.uid()) = user_id
        OR EXISTS (
            SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND is_admin = true
        )
    );

-- Admin write operations
CREATE POLICY "Admins can insert user feature flags"
    ON user_feature_flags FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND is_admin = true
        )
    );

CREATE POLICY "Admins can update user feature flags"
    ON user_feature_flags FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND is_admin = true
        )
    );

CREATE POLICY "Admins can delete user feature flags"
    ON user_feature_flags FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND is_admin = true
        )
    );

-- ============================================
-- 6. FIX PASSKEYS RLS (performance)
-- ============================================

DROP POLICY IF EXISTS "Users can manage own passkeys" ON passkeys;

CREATE POLICY "Users can manage own passkeys"
    ON passkeys FOR ALL
    USING ((select auth.uid()) = user_id);

-- ============================================
-- 7. FIX AUDIT_LOG RLS (security + performance)
-- Merge SELECT, restrict INSERT to service_role
-- ============================================

DROP POLICY IF EXISTS "Users can view own audit logs" ON audit_log;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_log;
DROP POLICY IF EXISTS "Service can insert audit logs" ON audit_log;

-- Merged SELECT: own logs OR admin sees all
CREATE POLICY "Users can view audit logs"
    ON audit_log FOR SELECT
    USING (
        (select auth.uid()) = user_id
        OR EXISTS (
            SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND is_admin = true
        )
    );

-- Restrict INSERT to service_role only
CREATE POLICY "Service can insert audit logs"
    ON audit_log FOR INSERT
    TO service_role
    WITH CHECK (true);

-- ============================================
-- 8. FIX MFA_FACTORS RLS (performance)
-- ============================================

DROP POLICY IF EXISTS "Users can manage own MFA factors" ON mfa_factors;

CREATE POLICY "Users can manage own MFA factors"
    ON mfa_factors FOR ALL
    USING ((select auth.uid()) = user_id);

-- ============================================
-- 9. FIX WEBAUTHN_CHALLENGES RLS (security)
-- Restrict to service_role instead of open access
-- ============================================

DROP POLICY IF EXISTS "Service role can manage challenges" ON webauthn_challenges;

CREATE POLICY "Service role can manage challenges"
    ON webauthn_challenges FOR ALL
    TO service_role
    USING (true);

-- ============================================
-- 10. FIX WIDGET_PREFERENCES RLS (performance)
-- ============================================

DROP POLICY IF EXISTS "Users can view own widget preferences" ON widget_preferences;
DROP POLICY IF EXISTS "Users can insert own widget preferences" ON widget_preferences;
DROP POLICY IF EXISTS "Users can update own widget preferences" ON widget_preferences;
DROP POLICY IF EXISTS "Users can delete own widget preferences" ON widget_preferences;

CREATE POLICY "Users can view own widget preferences"
    ON widget_preferences FOR SELECT
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own widget preferences"
    ON widget_preferences FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own widget preferences"
    ON widget_preferences FOR UPDATE
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own widget preferences"
    ON widget_preferences FOR DELETE
    USING ((select auth.uid()) = user_id);

-- ============================================
-- 11. FIX GOOGLE_OAUTH_TOKENS RLS (performance)
-- ============================================

DROP POLICY IF EXISTS "Users can view own OAuth tokens" ON google_oauth_tokens;
DROP POLICY IF EXISTS "Users can insert own OAuth tokens" ON google_oauth_tokens;
DROP POLICY IF EXISTS "Users can update own OAuth tokens" ON google_oauth_tokens;
DROP POLICY IF EXISTS "Users can delete own OAuth tokens" ON google_oauth_tokens;

CREATE POLICY "Users can view own OAuth tokens"
    ON google_oauth_tokens FOR SELECT
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own OAuth tokens"
    ON google_oauth_tokens FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own OAuth tokens"
    ON google_oauth_tokens FOR UPDATE
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own OAuth tokens"
    ON google_oauth_tokens FOR DELETE
    USING ((select auth.uid()) = user_id);
