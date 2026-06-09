import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getAppIssues,
  resolveAppIssue,
  deleteAppIssue,
  buildFixPrompt,
  type AppIssue,
} from '../../../lib/appIssues'

function fmtDate(s: string): string {
  const d = new Date(s)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)}h ago`
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const SEVERITY_STYLES: Record<AppIssue['severity'], string> = {
  error: 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-500/20 border-red-200 dark:border-red-500/30',
  warning: 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/20 border-amber-200 dark:border-amber-500/30',
}

export default function AppIssuesPage() {
  const [issues, setIssues] = useState<AppIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [includeResolved, setIncludeResolved] = useState(false)
  const [appFilter, setAppFilter] = useState<string>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [actingId, setActingId] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [includeResolved])

  const load = async () => {
    setLoading(true)
    const data = await getAppIssues(includeResolved)
    setIssues(data)
    setLoading(false)
  }

  const apps = useMemo(() => {
    const set = new Set<string>()
    for (const i of issues) set.add(i.app)
    return ['all', ...Array.from(set).sort()]
  }, [issues])

  const filtered = useMemo(
    () => (appFilter === 'all' ? issues : issues.filter((i) => i.app === appFilter)),
    [issues, appFilter],
  )

  const handleCopyFix = async (issue: AppIssue) => {
    const prompt = buildFixPrompt(issue)
    try {
      await navigator.clipboard.writeText(prompt)
      setCopiedId(issue.id)
      setTimeout(() => setCopiedId((id) => (id === issue.id ? null : id)), 2000)
    } catch (err) {
      console.error('Clipboard write failed:', err)
      window.alert('Could not copy to clipboard.')
    }
  }

  const handleResolve = async (issue: AppIssue) => {
    setActingId(issue.id)
    try {
      await resolveAppIssue(issue.id)
      setIssues((prev) => prev.map((i) => (i.id === issue.id ? { ...i, resolved: true } : i)))
      if (!includeResolved) {
        setIssues((prev) => prev.filter((i) => i.id !== issue.id))
      }
    } catch (err) {
      console.error('Resolve failed:', err)
      window.alert('Could not mark resolved.')
    } finally {
      setActingId(null)
    }
  }

  const handleDelete = async (issue: AppIssue) => {
    if (!window.confirm('Delete this issue? This cannot be undone.')) return
    setActingId(issue.id)
    try {
      await deleteAppIssue(issue.id)
      setIssues((prev) => prev.filter((i) => i.id !== issue.id))
    } catch (err) {
      console.error('Delete failed:', err)
      window.alert('Could not delete issue.')
    } finally {
      setActingId(null)
    }
  }

  return (
    <div className="max-w-6xl mx-auto pb-14">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">App Issues</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Warnings and errors reported by stonecode.ai and its satellite apps.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 dark:text-slate-400">App</label>
            <select
              value={appFilter}
              onChange={(e) => setAppFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-slate-200"
            >
              {apps.map((a) => (
                <option key={a} value={a}>{a === 'all' ? 'All apps' : a}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={includeResolved}
              onChange={(e) => setIncludeResolved(e.target.checked)}
              className="rounded border-slate-300 dark:border-white/10"
            />
            Show resolved
          </label>
          <button
            onClick={load}
            className="ml-auto px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"
          >
            Refresh
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <svg className="w-12 h-12 text-emerald-500/60 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
            </svg>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">All clear</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">No issues to show.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {filtered.map((issue) => (
                <motion.div
                  key={issue.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${SEVERITY_STYLES[issue.severity]}`}>
                        {issue.severity}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10">
                        {issue.app}
                      </span>
                      {issue.source && (
                        <span className="text-xs text-slate-400">{issue.source}</span>
                      )}
                      {issue.location && (
                        <span className="text-xs text-slate-400 font-mono">{issue.location}</span>
                      )}
                      {issue.resolved && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                          resolved
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
                      {fmtDate(issue.created_at)}
                    </span>
                  </div>

                  <p className="text-sm text-slate-900 dark:text-slate-100 mb-2 font-mono whitespace-pre-wrap break-words">
                    {issue.message}
                  </p>

                  {issue.details && (
                    <details className="mb-3">
                      <summary className="text-xs text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200">
                        Show details
                      </summary>
                      <pre className="mt-2 p-3 rounded-lg bg-slate-50 dark:bg-black/30 text-xs text-slate-700 dark:text-slate-300 overflow-x-auto whitespace-pre-wrap break-words">
                        {issue.details}
                      </pre>
                    </details>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleCopyFix(issue)}
                      className="px-3 py-1.5 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-500/30 text-xs font-medium transition-colors"
                    >
                      {copiedId === issue.id ? 'Copied — paste into Claude Code' : 'Copy fix prompt'}
                    </button>
                    {!issue.resolved && (
                      <button
                        onClick={() => handleResolve(issue)}
                        disabled={actingId === issue.id}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        Mark resolved
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(issue)}
                      disabled={actingId === issue.id}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  )
}
