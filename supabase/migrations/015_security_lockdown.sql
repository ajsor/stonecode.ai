-- Migration 015: Security lockdown — Phase 1 of multi-project security review
-- Closes four confirmed live data leaks reproducible with the project anon key,
-- and hardens four SECURITY DEFINER functions per Supabase advisory.

-- =============================================================================
-- 1. invitations: drop public SELECT-all, replace with a SECURITY DEFINER RPC
-- =============================================================================
-- The previous policy allowed anyone with the anon key to enumerate every
-- pending invitation (email + token), enabling impersonation via the accept
-- flow. The legitimate use case is "look up an invitation if you know its
-- token" — that's now a SECURITY DEFINER RPC scoped to a single token lookup.

DROP POLICY IF EXISTS "Anyone can view invitations by token" ON public.invitations;

CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token text)
RETURNS TABLE(
  id uuid,
  email text,
  app text,
  message text,
  metadata jsonb,
  expires_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz,
  invited_by uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id, email, app, message, metadata, expires_at, accepted_at, created_at, invited_by
  FROM public.invitations
  WHERE token = p_token
    AND accepted_at IS NULL
    AND expires_at > now();
$$;

GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO anon, authenticated;

COMMENT ON FUNCTION public.get_invitation_by_token IS
  'Look up a single pending, non-expired invitation by its token. Replaces the prior "Anyone can view invitations by token" RLS policy that leaked all rows.';

-- =============================================================================
-- 2. ADAM tables: tighten policies to service_role only
-- =============================================================================
-- Each of these tables had a policy named `service_role_all` whose intent was
-- to grant full access to the service role only — but the policy was created
-- with role `public` (which is granted to anon, authenticated, and service_role
-- alike). Result: anon callers could read/write/delete every row. Worker uses
-- the service role key, which still bypasses RLS regardless of policies.

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'assets', 'asset_metadata', 'companies', 'generation_jobs',
    'retrieval_jobs', 'style_profiles', 'user_profiles'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS service_role_all ON public.%I;', t);
    EXECUTE format(
      'CREATE POLICY service_role_all ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);',
      t
    );
  END LOOP;
END $$;

-- =============================================================================
-- 3. aether_debug_log: drop the open INSERT policy
-- =============================================================================
-- Previous policy allowed any anon/authenticated caller unlimited inserts
-- (DoS / DB bloat / log-poisoning vector). With the policy gone and RLS still
-- enabled, only service_role can write. Edge functions and clients that wrote
-- debug entries will silently fail; that's acceptable for a debug log.

DROP POLICY IF EXISTS debug_insert_any ON public.aether_debug_log;

-- =============================================================================
-- 4. relaite_invitations: drop the over-broad authenticated-reads-all policy
-- =============================================================================
-- The "relaite: authenticated reads invitation by token" policy had USING
-- `(auth.uid() IS NOT NULL)` — any authenticated user could enumerate all
-- pending invitations. The token-lookup pathway runs through the
-- accept-invitation edge function (service role); clients never need direct
-- SELECT on this table. The remaining "inviter reads own invitations" policy
-- correctly scopes admin's "my pending invites" list.

DROP POLICY IF EXISTS "relaite: authenticated reads invitation by token" ON public.relaite_invitations;

-- =============================================================================
-- 5. SECURITY DEFINER functions: harden search_path
-- =============================================================================
-- Functions running with elevated privileges should set an empty search_path
-- and fully-qualify all references, otherwise an attacker who can create a
-- function/table in `public` could shadow built-ins and hijack execution.

CREATE OR REPLACE FUNCTION public.auth_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = (SELECT auth.uid())),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE(
  id uuid,
  email text,
  full_name text,
  is_admin boolean,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE public.profiles.id = (SELECT auth.uid())
      AND public.profiles.is_admin = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
    SELECT p.id, p.email, p.full_name, p.is_admin, p.created_at, u.last_sign_in_at
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    ORDER BY p.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, is_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_landing_leads_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
