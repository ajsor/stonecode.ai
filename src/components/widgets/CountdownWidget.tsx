import { useState, useEffect } from 'react'
import { WidgetContainer } from './WidgetContainer'
import { useWidgets } from '../../hooks/useWidgets'

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
  total: number
}

function calculateTimeLeft(targetDate: string): TimeLeft {
  const difference = new Date(targetDate).getTime() - new Date().getTime()

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 }
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    total: difference,
  }
}

export function CountdownWidget() {
  const { configs } = useWidgets()

  const eventName = configs.countdown?.eventName ?? 'Event'
  const targetDate = configs.countdown?.targetDate ?? ''

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    targetDate ? calculateTimeLeft(targetDate) : { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 }
  )

  useEffect(() => {
    if (!targetDate) return

    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate))
    }, 1000)

    return () => clearInterval(interval)
  }, [targetDate])

  const isExpired = timeLeft.total <= 0
  const hasTarget = Boolean(targetDate)

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="text-center">
      <div className="text-3xl font-bold text-white">
        {value.toString().padStart(2, '0')}
      </div>
      <div className="text-xs text-slate-500 uppercase tracking-wide">{label}</div>
    </div>
  )

  return (
    <WidgetContainer
      title="Countdown"
      icon={
        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      }
    >
      <div className="h-full flex flex-col justify-center">
        {!hasTarget ? (
          <div className="text-center">
            <svg className="w-12 h-12 text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-slate-400 mb-1">No event set</p>
            <p className="text-xs text-slate-500">
              Click "Customize" to set a countdown date
            </p>
          </div>
        ) : isExpired ? (
          <div className="text-center">
            <div className="text-4xl mb-3">🎉</div>
            <div className="text-xl font-bold text-white mb-1">{eventName}</div>
            <div className="text-green-400 font-medium">Event has arrived!</div>
          </div>
        ) : (
          <>
            {/* Event name */}
            <div className="text-center mb-4">
              <div className="text-lg font-semibold text-white">{eventName}</div>
              <div className="text-xs text-slate-500">
                {new Date(targetDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>

            {/* Countdown display */}
            <div className="grid grid-cols-4 gap-2">
              <TimeBlock value={timeLeft.days} label="Days" />
              <TimeBlock value={timeLeft.hours} label="Hours" />
              <TimeBlock value={timeLeft.minutes} label="Mins" />
              <TimeBlock value={timeLeft.seconds} label="Secs" />
            </div>

            {/* Progress indicator */}
            <div className="mt-4 text-center">
              <span className="text-xs text-slate-500">
                {timeLeft.days > 0
                  ? `${timeLeft.days} day${timeLeft.days !== 1 ? 's' : ''} to go`
                  : timeLeft.hours > 0
                  ? `${timeLeft.hours} hour${timeLeft.hours !== 1 ? 's' : ''} to go`
                  : `${timeLeft.minutes} minute${timeLeft.minutes !== 1 ? 's' : ''} to go`}
              </span>
            </div>
          </>
        )}
      </div>
    </WidgetContainer>
  )
}
