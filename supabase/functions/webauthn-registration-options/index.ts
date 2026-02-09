// Supabase Edge Function: webauthn-registration-options
// Generates WebAuthn registration options for passkey setup

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  generateRegistrationOptions,
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

    const { userId, email } = await req.json()

    if (userId !== user.id) {
      return new Response(
        JSON.stringify({ error: 'User ID mismatch' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get existing passkeys for this user
    const { data: existingPasskeys } = await supabaseClient
      .from('passkeys')
      .select('credential_id')
      .eq('user_id', userId)

    const rpID = Deno.env.get('WEBAUTHN_RP_ID') ?? 'stonecode.ai'
    const rpName = 'stonecode.ai'

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: userId,
      userName: email,
      userDisplayName: email,
      attestationType: 'none',
      excludeCredentials: existingPasskeys?.map(p => ({
        id: p.credential_id,
        type: 'public-key',
      })) ?? [],
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    })

    // Store challenge in a temporary table or cache
    // For simplicity, we'll use a session-based approach
    await supabaseClient
      .from('webauthn_challenges')
      .upsert({
        user_id: userId,
        challenge: options.challenge,
        type: 'registration',
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
      })

    return new Response(
      JSON.stringify(options),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
