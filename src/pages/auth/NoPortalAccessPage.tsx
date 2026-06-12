import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { buildPortalLaunchUrl, type SatelliteApp } from '@stonecode/portal-sdk'
import { useAuth } from '../../hooks/useAuth'
import { useFeatureFlags } from '../../hooks/useFeatureFlags'
import { supabase } from '../../lib/supabase'

type AppLink = {
  flag: string
  app: SatelliteApp | string
  label: string
  description: string
}

const APPS: AppLink[] = [
  { flag: 'mb_dashboard', app: 'mb-dashboard', label: 'MB Dashboard', description: 'Payroll reporting and analytics.' },
  { flag: 'relaite', app: 'relaite', label: 'RELAiTE', description: 'Relationship intelligence.' },
  { flag: 'aether', app: 'aether', label: 'Aether', description: 'AI-powered dream journal.' },
  { flag: 'adam', app: 'adam', label: 'ADAM', description: 'Acolyte Digital Asset Manager.' },
  { flag: 'chorus', app: 'https://chorus.stonecode.ai', label: 'Chorus', description: 'AI customer feedback synthesis.' },
  { flag: 'mosaic', app: 'https://mosaic.stonecode.ai', label: 'Mosaic', description: 'AI brand identity studio.' },
  { flag: 'recon', app: 'https://recon.stonecode.ai', label: 'Recon', description: 'AI meeting prep briefs.' },
  { flag: 'lens', app: 'https://lens.stonecode.ai', label: 'Lens', description: 'AI document chat & extractor.' },
  { flag: 'sketchy', app: 'https://sketchy.stonecode.ai', label: 'Sketchy', description: 'Comedic screenplay generator.' },
  { flag: 'forge', app: 'https://forge.stonecode.ai', label: 'Forge', description: 'AI SMB optimization reports with priced SOWs.' },
  { flag: 'cameo', app: 'https://cameo.stonecode.ai', label: 'Cameo', description: 'AI website builder — turn social references into a portable demo site.' },
]

export default function NoPortalAccessPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading, profile, user, signOut } = useAuth()
  const { hasFeature, isLoading: flagsLoading } = useFeatureFlags()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }
    if (profile?.portal_access) {
      navigate('/portal/dashboard', { replace: true })
    }
  }, [isAuthenticated, isLoading, profile?.portal_access, navigate])

  const availableApps = APPS.filter((a) => hasFeature(a.flag))

  const openApp = async (app: SatelliteApp | string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    window.location.href = buildPortalLaunchUrl(app, session)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/', { replace: true })
  }

  if (isLoading || flagsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-xl"
      >
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-white">stonecode.ai</span>
          </div>

          <h1 className="text-2xl font-semibold text-white mb-3">Portal is invitation-only</h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            The stonecode.ai portal is reserved for invited members. Your account is active, but it doesn&apos;t have
            portal access. You can continue to any of the apps below that you have access to.
          </p>

          {availableApps.length > 0 ? (
            <div className="space-y-3 mb-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Your apps</p>
              {availableApps.map((a) => (
                <button
                  key={a.app}
                  onClick={() => openApp(a.app)}
                  className="w-full text-left p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{a.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{a.description}</p>
                    </div>
                    <svg className="w-4 h-4 text-slate-500 group-hover:text-orange-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-6">
              <p className="text-sm text-slate-400">
                No apps are currently linked to your account. If you&apos;re expecting access, reach out to the person
                who invited you.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-white/5">
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            <button
              onClick={handleSignOut}
              className="text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
