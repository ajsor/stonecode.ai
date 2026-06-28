import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { WidgetGrid, WidgetSettings } from '../../components/widgets'
import { NewsTicker } from '../../components/dashboard/NewsTicker'
import { getUnresolvedIssueCount } from '../../lib/appIssues'
import { getAppUtilization, type AppUtilization } from '../../lib/appLaunches'

export default function Dashboard() {
  const { profile } = useAuth()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [issueCount, setIssueCount] = useState<number | null>(null)
  const [utilization, setUtilization] = useState<AppUtilization | null>(null)
  const isAdmin = profile?.is_admin === true

  useEffect(() => {
    if (!isAdmin) return
    getUnresolvedIssueCount().then(setIssueCount)
    getAppUtilization().then(setUtilization).catch(() => setUtilization(null))
  }, [isAdmin])

  return (
    <div className="max-w-6xl mx-auto pb-14">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
              Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}!
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Here's your personalized dashboard.
            </p>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Customize
          </button>
        </div>

        {/* Widget Grid */}
        <div className="mb-8">
          <WidgetGrid />
        </div>

        {/* Admin tile section: App Utilization (2x2) + App Issues + reserved slot.
            Non-admins see no bottom row — their dashboard is the WidgetGrid above. */}
        {isAdmin && (
          <div className="grid gap-6 md:grid-cols-3 md:grid-rows-2 md:auto-rows-fr">
            {/* App Utilization (left 2 cols, both rows) */}
            <Link to="/portal/admin/utilization" className="md:col-span-2 md:row-span-2 block">
              <motion.div
                className="h-full p-5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-xl hover:border-orange-300 dark:hover:border-orange-500/40 transition-colors flex flex-col"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6h6v13M3 19h18M5 19V10h4M15 19v-7h4" />
                      </svg>
                    </div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">App Utilization</h2>
                  </div>
                  <span className="text-xs text-slate-400 dark:text-slate-500">View details →</span>
                </div>

                {utilization === null ? (
                  <UtilizationSkeleton />
                ) : (
                  <UtilizationSummary data={utilization} />
                )}
              </motion.div>
            </Link>

            {/* App Issues — top right */}
            <Link to="/portal/admin/app-issues" className="block">
              <motion.div
                className="h-full p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-xl hover:border-red-300 dark:hover:border-red-500/40 transition-colors"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0l-7.1 12.25A2 2 0 005 19z" />
                    </svg>
                  </div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">App Issues</h2>
                </div>
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-2xl font-light text-slate-900 dark:text-white leading-none">
                      {issueCount === null ? '—' : issueCount}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {issueCount === 0 ? 'All clear' : 'Unresolved'}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400 dark:text-slate-500">View →</span>
                </div>
              </motion.div>
            </Link>

            {/* Reserved slot — room for a future tile */}
            <div
              className="hidden md:block rounded-2xl border border-dashed border-slate-200/60 dark:border-white/5"
              aria-hidden="true"
            />
          </div>
        )}
      </motion.div>

      {/* Widget Settings Modal */}
      <WidgetSettings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* News Ticker */}
      <NewsTicker />
    </div>
  )
}

/* ── App Utilization tile internals ────────────────────────────────── */

function UtilizationSkeleton() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[180px]">
      <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function UtilizationSummary({ data }: { data: AppUtilization }) {
  const totalLaunches7d = data.apps.reduce((s, a) => s + a.launches_7d, 0)
  const topApps = [...data.apps]
    .filter((a) => a.launches_7d > 0)
    .sort((a, b) => b.launches_7d - a.launches_7d)
    .slice(0, 3)

  return (
    <div className="flex-1 flex flex-col gap-4">
      {/* Key numbers */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryStat label="Weekly active" value={data.active_users.wau} sub={`of ${data.active_users.total_users}`} />
        <SummaryStat label="Daily active" value={data.active_users.dau} />
        <SummaryStat label="Launches 7d" value={totalLaunches7d} sub={`${data.active_app_users.wau_apps} app users`} />
      </div>

      {/* Sparkline */}
      <div className="flex-1 min-h-[80px]">
        <TileSparkline series={data.daily_series} />
      </div>

      {/* Top 3 apps this week */}
      <div>
        <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Top apps · 7d</p>
        {topApps.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500">No launches yet this week.</p>
        ) : (
          <ul className="space-y-1.5">
            {topApps.map((a) => {
              const delta = a.launches_7d - a.launches_prev_7d
              return (
                <li key={a.app} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-slate-900 dark:text-white">{a.app}</span>
                  <span className="tabular-nums text-slate-600 dark:text-slate-300">
                    {a.launches_7d}
                    {a.launches_prev_7d > 0 && (
                      <span className={`ml-2 text-xs ${delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                        {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}
                      </span>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

function SummaryStat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-2xl font-light text-slate-900 dark:text-white tabular-nums mt-1 leading-none">
        {value.toLocaleString()}
      </p>
      {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
    </div>
  )
}

function TileSparkline({ series }: { series: { day: string; launches: number }[] }) {
  // 30-day densified sparkline. Same logic as the full page but smaller.
  const days = 30
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const buckets: number[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    const hit = series.find((s) => s.day === iso)
    buckets.push(hit?.launches ?? 0)
  }
  if (buckets.every((v) => v === 0)) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-slate-400 dark:text-slate-500">
        Launch trend appears once apps are opened from the portal.
      </div>
    )
  }
  const w = 600, h = 80
  const max = Math.max(1, ...buckets)
  const pts = buckets.map((v, i) => {
    const x = (i * w) / (buckets.length - 1)
    const y = h - (v / max) * h
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
  }).join(' ')
  const area = `${pts} L ${w} ${h} L 0 ${h} Z`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="tile-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgb(249,115,22)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="rgb(249,115,22)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#tile-fill)" />
      <path d={pts} fill="none" stroke="rgb(249,115,22)" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
