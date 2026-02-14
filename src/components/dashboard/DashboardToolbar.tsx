import { useState, useEffect } from 'react'
import { useWidgets } from '../../hooks/useWidgets'
import { useWeather } from '../../hooks/useWeather'
import { getWeatherIconUrl } from '../../lib/weatherApi'

interface DashboardToolbarProps {
  darkMode: boolean
}

export function DashboardToolbar({ darkMode }: DashboardToolbarProps) {
  const [now, setNow] = useState(new Date())
  const { configs } = useWidgets()
  const weatherEnabled = configs.weather.enabled
  const { weather } = useWeather(
    weatherEnabled ? configs.weather.location : '',
    configs.weather.units
  )

  const tempUnit = configs.weather.units === 'imperial' ? 'F' : 'C'

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })

  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const textPrimary = darkMode ? 'text-white' : 'text-slate-900'
  const textSecondary = darkMode ? 'text-slate-400' : 'text-slate-500'

  return (
    <div className="flex items-center gap-6">
      {/* Time */}
      <span className={`text-lg font-mono font-semibold tabular-nums ${textPrimary}`}>
        {timeStr}
      </span>

      {/* Date */}
      <span className={`text-sm hidden sm:block ${textSecondary}`}>
        {dateStr}
      </span>

      {/* Weather summary */}
      {weatherEnabled && weather && (
        <div className="flex items-center gap-2 hidden md:flex">
          <div className={`w-px h-5 ${darkMode ? 'bg-white/10' : 'bg-slate-300'}`} />
          <img
            src={getWeatherIconUrl(weather.icon)}
            alt={weather.description}
            className="w-7 h-7"
          />
          <span className={`text-sm font-medium ${textPrimary}`}>
            {weather.temp}&deg;{tempUnit}
          </span>
          <span className={`text-xs capitalize hidden lg:block ${textSecondary}`}>
            {weather.description}
          </span>
        </div>
      )}
    </div>
  )
}
