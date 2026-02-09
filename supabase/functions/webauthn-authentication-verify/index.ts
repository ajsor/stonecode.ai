// Supabase Edge Function: webauthn-authentication-verify
// Verifies WebAuthn authentication and creates a session

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  verifyAuthenticationResponse,
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

    const { authentication, sessionId } = await req.json()

    if (!authentication || !sessionId) {
      return new Response(
        JSON.stringify({ error: 'Missing authentication data or session ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get stored challenge
    const { data: challengeData, error: challengeError } = await supabaseClient
      .from('webauthn_challenges')
      .select('challenge, email')
      .eq('session_id', sessionId)
      .eq('type', 'authentication')
      .gt('expires_at', new Date().toISOString())
      .single()

    if (challengeError || !challengeData) {
      return new Response(
        JSON.stringify({ error: 'Challenge not found or expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find the passkey by credential ID
    const credentialId = authentication.id
    const { data: passkey, error: passkeyError } = await supabaseClient
      .from('passkeys')
      .select('*, profiles!inner(id, email)')
      .eq('credential_id', credentialId)
      .single()

    if (passkeyError || !passkey) {
      return new Response(
        JSON.stringify({ error: 'Passkey not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const rpID = Deno.env.get('WEBAUTHN_RP_ID') ?? 'stonecode.ai'
    const origin = Deno.env.get('SITE_URL') ?? 'https://stonecode.ai'

    const verification = await verifyAuthenticationResponse({
      response: authentication,
      expectedChallenge: challengeData.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: passkey.credential_id,
        credentialPublicKey: Buffer.from(passkey.public_key, 'base64'),
        counter: passkey.counter,
      },
    })

    if (!verification.verified) {
      return new Response(
        JSON.stringify({ error: 'Authentication verification failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update counter
    await supabaseClient
      .from('passkeys')
      .update({
        counter: verification.authenticationInfo.newCounter,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', passkey.id)

    // Clean up challenge
    await supabaseClient
      .from('webauthn_challenges')
      .delete()
      .eq('session_id', sessionId)

    // Create a session for the user
    // Note: This requires the user to exist in auth.users
    // We'll generate a custom token that can be exchanged for a session
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.admin.generateLink({
      type: 'magiclink',
      email: passkey.profiles.email,
      options: {
        redirectTo: `${origin}/portal/dashboard`,
      },
    })

    if (sessionError) {
      // Fallback: just return success and let client sign in
      await supabaseClient
        .from('audit_log')
        .insert({
          user_id: passkey.user_id,
          action: 'passkey_login',
          details: { method: 'passkey' },
        })

      return new Response(
        JSON.stringify({
          success: true,
          email: passkey.profiles.email,
          requiresLogin: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log audit event
    await supabaseClient
      .from('audit_log')
      .insert({
        user_id: passkey.user_id,
        action: 'passkey_login',
        details: { method: 'passkey' },
      })

    return new Response(
      JSON.stringify({
        success: true,
        // Return the magic link token for the client to complete login
        properties: sessionData.properties,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
