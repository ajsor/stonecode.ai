import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWidgets } from '../../hooks/useWidgets'
import type { WidgetType, SpotifyPlaylist } from '../../types/widgets'
import { NEWS_CATEGORIES } from '../../lib/newsApi'
import { TIMEZONES } from './ClockWidget'
import { PATTERNS } from './BreathingWidget'

type SettingsTab = WidgetType | 'news'

interface WidgetSettingsProps {
  isOpen: boolean
  onClose: () => void
}

// Toggle switch component
function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        enabled ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-600'
      }`}
    >
      <span
        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : ''
        }`}
      />
    </button>
  )
}

export function WidgetSettings({ isOpen, onClose }: WidgetSettingsProps) {
  const { configs, updateConfig, toggleWidget, resetToDefaults, isSaving } = useWidgets()
  const [activeTab, setActiveTab] = useState<SettingsTab>('clock')
  const [confirmReset, setConfirmReset] = useState(false)

  // Local state for form fields
  const [newsCategories, setNewsCategories] = useState<string[]>(configs.news?.categories ?? ['technology'])
  const [newsKeywords, setNewsKeywords] = useState<string[]>(configs.news?.keywords ?? [])
  const [newKeyword, setNewKeyword] = useState('')
  const [weatherLocation, setWeatherLocation] = useState(configs.weather.location)
  const [weatherUnits, setWeatherUnits] = useState(configs.weather.units)
  const [newPlaylistUrl, setNewPlaylistUrl] = useState('')
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [calendarMaxEvents, setCalendarMaxEvents] = useState(configs.calendar.maxEvents)
  const [clockShowSeconds, setClockShowSeconds] = useState(configs.clock?.showSeconds ?? true)
  const [clockTimezones, setClockTimezones] = useState<string[]>(configs.clock?.timezones ?? ['local'])
  const [pomodoroFocus, setPomodoroFocus] = useState(configs.pomodoro?.focusMinutes ?? 25)
  const [pomodoroBreak, setPomodoroBreak] = useState(configs.pomodoro?.breakMinutes ?? 5)
  const [pomodoroLongBreak, setPomodoroLongBreak] = useState(configs.pomodoro?.longBreakMinutes ?? 15)
  const [countdownName, setCountdownName] = useState(configs.countdown?.eventName ?? '')
  const [countdownDate, setCountdownDate] = useState(configs.countdown?.targetDate ?? '')
  const [breathingPattern, setBreathingPattern] = useState<string>(configs.breathing?.pattern ?? 'relaxing')

  // Sync local state when configs change
  useEffect(() => {
    setNewsCategories(configs.news?.categories ?? ['technology'])
    setNewsKeywords(configs.news?.keywords ?? [])
    setWeatherLocation(configs.weather.location)
    setWeatherUnits(configs.weather.units)
    setCalendarMaxEvents(configs.calendar.maxEvents)
    setClockShowSeconds(configs.clock?.showSeconds ?? true)
    setClockTimezones(configs.clock?.timezones ?? ['local'])
    setPomodoroFocus(configs.pomodoro?.focusMinutes ?? 25)
    setPomodoroBreak(configs.pomodoro?.breakMinutes ?? 5)
    setPomodoroLongBreak(configs.pomodoro?.longBreakMinutes ?? 15)
    setCountdownName(configs.countdown?.eventName ?? '')
    setCountdownDate(configs.countdown?.targetDate ?? '')
    setBreathingPattern(configs.breathing?.pattern ?? 'relaxing')
  }, [configs])

  const handleSaveWeather = async () => {
    await updateConfig('weather', { location: weatherLocation, units: weatherUnits })
  }

  const handleAddPlaylist = async () => {
    if (!newPlaylistUrl.trim()) return
    const newPlaylist: SpotifyPlaylist = {
      name: newPlaylistName.trim() || `Playlist ${configs.spotify.playlists.length + 1}`,
      url: newPlaylistUrl.trim(),
    }
    await updateConfig('spotify', { playlists: [...configs.spotify.playlists, newPlaylist] })
    setNewPlaylistUrl('')
    setNewPlaylistName('')
  }

  const handleRemovePlaylist = async (index: number) => {
    const newPlaylists = configs.spotify.playlists.filter((_, i) => i !== index)
    await updateConfig('spotify', { playlists: newPlaylists })
  }

  const handleSaveCalendar = async () => {
    await updateConfig('calendar', { maxEvents: calendarMaxEvents })
  }

  const handleSaveClock = async () => {
    await updateConfig('clock', { showSeconds: clockShowSeconds, timezones: clockTimezones })
  }

  const handleSavePomodoro = async () => {
    await updateConfig('pomodoro', {
      focusMinutes: pomodoroFocus,
      breakMinutes: pomodoroBreak,
      longBreakMinutes: pomodoroLongBreak,
    })
  }

  const handleSaveCountdown = async () => {
    await updateConfig('countdown', { eventName: countdownName, targetDate: countdownDate })
  }

  const handleSaveBreathing = async () => {
    await updateConfig('breathing', { pattern: breathingPattern as 'relaxing' | 'box' | 'calm' | 'energizing' })
  }

  const handleSaveNews = async () => {
    await updateConfig('news', { categories: newsCategories, keywords: newsKeywords })
  }

  const toggleNewsCategory = (cat: string) => {
    setNewsCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  const addKeyword = () => {
    const kw = newKeyword.trim()
    if (kw && !newsKeywords.includes(kw)) {
      setNewsKeywords([...newsKeywords, kw])
      setNewKeyword('')
    }
  }

  const removeKeyword = (kw: string) => {
    setNewsKeywords(newsKeywords.filter(k => k !== kw))
  }

  const toggleTimezone = (tz: string) => {
    if (clockTimezones.includes(tz)) {
      if (clockTimezones.length > 1) {
        setClockTimezones(clockTimezones.filter(t => t !== tz))
      }
    } else {
      setClockTimezones([...clockTimezones, tz])
    }
  }

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'news', label: 'News Ticker', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg> },
    { id: 'clock', label: 'Clock', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { id: 'pomodoro', label: 'Pomodoro', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { id: 'countdown', label: 'Countdown', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
    { id: 'calculator', label: 'Calculator', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> },
    { id: 'breathing', label: 'Breathing', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg> },
    { id: 'weather', label: 'Weather', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg> },
    { id: 'spotify', label: 'Spotify', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg> },
    { id: 'calendar', label: 'Calendar', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
    { id: 'notes', label: 'Notes', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg> },
    { id: 'bookmarks', label: 'Bookmarks', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg> },
    { id: 'todos', label: 'Todos', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> },
    { id: 'habits', label: 'Habits', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div
              className="w-full max-w-2xl max-h-[80vh] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Widget Settings</h2>
                <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex h-[60vh]">
                <div className="w-48 border-r border-slate-200 dark:border-white/10 p-4 space-y-1 overflow-y-auto">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        activeTab === tab.id ? 'bg-orange-500/20 text-orange-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5'
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                  <hr className="border-slate-200 dark:border-white/10 my-4" />
                  {confirmReset ? (
                    <div className="px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                      <p className="text-xs text-red-600 dark:text-red-400 mb-2">Reset all widgets to defaults?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { resetToDefaults(); setConfirmReset(false) }}
                          disabled={isSaving}
                          className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium disabled:opacity-50"
                        >
                          Yes, reset
                        </button>
                        <button
                          onClick={() => setConfirmReset(false)}
                          className="text-xs text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmReset(true)}
                      disabled={isSaving}
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Reset All
                    </button>
                  )}
                </div>

                <div className="flex-1 p-6 overflow-y-auto">
                  {/* Clock Tab */}
                  {activeTab === 'clock' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-slate-900 dark:text-white font-medium">Enable Clock Widget</h3>
                          <p className="text-sm text-slate-400">Display current time</p>
                        </div>
                        <Toggle enabled={configs.clock?.enabled ?? true} onChange={() => toggleWidget('clock', !(configs.clock?.enabled ?? true))} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-300">Show Seconds</span>
                        <Toggle enabled={clockShowSeconds} onChange={() => setClockShowSeconds(!clockShowSeconds)} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-3">Timezones</label>
                        <div className="grid grid-cols-2 gap-2">
                          {TIMEZONES.map((tz) => (
                            <label key={tz.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5">
                              <input
                                type="checkbox"
                                checked={clockTimezones.includes(tz.id)}
                                onChange={() => toggleTimezone(tz.id)}
                                className="rounded text-orange-500"
                              />
                              <span className="text-sm text-slate-900 dark:text-white">{tz.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <button onClick={handleSaveClock} disabled={isSaving} className="px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors disabled:opacity-50">
                        {isSaving ? 'Saving...' : 'Save Clock Settings'}
                      </button>
                    </div>
                  )}

                  {/* Pomodoro Tab */}
                  {activeTab === 'pomodoro' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-slate-900 dark:text-white font-medium">Enable Pomodoro Timer</h3>
                          <p className="text-sm text-slate-400">Focus and break timer</p>
                        </div>
                        <Toggle enabled={configs.pomodoro?.enabled ?? true} onChange={() => toggleWidget('pomodoro', !(configs.pomodoro?.enabled ?? true))} />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm text-slate-600 dark:text-slate-300 mb-2">Focus (min)</label>
                          <input type="number" min={1} max={60} value={pomodoroFocus} onChange={(e) => setPomodoroFocus(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white" />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-600 dark:text-slate-300 mb-2">Break (min)</label>
                          <input type="number" min={1} max={30} value={pomodoroBreak} onChange={(e) => setPomodoroBreak(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white" />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-600 dark:text-slate-300 mb-2">Long Break (min)</label>
                          <input type="number" min={1} max={60} value={pomodoroLongBreak} onChange={(e) => setPomodoroLongBreak(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white" />
                        </div>
                      </div>
                      <button onClick={handleSavePomodoro} disabled={isSaving} className="px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors disabled:opacity-50">
                        {isSaving ? 'Saving...' : 'Save Pomodoro Settings'}
                      </button>
                    </div>
                  )}

                  {/* Countdown Tab */}
                  {activeTab === 'countdown' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-slate-900 dark:text-white font-medium">Enable Countdown Widget</h3>
                          <p className="text-sm text-slate-400">Count down to a special event</p>
                        </div>
                        <Toggle enabled={configs.countdown?.enabled ?? true} onChange={() => toggleWidget('countdown', !(configs.countdown?.enabled ?? true))} />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-600 dark:text-slate-300 mb-2">Event Name</label>
                        <input type="text" value={countdownName} onChange={(e) => setCountdownName(e.target.value)} placeholder="e.g., Vacation, Birthday, Launch" className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500" />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-600 dark:text-slate-300 mb-2">Target Date</label>
                        <input type="datetime-local" value={countdownDate} onChange={(e) => setCountdownDate(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white" />
                      </div>
                      <button onClick={handleSaveCountdown} disabled={isSaving} className="px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors disabled:opacity-50">
                        {isSaving ? 'Saving...' : 'Save Countdown Settings'}
                      </button>
                    </div>
                  )}

                  {/* Calculator Tab */}
                  {activeTab === 'calculator' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-slate-900 dark:text-white font-medium">Enable Calculator Widget</h3>
                          <p className="text-sm text-slate-400">Quick calculations</p>
                        </div>
                        <Toggle enabled={configs.calculator?.enabled ?? true} onChange={() => toggleWidget('calculator', !(configs.calculator?.enabled ?? true))} />
                      </div>
                      <p className="text-sm text-slate-500">No additional settings for calculator.</p>
                    </div>
                  )}

                  {/* Breathing Tab */}
                  {activeTab === 'breathing' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-slate-900 dark:text-white font-medium">Enable Breathing Widget</h3>
                          <p className="text-sm text-slate-400">Guided breathing exercises</p>
                        </div>
                        <Toggle enabled={configs.breathing?.enabled ?? true} onChange={() => toggleWidget('breathing', !(configs.breathing?.enabled ?? true))} />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-600 dark:text-slate-300 mb-3">Breathing Pattern</label>
                        <div className="space-y-2">
                          {PATTERNS.map((pattern) => (
                            <label key={pattern.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-white/5 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10">
                              <input
                                type="radio"
                                name="breathing-pattern"
                                value={pattern.id}
                                checked={breathingPattern === pattern.id}
                                onChange={() => setBreathingPattern(pattern.id)}
                                className="text-orange-500"
                              />
                              <div>
                                <div className="text-sm text-slate-900 dark:text-white font-medium">{pattern.name}</div>
                                <div className="text-xs text-slate-500">
                                  {pattern.inhale}s in / {pattern.hold > 0 ? `${pattern.hold}s hold / ` : ''}{pattern.exhale}s out
                                  {pattern.rest > 0 ? ` / ${pattern.rest}s rest` : ''}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                      <button onClick={handleSaveBreathing} disabled={isSaving} className="px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors disabled:opacity-50">
                        {isSaving ? 'Saving...' : 'Save Breathing Settings'}
                      </button>
                    </div>
                  )}

                  {/* Weather Tab */}
                  {activeTab === 'weather' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-slate-900 dark:text-white font-medium">Enable Weather Widget</h3>
                          <p className="text-sm text-slate-400">Show current weather (requires API key)</p>
                        </div>
                        <Toggle enabled={configs.weather.enabled} onChange={() => toggleWidget('weather', !configs.weather.enabled)} />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-600 dark:text-slate-300 mb-2">Location</label>
                        <input type="text" value={weatherLocation} onChange={(e) => setWeatherLocation(e.target.value)} placeholder="City, State ZIP" className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500" />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-600 dark:text-slate-300 mb-2">Units</label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" checked={weatherUnits === 'imperial'} onChange={() => setWeatherUnits('imperial')} className="text-orange-500" />
                            <span className="text-slate-900 dark:text-white">Fahrenheit</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" checked={weatherUnits === 'metric'} onChange={() => setWeatherUnits('metric')} className="text-orange-500" />
                            <span className="text-slate-900 dark:text-white">Celsius</span>
                          </label>
                        </div>
                      </div>
                      <button onClick={handleSaveWeather} disabled={isSaving} className="px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors disabled:opacity-50">
                        {isSaving ? 'Saving...' : 'Save Weather Settings'}
                      </button>
                    </div>
                  )}

                  {/* Spotify Tab */}
                  {activeTab === 'spotify' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-slate-900 dark:text-white font-medium">Enable Spotify Widget</h3>
                          <p className="text-sm text-slate-400">Quick links to playlists</p>
                        </div>
                        <Toggle enabled={configs.spotify.enabled} onChange={() => toggleWidget('spotify', !configs.spotify.enabled)} />
                      </div>
                      <div className="space-y-3">
                        <label className="block text-sm text-slate-600 dark:text-slate-300">Add Playlist</label>
                        <input type="text" value={newPlaylistName} onChange={(e) => setNewPlaylistName(e.target.value)} placeholder="Playlist name" className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500" />
                        <div className="flex gap-2">
                          <input type="text" value={newPlaylistUrl} onChange={(e) => setNewPlaylistUrl(e.target.value)} placeholder="Spotify URL" className="flex-1 px-4 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500" />
                          <button onClick={handleAddPlaylist} disabled={!newPlaylistUrl.trim()} className="px-4 py-2 rounded-lg bg-green-500 text-white font-medium hover:bg-green-600 disabled:opacity-50">Add</button>
                        </div>
                      </div>
                      {configs.spotify.playlists.length > 0 && (
                        <div className="space-y-2">
                          {configs.spotify.playlists.map((playlist, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-white/5">
                              <span className="text-slate-900 dark:text-white text-sm truncate">{playlist.name}</span>
                              <button onClick={() => handleRemovePlaylist(i)} className="text-slate-400 hover:text-red-500 dark:hover:text-red-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Calendar Tab */}
                  {activeTab === 'calendar' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-slate-900 dark:text-white font-medium">Enable Calendar Widget</h3>
                          <p className="text-sm text-slate-400">Google Calendar events (requires setup)</p>
                        </div>
                        <Toggle enabled={configs.calendar.enabled} onChange={() => toggleWidget('calendar', !configs.calendar.enabled)} />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-600 dark:text-slate-300 mb-2">Max Events</label>
                        <input type="number" min={1} max={20} value={calendarMaxEvents} onChange={(e) => setCalendarMaxEvents(Number(e.target.value))} className="w-24 px-4 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white" />
                      </div>
                      <button onClick={handleSaveCalendar} disabled={isSaving} className="px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors disabled:opacity-50">
                        {isSaving ? 'Saving...' : 'Save Calendar Settings'}
                      </button>
                    </div>
                  )}

                  {/* Notes Tab */}
                  {activeTab === 'notes' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-slate-900 dark:text-white font-medium">Enable Notes Widget</h3>
                          <p className="text-sm text-slate-400">Quick notes stored in your account</p>
                        </div>
                        <Toggle enabled={configs.notes?.enabled ?? true} onChange={() => toggleWidget('notes', !(configs.notes?.enabled ?? true))} />
                      </div>
                      <p className="text-sm text-slate-500">No additional settings for notes.</p>
                    </div>
                  )}

                  {/* Bookmarks Tab */}
                  {activeTab === 'bookmarks' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-slate-900 dark:text-white font-medium">Enable Bookmarks Widget</h3>
                          <p className="text-sm text-slate-400">Save your favorite links</p>
                        </div>
                        <Toggle enabled={configs.bookmarks?.enabled ?? true} onChange={() => toggleWidget('bookmarks', !(configs.bookmarks?.enabled ?? true))} />
                      </div>
                      <p className="text-sm text-slate-500">No additional settings for bookmarks.</p>
                    </div>
                  )}

                  {/* Todos Tab */}
                  {activeTab === 'todos' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-slate-900 dark:text-white font-medium">Enable Todo List Widget</h3>
                          <p className="text-sm text-slate-400">Track your tasks and to-dos</p>
                        </div>
                        <Toggle enabled={configs.todos?.enabled ?? true} onChange={() => toggleWidget('todos', !(configs.todos?.enabled ?? true))} />
                      </div>
                      <p className="text-sm text-slate-500">No additional settings for todos.</p>
                    </div>
                  )}

                  {/* Habits Tab */}
                  {activeTab === 'habits' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-slate-900 dark:text-white font-medium">Enable Habit Tracker Widget</h3>
                          <p className="text-sm text-slate-400">Track daily habits with streaks</p>
                        </div>
                        <Toggle enabled={configs.habits?.enabled ?? true} onChange={() => toggleWidget('habits', !(configs.habits?.enabled ?? true))} />
                      </div>
                      <p className="text-sm text-slate-500">No additional settings for habits.</p>
                    </div>
                  )}

                  {/* News Ticker Tab */}
                  {activeTab === 'news' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-slate-900 dark:text-white font-medium">Enable News Ticker</h3>
                          <p className="text-sm text-slate-400">Scrolling headlines at the bottom of dashboard</p>
                        </div>
                        <Toggle enabled={configs.news?.enabled ?? false} onChange={() => toggleWidget('news', !(configs.news?.enabled ?? false))} />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-3">Categories</label>
                        <div className="grid grid-cols-2 gap-2">
                          {NEWS_CATEGORIES.map((cat) => (
                            <label key={cat.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5">
                              <input
                                type="checkbox"
                                checked={newsCategories.includes(cat.id)}
                                onChange={() => toggleNewsCategory(cat.id)}
                                className="rounded text-orange-500"
                              />
                              <span className="text-sm text-slate-900 dark:text-white">{cat.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Keywords</label>
                        <div className="flex gap-2 mb-3">
                          <input
                            type="text"
                            value={newKeyword}
                            onChange={(e) => setNewKeyword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                            placeholder="Add a keyword..."
                            className="flex-1 px-4 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                          />
                          <button
                            onClick={addKeyword}
                            disabled={!newKeyword.trim()}
                            className="px-4 py-2 rounded-lg bg-orange-500/20 text-orange-400 font-medium hover:bg-orange-500/30 disabled:opacity-50 transition-colors"
                          >
                            Add
                          </button>
                        </div>
                        {newsKeywords.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {newsKeywords.map((kw) => (
                              <span key={kw} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-sm text-slate-900 dark:text-white">
                                {kw}
                                <button onClick={() => removeKeyword(kw)} className="text-slate-400 hover:text-red-500 dark:hover:text-red-400">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <button onClick={handleSaveNews} disabled={isSaving} className="px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors disabled:opacity-50">
                        {isSaving ? 'Saving...' : 'Save News Settings'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
