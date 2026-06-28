-- Migration 026: Tighten app_issues insert policy.
--
-- 023_app_issues.sql declared:
--   CREATE POLICY app_issues_insert_authenticated ON app_issues
--     FOR INSERT TO authenticated WITH CHECK (true);
--
-- Any authenticated user (e.g. an end-user of aether or chorus) could
-- insert rows attributing errors to any other user_id or to any app slug,
-- polluting the admin dashboard with forged entries.
--
-- All edge-function loggers (supabase/functions/_shared/appIssues.ts in
-- every app) use the service-role key and bypass RLS, so they are
-- unaffected. The 2026-06-28 audit found no client-side code that
-- INSERTs into app_issues today, but the policy intent — apps may log
-- from a user session — is preserved by allowing inserts only when the
-- user_id either matches auth.uid() or is NULL.

DROP POLICY IF EXISTS "app_issues_insert_authenticated" ON app_issues;

CREATE POLICY "app_issues_insert_authenticated" ON app_issues
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
