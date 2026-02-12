import { useState, useEffect, useCallback } from 'react'
import { WidgetContainer } from './WidgetContainer'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { TodoItem } from '../../types/widgets'

export function TodosWidget() {
  const { user } = useAuth()
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newTodo, setNewTodo] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')

  // Fetch todos
  const fetchTodos = useCallback(async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
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

    const { data, error } = await supabase
      .from('todos')
      .insert({
        user_id: user.id,
        text: newTodo.trim(),
        completed: false,
      })
      .select()
      .single()

    if (!error && data) {
      setTodos([data, ...todos])
      setNewTodo('')
    }
  }

  // Toggle todo
  const toggleTodo = async (id: string, completed: boolean) => {
    const { error } = await supabase
      .from('todos')
      .update({ completed })
      .eq('id', id)

    if (!error) {
      setTodos(todos.map(t => t.id === id ? { ...t, completed } : t))
    }
  }

  // Delete todo
  const deleteTodo = async (id: string) => {
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id)

    if (!error) {
      setTodos(todos.filter(t => t.id !== id))
    }
  }

  // Clear completed
  const clearCompleted = async () => {
    const completedIds = todos.filter(t => t.completed).map(t => t.id)
    if (completedIds.length === 0) return

    const { error } = await supabase
      .from('todos')
      .delete()
      .in('id', completedIds)

    if (!error) {
      setTodos(todos.filter(t => !t.completed))
    }
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
        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      }
    >
      <div className="h-full flex flex-col">
        {/* Add input */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTodo()}
            placeholder="Add a task..."
            className="flex-1 bg-slate-700 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:border-violet-500 focus:outline-none"
          />
          <button
            onClick={addTodo}
            disabled={!newTodo.trim()}
            className="px-3 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
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
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Todos list */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-violet-500 border-t-transparent" />
            </div>
          ) : filteredTodos.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">
              {filter === 'all' ? 'No tasks yet. Add one above!' : `No ${filter} tasks.`}
            </p>
          ) : (
            filteredTodos.map((todo) => (
              <div
                key={todo.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/50 group"
              >
                <button
                  onClick={() => toggleTodo(todo.id, !todo.completed)}
                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    todo.completed
                      ? 'bg-violet-600 border-violet-600'
                      : 'border-slate-500 hover:border-violet-500'
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
                    todo.completed ? 'text-slate-500 line-through' : 'text-white'
                  }`}
                >
                  {todo.text}
                </span>
                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400 transition-opacity flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {todos.length > 0 && (
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-700 text-xs text-slate-400">
            <span>{activeCount} item{activeCount !== 1 ? 's' : ''} left</span>
            {todos.some(t => t.completed) && (
              <button
                onClick={clearCompleted}
                className="hover:text-red-400 transition-colors"
              >
                Clear completed
              </button>
            )}
          </div>
        )}
      </div>
    </WidgetContainer>
  )
}
