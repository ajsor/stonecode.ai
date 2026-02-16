import { useWidgets } from '../../hooks/useWidgets'
import { useGoogleCalendar } from '../../hooks/useGoogleCalendar'
import { WidgetContainer } from './WidgetContainer'

export function CalendarWidget() {
  const { configs } = useWidgets()
  const { maxEvents } = configs.calendar
  const { events, isLoading, error, isConnected, isConfigured, connect, disconnect, refresh } =
    useGoogleCalendar(maxEvents)

  const formatEventTime = (event: { start: { dateTime?: string; date?: string } }) => {
    if (event.start.date) {
      // All-day event
      return 'All day'
    }
    if (event.start.dateTime) {
      return new Date(event.start.dateTime).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    }
    return ''
  }

  const formatEventDate = (event: { start: { dateTime?: string; date?: string } }) => {
    const dateStr = event.start.dateTime || event.start.date
    if (!dateStr) return ''

    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow'
    }

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <WidgetContainer
      title="Calendar"
      icon={
        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      }
      isLoading={isLoading}
      error={error}
      headerAction={
        isConnected ? (
          <button
            onClick={refresh}
            className="p-1 text-slate-400 hover:text-white transition-colors"
            title="Refresh events"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        ) : null
      }
    >
      {!isConfigured ? (
        <div className="flex flex-col items-center text-center">
          <svg className="w-12 h-12 text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-slate-400 mb-2">Google Calendar not configured</p>
          <p className="text-xs text-slate-500">
            Set VITE_GOOGLE_CLIENT_ID in your environment
          </p>
        </div>
      ) : !isConnected ? (
        <div className="flex flex-col items-center text-center">
          <svg className="w-12 h-12 text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-slate-400 mb-4">Connect your Google Calendar</p>
          <button
            onClick={connect}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-slate-900 font-medium hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Connect Google
          </button>
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center text-center">
          <svg className="w-12 h-12 text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-sm text-slate-400 mb-2">No upcoming events</p>
          <p className="text-xs text-slate-500">Your calendar is clear!</p>
          <button
            onClick={disconnect}
            className="mt-4 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Disconnect Google Calendar
          </button>
        </div>
      ) : (
        <div className="space-y-1 overflow-y-auto">
          {events.map((event) => (
            <a
              key={event.id}
              href={event.htmlLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 rounded-lg hover:bg-white/5 transition-colors group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate group-hover:text-blue-400 transition-colors">
                    {event.summary}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-blue-400 font-medium">
                      {formatEventDate(event)}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatEventTime(event)}
                    </span>
                  </div>
                </div>
                <svg className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
            </a>
          ))}

          <div className="pt-3 mt-3 border-t border-white/10">
            <button
              onClick={disconnect}
              className="w-full text-xs text-slate-500 hover:text-red-400 transition-colors text-center py-2"
            >
              Disconnect Google Calendar
            </button>
          </div>
        </div>
      )}
    </WidgetContainer>
  )
}
