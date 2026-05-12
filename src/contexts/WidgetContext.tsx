import { createContext, useEffect, useState, useCallback, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getWidgetPreferences, saveWidgetPreferences, isSupabaseConfigured } from '../lib/supabase'
import {
  type WidgetContextType,
  type WidgetLayoutItem,
  type WidgetConfigs,
  DEFAULT_LAYOUT,
  DEFAULT_CONFIGS,
  LAYOUT_VERSION,
} from '../types/widgets'

export const WidgetContext = createContext<WidgetContextType | null>(null)

interface WidgetProviderProps {
  children: ReactNode
}

// Valid config keys from DEFAULT_CONFIGS
const VALID_CONFIG_KEYS = new Set(Object.keys(DEFAULT_CONFIGS))

// Merge saved layout with defaults: keep saved positions for known widgets,
// add any new widgets from defaults, remove any that no longer exist.
// If layout is from an older version, reset to defaults (scaling is lossy).
function mergeLayout(saved: WidgetLayoutItem[], savedVersion?: number): WidgetLayoutItem[] {
  if (savedVersion !== undefined && savedVersion < LAYOUT_VERSION) {
    return DEFAULT_LAYOUT
  }

  const savedMap = new Map(saved.map(item => [item.i, item]))
  return DEFAULT_LAYOUT.map(defaultItem => savedMap.get(defaultItem.i) ?? defaultItem)
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

const PERSIST_DEBOUNCE_MS = 500
const CACHE_KEY_PREFIX = 'widget_prefs_cache_v1_'

// Read/write a per-user localStorage cache so warm loads paint the grid
// instantly without waiting on the Supabase round-trip. Server fetch still
// runs in the background and reconciles.
function readCache(userId: string): { layout: WidgetLayoutItem[]; configs: WidgetConfigs } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + userId)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.layout || !parsed?.configs) return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(userId: string, layout: WidgetLayoutItem[], configs: WidgetConfigs) {
  try {
    localStorage.setItem(
      CACHE_KEY_PREFIX + userId,
      JSON.stringify({ layout, configs })
    )
  } catch {
    // Ignore quota / private-mode errors
  }
}

export function WidgetProvider({ children }: WidgetProviderProps) {
  const { user } = useAuth()
  const [layout, setLayout] = useState<WidgetLayoutItem[]>(DEFAULT_LAYOUT)
  const [configs, setConfigs] = useState<WidgetConfigs>(DEFAULT_CONFIGS)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<{ layout: WidgetLayoutItem[]; configs: WidgetConfigs } | null>(null)

  // Fetch preferences on mount/user change. Hit localStorage cache first
  // (instant paint), then revalidate from Supabase in the background.
  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured()) {
      setIsLoading(false)
      return
    }

    const userId = user.id
    const cached = readCache(userId)
    if (cached) {
      setLayout(cached.layout)
      setConfigs(cached.configs)
      setIsLoading(false)
    }

    const fetchPreferences = async () => {
      try {
        if (!cached) setIsLoading(true)
        setError(null)
        const { data, error: fetchError } = await getWidgetPreferences(userId)

        let nextLayout = DEFAULT_LAYOUT
        let nextConfigs = DEFAULT_CONFIGS

        if (fetchError) {
          // PGRST116 = no rows found, which is fine for new users
          if (fetchError.code !== 'PGRST116') {
            console.error('Error fetching widget preferences:', fetchError)
            setError('Failed to load widget preferences')
          }
        } else if (data) {
          const savedLayout = data.layout as WidgetLayoutItem[] | undefined
          const savedConfigs = data.widget_configs as Record<string, unknown> | undefined
          // layout_version stored inside widget_configs as _layoutVersion
          const savedVersion = savedConfigs?._layoutVersion as number | undefined
          nextLayout = savedLayout ? mergeLayout(savedLayout, savedVersion) : DEFAULT_LAYOUT
          nextConfigs = savedConfigs ? mergeConfigs(savedConfigs) : DEFAULT_CONFIGS
        }

        setLayout(nextLayout)
        setConfigs(nextConfigs)
        writeCache(userId, nextLayout, nextConfigs)
      } catch (err) {
        console.error('Widget preferences fetch failed:', err)
        setError('Failed to load widget preferences')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPreferences()
  }, [user?.id])

  // Write to DB. Debounced by schedulePersist — rapid drag/resize events
  // coalesce into one write after PERSIST_DEBOUNCE_MS of quiet.
  // Also refreshes the localStorage cache so warm loads see the latest state.
  const writePreferences = useCallback(async (
    newLayout: WidgetLayoutItem[],
    newConfigs: WidgetConfigs
  ) => {
    if (!user?.id || !isSupabaseConfigured()) return

    writeCache(user.id, newLayout, newConfigs)

    try {
      setIsSaving(true)
      setError(null)
      const { error: saveError } = await saveWidgetPreferences(
        user.id,
        newLayout,
        newConfigs,
        LAYOUT_VERSION
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

  const schedulePersist = useCallback((
    newLayout: WidgetLayoutItem[],
    newConfigs: WidgetConfigs
  ) => {
    pendingRef.current = { layout: newLayout, configs: newConfigs }
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
    persistTimerRef.current = setTimeout(() => {
      const pending = pendingRef.current
      pendingRef.current = null
      persistTimerRef.current = null
      if (pending) void writePreferences(pending.layout, pending.configs)
    }, PERSIST_DEBOUNCE_MS)
  }, [writePreferences])

  // Flush any pending write immediately (used for urgent saves + unmount).
  const flushPersist = useCallback(async () => {
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current)
      persistTimerRef.current = null
    }
    const pending = pendingRef.current
    pendingRef.current = null
    if (pending) await writePreferences(pending.layout, pending.configs)
  }, [writePreferences])

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current)
        const pending = pendingRef.current
        if (pending) void writePreferences(pending.layout, pending.configs)
      }
    }
  }, [writePreferences])

  // Update layout (called on drag/resize — high-frequency, debounced)
  const updateLayout = useCallback(async (newLayout: WidgetLayoutItem[]) => {
    setLayout(newLayout)
    schedulePersist(newLayout, configs)
  }, [configs, schedulePersist])

  // Update a specific widget's config (discrete clicks — flush immediately)
  const updateConfig = useCallback(async <K extends keyof WidgetConfigs>(
    widget: K,
    config: Partial<WidgetConfigs[K]>
  ) => {
    const newConfigs = {
      ...configs,
      [widget]: { ...configs[widget], ...config },
    }
    setConfigs(newConfigs)
    pendingRef.current = { layout, configs: newConfigs }
    await flushPersist()
  }, [configs, layout, flushPersist])

  const toggleWidget = useCallback(async (widget: keyof WidgetConfigs, enabled: boolean) => {
    await updateConfig(widget, { enabled } as Partial<WidgetConfigs[typeof widget]>)
  }, [updateConfig])

  const resetToDefaults = useCallback(async () => {
    setLayout(DEFAULT_LAYOUT)
    setConfigs(DEFAULT_CONFIGS)
    pendingRef.current = { layout: DEFAULT_LAYOUT, configs: DEFAULT_CONFIGS }
    await flushPersist()
  }, [flushPersist])

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
