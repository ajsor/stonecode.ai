import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'
import { useFeatureFlags } from '../../hooks/useFeatureFlags'
import { WidgetGrid, WidgetSettings } from '../../components/widgets'
import { NewsTicker } from '../../components/dashboard/NewsTicker'

export default function Dashboard() {
  const { profile } = useAuth()
  const { flags } = useFeatureFlags()
  const [settingsOpen, setSettingsOpen] = useState(false)

  const enabledFeatures = Object.entries(flags).filter(([, enabled]) => enabled)

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

        {/* Account Info & Quick Actions - Compact Section */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Account Status Card */}
          <motion.div
            className="p-5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Account</h2>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Status</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Role</span>
                <span className="text-slate-900 dark:text-white font-medium">
                  {profile?.is_admin ? 'Administrator' : 'Member'}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Features Card */}
          <motion.div
            className="p-5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Features</h2>
            </div>
            {enabledFeatures.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {enabledFeatures.slice(0, 3).map(([name]) => (
                  <span
                    key={name}
                    className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-xs font-medium"
                  >
                    {name.replace(/_/g, ' ')}
                  </span>
                ))}
                {enabledFeatures.length > 3 && (
                  <span className="px-2 py-0.5 text-slate-500 text-xs">
                    +{enabledFeatures.length - 3} more
                  </span>
                )}
              </div>
            ) : (
              <p className="text-slate-500 text-xs">No special features enabled</p>
            )}
          </motion.div>

          {/* Quick Links Card */}
          <motion.div
            className="p-5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Quick Links</h2>
            </div>
            <div className="flex gap-2">
              <a
                href="/portal/profile"
                className="flex-1 px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-center text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              >
                Profile
              </a>
              <a
                href="/portal/profile/security"
                className="flex-1 px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-center text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              >
                Security
              </a>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Widget Settings Modal */}
      <WidgetSettings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* News Ticker */}
      <NewsTicker />
    </div>
  )
}
