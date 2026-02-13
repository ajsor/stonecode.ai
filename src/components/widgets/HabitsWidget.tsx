import { useState, useEffect, useCallback, useMemo } from 'react'
import { WidgetContainer } from './WidgetContainer'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { Habit, HabitCompletion } from '../../types/widgets'

const HABIT_ICONS = [
  { id: 'star', icon: '⭐' },
  { id: 'workout', icon: '💪' },
  { id: 'water', icon: '💧' },
  { id: 'book', icon: '📚' },
  { id: 'meditation', icon: '🧘' },
  { id: 'sleep', icon: '😴' },
  { id: 'run', icon: '🏃' },
  { id: 'fruit', icon: '🍎' },
]

const HABIT_COLORS = [
  { id: 'violet', bg: 'bg-violet-600', ring: 'ring-violet-500' },
  { id: 'blue', bg: 'bg-blue-600', ring: 'ring-blue-500' },
  { id: 'green', bg: 'bg-green-600', ring: 'ring-green-500' },
  { id: 'amber', bg: 'bg-amber-600', ring: 'ring-amber-500' },
  { id: 'rose', bg: 'bg-rose-600', ring: 'ring-rose-500' },
  { id: 'cyan', bg: 'bg-cyan-600', ring: 'ring-cyan-500' },
]

// Get last 7 days including today
function getLast7Days() {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    days.push(date.toISOString().split('T')[0])
  }
  return days
}

export function HabitsWidget() {
  const { user } = useAuth()
  const [habits, setHabits] = useState<Habit[]>([])
  const [completions, setCompletions] = useState<HabitCompletion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('star')
  const [newColor, setNewColor] = useState('violet')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const today = useMemo(() => new Date().toISOString().split('T')[0], [])
  const last7Days = useMemo(() => getLast7Days(), [])

  // Fetch habits and completions
  const fetchData = useCallback(async () => {
    if (!user) return

    setError(null)

    // Fetch habits
    const { data: habitsData, error: habitsError } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (habitsError) {
      setError('Failed to load habits')
      setIsLoading(false)
      return
    }

    if (habitsData) {
      setHabits(habitsData)

      // Fetch completions for the last 7 days
      if (habitsData.length > 0) {
        const habitIds = habitsData.map(h => h.id)
        const { data: completionsData, error: completionsError } = await supabase
          .from('habit_completions')
          .select('*')
          .in('habit_id', habitIds)
          .gte('completed_date', last7Days[0])
          .lte('completed_date', last7Days[6])

        if (completionsError) {
          setError('Failed to load habit data')
        } else if (completionsData) {
          setCompletions(completionsData)
        }
      }
    }
    setIsLoading(false)
  }, [user, last7Days])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Add habit
  const addHabit = async () => {
    if (!user || !newName.trim()) return

    const { data, error: insertError } = await supabase
      .from('habits')
      .insert({
        user_id: user.id,
        name: newName.trim(),
        icon: newIcon,
        color: newColor,
      })
      .select()
      .single()

    if (insertError) {
      setError('Failed to add habit')
    } else if (data) {
      setHabits([...habits, data])
      setNewName('')
      setNewIcon('star')
      setNewColor('violet')
      setIsAdding(false)
    }
  }

  // Toggle habit completion for today
  const toggleCompletion = async (habitId: string) => {
    const existing = completions.find(
      c => c.habit_id === habitId && c.completed_date === today
    )

    if (existing) {
      // Remove completion
      const { error: deleteError } = await supabase
        .from('habit_completions')
        .delete()
        .eq('id', existing.id)

      if (deleteError) {
        setError('Failed to update habit')
      } else {
        setCompletions(completions.filter(c => c.id !== existing.id))
      }
    } else {
      // Add completion
      const { data, error: insertError } = await supabase
        .from('habit_completions')
        .insert({
          habit_id: habitId,
          completed_date: today,
        })
        .select()
        .single()

      if (insertError) {
        setError('Failed to update habit')
      } else if (data) {
        setCompletions([...completions, data])
      }
    }
  }

  // Delete habit
  const deleteHabit = async (id: string) => {
    const { error: deleteError } = await supabase
      .from('habits')
      .delete()
      .eq('id', id)

    if (deleteError) {
      setError('Failed to delete habit')
    } else {
      setHabits(habits.filter(h => h.id !== id))
      setCompletions(completions.filter(c => c.habit_id !== id))
    }
    setConfirmDeleteId(null)
  }

  // Check if habit is completed on a given date
  const isCompleted = (habitId: string, date: string) => {
    return completions.some(
      c => c.habit_id === habitId && c.completed_date === date
    )
  }

  // Get streak for a habit
  const getStreak = (habitId: string) => {
    let streak = 0
    for (let i = last7Days.length - 1; i >= 0; i--) {
      if (isCompleted(habitId, last7Days[i])) {
        streak++
      } else {
        break
      }
    }
    return streak
  }

  const getColorClass = (colorId: string) => {
    return HABIT_COLORS.find(c => c.id === colorId) || HABIT_COLORS[0]
  }

  const getIcon = (iconId: string) => {
    return HABIT_ICONS.find(i => i.id === iconId)?.icon || '⭐'
  }

  return (
    <WidgetContainer
      title="Habit Tracker"
      icon={
        <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }
    >
      <div className="h-full flex flex-col">
        {error && (
          <div className="mb-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 ml-2">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {/* Add form */}
        {isAdding ? (
          <div className="mb-3 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Habit name..."
              className="w-full bg-slate-800 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:border-violet-500 focus:outline-none mb-2"
              autoFocus
            />
            <div className="flex flex-wrap gap-1 mb-2">
              {HABIT_ICONS.map((i) => (
                <button
                  key={i.id}
                  onClick={() => setNewIcon(i.id)}
                  className={`w-8 h-8 rounded flex items-center justify-center text-lg ${
                    newIcon === i.id ? 'bg-slate-600 ring-2 ring-violet-500' : 'bg-slate-800 hover:bg-slate-700'
                  }`}
                >
                  {i.icon}
                </button>
              ))}
            </div>
            <div className="flex gap-1 mb-2">
              {HABIT_COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setNewColor(c.id)}
                  className={`w-6 h-6 rounded-full ${c.bg} ${
                    newColor === c.id ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-700' : ''
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setIsAdding(false)
                  setNewName('')
                }}
                className="text-xs text-slate-400 hover:text-white px-3 py-1"
              >
                Cancel
              </button>
              <button
                onClick={addHabit}
                disabled={!newName.trim()}
                className="text-xs bg-violet-600 hover:bg-violet-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-3 py-1 rounded"
              >
                Add
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full py-2 px-3 mb-3 border border-dashed border-slate-600 rounded-lg text-slate-400 hover:text-white hover:border-violet-500 transition-colors text-sm flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Habit
          </button>
        )}

        {/* Habits list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 widget-scrollable">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-violet-500 border-t-transparent" />
            </div>
          ) : habits.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">
              No habits yet. Start tracking your daily habits!
            </p>
          ) : (
            habits.map((habit) => {
              const colors = getColorClass(habit.color)
              const streak = getStreak(habit.id)

              return (
                <div
                  key={habit.id}
                  className="p-3 bg-slate-700/30 rounded-lg border border-slate-700 group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getIcon(habit.icon)}</span>
                      <span className="text-sm text-white font-medium">{habit.name}</span>
                      {streak > 0 && (
                        <span className="text-xs bg-amber-600/30 text-amber-400 px-1.5 py-0.5 rounded">
                          {streak}d
                        </span>
                      )}
                    </div>
                    {confirmDeleteId === habit.id ? (
                      <div className="flex items-center gap-1 bg-slate-800 rounded-lg px-2 py-1 border border-slate-600">
                        <span className="text-xs text-slate-300">Delete?</span>
                        <button onClick={() => deleteHabit(habit.id)} className="text-xs text-red-400 hover:text-red-300 px-1">Yes</button>
                        <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-slate-400 hover:text-white px-1">No</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(habit.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400 transition-opacity"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {last7Days.map((date) => {
                      const isToday = date === today
                      const completed = isCompleted(habit.id, date)
                      return (
                        <button
                          key={date}
                          onClick={() => isToday && toggleCompletion(habit.id)}
                          disabled={!isToday}
                          className={`flex-1 h-6 rounded text-xs flex items-center justify-center transition-colors ${
                            completed
                              ? `${colors.bg} text-white`
                              : 'bg-slate-700 text-slate-500'
                          } ${isToday && !completed ? 'hover:bg-slate-600 cursor-pointer ring-2 ring-violet-500/50' : ''} ${
                            !isToday ? 'cursor-default' : ''
                          }`}
                          title={new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        >
                          {['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(date).getDay()]}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </WidgetContainer>
  )
}
