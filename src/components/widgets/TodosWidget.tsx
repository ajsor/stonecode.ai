import { useState, useEffect, useCallback } from 'react'
import { WidgetContainer } from './WidgetContainer'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { TodoItem } from '../../types/widgets'

export function TodosWidget() {
  const { user } = useAuth()
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newTodo, setNewTodo] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)

  // Fetch todos
  const fetchTodos = useCallback(async () => {
    if (!user) return

    setError(null)
    const { data, error: fetchError } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError('Failed to load todos')
    } else if (data) {
      setTodos(data)
    }
    setIsLoading(false)
  }, [user])

  useEffect(() => {
    fetchTodos()
  }, [fetchTodos])

  // Add todo
  const addTodo = async () => {
    if (!user || !newTodo.trim()) return

    const { data, error: insertError } = await supabase
      .from('todos')
      .insert({
        user_id: user.id,
        text: newTodo.trim(),
        completed: false,
      })
      .select()
      .single()

    if (insertError) {
      setError('Failed to add todo')
    } else if (data) {
      setTodos([data, ...todos])
      setNewTodo('')
    }
  }

  // Toggle todo
  const toggleTodo = async (id: string, completed: boolean) => {
    const { error: updateError } = await supabase
      .from('todos')
      .update({ completed })
      .eq('id', id)

    if (updateError) {
      setError('Failed to update todo')
    } else {
      setTodos(todos.map(t => t.id === id ? { ...t, completed } : t))
    }
  }

  // Delete todo
  const deleteTodo = async (id: string) => {
    const { error: deleteError } = await supabase
      .from('todos')
      .delete()
      .eq('id', id)

    if (deleteError) {
      setError('Failed to delete todo')
    } else {
      setTodos(todos.filter(t => t.id !== id))
    }
    setConfirmDeleteId(null)
  }

  // Clear completed
  const clearCompleted = async () => {
    const completedIds = todos.filter(t => t.completed).map(t => t.id)
    if (completedIds.length === 0) return

    const { error: deleteError } = await supabase
      .from('todos')
      .delete()
      .in('id', completedIds)

    if (deleteError) {
      setError('Failed to clear completed')
    } else {
      setTodos(todos.filter(t => !t.completed))
    }
    setConfirmClear(false)
  }

  const filteredTodos = todos.filter(t => {
    if (filter === 'active') return !t.completed
    if (filter === 'completed') return t.completed
    return true
  })

  const activeCount = todos.filter(t => !t.completed).length

  return (
    <WidgetContainer
      title="Todo List"
      icon={
        <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      }
    >
      <div className="flex flex-col">
        {error && (
          <div className="mb-2 px-3 py-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-red-700 dark:text-red-400 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 ml-2">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {/* Add input */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTodo()}
            placeholder="Add a task..."
            className="flex-1 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white text-sm px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 focus:border-orange-500 focus:outline-none"
          />
          <button
            onClick={addTodo}
            disabled={!newTodo.trim()}
            className="px-3 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-200 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-3 text-xs">
          {(['all', 'active', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full capitalize transition-colors ${
                filter === f
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Todos list */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 widget-scrollable">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-orange-500 border-t-transparent" />
            </div>
          ) : filteredTodos.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">
              {filter === 'all' ? 'No tasks yet. Add one above!' : `No ${filter} tasks.`}
            </p>
          ) : (
            filteredTodos.map((todo) => (
              <div
                key={todo.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 group"
              >
                <button
                  onClick={() => toggleTodo(todo.id, !todo.completed)}
                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    todo.completed
                      ? 'bg-orange-600 border-orange-600'
                      : 'border-slate-500 hover:border-orange-500'
                  }`}
                >
                  {todo.completed && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <span
                  className={`flex-1 text-sm ${
                    todo.completed ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {todo.text}
                </span>
                {confirmDeleteId === todo.id ? (
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-600 shadow-sm dark:shadow-none">
                    <span className="text-xs text-slate-600 dark:text-slate-300">Delete?</span>
                    <button onClick={() => deleteTodo(todo.id)} className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-1">Yes</button>
                    <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-slate-400 hover:text-slate-900 dark:hover:text-white px-1">No</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(todo.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-opacity flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {todos.length > 0 && (
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
            <span>{activeCount} item{activeCount !== 1 ? 's' : ''} left</span>
            {todos.some(t => t.completed) && (
              confirmClear ? (
                <div className="flex items-center gap-1">
                  <span className="text-slate-600 dark:text-slate-300">Clear all?</span>
                  <button onClick={clearCompleted} className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-1">Yes</button>
                  <button onClick={() => setConfirmClear(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white px-1">No</button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  Clear completed
                </button>
              )
            )}
          </div>
        )}
      </div>
    </WidgetContainer>
  )
}
