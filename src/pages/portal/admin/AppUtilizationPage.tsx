import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getAppUtilization, type AppUtilization } from '../../../lib/appLaunches'

export default function AppUtilizationPage() {
  const [data, setData] = useState<AppUtilization | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getAppUtilization()
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return <Loader />
  }
  if (error) {
    return (
      <div className="max-w-6xl mx-auto py-12 text-center">
        <p className="text-red-500 dark:text-red-400">Failed to load utilization: {error}</p>
      </div>
    )
  }
  if (!data) return null

  const totalLaunches7d  = data.apps.reduce((s, a) => s + a.launches_7d,  0)
  const totalLaunches30d = data.apps.reduce((s, a) => s + a.launches_30d, 0)

  return (
    <div className="max-w-6xl mx-auto pb-14">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">App Utilization</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Active users and satellite app launches across the stonecode portal.
            </p>
          </div>
          <Link
            to="/portal/dashboard"
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            ← Dashboard
          </Link>
        </div>

        {/* Top stat row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Stat label="Daily active users"    value={data.active_users.dau} caption={`of ${data.active_users.total_users} total`} />
          <Stat label="Weekly active users"   value={data.active_users.wau} />
          <Stat label="Monthly active users"  value={data.active_users.mau} />
          <Stat label="Launches (7d)"         value={totalLaunches7d} caption={`${totalLaunches30d} in 30d`} />
        </div>

        {/* Daily launches chart */}
        <Card title="Daily launches — last 30 days">
          {data.daily_series.length === 0 ? (
            <Empty message="No launches yet. The series will populate as users open apps from the portal." />
          ) : (
            <DailySeriesChart series={data.daily_series} />
          )}
        </Card>

        {/* Per-app row + adoption */}
        <div className="grid lg:grid-cols-2 gap-6 mt-6">
          <Card title="Launches by app — last 7 days vs prior 7 days">
            {data.apps.every((a) => a.launches_7d === 0 && a.launches_prev_7d === 0) ? (
              <Empty message="No app launches captured yet." />
            ) : (
              <PerAppBars apps={data.apps} />
            )}
          </Card>

          <Card title="Adoption funnel — granted → launched → returning">
            <AdoptionTable apps={data.apps} />
          </Card>
        </div>

        {/* Top users */}
        <Card title="Top users — last 30 days" className="mt-6">
          {data.top_users.length === 0 ? (
            <Empty message="No launches yet." />
          ) : (
            <ol className="divide-y divide-slate-200 dark:divide-white/5">
              {data.top_users.map((u, i) => (
                <li key={u.user_id} className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-3">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold bg-orange-500/10 text-orange-600 dark:text-orange-400"
                    >{i + 1}</span>
                    <span className="text-sm text-slate-900 dark:text-white truncate max-w-xs">{u.label}</span>
                  </span>
                  <span className="text-sm tabular-nums text-slate-500 dark:text-slate-400">
                    {u.launches.toLocaleString()} launches
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <p className="text-xs text-slate-400 dark:text-slate-500 mt-6">
          Updated {new Date(data.generated_at).toLocaleString()}. Launch telemetry collected from portal-sidebar clicks.
        </p>
      </motion.div>
    </div>
  )
}

/* ── presentational helpers ────────────────────────────────────────── */

function Loader() {
  return (
    <div className="max-w-6xl mx-auto py-24 flex justify-center">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function Stat({ label, value, caption }: { label: string; value: number; caption?: string }) {
  return (
    <motion.div
      className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-xl"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-light text-slate-900 dark:text-white tabular-nums">
        {value.toLocaleString()}
      </p>
      {caption && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{caption}</p>
      )}
    </motion.div>
  )
}

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={`p-5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none ${className ?? ''}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 }}
    >
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">{title}</h2>
      {children}
    </motion.div>
  )
}

function Empty({ message }: { message: string }) {
  return (
    <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">{message}</div>
  )
}

/* ── charts (inline SVG, no chart-lib dependency) ──────────────────── */

function DailySeriesChart({ series }: { series: { day: string; launches: number }[] }) {
  // Densify: ensure we have 30 buckets so the X-axis is stable even when
  // some days had zero launches and the RPC didn't emit a row.
  const days = 30
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const buckets: { day: string; launches: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    const hit = series.find((s) => s.day === iso)
    buckets.push({ day: iso, launches: hit?.launches ?? 0 })
  }

  const w = 600, h = 160, pad = 20
  const max = Math.max(1, ...buckets.map((b) => b.launches))
  const pts = buckets.map((b, i) => {
    const x = pad + (i * (w - 2 * pad)) / (buckets.length - 1)
    const y = h - pad - (b.launches / max) * (h - 2 * pad)
    return { x, y, ...b }
  })
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L ${pts[pts.length - 1].x.toFixed(1)} ${h - pad} L ${pts[0].x.toFixed(1)} ${h - pad} Z`

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-40">
        <defs>
          <linearGradient id="ds-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="rgb(249,115,22)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="rgb(249,115,22)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Y baseline */}
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="currentColor" strokeOpacity="0.1" />
        <path d={areaPath} fill="url(#ds-fill)" />
        <path d={linePath} fill="none" stroke="rgb(249,115,22)" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <title>{`${p.day}: ${p.launches} launches`}</title>
            <circle cx={p.x} cy={p.y} r={p.launches > 0 ? 2.25 : 0} fill="rgb(249,115,22)" />
          </g>
        ))}
        {/* X axis labels — first, mid, last */}
        <text x={pad} y={h - 4} fontSize="10" fill="currentColor" fillOpacity="0.5">
          {buckets[0].day.slice(5)}
        </text>
        <text x={w / 2} y={h - 4} fontSize="10" fill="currentColor" fillOpacity="0.5" textAnchor="middle">
          {buckets[Math.floor(buckets.length / 2)].day.slice(5)}
        </text>
        <text x={w - pad} y={h - 4} fontSize="10" fill="currentColor" fillOpacity="0.5" textAnchor="end">
          {buckets[buckets.length - 1].day.slice(5)}
        </text>
      </svg>
    </div>
  )
}

function PerAppBars({ apps }: { apps: AppUtilization['apps'] }) {
  const visible = apps.filter((a) => a.launches_7d > 0 || a.launches_prev_7d > 0)
  const max = Math.max(1, ...visible.flatMap((a) => [a.launches_7d, a.launches_prev_7d]))
  return (
    <ul className="space-y-3">
      {visible.map((a) => (
        <li key={a.app}>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-sm font-medium text-slate-900 dark:text-white capitalize">{a.app}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {a.launches_7d.toLocaleString()} <span className="opacity-50">vs {a.launches_prev_7d.toLocaleString()}</span>
            </span>
          </div>
          <div className="grid grid-cols-1 gap-1">
            <Bar label="this 7d"  value={a.launches_7d}      max={max} color="rgb(249,115,22)" />
            <Bar label="prior 7d" value={a.launches_prev_7d} max={max} color="rgba(100,116,139,0.4)" />
          </div>
        </li>
      ))}
    </ul>
  )
}

function Bar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = (value / max) * 100
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 w-14 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function AdoptionTable({ apps }: { apps: AppUtilization['apps'] }) {
  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <th className="text-left py-2 px-2 font-medium">App</th>
            <th className="text-right py-2 px-2 font-medium">Granted</th>
            <th className="text-right py-2 px-2 font-medium">Launched</th>
            <th className="text-right py-2 px-2 font-medium">Active 7d</th>
            <th className="text-right py-2 px-2 font-medium">Returning</th>
          </tr>
        </thead>
        <tbody>
          {apps.map((a) => {
            const launchedPct = a.granted > 0 ? Math.round((a.ever_launched / a.granted) * 100) : 0
            return (
              <tr key={a.app} className="border-t border-slate-100 dark:border-white/5">
                <td className="py-2 px-2 capitalize text-slate-900 dark:text-white font-medium">{a.app}</td>
                <td className="py-2 px-2 text-right tabular-nums text-slate-600 dark:text-slate-300">{a.granted}</td>
                <td className="py-2 px-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                  {a.ever_launched}{' '}
                  {a.granted > 0 && (
                    <span className="text-xs text-slate-400 dark:text-slate-500">({launchedPct}%)</span>
                  )}
                </td>
                <td className="py-2 px-2 text-right tabular-nums text-slate-600 dark:text-slate-300">{a.active_7d}</td>
                <td className="py-2 px-2 text-right tabular-nums text-slate-600 dark:text-slate-300">{a.returning}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
