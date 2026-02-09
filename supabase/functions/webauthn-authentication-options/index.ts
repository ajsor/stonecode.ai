// Supabase Edge Function: webauthn-authentication-options
// Generates WebAuthn authentication options for passkey login

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  generateAuthenticationOptions,
} from 'https://esm.sh/@simplewebauthn/server@9.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    let allowCredentials = undefined

    // If email provided, get specific user's passkeys
    if (email) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single()

      if (profile) {
        const { data: passkeys } = await supabaseClient
          .from('passkeys')
          .select('credential_id, transports')
          .eq('user_id', profile.id)

        if (passkeys && passkeys.length > 0) {
          allowCredentials = passkeys.map(p => ({
            id: p.credential_id,
            type: 'public-key' as const,
            transports: p.transports,
          }))
        }
      }
    }

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
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
