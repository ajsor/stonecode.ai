-- Fix infinite recursion in profiles RLS policy
--
-- The "Admins can view all profiles" policy used:
--   EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
--
-- PostgreSQL evaluates ALL policies for a table on every access, so this
-- sub-query back into `profiles` re-triggered the same policies → infinite loop.
--
-- Fix: create a SECURITY DEFINER function that reads `profiles` while bypassing
-- RLS (runs as the table owner), breaking the recursion chain.

-- 1. Security definer function to check admin status without triggering RLS
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

-- 2. Replace the recursive policy on profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    USING (auth_is_admin());
