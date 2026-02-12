import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TokenRequest {
  code?: string
  redirect_uri?: string
  refresh_token?: string
}

interface GoogleTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope: string
  token_type: string
  error?: string
  error_description?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      throw new Error('Google OAuth credentials not configured')
    }

    const { code, redirect_uri, refresh_token }: TokenRequest = await req.json()

    const tokenParams = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
    })

    if (refresh_token) {
      // Refresh token flow
      tokenParams.append('refresh_token', refresh_token)
      tokenParams.append('grant_type', 'refresh_token')
    } else if (code && redirect_uri) {
      // Authorization code flow
      tokenParams.append('code', code)
      tokenParams.append('redirect_uri', redirect_uri)
      tokenParams.append('grant_type', 'authorization_code')
    } else {
      throw new Error('Missing required parameters: code and redirect_uri, or refresh_token')
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    })

    const tokenData: GoogleTokenResponse = await tokenResponse.json()

    if (tokenData.error) {
      console.error('Google token error:', tokenData.error_description)
      return new Response(
        JSON.stringify({ message: tokenData.error_description || tokenData.error }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response(
      JSON.stringify({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        scope: tokenData.scope,
        token_type: tokenData.token_type,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('OAuth exchange error:', error)
    return new Response(
      JSON.stringify({ message: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
