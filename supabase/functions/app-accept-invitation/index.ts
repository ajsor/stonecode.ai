// Supabase Edge Function: app-accept-invitation
// Accepts an app-scoped invitation token and grants the corresponding feature
// flag to the calling (authenticated) user. Does NOT grant portal_access
// unless app='portal'. Intended to be called by the satellite app's
// /accept-invite page after the invitee signs in or signs up.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing authorization' }, 401)
    const bearer = authHeader.replace('Bearer ', '')

    const { data: { user }, error: authError } = await admin.auth.getUser(bearer)
    if (authError || !user) return json({ error: 'Unauthorized' }, 401)

    const body = await req.json()
    const token = body?.token as string | undefined
    if (!token) return json({ error: 'Token is required' }, 400)

    const { data: invite, error: inviteErr } = await admin
      .from('invitations')
      .select('id, email, app, expires_at, accepted_at, invited_by')
      .eq('token', token)
      .maybeSingle()
    if (inviteErr) return json({ error: inviteErr.message }, 500)
    if (!invite) return json({ error: 'Invitation not found' }, 404)
    if (invite.accepted_at) return json({ error: 'Invitation already accepted' }, 400)
    if (new Date(invite.expires_at) < new Date()) return json({ error: 'Invitation expired' }, 400)

    // Ensure the caller's email matches the invite (case-insensitive).
    // Merging by email is the point — any account with the same email can claim.
    const callerEmail = (user.email ?? '').toLowerCase()
    if (callerEmail !== invite.email.toLowerCase()) {
      return json({ error: `This invitation is for ${invite.email}. Sign in with that email to accept.` }, 403)
    }

    // portal invites keep legacy behavior; app-scoped invites only grant the flag.
    if (invite.app === 'portal') {
      await admin
        .from('profiles')
        .update({ portal_access: true })
        .eq('id', user.id)
    } else {
      const { data: flagRow } = await admin
        .from('feature_flags')
        .select('id')
        .eq('name', invite.app)
        .single()
      if (!flagRow) return json({ error: `Feature flag '${invite.app}' not found` }, 500)

      const { error: upsertErr } = await admin
        .from('user_feature_flags')
        .upsert(
          { user_id: user.id, feature_id: flagRow.id, enabled: true },
          { onConflict: 'user_id,feature_id' },
        )
      if (upsertErr) return json({ error: upsertErr.message }, 500)
    }

    await admin
      .from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id)

    await admin.from('audit_log').insert({
      user_id: user.id,
      action: 'app_invitation_accepted',
      details: { app: invite.app, invitation_id: invite.id, inviter_id: invite.invited_by },
    })

    return json({ success: true, app: invite.app })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return json({ error: msg }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
