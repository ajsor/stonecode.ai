// Supabase Edge Function: webauthn-authentication-options
// Generates WebAuthn authentication options for passkey login

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { logAppIssue } from '../_shared/appIssues.ts'
import {
  generateAuthenticationOptions,
} from 'https://esm.sh/@simplewebauthn/server@9.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://stonecode.ai',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  Vary: 'Origin',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { email } = await req.json()

    // Use discoverable-credential auth: never branch the response shape on
    // whether the email maps to an existing profile. The previous branch
    // (return `allowCredentials` only when email->profile->passkeys all hit)
    // leaked account existence to anyone who could call this endpoint.
    // Browsers handle `allowCredentials: undefined` by letting the user pick
    // any registered passkey on the device — a slightly different UX, but
    // closes the enumeration vector cleanly.
    const allowCredentials = undefined

    const rpID = Deno.env.get('WEBAUTHN_RP_ID') ?? 'stonecode.ai'

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'preferred',
      allowCredentials,
    })

    // Store challenge for verification
    // Generate a session ID for unauthenticated users
    const sessionId = crypto.randomUUID()

    await supabaseClient
      .from('webauthn_challenges')
      .insert({
        session_id: sessionId,
        challenge: options.challenge,
        type: 'authentication',
        email: email || null,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      })

    return new Response(
      JSON.stringify({ ...options, sessionId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const detail = error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error)
    logAppIssue({ fn: 'webauthn-authentication-options', detail })
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
