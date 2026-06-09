// Supabase Edge Function: create-invitation
// Creates an invitation and sends an email with the invite link + QR code

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { logAppIssue } from '../_shared/appIssues.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://stonecode.ai',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')

    // Verify the user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get request body
    const { email, message, feature_flags } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate requested feature flags exist. Names are kept (not IDs) so the
    // metadata stays human-readable; the accept function will resolve to IDs.
    let validFlagNames: string[] = []
    if (Array.isArray(feature_flags) && feature_flags.length > 0) {
      const requested = feature_flags.filter((n) => typeof n === 'string')
      const { data: flagRows, error: flagErr } = await supabaseClient
        .from('feature_flags')
        .select('name')
        .in('name', requested)
      if (flagErr) {
        return new Response(
          JSON.stringify({ error: `Failed to validate feature flags: ${flagErr.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      validFlagNames = (flagRows ?? []).map((r) => r.name as string)
      const unknown = requested.filter((n) => !validFlagNames.includes(n))
      if (unknown.length > 0) {
        return new Response(
          JSON.stringify({ error: `Unknown feature flag(s): ${unknown.join(', ')}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Check if email already has pending invitation
    const { data: existingInvite } = await supabaseClient
      .from('invitations')
      .select('id')
      .eq('email', email)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (existingInvite) {
      return new Response(
        JSON.stringify({ error: 'An active invitation already exists for this email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: 'A user with this email already exists' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate secure token
    const token_value = crypto.randomUUID() + '-' + crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

    // Create invitation. metadata.feature_flags carries any flags the admin
    // pre-selected; app-accept-invitation grants them on accept so the
    // invitee lands with access on first login.
    const metadata =
      validFlagNames.length > 0 ? { feature_flags: validFlagNames } : null

    const { data: invitation, error: insertError } = await supabaseClient
      .from('invitations')
      .insert({
        email,
        token: token_value,
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
        metadata,
      })
      .select()
      .single()

    if (insertError) {
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate invite URL
    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://stonecode.ai'
    const inviteUrl = `${siteUrl}/accept-invite?token=${token_value}`

    // Fetch inviter profile for personalized email
    const { data: inviterProfile } = await supabaseClient
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    const inviterName = inviterProfile?.full_name || inviterProfile?.email || 'The stonecode.ai team'

    // Send the invitation email via Resend. If RESEND_API_KEY is missing,
    // continue silently so admins can still copy the link manually.
    const resendKey = Deno.env.get('RESEND_API_KEY')
    let emailSent = false
    let emailError: string | null = null
    if (resendKey) {
      try {
        const fromAddr = Deno.env.get('INVITE_FROM') ?? 'stonecode.ai <invites@stonecode.ai>'
        const personalNote = message
          ? `<p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 24px;border-left:3px solid #fb923c;padding:0 0 0 16px;">${escapeHtml(message)}</p>`
          : ''

        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddr,
            to: [email],
            subject: `${inviterName} invited you to stonecode.ai`,
            html: buildInviteEmailHtml({
              inviterName,
              inviteUrl,
              personalNote,
            }),
            text: buildInviteEmailText({ inviterName, inviteUrl, message }),
          }),
        })

        if (emailRes.ok) {
          emailSent = true
        } else {
          emailError = `Resend responded ${emailRes.status}: ${await emailRes.text()}`
          console.error('Resend send failed:', emailError)
        }
      } catch (err) {
        emailError = err instanceof Error ? err.message : String(err)
        console.error('Resend send threw:', emailError)
      }
    } else {
      emailError = 'RESEND_API_KEY not configured — email skipped.'
    }

    // Log audit event
    await supabaseClient
      .from('audit_log')
      .insert({
        user_id: user.id,
        action: 'invitation_created',
        details: { email, invitation_id: invitation.id, email_sent: emailSent },
      })

    return new Response(
      JSON.stringify({
        success: true,
        email_sent: emailSent,
        email_error: emailError,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          expires_at: invitation.expires_at,
          invite_url: inviteUrl,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const detail = error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error)
    logAppIssue({ fn: 'create-invitation', detail })
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildInviteEmailHtml(args: {
  inviterName: string
  inviteUrl: string
  personalNote: string
}): string {
  const { inviterName, inviteUrl, personalNote } = args
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Your stonecode.ai invitation</title>
  </head>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8fafc;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
            <tr>
              <td style="background:linear-gradient(135deg,#f97316,#f59e0b);padding:32px 32px 28px;text-align:center;">
                <div style="display:inline-block;background:rgba(255,255,255,0.18);border-radius:14px;padding:12px;">
                  <span style="color:#ffffff;font-size:22px;font-weight:600;letter-spacing:-0.02em;">&lt;/&gt;</span>
                </div>
                <h1 style="color:#ffffff;font-size:22px;font-weight:600;margin:20px 0 0;letter-spacing:-0.02em;">stonecode.ai</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:40px 40px 32px;">
                <h2 style="color:#0f172a;font-size:22px;font-weight:600;margin:0 0 16px;letter-spacing:-0.01em;">You're invited</h2>
                <p style="color:#475569;font-size:15px;line-height:1.65;margin:0 0 16px;">
                  <strong style="color:#0f172a;">${escapeHtml(inviterName)}</strong> has invited you to join the stonecode.ai portal — a private workspace for dashboards, tools, and AI-powered apps.
                </p>
                ${personalNote}
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 16px;">
                  <tr>
                    <td style="border-radius:12px;background:linear-gradient(135deg,#f97316,#f59e0b);">
                      <a href="${inviteUrl}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:12px;">Accept invitation</a>
                    </td>
                  </tr>
                </table>
                <p style="color:#64748b;font-size:13px;line-height:1.6;margin:20px 0 0;">
                  Or copy this link into your browser:<br/>
                  <a href="${inviteUrl}" style="color:#ea580c;word-break:break-all;">${inviteUrl}</a>
                </p>
                <p style="color:#94a3b8;font-size:12px;margin:24px 0 0;">This invitation expires in 7 days.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 40px 28px;border-top:1px solid #f1f5f9;">
                <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;">
                  If you weren't expecting this, you can safely ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function buildInviteEmailText(args: {
  inviterName: string
  inviteUrl: string
  message?: string
}): string {
  const { inviterName, inviteUrl, message } = args
  const note = message ? `\n\n${message}\n` : ''
  return `You're invited to stonecode.ai
${note}
${inviterName} has invited you to join the stonecode.ai portal.

Accept your invitation:
${inviteUrl}

This invitation expires in 7 days. If you weren't expecting this, you can safely ignore this email.
`
}
