import { motion } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'
import { useFeatureFlags } from '../../hooks/useFeatureFlags'

export default function Dashboard() {
  const { profile } = useAuth()
  const { flags } = useFeatureFlags()

  const enabledFeatures = Object.entries(flags).filter(([, enabled]) => enabled)

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl font-bold text-white mb-2">
          Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}!
        </h1>
        <p className="text-slate-400 mb-8">
          Here's an overview of your portal access.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Account Status Card */}
          <motion.div
            className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white">Account Status</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Status</span>
                <span className="text-green-400 font-medium">Active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Role</span>
                <span className="text-white font-medium">
                  {profile?.is_admin ? 'Administrator' : 'Member'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email</span>
                <span className="text-white font-medium truncate ml-4">
                  {profile?.email}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Features Card */}
          <motion.div
            className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white">Enabled Features</h2>
            </div>
            {enabledFeatures.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {enabledFeatures.map(([name]) => (
                  <span
                    key={name}
                    className="px-3 py-1 rounded-full bg-violet-500/20 text-violet-400 text-sm font-medium"
                  >
                    {name.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No special features enabled</p>
            )}
          </motion.div>

          {/* Quick Actions Card */}
          <motion.div
            className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl md:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <a
                href="/portal/profile"
                className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-medium">Edit Profile</p>
                  <p className="text-slate-500 text-sm">Update your info</p>
                </div>
              </a>

              <a
                href="/portal/profile/security"
                className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-medium">Security</p>
                  <p className="text-slate-500 text-sm">Passkeys & MFA</p>
                </div>
              </a>

              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-medium">Visit Site</p>
                  <p className="text-slate-500 text-sm">stonecode.ai</p>
                </div>
              </a>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
