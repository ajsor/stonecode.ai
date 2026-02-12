const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string
const REDIRECT_URI = `${window.location.origin}/portal/dashboard`
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
].join(' ')

export function isGoogleAuthConfigured(): boolean {
  return Boolean(GOOGLE_CLIENT_ID)
}

export function initiateGoogleAuth(): void {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Google Client ID not configured')
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state: 'google_calendar_connect',
  })

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export function parseOAuthCallback(): { code: string } | null {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const state = params.get('state')

  if (code && state === 'google_calendar_connect') {
    // Clear the URL params
    window.history.replaceState({}, '', window.location.pathname)
    return { code }
  }

  return null
}

export interface GoogleTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  scope: string
  token_type: string
}

export async function exchangeCodeForTokens(
  code: string,
  supabaseUrl: string
): Promise<GoogleTokenResponse> {
  // Exchange via Supabase Edge Function to protect client secret
  const response = await fetch(`${supabaseUrl}/functions/v1/google-oauth-exchange`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code, redirect_uri: REDIRECT_URI }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Token exchange failed' }))
    throw new Error(error.message || 'Failed to exchange authorization code')
  }

  return response.json()
}

export interface CalendarEvent {
  id: string
  summary: string
  description?: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  htmlLink: string
  status: string
}

export interface CalendarEventsResponse {
  items: CalendarEvent[]
}

export async function fetchCalendarEvents(
  accessToken: string,
  maxResults: number = 7
): Promise<CalendarEvent[]> {
  const now = new Date().toISOString()
  const params = new URLSearchParams({
    maxResults: String(maxResults),
    orderBy: 'startTime',
    singleEvents: 'true',
    timeMin: now,
  })

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('TOKEN_EXPIRED')
    }
    throw new Error('Failed to fetch calendar events')
  }

  const data: CalendarEventsResponse = await response.json()
  return data.items || []
}

export async function refreshAccessToken(
  refreshToken: string,
  supabaseUrl: string
): Promise<GoogleTokenResponse> {
  const response = await fetch(`${supabaseUrl}/functions/v1/google-oauth-exchange`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

  if (!response.ok) {
    throw new Error('Failed to refresh token')
  }

  return response.json()
}
