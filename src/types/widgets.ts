// Widget Types for Dashboard Widgets

export type WidgetType =
  | 'weather'
  | 'spotify'
  | 'calendar'
  | 'gmail'
  | 'clock'
  | 'pomodoro'
  | 'countdown'
  | 'calculator'
  | 'breathing'
  | 'notes'
  | 'bookmarks'
  | 'todos'
  | 'habits'

// React Grid Layout item
export interface WidgetLayoutItem {
  i: WidgetType
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

// Weather Widget Config
export interface WeatherConfig {
  enabled: boolean
  location: string
  units: 'imperial' | 'metric'
}

// Spotify Playlist
export interface SpotifyPlaylist {
  name: string
  url: string
  imageUrl?: string
}

// Spotify Widget Config
export interface SpotifyConfig {
  enabled: boolean
  playlists: SpotifyPlaylist[]
}

// Calendar Widget Config
export interface CalendarConfig {
  enabled: boolean
  maxEvents: number
}

// Gmail Widget Config (future)
export interface GmailConfig {
  enabled: boolean
}

// Clock Widget Config
export interface ClockConfig {
  enabled: boolean
  showSeconds: boolean
  timezones: string[] // 'local', 'utc', 'new_york', 'london', 'tokyo', 'sydney'
}

// Pomodoro Widget Config
export interface PomodoroConfig {
  enabled: boolean
  focusMinutes: number
  breakMinutes: number
  longBreakMinutes: number
}

// Countdown Widget Config
export interface CountdownConfig {
  enabled: boolean
  eventName: string
  targetDate: string // ISO date string
}

// Calculator Widget Config
export interface CalculatorConfig {
  enabled: boolean
}

// Breathing Widget Config
export interface BreathingConfig {
  enabled: boolean
  pattern: 'relaxing' | 'box' | 'calm' | 'energizing'
}

// Quick Notes Widget Config
export interface NotesConfig {
  enabled: boolean
}

// Bookmarks Widget Config
export interface BookmarksConfig {
  enabled: boolean
}

// Todo List Widget Config
export interface TodosConfig {
  enabled: boolean
}

// Habit Tracker Widget Config
export interface HabitsConfig {
  enabled: boolean
}

// Quick Note (stored in DB)
export interface QuickNote {
  id: string
  user_id: string
  content: string
  color: string
  created_at: string
  updated_at: string
}

// Bookmark (stored in DB)
export interface Bookmark {
  id: string
  user_id: string
  title: string
  url: string
  description?: string
  favicon?: string
  created_at: string
}

// Todo Item (stored in DB)
export interface TodoItem {
  id: string
  user_id: string
  text: string
  completed: boolean
  due_date?: string
  created_at: string
  updated_at: string
}

// Habit (stored in DB)
export interface Habit {
  id: string
  user_id: string
  name: string
  icon: string
  color: string
  created_at: string
}

// Habit Completion (stored in DB)
export interface HabitCompletion {
  id: string
  habit_id: string
  completed_date: string
  created_at: string
}

// Combined Widget Configs
export interface WidgetConfigs {
  weather: WeatherConfig
  spotify: SpotifyConfig
  calendar: CalendarConfig
  gmail: GmailConfig
  clock: ClockConfig
  pomodoro: PomodoroConfig
  countdown: CountdownConfig
  calculator: CalculatorConfig
  breathing: BreathingConfig
  notes: NotesConfig
  bookmarks: BookmarksConfig
  todos: TodosConfig
  habits: HabitsConfig
}

// Widget Preferences (stored in DB)
export interface WidgetPreferences {
  id: string
  user_id: string
  layout: WidgetLayoutItem[]
  widget_configs: WidgetConfigs
  created_at: string
  updated_at: string
}

// Google OAuth Token (stored in DB)
export interface GoogleOAuthToken {
  id: string
  user_id: string
  access_token: string
  refresh_token: string
  expires_at: string
  scope: string
  created_at: string
  updated_at: string
}

// Default Layout
export const DEFAULT_LAYOUT: WidgetLayoutItem[] = [
  { i: 'clock', x: 0, y: 0, w: 2, h: 2, minW: 2, minH: 2 },
  { i: 'weather', x: 2, y: 0, w: 2, h: 2, minW: 2, minH: 2 },
  { i: 'pomodoro', x: 0, y: 2, w: 2, h: 3, minW: 2, minH: 3 },
  { i: 'calculator', x: 2, y: 2, w: 2, h: 3, minW: 2, minH: 3 },
  { i: 'countdown', x: 0, y: 5, w: 2, h: 2, minW: 2, minH: 2 },
  { i: 'breathing', x: 2, y: 5, w: 2, h: 3, minW: 2, minH: 3 },
  { i: 'notes', x: 0, y: 8, w: 2, h: 3, minW: 2, minH: 2 },
  { i: 'todos', x: 2, y: 8, w: 2, h: 3, minW: 2, minH: 2 },
  { i: 'bookmarks', x: 0, y: 11, w: 2, h: 3, minW: 2, minH: 2 },
  { i: 'habits', x: 2, y: 11, w: 2, h: 3, minW: 2, minH: 2 },
  { i: 'spotify', x: 0, y: 14, w: 2, h: 3, minW: 2, minH: 2 },
  { i: 'calendar', x: 2, y: 14, w: 2, h: 4, minW: 2, minH: 3 },
]

// Default Configs
export const DEFAULT_CONFIGS: WidgetConfigs = {
  weather: { enabled: false, location: 'Vancouver, WA 98682', units: 'imperial' },
  spotify: { enabled: false, playlists: [] },
  calendar: { enabled: false, maxEvents: 7 },
  gmail: { enabled: false },
  clock: { enabled: true, showSeconds: true, timezones: ['local'] },
  pomodoro: { enabled: true, focusMinutes: 25, breakMinutes: 5, longBreakMinutes: 15 },
  countdown: { enabled: true, eventName: '', targetDate: '' },
  calculator: { enabled: true },
  breathing: { enabled: true, pattern: 'relaxing' },
  notes: { enabled: true },
  bookmarks: { enabled: true },
  todos: { enabled: true },
  habits: { enabled: true },
}

// Weather API Types
export interface WeatherData {
  temp: number
  feelsLike: number
  humidity: number
  description: string
  icon: string
  location: string
  timestamp: number
}

// Google Calendar Event
export interface CalendarEvent {
  id: string
  summary: string
  description?: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  htmlLink: string
  status: string
}

// Widget Context State
export interface WidgetState {
  layout: WidgetLayoutItem[]
  configs: WidgetConfigs
  isLoading: boolean
  isSaving: boolean
  error: string | null
}

// Widget Context Actions
export interface WidgetActions {
  updateLayout: (layout: WidgetLayoutItem[]) => Promise<void>
  updateConfig: <K extends WidgetType>(
    widget: K,
    config: Partial<WidgetConfigs[K]>
  ) => Promise<void>
  toggleWidget: (widget: WidgetType, enabled: boolean) => Promise<void>
  resetToDefaults: () => Promise<void>
}

export type WidgetContextType = WidgetState & WidgetActions
