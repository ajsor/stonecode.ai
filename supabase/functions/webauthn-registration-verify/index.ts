// Supabase Edge Function: webauthn-registration-verify
// Verifies WebAuthn registration and stores the passkey

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  verifyRegistrationResponse,
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

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { userId, registration } = await req.json()

    if (userId !== user.id) {
      return new Response(
        JSON.stringify({ error: 'User ID mismatch' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get stored challenge
    const { data: challengeData, error: challengeError } = await supabaseClient
      .from('webauthn_challenges')
      .select('challenge')
      .eq('user_id', userId)
      .eq('type', 'registration')
      .gt('expires_at', new Date().toISOString())
      .single()

    if (challengeError || !challengeData) {
      return new Response(
        JSON.stringify({ error: 'Challenge not found or expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const rpID = Deno.env.get('WEBAUTHN_RP_ID') ?? 'stonecode.ai'
    const origin = Deno.env.get('SITE_URL') ?? 'https://stonecode.ai'

    const verification = await verifyRegistrationResponse({
      response: registration,
      expectedChallenge: challengeData.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    })

    if (!verification.verified || !verification.registrationInfo) {
      return new Response(
        JSON.stringify({ error: 'Registration verification failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { credentialID, credentialPublicKey, counter, credentialBackedUp, credentialDeviceType } = verification.registrationInfo

    // Store the passkey
    const { error: insertError } = await supabaseClient
      .from('passkeys')
      .insert({
        user_id: userId,
        credential_id: Buffer.from(credentialID).toString('base64url'),
        public_key: Buffer.from(credentialPublicKey).toString('base64'),
        counter,
        backed_up: credentialBackedUp,
        device_type: credentialDeviceType,
        transports: registration.response.transports,
      })

    if (insertError) {
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Clean up challenge
    await supabaseClient
      .from('webauthn_challenges')
      .delete()
      .eq('user_id', userId)
      .eq('type', 'registration')

    // Log audit event
    await supabaseClient
      .from('audit_log')
      .insert({
        user_id: userId,
        action: 'passkey_registered',
        details: { device_type: credentialDeviceType },
      })

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
