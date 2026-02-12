import { createContext, useEffect, useState, useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getWidgetPreferences, saveWidgetPreferences, isSupabaseConfigured } from '../lib/supabase'
import {
  type WidgetContextType,
  type WidgetLayoutItem,
  type WidgetConfigs,
  type WidgetType,
  DEFAULT_LAYOUT,
  DEFAULT_CONFIGS,
} from '../types/widgets'

export const WidgetContext = createContext<WidgetContextType | null>(null)

interface WidgetProviderProps {
  children: ReactNode
}

export function WidgetProvider({ children }: WidgetProviderProps) {
  const { user } = useAuth()
  const [layout, setLayout] = useState<WidgetLayoutItem[]>(DEFAULT_LAYOUT)
  const [configs, setConfigs] = useState<WidgetConfigs>(DEFAULT_CONFIGS)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch preferences on mount/user change
  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user?.id || !isSupabaseConfigured()) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        const { data, error: fetchError } = await getWidgetPreferences(user.id)

        if (fetchError) {
          // PGRST116 = no rows found, which is fine for new users
          if (fetchError.code !== 'PGRST116') {
            console.error('Error fetching widget preferences:', fetchError)
            setError('Failed to load widget preferences')
          }
          // Use defaults for new users
          setLayout(DEFAULT_LAYOUT)
          setConfigs(DEFAULT_CONFIGS)
        } else if (data) {
          setLayout(data.layout as WidgetLayoutItem[] || DEFAULT_LAYOUT)
          setConfigs(data.widget_configs as WidgetConfigs || DEFAULT_CONFIGS)
        }
      } catch (err) {
        console.error('Widget preferences fetch failed:', err)
        setError('Failed to load widget preferences')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPreferences()
  }, [user?.id])

  // Save preferences to database
  const persistPreferences = useCallback(async (
    newLayout: WidgetLayoutItem[],
    newConfigs: WidgetConfigs
  ) => {
    if (!user?.id || !isSupabaseConfigured()) return

    try {
      setIsSaving(true)
      setError(null)
      const { error: saveError } = await saveWidgetPreferences(
        user.id,
        newLayout,
        newConfigs
      )

      if (saveError) {
        console.error('Error saving widget preferences:', saveError)
        setError('Failed to save widget preferences')
      }
    } catch (err) {
      console.error('Widget preferences save failed:', err)
      setError('Failed to save widget preferences')
    } finally {
      setIsSaving(false)
    }
  }, [user?.id])

  // Update layout (called on drag/resize)
  const updateLayout = useCallback(async (newLayout: WidgetLayoutItem[]) => {
    setLayout(newLayout)
    await persistPreferences(newLayout, configs)
  }, [configs, persistPreferences])

  // Update a specific widget's config
  const updateConfig = useCallback(async <K extends WidgetType>(
    widget: K,
    config: Partial<WidgetConfigs[K]>
  ) => {
    const newConfigs = {
      ...configs,
      [widget]: { ...configs[widget], ...config },
    }
    setConfigs(newConfigs)
    await persistPreferences(layout, newConfigs)
  }, [configs, layout, persistPreferences])

  // Toggle widget enabled state
  const toggleWidget = useCallback(async (widget: WidgetType, enabled: boolean) => {
    await updateConfig(widget, { enabled } as Partial<WidgetConfigs[typeof widget]>)
  }, [updateConfig])

  // Reset to defaults
  const resetToDefaults = useCallback(async () => {
    setLayout(DEFAULT_LAYOUT)
    setConfigs(DEFAULT_CONFIGS)
    await persistPreferences(DEFAULT_LAYOUT, DEFAULT_CONFIGS)
  }, [persistPreferences])

  const value = useMemo<WidgetContextType>(() => ({
    layout,
    configs,
    isLoading,
    isSaving,
    error,
    updateLayout,
    updateConfig,
    toggleWidget,
    resetToDefaults,
  }), [
    layout,
    configs,
    isLoading,
    isSaving,
    error,
    updateLayout,
    updateConfig,
    toggleWidget,
    resetToDefaults,
  ])

  return (
    <WidgetContext.Provider value={value}>
      {children}
    </WidgetContext.Provider>
  )
}
