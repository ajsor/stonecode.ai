import type { WeatherData } from '../types/widgets'

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY as string
const BASE_URL = 'https://api.openweathermap.org/data/2.5'

export interface OpenWeatherResponse {
  coord: { lon: number; lat: number }
  weather: Array<{
    id: number
    main: string
    description: string
    icon: string
  }>
  main: {
    temp: number
    feels_like: number
    humidity: number
    pressure: number
  }
  wind: { speed: number; deg: number }
  name: string
  sys: { country: string }
}

export async function fetchWeather(
  location: string,
  units: 'imperial' | 'metric' = 'imperial'
): Promise<WeatherData> {
  if (!API_KEY) {
    throw new Error('OpenWeatherMap API key not configured')
  }

  const url = new URL(`${BASE_URL}/weather`)
  // Detect zip code format (e.g. "98682,US") vs city name
  const isZip = /^\d{5}(,\w{2})?$/.test(location.trim())
  if (isZip) {
    url.searchParams.set('zip', location.trim())
  } else {
    url.searchParams.set('q', location)
  }
  url.searchParams.set('appid', API_KEY)
  url.searchParams.set('units', units)

  const response = await fetch(url.toString())

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Location not found')
    }
    if (response.status === 401) {
      throw new Error('Invalid API key')
    }
    throw new Error(`Weather API error: ${response.status}`)
  }

  const data: OpenWeatherResponse = await response.json()

  return {
    temp: Math.round(data.main.temp),
    feelsLike: Math.round(data.main.feels_like),
    humidity: data.main.humidity,
    description: data.weather[0]?.description || 'Unknown',
    icon: data.weather[0]?.icon || '01d',
    location: `${data.name}, ${data.sys.country}`,
    timestamp: Date.now(),
  }
}

// Get weather icon URL
export function getWeatherIconUrl(icon: string): string {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`
}

// Get weather condition color
export function getWeatherConditionColor(icon: string): string {
  const conditions: Record<string, string> = {
    '01': 'text-yellow-400', // clear sky
    '02': 'text-blue-300', // few clouds
    '03': 'text-slate-400', // scattered clouds
    '04': 'text-slate-500', // broken clouds
    '09': 'text-blue-400', // shower rain
    '10': 'text-blue-500', // rain
    '11': 'text-yellow-500', // thunderstorm
    '13': 'text-cyan-300', // snow
    '50': 'text-slate-400', // mist
  }

  const code = icon.slice(0, 2)
  return conditions[code] || 'text-slate-400'
}
