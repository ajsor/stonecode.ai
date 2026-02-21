-- Fix infinite recursion in profiles RLS
--
-- Migration 005 merged the admin+user SELECT policy into one, but kept a
-- self-referential subquery:
--
--   CREATE POLICY "Users can view own profile" ON profiles FOR SELECT
--   USING (
--     (select auth.uid()) = id
--     OR EXISTS (
--       SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.is_admin = true
--     )  ← queries profiles from inside a profiles policy = infinite recursion
--   );
--
-- Fix: SECURITY DEFINER function that reads profiles while bypassing RLS,
-- breaking the recursion chain.

-- 1. Create security definer helper (runs as table owner, bypasses RLS)
CREATE OR REPLACE FUNCTION auth_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

-- 2. Drop both the recursive policy (from 005) and any leftover from 001
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- 3. Recreate with auth_is_admin() - no self-reference, no recursion
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (
        (select auth.uid()) = id
        OR auth_is_admin()
    );
