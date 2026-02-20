import { useState, useEffect } from 'react'
import { WidgetContainer } from './WidgetContainer'
import { useWidgets } from '../../hooks/useWidgets'

const TIMEZONES = [
  { id: 'local', label: 'Local', zone: Intl.DateTimeFormat().resolvedOptions().timeZone },
  { id: 'utc', label: 'UTC', zone: 'UTC' },
  { id: 'new_york', label: 'New York', zone: 'America/New_York' },
  { id: 'london', label: 'London', zone: 'Europe/London' },
  { id: 'tokyo', label: 'Tokyo', zone: 'Asia/Tokyo' },
  { id: 'sydney', label: 'Sydney', zone: 'Australia/Sydney' },
]

export function ClockWidget() {
  const { configs } = useWidgets()
  const [time, setTime] = useState(new Date())

  const showSeconds = configs.clock?.showSeconds ?? true
  const selectedZones = configs.clock?.timezones ?? ['local']

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const formatTime = (date: Date, timezone: string, withSeconds: boolean) => {
    return date.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: withSeconds ? '2-digit' : undefined,
      hour12: true,
    })
  }

  const formatDate = (date: Date, timezone: string) => {
    return date.toLocaleDateString('en-US', {
      timeZone: timezone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const activeZones = TIMEZONES.filter(tz => selectedZones.includes(tz.id))
  const primaryZone = activeZones[0] || TIMEZONES[0]
  const secondaryZones = activeZones.slice(1)

  return (
    <WidgetContainer
      title="Clock"
      icon={
        <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }
    >
      <div className="flex flex-col">
        {/* Primary time display */}
        <div className="text-center mb-4">
          <div className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
            {formatTime(time, primaryZone.zone, showSeconds)}
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {formatDate(time, primaryZone.zone)}
          </div>
          {primaryZone.id !== 'local' && (
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">{primaryZone.label}</div>
          )}
        </div>

        {/* Secondary timezones */}
        {secondaryZones.length > 0 && (
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
            {secondaryZones.map((tz) => (
              <div key={tz.id} className="text-center">
                <div className="text-lg font-medium text-slate-900 dark:text-white">
                  {formatTime(time, tz.zone, false)}
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500">{tz.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </WidgetContainer>
  )
}

export { TIMEZONES }
