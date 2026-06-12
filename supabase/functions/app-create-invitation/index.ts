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
//
// Optional `metadata` in the request body is persisted on the invitation row.
// For app='adam', metadata is expected to be { company_id, role } and is used
// to provision the invitee's ADAM user_profiles row on both direct-grant and
// accept paths.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { logAppIssue } from '../_shared/appIssues.ts'

const ALLOWED_ORIGINS = new Set([
  'https://stonecode.ai',
  'https://mb-dashboard.stonecode.ai',
  'https://relaite.stonecode.ai',
  'https://aether.stonecode.ai',
  'https://adam.stonecode.ai',
  'https://chorus.stonecode.ai',
  'https://mosaic.stonecode.ai',
  'https://recon.stonecode.ai',
  'https://lens.stonecode.ai',
  'https://sketchy.stonecode.ai',
  'https://forge.stonecode.ai',
])

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : 'https://stonecode.ai'
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    Vary: 'Origin',
  }
}

type AppSlug = 'mb_dashboard' | 'relaite' | 'aether' | 'adam' | 'chorus' | 'mosaic' | 'recon' | 'lens' | 'sketchy' | 'forge' | 'cameo'

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
  chorus: {
    label: 'Chorus',
    acceptUrl: 'https://chorus.stonecode.ai/accept-invite',
    from: 'Chorus <invites@stonecode.ai>',
  },
  mosaic: {
    label: 'Mosaic',
    acceptUrl: 'https://mosaic.stonecode.ai/accept-invite',
    from: 'Mosaic <invites@stonecode.ai>',
  },
  recon: {
    label: 'Recon',
    acceptUrl: 'https://recon.stonecode.ai/accept-invite',
    from: 'Recon <invites@stonecode.ai>',
  },
  lens: {
    label: 'Lens',
    acceptUrl: 'https://lens.stonecode.ai/accept-invite',
    from: 'Lens <invites@stonecode.ai>',
  },
  sketchy: {
    label: 'Sketchy',
    acceptUrl: 'https://sketchy.stonecode.ai/accept-invite',
    from: 'Sketchy <invites@stonecode.ai>',
  },
  forge: {
    label: 'Forge',
    acceptUrl: 'https://forge.stonecode.ai/accept-invite',
    from: 'Forge <invites@stonecode.ai>',
  },
  cameo: {
    label: 'Cameo',
    acceptUrl: 'https://cameo.stonecode.ai/accept-invite',
    from: 'Cameo <invites@stonecode.ai>',
  },
}

const ADAM_COMPANY_NAMES: Record<string, string> = {
  '00000000-0000-0000-0000-000000000001': 'Acolyte Health',
  '00000000-0000-0000-0000-000000000002': 'Lockton',
}

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req)
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
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
    const rawMetadata = body?.metadata as Record<string, unknown> | undefined

    if (!app || !(app in APP_CONFIG)) return json({ error: 'Unknown app' }, 400)
    if (!email) return json({ error: 'Email is required' }, 400)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Invalid email' }, 400)
    if (email.length > 254) return json({ error: 'Email too long' }, 400)
    if (message && message.length > 2000) return json({ error: 'Message too long' }, 400)

    // Per-app metadata validation. Anything not in the allowlist is dropped
    // so a caller can't smuggle arbitrary fields onto the invitation row.
    const ADAM_VALID_COMPANY_IDS = new Set([
      '00000000-0000-0000-0000-000000000001', // Acolyte Health
      '00000000-0000-0000-0000-000000000002', // Lockton
    ])
    const ADAM_VALID_ROLES = new Set(['internal', 'admin'])
    let metadata: Record<string, unknown> | undefined
    if (app === 'adam') {
      const companyId = rawMetadata?.company_id as string | undefined
      const role = rawMetadata?.role as string | undefined
      if (!companyId || !ADAM_VALID_COMPANY_IDS.has(companyId)) {
        return json({ error: 'Invalid or missing ADAM company_id' }, 400)
      }
      if (!role || !ADAM_VALID_ROLES.has(role)) {
        return json({ error: 'Invalid or missing ADAM role' }, 400)
      }
      // Tenant isolation: a non-superadmin caller can only invite into their
      // own company. Superadmin (stonecode.ai is_admin=true) can cross tenants.
      const { data: callerProfile } = await admin
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle()
      if (!callerProfile?.is_admin) {
        const { data: callerAdamProfile } = await admin
          .from('user_profiles')
          .select('company_id, role')
          .eq('id', user.id)
          .maybeSingle()
        if (!callerAdamProfile || callerAdamProfile.company_id !== companyId) {
          return json({ error: 'You can only invite users to your own company' }, 403)
        }
      }
      metadata = { company_id: companyId, role }
    } else {
      // For non-ADAM apps, allow only the optional pre-assigned feature_flags
      // array, validated against the live feature_flags table below.
      const flags = rawMetadata?.feature_flags
      metadata = Array.isArray(flags) && flags.every((f) => typeof f === 'string')
        ? { feature_flags: flags as string[] }
        : undefined
    }

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
      const { error: upsertErr } = await admin
        .from('user_feature_flags')
        .upsert(
          { user_id: existingProfile.id, feature_id: flagRow.id, enabled: true },
          { onConflict: 'user_id,feature_id' },
        )
      if (upsertErr) return json({ error: upsertErr.message }, 500)

      // For ADAM, also upsert the user_profiles row so the invitee appears in
      // the Acolyte tenant with the specified role on first sign-in.
      if (app === 'adam' && metadata?.company_id && metadata?.role) {
        await admin.from('user_profiles').upsert({
          id: existingProfile.id,
          company_id: metadata.company_id,
          role: metadata.role,
        }, { onConflict: 'id' })
      }

      await sendGrantedEmail({ email, inviterName, config, message, app, metadata })

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
        metadata: metadata ?? null,
      })
      .select()
      .single()
    if (insertErr) return json({ error: insertErr.message }, 500)

    const inviteUrl = `${config.acceptUrl}?token=${token}`
    const emailResult = await sendInviteEmail({ email, inviterName, inviteUrl, config, message, app, metadata })

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
    const msg = err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : String(err)
    logAppIssue({ fn: 'app-create-invitation', detail: msg })
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})

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
  app: AppSlug
  metadata?: Record<string, unknown>
}): Promise<{ sent: boolean; error: string | null }> {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return { sent: false, error: 'RESEND_API_KEY not configured' }

  const { email, inviterName, inviteUrl, config, message, app, metadata } = args

  try {
    const html = app === 'adam'
      ? buildAdamInviteHtml({ inviterName, inviteUrl, message, metadata })
      : buildInviteHtml({ inviterName, inviteUrl, personalNote: buildPersonalNote(message), label: config.label })

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: config.from,
        to: [email],
        subject: `${inviterName} invited you to ${config.label}`,
        html,
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
  app: AppSlug
  metadata?: Record<string, unknown>
}): Promise<void> {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return
  const { email, inviterName, config, message, app, metadata } = args
  const appRoot = config.acceptUrl.replace(/\/accept-invite$/, '')

  try {
    const html = app === 'adam'
      ? buildAdamGrantedHtml({ inviterName, appRoot, message, metadata })
      : buildGrantedHtml({ inviterName, appRoot, personalNote: buildPersonalNote(message), label: config.label })

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: config.from,
        to: [email],
        subject: `${inviterName} added you to ${config.label}`,
        html,
        text: `${inviterName} added you to ${config.label}.\n\n${message ? message + '\n\n' : ''}Sign in at ${appRoot} with your existing stonecode.ai account.`,
      }),
    })
  } catch (err) {
    console.error('sendGrantedEmail failed:', err)
  }
}

function buildPersonalNote(message?: string): string {
  return message
    ? `<p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 24px;border-left:3px solid #fb923c;padding:0 0 0 16px;">${escapeHtml(message)}</p>`
    : ''
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

function buildAdamInviteHtml(args: {
  inviterName: string
  inviteUrl: string
  message?: string
  metadata?: Record<string, unknown>
}): string {
  const { inviterName, inviteUrl, message, metadata } = args
  const companyId = metadata?.company_id as string | undefined
  const role = metadata?.role as string | undefined
  const companyName = companyId ? (ADAM_COMPANY_NAMES[companyId] ?? 'Acolyte Health') : 'Acolyte Health'
  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Internal'
  const personalNote = message
    ? `<p style="color:#32373c;font-size:13px;line-height:1.6;margin:0 0 20px;border-left:3px solid #ff6900;padding:0 0 0 12px;">${escapeHtml(message)}</p>`
    : ''

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0f0f0;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#32373c;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f0f0f0;padding:40px 16px;"><tr><td align="center">
<table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;border:1px solid #e5e7eb;">
<tr><td style="background:#32373c;padding:28px 32px;">
<div style="font-size:11px;font-weight:600;letter-spacing:2px;color:#ff6900;text-transform:uppercase;margin-bottom:6px;">Acolyte Digital Asset Manager</div>
<div style="font-size:24px;font-weight:600;color:#ffffff;letter-spacing:-0.01em;">ADAM</div>
</td></tr>
<tr><td style="padding:36px 32px 28px;">
<h2 style="color:#32373c;font-size:20px;font-weight:600;margin:0 0 16px;">You're invited</h2>
<p style="color:#32373c;font-size:15px;line-height:1.65;margin:0 0 20px;"><strong>${escapeHtml(inviterName)}</strong> has invited you to ADAM, the AI-powered digital asset manager for Acolyte Health.</p>
${personalNote}
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;border:1px solid #e5e7eb;width:100%;">
<tr><td style="padding:10px 14px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;width:90px;">Company</td><td style="padding:10px 14px;font-size:13px;color:#32373c;font-weight:500;">${escapeHtml(companyName)}</td></tr>
<tr><td style="padding:10px 14px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;border-top:1px solid #e5e7eb;">Role</td><td style="padding:10px 14px;font-size:13px;color:#32373c;font-weight:500;border-top:1px solid #e5e7eb;">${escapeHtml(roleLabel)}</td></tr>
</table>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;"><tr><td style="background:#ff6900;">
<a href="${inviteUrl}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:14px;font-weight:500;text-decoration:none;">Accept invitation</a></td></tr></table>
<p style="color:#6b7280;font-size:12px;line-height:1.6;margin:0 0 4px;">Or copy this link into your browser:</p>
<p style="color:#32373c;font-size:12px;line-height:1.6;margin:0 0 20px;word-break:break-all;"><a href="${inviteUrl}" style="color:#ff6900;text-decoration:none;">${inviteUrl}</a></p>
<p style="color:#6b7280;font-size:12px;line-height:1.6;margin:0;">You'll create a password and set your display name when you accept. This link expires in 7 days.</p>
</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #e5e7eb;background:#fafafa;">
<p style="color:#6b7280;font-size:11px;margin:0;">ADAM &middot; Acolyte Health &middot; <a href="https://adam.stonecode.ai" style="color:#6b7280;text-decoration:none;">adam.stonecode.ai</a></p>
</td></tr></table></td></tr></table></body></html>`
}

function buildAdamGrantedHtml(args: {
  inviterName: string
  appRoot: string
  message?: string
  metadata?: Record<string, unknown>
}): string {
  const { inviterName, appRoot, message, metadata } = args
  const companyId = metadata?.company_id as string | undefined
  const role = metadata?.role as string | undefined
  const companyName = companyId ? (ADAM_COMPANY_NAMES[companyId] ?? 'Acolyte Health') : 'Acolyte Health'
  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Internal'
  const personalNote = message
    ? `<p style="color:#32373c;font-size:13px;line-height:1.6;margin:0 0 20px;border-left:3px solid #ff6900;padding:0 0 0 12px;">${escapeHtml(message)}</p>`
    : ''

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0f0f0;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#32373c;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f0f0f0;padding:40px 16px;"><tr><td align="center">
<table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;border:1px solid #e5e7eb;">
<tr><td style="background:#32373c;padding:28px 32px;">
<div style="font-size:11px;font-weight:600;letter-spacing:2px;color:#ff6900;text-transform:uppercase;margin-bottom:6px;">Acolyte Digital Asset Manager</div>
<div style="font-size:24px;font-weight:600;color:#ffffff;letter-spacing:-0.01em;">ADAM</div>
</td></tr>
<tr><td style="padding:36px 32px 28px;">
<h2 style="color:#32373c;font-size:20px;font-weight:600;margin:0 0 16px;">You're in</h2>
<p style="color:#32373c;font-size:15px;line-height:1.65;margin:0 0 20px;"><strong>${escapeHtml(inviterName)}</strong> added you to ADAM. Sign in with your existing stonecode.ai account.</p>
${personalNote}
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;border:1px solid #e5e7eb;width:100%;">
<tr><td style="padding:10px 14px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;width:90px;">Company</td><td style="padding:10px 14px;font-size:13px;color:#32373c;font-weight:500;">${escapeHtml(companyName)}</td></tr>
<tr><td style="padding:10px 14px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;border-top:1px solid #e5e7eb;">Role</td><td style="padding:10px 14px;font-size:13px;color:#32373c;font-weight:500;border-top:1px solid #e5e7eb;">${escapeHtml(roleLabel)}</td></tr>
</table>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;"><tr><td style="background:#ff6900;">
<a href="${appRoot}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:14px;font-weight:500;text-decoration:none;">Open ADAM</a></td></tr></table>
<p style="color:#32373c;font-size:12px;line-height:1.6;margin:0 0 20px;word-break:break-all;"><a href="${appRoot}" style="color:#ff6900;text-decoration:none;">${appRoot}</a></p>
</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #e5e7eb;background:#fafafa;">
<p style="color:#6b7280;font-size:11px;margin:0;">ADAM &middot; Acolyte Health &middot; <a href="https://adam.stonecode.ai" style="color:#6b7280;text-decoration:none;">adam.stonecode.ai</a></p>
</td></tr></table></td></tr></table></body></html>`
}
