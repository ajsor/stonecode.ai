import { useState, useEffect } from 'react'
import { useWidgets } from '../../hooks/useWidgets'
import { useWeather } from '../../hooks/useWeather'
import { getWeatherIconUrl } from '../../lib/weatherApi'

export function DashboardToolbar() {
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

  return (
    <div className="flex items-center justify-between px-4 py-2.5 mb-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl">
      {/* Left: Time + Date */}
      <div className="flex items-center gap-4">
        <span className="text-lg font-mono font-semibold text-white tabular-nums">
          {timeStr}
        </span>
        <span className="text-sm text-slate-400 hidden sm:block">
          {dateStr}
        </span>
      </div>

      {/* Right: Weather summary */}
      {weatherEnabled && weather && (
        <div className="flex items-center gap-2">
          <img
            src={getWeatherIconUrl(weather.icon)}
            alt={weather.description}
            className="w-8 h-8"
          />
          <span className="text-sm font-medium text-white">
            {weather.temp}&deg;{tempUnit}
          </span>
          <span className="text-xs text-slate-400 capitalize hidden sm:block">
            {weather.description}
          </span>
        </div>
      )}
    </div>
  )
}
