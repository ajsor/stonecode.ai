import { useWidgets } from '../../hooks/useWidgets'
import { useWeather } from '../../hooks/useWeather'
import { WidgetContainer } from './WidgetContainer'
import { getWeatherIconUrl } from '../../lib/weatherApi'

export function WeatherWidget() {
  const { configs } = useWidgets()
  const { location, units } = configs.weather
  const { weather, isLoading, error, refresh } = useWeather(location, units)

  const tempUnit = units === 'imperial' ? 'F' : 'C'

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
                <span className="text-xl text-slate-400">°{tempUnit}</span>
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
              <span className="text-white">{weather.feelsLike}°{tempUnit}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Humidity</span>
              <span className="text-white">{weather.humidity}%</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="truncate">{weather.location}</span>
            </div>
          </div>
        </div>
      )}
    </WidgetContainer>
  )
}
