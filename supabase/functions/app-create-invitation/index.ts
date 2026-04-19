// Supabase Edge Function: app-create-invitation
// App-scoped invitation creator — any signed-in user with the corresponding
// feature flag can invite another user to that one app (e.g., a mb_dashboard
// user invites someone to mb_dashboard, without granting portal access).
//
// Behavior:
//   - If the target email already has a profile, grant the app's feature flag
//     directly and send a "you've been added" email (no signup step).
//   - Otherwise, create an `invitations` row with app=<app>, send an invite
//     email with a link to <app's accept URL>?token=<token>.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type AppSlug = 'mb_dashboard' | 'relaite' | 'aether' | 'adam'

const APP_CONFIG: Record<AppSlug, { label: string; acceptUrl: string; from: string }> = {
  mb_dashboard: {
    label: 'MB Dashboard',
    acceptUrl: 'https://mb-dashboard.stonecode.ai/accept-invite',
    from: 'MB Dashboard <invites@stonecode.ai>',
  },
  relaite: {
    label: 'RELAiTE',
    acceptUrl: 'https://relaite.stonecode.ai/accept-invite',
    from: 'RELAiTE <invites@stonecode.ai>',
  },
  aether: {
    label: 'Aether',
    acceptUrl: 'https://aether.stonecode.ai/accept-invite',
    from: 'Aether <invites@stonecode.ai>',
  },
  adam: {
    label: 'ADAM',
    acceptUrl: 'https://adam.stonecode.ai/accept-invite',
    from: 'ADAM <invites@stonecode.ai>',
  },
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
    const app = body?.app as AppSlug
    const email = (body?.email as string | undefined)?.trim().toLowerCase()
    const message = body?.message as string | undefined

    if (!app || !(app in APP_CONFIG)) return json({ error: 'Unknown app' }, 400)
    if (!email) return json({ error: 'Email is required' }, 400)

    // 1. Verify caller has the app's feature flag enabled
    const { data: flagRow } = await admin
      .from('feature_flags')
      .select('id, enabled_default')
      .eq('name', app)
      .single()
    if (!flagRow) return json({ error: `Feature flag '${app}' not found` }, 500)

    const { data: userOverride } = await admin
      .from('user_feature_flags')
      .select('enabled')
      .eq('user_id', user.id)
      .eq('feature_id', flagRow.id)
      .maybeSingle()

    const callerHasFlag = userOverride ? userOverride.enabled : flagRow.enabled_default
    if (!callerHasFlag) {
      return json({ error: `You must have ${APP_CONFIG[app].label} access to invite others` }, 403)
    }

    const config = APP_CONFIG[app]

    // 2. Fetch inviter name for the email
    const { data: inviterProfile } = await admin
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()
    const inviterName = inviterProfile?.full_name || inviterProfile?.email || `A ${config.label} user`

    // 3. If target email already has a profile, grant the flag directly
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle()

    if (existingProfile) {
      // Upsert user_feature_flags to enabled=true
      const { error: upsertErr } = await admin
        .from('user_feature_flags')
        .upsert(
          { user_id: existingProfile.id, feature_id: flagRow.id, enabled: true },
          { onConflict: 'user_id,feature_id' },
        )
      if (upsertErr) return json({ error: upsertErr.message }, 500)

      await sendGrantedEmail({ email, inviterName, config, message })

      await admin.from('audit_log').insert({
        user_id: user.id,
        action: 'app_access_granted_direct',
        details: { email, app, target_user_id: existingProfile.id },
      })

      return json({
        success: true,
        mode: 'granted_direct',
        message: `${email} already has a stonecode.ai account — access granted directly.`,
      })
    }

    // 4. Otherwise, create an invitation row
    const { data: existingInvite } = await admin
      .from('invitations')
      .select('id')
      .eq('email', email)
      .eq('app', app)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()
    if (existingInvite) {
      return json({ error: `An active ${config.label} invitation already exists for this email` }, 400)
    }

    const token = crypto.randomUUID() + '-' + crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const { data: invitation, error: insertErr } = await admin
      .from('invitations')
      .insert({
        email,
        token,
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
        app,
        message: message ?? null,
      })
      .select()
      .single()
    if (insertErr) return json({ error: insertErr.message }, 500)

    const inviteUrl = `${config.acceptUrl}?token=${token}`
    const emailResult = await sendInviteEmail({ email, inviterName, inviteUrl, config, message })

    await admin.from('audit_log').insert({
      user_id: user.id,
      action: 'app_invitation_created',
      details: { email, app, invitation_id: invitation.id, email_sent: emailResult.sent },
    })

    return json({
      success: true,
      mode: 'invited',
      email_sent: emailResult.sent,
      email_error: emailResult.error,
      invitation: { id: invitation.id, email, expires_at: invitation.expires_at, invite_url: inviteUrl },
    })
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

async function sendInviteEmail(args: {
  email: string
  inviterName: string
  inviteUrl: string
  config: { label: string; from: string }
  message?: string
}): Promise<{ sent: boolean; error: string | null }> {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return { sent: false, error: 'RESEND_API_KEY not configured' }

  const { email, inviterName, inviteUrl, config, message } = args
  const personalNote = message
    ? `<p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 24px;border-left:3px solid #fb923c;padding:0 0 0 16px;">${escapeHtml(message)}</p>`
    : ''

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: config.from,
        to: [email],
        subject: `${inviterName} invited you to ${config.label}`,
        html: buildInviteHtml({ inviterName, inviteUrl, personalNote, label: config.label }),
        text: `${inviterName} invited you to ${config.label}.\n\n${message ? message + '\n\n' : ''}Accept: ${inviteUrl}\n\nThis link expires in 7 days.`,
      }),
    })
    if (!res.ok) return { sent: false, error: `Resend ${res.status}: ${await res.text()}` }
    return { sent: true, error: null }
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : String(err) }
  }
}

async function sendGrantedEmail(args: {
  email: string
  inviterName: string
  config: { label: string; from: string; acceptUrl: string }
  message?: string
}): Promise<void> {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return
  const { email, inviterName, config, message } = args
  const appRoot = config.acceptUrl.replace(/\/accept-invite$/, '')
  const personalNote = message
    ? `<p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 24px;border-left:3px solid #fb923c;padding:0 0 0 16px;">${escapeHtml(message)}</p>`
    : ''

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: config.from,
        to: [email],
        subject: `${inviterName} added you to ${config.label}`,
        html: buildGrantedHtml({ inviterName, appRoot, personalNote, label: config.label }),
        text: `${inviterName} added you to ${config.label}.\n\n${message ? message + '\n\n' : ''}Sign in at ${appRoot} with your existing stonecode.ai account.`,
      }),
    })
  } catch (err) {
    console.error('sendGrantedEmail failed:', err)
  }
}

function buildInviteHtml(args: { inviterName: string; inviteUrl: string; personalNote: string; label: string }): string {
  const { inviterName, inviteUrl, personalNote, label } = args
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8fafc;padding:40px 16px;"><tr><td align="center">
<table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
<tr><td style="background:linear-gradient(135deg,#f97316,#f59e0b);padding:32px;text-align:center;">
<h1 style="color:#fff;font-size:22px;font-weight:600;margin:0;letter-spacing:-0.02em;">${escapeHtml(label)}</h1></td></tr>
<tr><td style="padding:40px 40px 32px;">
<h2 style="color:#0f172a;font-size:22px;font-weight:600;margin:0 0 16px;">You're invited</h2>
<p style="color:#475569;font-size:15px;line-height:1.65;margin:0 0 16px;"><strong style="color:#0f172a;">${escapeHtml(inviterName)}</strong> has invited you to ${escapeHtml(label)}.</p>
${personalNote}
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 16px;"><tr><td style="border-radius:12px;background:linear-gradient(135deg,#f97316,#f59e0b);">
<a href="${inviteUrl}" style="display:inline-block;padding:14px 28px;color:#fff;font-size:15px;font-weight:600;text-decoration:none;border-radius:12px;">Accept invitation</a></td></tr></table>
<p style="color:#64748b;font-size:13px;line-height:1.6;margin:20px 0 0;">Or copy this link:<br/><a href="${inviteUrl}" style="color:#ea580c;word-break:break-all;">${inviteUrl}</a></p>
<p style="color:#94a3b8;font-size:12px;margin:24px 0 0;">This invitation expires in 7 days.</p>
</td></tr></table></td></tr></table></body></html>`
}

function buildGrantedHtml(args: { inviterName: string; appRoot: string; personalNote: string; label: string }): string {
  const { inviterName, appRoot, personalNote, label } = args
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8fafc;padding:40px 16px;"><tr><td align="center">
<table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
<tr><td style="background:linear-gradient(135deg,#f97316,#f59e0b);padding:32px;text-align:center;">
<h1 style="color:#fff;font-size:22px;font-weight:600;margin:0;letter-spacing:-0.02em;">${escapeHtml(label)}</h1></td></tr>
<tr><td style="padding:40px 40px 32px;">
<h2 style="color:#0f172a;font-size:22px;font-weight:600;margin:0 0 16px;">You're in</h2>
<p style="color:#475569;font-size:15px;line-height:1.65;margin:0 0 16px;"><strong style="color:#0f172a;">${escapeHtml(inviterName)}</strong> added you to ${escapeHtml(label)}. Your existing stonecode.ai account now has access — no new signup needed.</p>
${personalNote}
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 16px;"><tr><td style="border-radius:12px;background:linear-gradient(135deg,#f97316,#f59e0b);">
<a href="${appRoot}" style="display:inline-block;padding:14px 28px;color:#fff;font-size:15px;font-weight:600;text-decoration:none;border-radius:12px;">Open ${escapeHtml(label)}</a></td></tr></table>
<p style="color:#64748b;font-size:13px;line-height:1.6;margin:20px 0 0;"><a href="${appRoot}" style="color:#ea580c;word-break:break-all;">${appRoot}</a></p>
</td></tr></table></td></tr></table></body></html>`
}
