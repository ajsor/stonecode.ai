import { useMemo, useCallback, useRef, useEffect, useState } from 'react'
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

interface WidgetGridProps {
  className?: string
}

// GridLayout item interface matching react-grid-layout
interface GridLayoutItem {
  i: string
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
  maxW?: number
  maxH?: number
  static?: boolean
}

// Column breakpoints
const COLS = 4
const ROW_HEIGHT = 100
const MARGIN: [number, number] = [16, 16]

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

  // Measure container width
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth)
      }
    }

    updateWidth()
    window.addEventListener('resize', updateWidth)

    // Use ResizeObserver for more accurate updates
    const observer = new ResizeObserver(updateWidth)
    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => {
      window.removeEventListener('resize', updateWidth)
      observer.disconnect()
    }
  }, [])

  // Filter layout to only show enabled widgets
  const visibleLayout = useMemo(() => {
    return layout.filter((item) => {
      const config = configs[item.i as WidgetType]
      return config?.enabled
    })
  }, [layout, configs])

  // Handle layout change from drag/resize
  const handleLayoutChange = useCallback((newLayout: GridLayoutItem[]) => {
    // Map back to our format, preserving min/max constraints
    const updatedLayout: WidgetLayoutItem[] = layout.map((item) => {
      const updated = newLayout.find((l) => l.i === item.i)
      if (updated) {
        return {
          ...item,
          x: updated.x,
          y: updated.y,
          w: updated.w,
          h: updated.h,
        }
      }
      return item
    })

    updateLayout(updatedLayout)
  }, [layout, updateLayout])

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
      <WidgetErrorBoundary widgetName={WIDGET_NAMES[type]}>
        {widget}
      </WidgetErrorBoundary>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-violet-500 border-t-transparent" />
      </div>
    )
  }

  if (visibleLayout.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <svg className="w-16 h-16 text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
        <h3 className="text-lg font-medium text-white mb-2">No widgets enabled</h3>
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
          cols={COLS}
          rowHeight={ROW_HEIGHT}
          width={containerWidth}
          margin={MARGIN}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onLayoutChange={handleLayoutChange as any}
          draggableHandle=".widget-drag-handle"
          isResizable={true}
          isDraggable={true}
          useCSSTransforms={true}
          compactType="vertical"
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
