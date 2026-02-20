import { useState, useEffect, useCallback } from 'react'
import { WidgetContainer } from './WidgetContainer'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { Bookmark } from '../../types/widgets'

export function BookmarksWidget() {
  const { user } = useAuth()
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Fetch bookmarks
  const fetchBookmarks = useCallback(async () => {
    if (!user) return

    setError(null)
    const { data, error: fetchError } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (fetchError) {
      setError('Failed to load bookmarks')
    } else if (data) {
      setBookmarks(data)
    }
    setIsLoading(false)
  }, [user])

  useEffect(() => {
    fetchBookmarks()
  }, [fetchBookmarks])

  // Extract domain for favicon
  const getFaviconUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    } catch {
      return null
    }
  }

  // Add bookmark
  const addBookmark = async () => {
    if (!user || !newUrl.trim()) return

    // Add protocol if missing
    let url = newUrl.trim()
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }

    // Use URL as title if not provided
    const title = newTitle.trim() || url

    const { data, error: insertError } = await supabase
      .from('bookmarks')
      .insert({
        user_id: user.id,
        url,
        title,
        favicon: getFaviconUrl(url),
      })
      .select()
      .single()

    if (insertError) {
      setError('Failed to add bookmark')
    } else if (data) {
      setBookmarks([data, ...bookmarks])
      setNewUrl('')
      setNewTitle('')
      setIsAdding(false)
    }
  }

  // Delete bookmark
  const deleteBookmark = async (id: string) => {
    const { error: deleteError } = await supabase
      .from('bookmarks')
      .delete()
      .eq('id', id)

    if (deleteError) {
      setError('Failed to delete bookmark')
    } else {
      setBookmarks(bookmarks.filter(b => b.id !== id))
    }
    setConfirmDeleteId(null)
  }

  return (
    <WidgetContainer
      title="Bookmarks"
      icon={
        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
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

        {/* Add form */}
        {isAdding ? (
          <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
            <input
              type="text"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="URL (e.g., github.com)"
              className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 focus:border-orange-500 focus:outline-none mb-2"
              autoFocus
            />
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Title (optional)"
              className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 focus:border-orange-500 focus:outline-none mb-2"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setIsAdding(false)
                  setNewUrl('')
                  setNewTitle('')
                }}
                className="text-xs text-slate-400 hover:text-slate-900 dark:hover:text-white px-3 py-1"
              >
                Cancel
              </button>
              <button
                onClick={addBookmark}
                disabled={!newUrl.trim()}
                className="text-xs bg-orange-600 hover:bg-orange-500 disabled:bg-slate-200 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-3 py-1 rounded"
              >
                Add
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full py-2 px-3 mb-3 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-orange-500 transition-colors text-sm flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Bookmark
          </button>
        )}

        {/* Bookmarks list */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 widget-scrollable">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-orange-500 border-t-transparent" />
            </div>
          ) : bookmarks.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">
              No bookmarks yet. Add your favorite sites!
            </p>
          ) : (
            bookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 group"
              >
                {bookmark.favicon ? (
                  <img
                    src={bookmark.favicon}
                    alt=""
                    className="w-4 h-4 flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                ) : (
                  <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                )}
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-sm text-slate-900 dark:text-white hover:text-orange-500 dark:hover:text-orange-400 truncate"
                >
                  {bookmark.title}
                </a>
                {confirmDeleteId === bookmark.id ? (
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-600 shadow-sm dark:shadow-none">
                    <span className="text-xs text-slate-600 dark:text-slate-300">Delete?</span>
                    <button onClick={() => deleteBookmark(bookmark.id)} className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-1">Yes</button>
                    <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-slate-400 hover:text-slate-900 dark:hover:text-white px-1">No</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(bookmark.id)}
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
      </div>
    </WidgetContainer>
  )
}
