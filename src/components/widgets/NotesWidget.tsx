import { useState, useEffect, useCallback } from 'react'
import { WidgetContainer } from './WidgetContainer'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { QuickNote } from '../../types/widgets'

const NOTE_COLORS = [
  { id: 'slate', bg: 'bg-slate-700', border: 'border-slate-600' },
  { id: 'violet', bg: 'bg-violet-900/50', border: 'border-violet-700' },
  { id: 'blue', bg: 'bg-blue-900/50', border: 'border-blue-700' },
  { id: 'green', bg: 'bg-green-900/50', border: 'border-green-700' },
  { id: 'amber', bg: 'bg-amber-900/50', border: 'border-amber-700' },
  { id: 'rose', bg: 'bg-rose-900/50', border: 'border-rose-700' },
]

export function NotesWidget() {
  const { user } = useAuth()
  const [notes, setNotes] = useState<QuickNote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  // Fetch notes
  const fetchNotes = useCallback(async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('quick_notes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (!error && data) {
      setNotes(data)
    }
    setIsLoading(false)
  }, [user])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  // Add new note
  const addNote = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('quick_notes')
      .insert({
        user_id: user.id,
        content: '',
        color: 'slate',
      })
      .select()
      .single()

    if (!error && data) {
      setNotes([data, ...notes])
      setEditingId(data.id)
      setEditContent('')
    }
  }

  // Update note
  const updateNote = async (id: string, content: string) => {
    const { error } = await supabase
      .from('quick_notes')
      .update({ content })
      .eq('id', id)

    if (!error) {
      setNotes(notes.map(n => n.id === id ? { ...n, content } : n))
    }
    setEditingId(null)
  }

  // Update note color
  const updateNoteColor = async (id: string, color: string) => {
    const { error } = await supabase
      .from('quick_notes')
      .update({ color })
      .eq('id', id)

    if (!error) {
      setNotes(notes.map(n => n.id === id ? { ...n, color } : n))
    }
  }

  // Delete note
  const deleteNote = async (id: string) => {
    const { error } = await supabase
      .from('quick_notes')
      .delete()
      .eq('id', id)

    if (!error) {
      setNotes(notes.filter(n => n.id !== id))
    }
  }

  const getColorClasses = (colorId: string) => {
    return NOTE_COLORS.find(c => c.id === colorId) || NOTE_COLORS[0]
  }

  return (
    <WidgetContainer
      title="Quick Notes"
      icon={
        <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      }
    >
      <div className="h-full flex flex-col">
        {/* Add button */}
        <button
          onClick={addNote}
          className="w-full py-2 px-3 mb-3 border border-dashed border-slate-600 rounded-lg text-slate-400 hover:text-white hover:border-violet-500 transition-colors text-sm flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Note
        </button>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-violet-500 border-t-transparent" />
            </div>
          ) : notes.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">
              No notes yet. Click "Add Note" to create one.
            </p>
          ) : (
            notes.map((note) => {
              const colors = getColorClasses(note.color)
              return (
                <div
                  key={note.id}
                  className={`p-3 rounded-lg border ${colors.bg} ${colors.border} group relative`}
                >
                  {editingId === note.id ? (
                    <div>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full bg-transparent text-white text-sm resize-none focus:outline-none min-h-[60px]"
                        placeholder="Write your note..."
                        autoFocus
                      />
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex gap-1">
                          {NOTE_COLORS.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => updateNoteColor(note.id, c.id)}
                              className={`w-4 h-4 rounded-full ${c.bg} border ${c.border} ${note.color === c.id ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-800' : ''}`}
                            />
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-xs text-slate-400 hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => updateNote(note.id, editContent)}
                            className="text-xs text-violet-400 hover:text-violet-300"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p
                        className="text-sm text-white whitespace-pre-wrap cursor-pointer min-h-[20px]"
                        onClick={() => {
                          setEditingId(note.id)
                          setEditContent(note.content)
                        }}
                      >
                        {note.content || <span className="text-slate-500 italic">Empty note</span>}
                      </p>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400 transition-opacity"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </WidgetContainer>
  )
}
