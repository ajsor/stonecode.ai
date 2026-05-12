// Pure-data constants shared between WidgetSettings and individual widgets.
// Lives outside the widget component files so importing it doesn't pull a
// full widget module (and its framer-motion / hook deps) into a consumer's
// chunk — important now that widgets are React.lazy-loaded per enabled flag.

export interface BreathPattern {
  id: string
  name: string
  inhale: number
  hold: number
  exhale: number
  rest: number
}

export const PATTERNS: BreathPattern[] = [
  { id: 'relaxing', name: 'Relaxing (4-7-8)', inhale: 4, hold: 7, exhale: 8, rest: 0 },
  { id: 'box', name: 'Box Breathing', inhale: 4, hold: 4, exhale: 4, rest: 4 },
  { id: 'calm', name: 'Calm (4-4-6)', inhale: 4, hold: 4, exhale: 6, rest: 0 },
  { id: 'energizing', name: 'Energizing (6-0-6)', inhale: 6, hold: 0, exhale: 6, rest: 0 },
]

export interface TimezoneOption {
  id: string
  label: string
  zone: string
}

export const TIMEZONES: TimezoneOption[] = [
  { id: 'local', label: 'Local', zone: Intl.DateTimeFormat().resolvedOptions().timeZone },
  { id: 'utc', label: 'UTC', zone: 'UTC' },
  { id: 'new_york', label: 'New York', zone: 'America/New_York' },
  { id: 'london', label: 'London', zone: 'Europe/London' },
  { id: 'tokyo', label: 'Tokyo', zone: 'Asia/Tokyo' },
  { id: 'sydney', label: 'Sydney', zone: 'Australia/Sydney' },
]
