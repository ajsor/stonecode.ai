import { useState, useEffect, useCallback } from 'react'
import { fetchWeather } from '../lib/weatherApi'
import type { WeatherData } from '../types/widgets'

const REFRESH_INTERVAL = 30 * 60 * 1000 // 30 minutes
const CACHE_KEY = 'weather_cache'

interface CachedWeather {
  data: WeatherData
  location: string
  units: string
  timestamp: number
}

export function useWeather(location: string, units: 'imperial' | 'metric') {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadWeather = useCallback(async (forceRefresh = false) => {
    if (!location) {
      setError('No location configured')
      setIsLoading(false)
      return
    }

    // Check cache first
    if (!forceRefresh) {
      try {
        const cached = localStorage.getItem(CACHE_KEY)
        if (cached) {
          const parsedCache: CachedWeather = JSON.parse(cached)
          const isValid =
            parsedCache.location === location &&
            parsedCache.units === units &&
            Date.now() - parsedCache.timestamp < REFRESH_INTERVAL

          if (isValid) {
            setWeather(parsedCache.data)
            setIsLoading(false)
            setError(null)
            return
          }
        }
      } catch {
        // Ignore cache errors
      }
    }

    try {
      setIsLoading(true)
      setError(null)

      const data = await fetchWeather(location, units)
      setWeather(data)

      // Cache the result
      const cacheData: CachedWeather = {
        data,
        location,
        units,
        timestamp: Date.now(),
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
    } catch (err) {
      console.error('Weather fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load weather')
    } finally {
      setIsLoading(false)
    }
  }, [location, units])

  // Initial load
  useEffect(() => {
    loadWeather()
  }, [loadWeather])

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      loadWeather(true)
    }, REFRESH_INTERVAL)

    return () => clearInterval(interval)
  }, [loadWeather])

  const refresh = useCallback(() => {
    loadWeather(true)
  }, [loadWeather])

  return {
    weather,
    isLoading,
    error,
    refresh,
  }
}
