import { useState, useEffect, useCallback } from 'react'
import { WidgetContainer } from './WidgetContainer'
import { useWidgets } from '../../hooks/useWidgets'

type TimerMode = 'focus' | 'break' | 'longBreak'

const MODE_LABELS: Record<TimerMode, string> = {
  focus: 'Focus',
  break: 'Break',
  longBreak: 'Long Break',
}

const MODE_COLORS: Record<TimerMode, string> = {
  focus: 'text-red-400',
  break: 'text-green-400',
  longBreak: 'text-blue-400',
}

export function PomodoroWidget() {
  const { configs } = useWidgets()

  const focusMinutes = configs.pomodoro?.focusMinutes ?? 25
  const breakMinutes = configs.pomodoro?.breakMinutes ?? 5
  const longBreakMinutes = configs.pomodoro?.longBreakMinutes ?? 15

  const [mode, setMode] = useState<TimerMode>('focus')
  const [timeLeft, setTimeLeft] = useState(focusMinutes * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [sessions, setSessions] = useState(0)

  const getInitialTime = useCallback((m: TimerMode) => {
    switch (m) {
      case 'focus': return focusMinutes * 60
      case 'break': return breakMinutes * 60
      case 'longBreak': return longBreakMinutes * 60
    }
  }, [focusMinutes, breakMinutes, longBreakMinutes])

  // Reset timer when config changes
  useEffect(() => {
    if (!isRunning) {
      setTimeLeft(getInitialTime(mode))
    }
  }, [focusMinutes, breakMinutes, longBreakMinutes, mode, isRunning, getInitialTime])

  useEffect(() => {
    if (!isRunning) return

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Timer complete
          setIsRunning(false)

          // Play notification sound (optional)
          try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQcAQqbz+qh/FQ0qjN3/xJV1OiY/hdnz5rlpIQkAbbbw1KB9MQ0nhNL/16d/NyI1fcDf4b13LhAIebHe38mKWjgtYqvN4dSeeT0aIXGm0OTen3UjCASY1vPvp35MKCVsmMvj36J8PyAdaJzI4N6gfT8cIWmWxN7doH5BICF2oMvj4aJ9PBsed5zJ4OCggD0bHnugzeTjon88Gx53nMng4aB/PRsed5zJ4OGgfz0bHnecyeDhoH8=')
            audio.volume = 0.3
            audio.play().catch(() => {})
          } catch {}

          if (mode === 'focus') {
            const newSessions = sessions + 1
            setSessions(newSessions)
            // Every 4 sessions, take a long break
            if (newSessions % 4 === 0) {
              setMode('longBreak')
              return longBreakMinutes * 60
            } else {
              setMode('break')
              return breakMinutes * 60
            }
          } else {
            setMode('focus')
            return focusMinutes * 60
          }
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning, mode, sessions, focusMinutes, breakMinutes, longBreakMinutes])

  const toggleTimer = () => {
    setIsRunning(!isRunning)
  }

  const resetTimer = () => {
    setIsRunning(false)
    setTimeLeft(getInitialTime(mode))
  }

  const switchMode = (newMode: TimerMode) => {
    setIsRunning(false)
    setMode(newMode)
    setTimeLeft(getInitialTime(newMode))
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const progress = 1 - (timeLeft / getInitialTime(mode))

  return (
    <WidgetContainer
      title="Pomodoro"
      icon={
        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }
    >
      <div className="h-full flex flex-col">
        {/* Mode selector */}
        <div className="flex gap-1 mb-4">
          {(['focus', 'break', 'longBreak'] as TimerMode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                mode === m
                  ? 'bg-white/10 text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        {/* Timer display */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className={`text-5xl font-bold ${MODE_COLORS[mode]} mb-2`}>
            {formatTime(timeLeft)}
          </div>
          <div className="text-sm text-slate-500 mb-4">
            {MODE_LABELS[mode]} {mode === 'focus' && `(Session ${sessions + 1})`}
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-4">
            <div
              className={`h-full transition-all duration-1000 ${
                mode === 'focus' ? 'bg-red-400' : mode === 'break' ? 'bg-green-400' : 'bg-blue-400'
              }`}
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            <button
              onClick={toggleTimer}
              className={`px-6 py-2 rounded-xl font-medium transition-colors ${
                isRunning
                  ? 'bg-white/10 text-white hover:bg-white/20'
                  : 'bg-violet-500 text-white hover:bg-violet-600'
              }`}
            >
              {isRunning ? 'Pause' : 'Start'}
            </button>
            <button
              onClick={resetTimer}
              className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </WidgetContainer>
  )
}
