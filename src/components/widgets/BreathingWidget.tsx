import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WidgetContainer } from './WidgetContainer'
import { useWidgets } from '../../hooks/useWidgets'

type BreathPhase = 'inhale' | 'hold' | 'exhale' | 'rest'

interface BreathPattern {
  id: string
  name: string
  inhale: number
  hold: number
  exhale: number
  rest: number
}

const PATTERNS: BreathPattern[] = [
  { id: 'relaxing', name: 'Relaxing (4-7-8)', inhale: 4, hold: 7, exhale: 8, rest: 0 },
  { id: 'box', name: 'Box Breathing', inhale: 4, hold: 4, exhale: 4, rest: 4 },
  { id: 'calm', name: 'Calm (4-4-6)', inhale: 4, hold: 4, exhale: 6, rest: 0 },
  { id: 'energizing', name: 'Energizing (6-0-6)', inhale: 6, hold: 0, exhale: 6, rest: 0 },
]

const PHASE_LABELS: Record<BreathPhase, string> = {
  inhale: 'Breathe In',
  hold: 'Hold',
  exhale: 'Breathe Out',
  rest: 'Rest',
}

const PHASE_COLORS: Record<BreathPhase, string> = {
  inhale: 'from-cyan-500 to-blue-500',
  hold: 'from-amber-500 to-orange-500',
  exhale: 'from-green-500 to-emerald-500',
  rest: 'from-slate-500 to-slate-600',
}

export function BreathingWidget() {
  const { configs } = useWidgets()
  const patternId = configs.breathing?.pattern ?? 'relaxing'

  const [isActive, setIsActive] = useState(false)
  const [phase, setPhase] = useState<BreathPhase>('inhale')
  const [timeLeft, setTimeLeft] = useState(0)
  const [cycles, setCycles] = useState(0)

  const pattern = PATTERNS.find(p => p.id === patternId) || PATTERNS[0]

  const getPhaseTime = useCallback((p: BreathPhase): number => {
    switch (p) {
      case 'inhale': return pattern.inhale
      case 'hold': return pattern.hold
      case 'exhale': return pattern.exhale
      case 'rest': return pattern.rest
    }
  }, [pattern])

  const getNextPhase = useCallback((currentPhase: BreathPhase): BreathPhase => {
    switch (currentPhase) {
      case 'inhale':
        return pattern.hold > 0 ? 'hold' : 'exhale'
      case 'hold':
        return 'exhale'
      case 'exhale':
        return pattern.rest > 0 ? 'rest' : 'inhale'
      case 'rest':
        return 'inhale'
    }
  }, [pattern])

  useEffect(() => {
    if (!isActive) return

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          const next = getNextPhase(phase)
          if (next === 'inhale' && phase !== 'inhale') {
            setCycles(c => c + 1)
          }
          setPhase(next)
          return getPhaseTime(next)
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isActive, phase, getNextPhase, getPhaseTime])

  const start = () => {
    setIsActive(true)
    setPhase('inhale')
    setTimeLeft(pattern.inhale)
    setCycles(0)
  }

  const stop = () => {
    setIsActive(false)
    setPhase('inhale')
    setTimeLeft(0)
  }

  // Calculate circle scale based on phase
  const getScale = () => {
    if (!isActive) return 0.6
    switch (phase) {
      case 'inhale': return 1
      case 'hold': return 1
      case 'exhale': return 0.6
      case 'rest': return 0.6
    }
  }

  return (
    <WidgetContainer
      title="Breathing"
      icon={
        <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      }
    >
      <div className="flex flex-col items-center">
        {/* Pattern selector (when not active) */}
        <AnimatePresence mode="wait">
          {!isActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center mb-4"
            >
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">{pattern.name}</div>
              <div className="text-xs text-slate-400 dark:text-slate-500">
                {pattern.inhale}s in / {pattern.hold > 0 ? `${pattern.hold}s hold / ` : ''}{pattern.exhale}s out
                {pattern.rest > 0 ? ` / ${pattern.rest}s rest` : ''}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Breathing circle */}
        <div className="relative w-32 h-32 mb-4">
          <motion.div
            className={`absolute inset-0 rounded-full bg-gradient-to-br ${PHASE_COLORS[phase]} opacity-20`}
            animate={{ scale: getScale() }}
            transition={{ duration: getPhaseTime(phase), ease: 'easeInOut' }}
          />
          <motion.div
            className={`absolute inset-4 rounded-full bg-gradient-to-br ${PHASE_COLORS[phase]} opacity-40`}
            animate={{ scale: getScale() }}
            transition={{ duration: getPhaseTime(phase), ease: 'easeInOut' }}
          />
          <motion.div
            className={`absolute inset-8 rounded-full bg-gradient-to-br ${PHASE_COLORS[phase]}`}
            animate={{ scale: getScale() }}
            transition={{ duration: getPhaseTime(phase), ease: 'easeInOut' }}
          />

          {/* Center content */}
          <div className="absolute inset-0 flex items-center justify-center">
            {isActive ? (
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{timeLeft}</div>
              </div>
            ) : (
              <svg className="w-8 h-8 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            )}
          </div>
        </div>

        {/* Phase label */}
        <AnimatePresence mode="wait">
          {isActive && (
            <motion.div
              key={phase}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-lg font-medium text-slate-900 dark:text-white mb-1"
            >
              {PHASE_LABELS[phase]}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cycles counter */}
        {isActive && cycles > 0 && (
          <div className="text-xs text-slate-500 mb-3">
            {cycles} cycle{cycles !== 1 ? 's' : ''} completed
          </div>
        )}

        {/* Controls */}
        <button
          onClick={isActive ? stop : start}
          className={`px-6 py-2 rounded-xl font-medium transition-colors ${
            isActive
              ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20'
              : 'bg-teal-500 text-white hover:bg-teal-600'
          }`}
        >
          {isActive ? 'Stop' : 'Start'}
        </button>
      </div>
    </WidgetContainer>
  )
}

export { PATTERNS }
