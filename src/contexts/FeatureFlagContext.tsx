import { createContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { getUserFeatureFlags, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export interface FeatureFlagContextType {
  flags: Record<string, boolean>
  isLoading: boolean
  hasFeature: (featureName: string) => boolean
  refreshFlags: () => Promise<void>
}

export const FeatureFlagContext = createContext<FeatureFlagContextType | null>(null)

interface FeatureFlagProviderProps {
  children: ReactNode
}

// Default feature flags when not authenticated or Supabase isn't configured
const DEFAULT_FLAGS: Record<string, boolean> = {
  admin_panel: false,
  advanced_analytics: false,
  beta_features: false,
}

export function FeatureFlagProvider({ children }: FeatureFlagProviderProps) {
  const { user, isLoading: authLoading } = useAuth()
  const [flags, setFlags] = useState<Record<string, boolean>>(DEFAULT_FLAGS)
  const [isLoading, setIsLoading] = useState(true)

  const fetchFlags = useCallback(async () => {
    if (!user?.id || !isSupabaseConfigured()) {
      setFlags(DEFAULT_FLAGS)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const userFlags = await getUserFeatureFlags(user.id)
      setFlags({ ...DEFAULT_FLAGS, ...userFlags })
    } catch (error) {
      console.error('Error fetching feature flags:', error)
      setFlags(DEFAULT_FLAGS)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (!authLoading) {
      fetchFlags()
    }
  }, [authLoading, fetchFlags])

  const hasFeature = useCallback((featureName: string) => {
    return flags[featureName] ?? false
  }, [flags])

  const refreshFlags = useCallback(async () => {
    await fetchFlags()
  }, [fetchFlags])

  const value: FeatureFlagContextType = {
    flags,
    isLoading,
    hasFeature,
    refreshFlags,
  }

  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  )
}
