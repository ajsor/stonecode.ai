-- Migration 016 — Restore admin SELECT on public.invitations
--
-- Migration 015 (security lockdown) dropped the previous public SELECT
-- policy on invitations to close a token-enumeration data leak and routed
-- token-based reads through the `get_invitation_by_token` SECURITY DEFINER
-- RPC. But no replacement SELECT policy was added for admins, so the
-- portal admin Invitations tab returned zero rows for every admin — no
-- one could see cross-project invitations they'd sent or others had sent.
--
-- This restores admin visibility only. Token-based lookups for invitees
-- continue to use the RPC; anon and non-admin authenticated users still
-- cannot enumerate invitations.

CREATE POLICY "Admins can view all invitations"
  ON public.invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.is_admin = true
    )
  );
