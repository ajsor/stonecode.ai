import { createContext, useEffect, useState, useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getWidgetPreferences, saveWidgetPreferences, isSupabaseConfigured } from '../lib/supabase'
import {
  type WidgetContextType,
  type WidgetLayoutItem,
  type WidgetConfigs,
  DEFAULT_LAYOUT,
  DEFAULT_CONFIGS,
} from '../types/widgets'

export const WidgetContext = createContext<WidgetContextType | null>(null)

interface WidgetProviderProps {
  children: ReactNode
}

// Valid config keys from DEFAULT_CONFIGS
const VALID_CONFIG_KEYS = new Set(Object.keys(DEFAULT_CONFIGS))

// Merge saved layout with defaults: keep saved positions for known widgets,
// add any new widgets from defaults, remove any that no longer exist
function mergeLayout(saved: WidgetLayoutItem[]): WidgetLayoutItem[] {
  const savedMap = new Map(saved.map(item => [item.i, item]))
  const merged: WidgetLayoutItem[] = []

  for (const defaultItem of DEFAULT_LAYOUT) {
    const savedItem = savedMap.get(defaultItem.i)
    merged.push(savedItem ?? defaultItem)
  }

  return merged
}

// Merge saved configs with defaults: keep saved values for known config keys,
// add defaults for new keys, remove configs for deleted keys
function mergeConfigs(saved: Record<string, unknown>): WidgetConfigs {
  const merged = { ...DEFAULT_CONFIGS } as Record<string, unknown>

  for (const key of Object.keys(DEFAULT_CONFIGS)) {
    if (key in saved && VALID_CONFIG_KEYS.has(key)) {
      merged[key] = { ...(merged[key] as object), ...(saved[key] as object) }
    }
  }

  return merged as unknown as WidgetConfigs
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
          const savedLayout = data.layout as WidgetLayoutItem[] | undefined
          const savedConfigs = data.widget_configs as Record<string, unknown> | undefined
          setLayout(savedLayout ? mergeLayout(savedLayout) : DEFAULT_LAYOUT)
          setConfigs(savedConfigs ? mergeConfigs(savedConfigs) : DEFAULT_CONFIGS)
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
  const updateConfig = useCallback(async <K extends keyof WidgetConfigs>(
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
  const toggleWidget = useCallback(async (widget: keyof WidgetConfigs, enabled: boolean) => {
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
