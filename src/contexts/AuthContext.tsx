import { createContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, getProfile, isSupabaseConfigured } from '../lib/supabase'
import type { Profile } from '../types'

export interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string) => {
    if (!isSupabaseConfigured()) return

    try {
      // 3s timeout — previously 10s, which matched what users saw as a hung
      // spinner on /portal/dashboard when supabase-js's auto token refresh
      // stalled. The DB-level query itself runs in ~0.4s, so anything past
      // a few seconds is the supabase-js auth refresh hanging, not the DB.
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
      )
      const fetchPromise = getProfile(userId)
      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as Awaited<ReturnType<typeof getProfile>>

      if (error) {
        console.error('Error fetching profile:', error)
        return
      }
      setProfile(data)
    } catch (err) {
      console.error('Profile fetch failed:', err)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id)
    }
  }, [user?.id, fetchProfile])

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false)
      return
    }

    // Get initial session. Flip isLoading=false the moment we know whether
    // there's a session — do NOT await the profile fetch. Previously this
    // blocked portal rendering on a query that could hang, leading to
    // multi-second white screens. The profile loads in the background; the
    // portal layout renders chrome immediately and consumers use optional
    // chaining (profile?.full_name, profile?.is_admin) so a brief null is fine.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
      if (session?.user) {
        void fetchProfile(session.user.id)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)

        if (event === 'SIGNED_IN' && session?.user) {
          await fetchProfile(session.user.id)
        } else if (event === 'SIGNED_OUT') {
          setProfile(null)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      return { error: new Error('Supabase is not configured') }
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    return { error: error ? new Error(error.message) : null }
  }

  const signInWithMagicLink = async (email: string) => {
    if (!isSupabaseConfigured()) {
      return { error: new Error('Supabase is not configured') }
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/portal/dashboard`,
      },
    })

    return { error: error ? new Error(error.message) : null }
  }

  const signOut = async () => {
    if (!isSupabaseConfigured()) return

    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
  }

  const value: AuthContextType = {
    user,
    profile,
    session,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signInWithMagicLink,
    signOut,
    refreshProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
