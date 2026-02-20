import { useMemo, useCallback, useRef, useEffect, useState, createContext } from 'react'
import type { ComponentType } from 'react'
import GridLayoutBase from 'react-grid-layout'
import { useWidgets } from '../../hooks/useWidgets'
import { WeatherWidget } from './WeatherWidget'
import { SpotifyWidget } from './SpotifyWidget'
import { CalendarWidget } from './CalendarWidget'
import { ClockWidget } from './ClockWidget'
import { PomodoroWidget } from './PomodoroWidget'
import { CountdownWidget } from './CountdownWidget'
import { CalculatorWidget } from './CalculatorWidget'
import { BreathingWidget } from './BreathingWidget'
import { NotesWidget } from './NotesWidget'
import { BookmarksWidget } from './BookmarksWidget'
import { TodosWidget } from './TodosWidget'
import { HabitsWidget } from './HabitsWidget'
import { WidgetErrorBoundary } from './WidgetErrorBoundary'
import type { WidgetLayoutItem, WidgetType } from '../../types/widgets'

import 'react-grid-layout/css/styles.css'

// Cast to any to work around type definition issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GridLayout = GridLayoutBase as ComponentType<any>

// Context provided per-widget so WidgetContainer can report collapse and content height
export const WidgetCollapseContext = createContext<{
  reportCollapse: (collapsed: boolean) => void
  reportContentHeight: (height: number) => void
} | null>(null)

interface WidgetGridProps {
  className?: string
}

// Grid constants
const COLS = 4
const ROW_HEIGHT = 1  // 1px rows for pixel-precise widget heights (max 4px waste)
const MARGIN: [number, number] = [16, 4]
const COLLAPSED_H = 12 // 5*12-4 = 56px, fits 52px collapsed header

// Total non-content overhead: header(50) + border-bottom(1) + card border(2) + content padding py-1(8)
const HEADER_OVERHEAD = 61

// Convert pixel height to grid h units (round up to nearest unit that fits)
function pixelsToH(pixels: number): number {
  // pixels = h * ROW_HEIGHT + (h - 1) * MARGIN[1]
  // pixels = h * (ROW_HEIGHT + MARGIN[1]) - MARGIN[1]
  // h = (pixels + MARGIN[1]) / (ROW_HEIGHT + MARGIN[1])
  return Math.ceil((pixels + MARGIN[1]) / (ROW_HEIGHT + MARGIN[1]))
}

const WIDGET_NAMES: Record<WidgetType, string> = {
  weather: 'Weather',
  spotify: 'Spotify',
  calendar: 'Calendar',
  clock: 'Clock',
  pomodoro: 'Pomodoro',
  countdown: 'Countdown',
  calculator: 'Calculator',
  breathing: 'Breathing',
  notes: 'Notes',
  bookmarks: 'Bookmarks',
  todos: 'Todos',
  habits: 'Habits',
}

export function WidgetGrid({ className }: WidgetGridProps) {
  const { layout, configs, updateLayout, isLoading } = useWidgets()
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [collapsedWidgets, setCollapsedWidgets] = useState<Set<string>>(new Set())

  // Track measured content heights for auto-sizing
  const measuredHeights = useRef<Map<string, number>>(new Map())
  const autoSizeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Stable refs for auto-sizing callback (avoids recreating on every layout change)
  const layoutRef = useRef(layout)
  layoutRef.current = layout
  const collapsedRef = useRef(collapsedWidgets)
  collapsedRef.current = collapsedWidgets

  // Measure container width via ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    observer.observe(containerRef.current)

    return () => observer.disconnect()
  }, [])

  // When content measurements arrive, directly update layout state with auto-sized h values.
  // Uses refs for stable access so the callback doesn't recreate on every layout change.
  const handleContentHeight = useCallback((widgetId: string, height: number) => {
    const prev = measuredHeights.current.get(widgetId)
    if (prev === height) return

    measuredHeights.current.set(widgetId, height)

    // Debounce: wait for all widgets to report before updating layout
    if (autoSizeTimer.current) clearTimeout(autoSizeTimer.current)
    autoSizeTimer.current = setTimeout(() => {
      const currentLayout = layoutRef.current
      const currentCollapsed = collapsedRef.current
      const autoSized = currentLayout.map(item => {
        if (currentCollapsed.has(item.i)) return item
        const measured = measuredHeights.current.get(item.i)
        if (measured !== undefined) {
          const neededH = Math.max(pixelsToH(measured + HEADER_OVERHEAD), item.minH || 1)
          if (neededH !== item.h) {
            return { ...item, h: neededH }
          }
        }
        return item
      })
      if (autoSized.some((item, i) => item !== currentLayout[i])) {
        updateLayout(autoSized)
      }
    }, 100)
  }, [updateLayout])

  const handleCollapseChange = useCallback((widgetId: string, collapsed: boolean) => {
    setCollapsedWidgets(prev => {
      const next = new Set(prev)
      if (collapsed) {
        next.add(widgetId)
      } else {
        next.delete(widgetId)
      }
      return next
    })
  }, [])

  // Filter layout to only show enabled widgets, adjust heights for collapsed
  const visibleLayout = useMemo(() => {
    const filtered = layout.filter((item) => {
      const config = configs[item.i as WidgetType]
      return config?.enabled
    })

    return filtered.map((item) => {
      if (collapsedWidgets.has(item.i)) {
        return { ...item, h: COLLAPSED_H, minH: COLLAPSED_H }
      }
      return item
    })
  }, [layout, configs, collapsedWidgets])

  // Handle layout change from drag/resize
  const handleLayoutChange = useCallback((newLayout: WidgetLayoutItem[]) => {
    const updatedLayout: WidgetLayoutItem[] = layout.map((item) => {
      const updated = newLayout.find((l) => l.i === item.i)
      if (updated) {
        // If collapsed, keep the original h instead of the collapsed height
        const h = collapsedWidgets.has(item.i) ? item.h : updated.h
        return {
          ...item,
          x: updated.x,
          y: updated.y,
          w: updated.w,
          h,
        }
      }
      return item
    })

    updateLayout(updatedLayout)
  }, [layout, updateLayout, collapsedWidgets])

  // Render widget by type
  const renderWidget = (type: WidgetType) => {
    let widget: React.ReactNode = null

    switch (type) {
      case 'weather':
        widget = <WeatherWidget />
        break
      case 'spotify':
        widget = <SpotifyWidget />
        break
      case 'calendar':
        widget = <CalendarWidget />
        break
      case 'clock':
        widget = <ClockWidget />
        break
      case 'pomodoro':
        widget = <PomodoroWidget />
        break
      case 'countdown':
        widget = <CountdownWidget />
        break
      case 'calculator':
        widget = <CalculatorWidget />
        break
      case 'breathing':
        widget = <BreathingWidget />
        break
      case 'notes':
        widget = <NotesWidget />
        break
      case 'bookmarks':
        widget = <BookmarksWidget />
        break
      case 'todos':
        widget = <TodosWidget />
        break
      case 'habits':
        widget = <HabitsWidget />
        break
      default:
        return null
    }

    return (
      <WidgetCollapseContext.Provider
        value={{
          reportCollapse: (collapsed) => handleCollapseChange(type, collapsed),
          reportContentHeight: (height) => handleContentHeight(type, height),
        }}
      >
        <WidgetErrorBoundary widgetName={WIDGET_NAMES[type]}>
          {widget}
        </WidgetErrorBoundary>
      </WidgetCollapseContext.Provider>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-orange-500 border-t-transparent" />
      </div>
    )
  }

  if (visibleLayout.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <svg className="w-16 h-16 text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No widgets enabled</h3>
        <p className="text-slate-400 text-sm">
          Click "Customize" to enable widgets and personalize your dashboard.
        </p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={className}>
      {containerWidth > 0 && (
        <GridLayout
          className="widget-grid"
          layout={visibleLayout}
          width={containerWidth}
          gridConfig={{
            cols: COLS,
            rowHeight: ROW_HEIGHT,
            margin: MARGIN,
          }}
          dragConfig={{
            enabled: true,
            handle: '.widget-drag-handle',
          }}
          resizeConfig={{
            enabled: true,
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onLayoutChange={handleLayoutChange as any}
        >
          {visibleLayout.map((item) => (
            <div key={item.i} className="widget-item">
              {renderWidget(item.i as WidgetType)}
            </div>
          ))}
        </GridLayout>
      )}
    </div>
  )
}
