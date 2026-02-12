import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import {
  fetchCalendarEvents,
  refreshAccessToken,
  exchangeCodeForTokens,
  parseOAuthCallback,
  isGoogleAuthConfigured,
  type CalendarEvent,
} from '../lib/googleAuth'
import {
  getGoogleOAuthTokens,
  saveGoogleOAuthTokens,
  deleteGoogleOAuthTokens,
  isSupabaseConfigured,
} from '../lib/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

interface UseGoogleCalendarReturn {
  events: CalendarEvent[]
  isLoading: boolean
  error: string | null
  isConnected: boolean
  isConfigured: boolean
  connect: () => void
  disconnect: () => Promise<void>
  refresh: () => Promise<void>
}

export function useGoogleCalendar(maxEvents: number = 7): UseGoogleCalendarReturn {
  const { user } = useAuth()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)
  const [tokenExpiry, setTokenExpiry] = useState<Date | null>(null)

  const isConfigured = isGoogleAuthConfigured() && isSupabaseConfigured()

  // Load stored tokens
  useEffect(() => {
    const loadTokens = async () => {
      if (!user?.id || !isSupabaseConfigured()) {
        setIsLoading(false)
        return
      }

      try {
        const { data, error: fetchError } = await getGoogleOAuthTokens(user.id)

        if (fetchError) {
          if (fetchError.code !== 'PGRST116') {
            console.error('Error loading OAuth tokens:', fetchError)
          }
          setIsLoading(false)
          return
        }

        if (data) {
          setAccessToken(data.access_token)
          setRefreshToken(data.refresh_token)
          setTokenExpiry(new Date(data.expires_at))
          setIsConnected(true)
        }
      } catch (err) {
        console.error('Failed to load OAuth tokens:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadTokens()
  }, [user?.id])

  // Handle OAuth callback
  useEffect(() => {
    const handleCallback = async () => {
      if (!user?.id || !isSupabaseConfigured()) return

      const callback = parseOAuthCallback()
      if (!callback) return

      try {
        setIsLoading(true)
        setError(null)

        const tokens = await exchangeCodeForTokens(callback.code, SUPABASE_URL)

        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

        await saveGoogleOAuthTokens(
          user.id,
          tokens.access_token,
          tokens.refresh_token,
          expiresAt.toISOString(),
          tokens.scope
        )

        setAccessToken(tokens.access_token)
        setRefreshToken(tokens.refresh_token)
        setTokenExpiry(expiresAt)
        setIsConnected(true)
      } catch (err) {
        console.error('OAuth callback error:', err)
        setError(err instanceof Error ? err.message : 'Failed to connect Google Calendar')
      } finally {
        setIsLoading(false)
      }
    }

    handleCallback()
  }, [user?.id])

  // Fetch events when connected
  const fetchEvents = useCallback(async () => {
    if (!accessToken || !user?.id) return

    try {
      setError(null)

      // Check if token needs refresh
      if (tokenExpiry && refreshToken && new Date() >= tokenExpiry) {
        try {
          const tokens = await refreshAccessToken(refreshToken, SUPABASE_URL)
          const newExpiry = new Date(Date.now() + tokens.expires_in * 1000)

          await saveGoogleOAuthTokens(
            user.id,
            tokens.access_token,
            tokens.refresh_token || refreshToken,
            newExpiry.toISOString(),
            tokens.scope
          )

          setAccessToken(tokens.access_token)
          if (tokens.refresh_token) {
            setRefreshToken(tokens.refresh_token)
          }
          setTokenExpiry(newExpiry)
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError)
          setError('Session expired. Please reconnect.')
          setIsConnected(false)
          return
        }
      }

      const calendarEvents = await fetchCalendarEvents(accessToken, maxEvents)
      setEvents(calendarEvents)
    } catch (err) {
      if (err instanceof Error && err.message === 'TOKEN_EXPIRED') {
        setError('Session expired. Please reconnect.')
        setIsConnected(false)
      } else {
        console.error('Failed to fetch calendar events:', err)
        setError(err instanceof Error ? err.message : 'Failed to load events')
      }
    }
  }, [accessToken, refreshToken, tokenExpiry, maxEvents, user?.id])

  useEffect(() => {
    if (isConnected && accessToken) {
      fetchEvents()
    }
  }, [isConnected, accessToken, fetchEvents])

  const connect = useCallback(async () => {
    const { initiateGoogleAuth } = await import('../lib/googleAuth')
    initiateGoogleAuth()
  }, [])

  const disconnect = useCallback(async () => {
    if (!user?.id) return

    try {
      await deleteGoogleOAuthTokens(user.id)
      setAccessToken(null)
      setRefreshToken(null)
      setTokenExpiry(null)
      setIsConnected(false)
      setEvents([])
    } catch (err) {
      console.error('Failed to disconnect:', err)
      setError('Failed to disconnect Google Calendar')
    }
  }, [user?.id])

  const refresh = useCallback(async () => {
    setIsLoading(true)
    await fetchEvents()
    setIsLoading(false)
  }, [fetchEvents])

  return {
    events,
    isLoading,
    error,
    isConnected,
    isConfigured,
    connect,
    disconnect,
    refresh,
  }
}
