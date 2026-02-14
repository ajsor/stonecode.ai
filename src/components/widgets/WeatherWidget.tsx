import { useState } from 'react'
import { useWidgets } from '../../hooks/useWidgets'
import { useWeather } from '../../hooks/useWeather'
import { WidgetContainer } from './WidgetContainer'
import { getWeatherIconUrl } from '../../lib/weatherApi'

export function WeatherWidget() {
  const { configs, updateConfig } = useWidgets()
  const { location, units } = configs.weather
  const { weather, isLoading, error, refresh } = useWeather(location, units)
  const [editing, setEditing] = useState(false)
  const [editLocation, setEditLocation] = useState(location)

  const tempUnit = units === 'imperial' ? 'F' : 'C'

  const handleSaveLocation = async () => {
    const trimmed = editLocation.trim()
    if (trimmed && trimmed !== location) {
      await updateConfig('weather', { location: trimmed })
    }
    setEditing(false)
  }

  return (
    <WidgetContainer
      title="Weather"
      icon={
        <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      }
      isLoading={isLoading}
      error={error}
      headerAction={
        <button
          onClick={refresh}
          className="p-1 text-slate-400 hover:text-white transition-colors"
          title="Refresh weather"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      }
    >
      {weather && (
        <div className="h-full flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">{weather.temp}</span>
                <span className="text-xl text-slate-400">&deg;{tempUnit}</span>
              </div>
              <p className="text-sm text-slate-400 capitalize mt-1">
                {weather.description}
              </p>
            </div>
            <img
              src={getWeatherIconUrl(weather.icon)}
              alt={weather.description}
              className="w-16 h-16 -mt-2 -mr-2"
            />
          </div>

          <div className="space-y-2 mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Feels like</span>
              <span className="text-white">{weather.feelsLike}&deg;{tempUnit}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Humidity</span>
              <span className="text-white">{weather.humidity}%</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10">
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveLocation()
                    if (e.key === 'Escape') setEditing(false)
                  }}
                  autoFocus
                  placeholder="City or ZIP,Country"
                  className="flex-1 px-2 py-1 text-xs rounded bg-white/10 border border-white/20 text-white placeholder-slate-500 outline-none focus:border-violet-500"
                />
                <button
                  onClick={handleSaveLocation}
                  className="text-xs text-violet-400 hover:text-violet-300 font-medium"
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setEditLocation(location); setEditing(true) }}
                className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors group w-full"
                title="Click to change location"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="truncate">{weather.location}</span>
                <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </WidgetContainer>
  )
}
