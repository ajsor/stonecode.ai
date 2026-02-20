import { useState, useEffect } from 'react'
import { useWidgets } from '../../hooks/useWidgets'
import { useWeather } from '../../hooks/useWeather'
import { getWeatherIconUrl } from '../../lib/weatherApi'

export function DashboardToolbar() {
  const [now, setNow] = useState(new Date())
  const { configs } = useWidgets()
  const { weather } = useWeather(configs.weather.location, configs.weather.units)

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

  return (
    <div className="flex items-center gap-6">
      {/* Time */}
      <span className="text-lg font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
        {timeStr}
      </span>

      {/* Date */}
      <span className="text-sm hidden sm:block text-slate-500 dark:text-slate-400">
        {dateStr}
      </span>

      {/* Weather summary */}
      {weather && (
        <div className="flex items-center gap-2 hidden md:flex">
          <div className="w-px h-5 bg-slate-300 dark:bg-white/10" />
          <img
            src={getWeatherIconUrl(weather.icon)}
            alt={weather.description}
            className="w-7 h-7"
          />
          <span className="text-sm font-medium text-slate-900 dark:text-white">
            {weather.temp}&deg;{tempUnit}
          </span>
          <span className="text-xs capitalize hidden lg:block text-slate-500 dark:text-slate-400">
            {weather.description}
          </span>
        </div>
      )}
    </div>
  )
}
