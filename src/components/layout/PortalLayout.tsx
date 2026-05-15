import { useEffect, useState, type ReactNode } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { buildPortalLaunchUrl, type SatelliteApp } from '@stonecode/portal-sdk'
import { useAuth } from '../../hooks/useAuth'
import { useFeatureFlags } from '../../hooks/useFeatureFlags'
import { useDarkMode } from '../../hooks/useDarkMode'
import { DashboardToolbar } from '../dashboard/DashboardToolbar'
import { QuantumField } from '../QuantumField'
import { supabase } from '../../lib/supabase'
import { WidgetProvider } from '../../contexts/WidgetContext'

type Tool = {
  flag: string
  app: SatelliteApp | string
  label: string
  icon: ReactNode
}

const TOOLS: Tool[] = [
  {
    flag: 'mb_dashboard',
    app: 'mb-dashboard',
    label: 'MB Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    flag: 'relaite',
    app: 'relaite',
    label: 'RELAiTE',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
  {
    flag: 'aether',
    app: 'aether',
    label: 'Aether',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    ),
  },
  {
    flag: 'adam',
    app: 'adam',
    label: 'ADAM',
    icon: <img src="https://adam.stonecode.ai/acolyte-logo.png" alt="ADAM" className="w-5 h-5 object-contain" />,
  },
  {
    flag: 'chorus',
    app: 'https://chorus.stonecode.ai',
    label: 'Chorus',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
      </svg>
    ),
  },
  {
    flag: 'mosaic',
    app: 'https://mosaic.stonecode.ai',
    label: 'Mosaic',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h5a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM13 5a1 1 0 011-1h5a1 1 0 011 1v5a1 1 0 01-1 1h-5a1 1 0 01-1-1V5zM4 14a1 1 0 011-1h5a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1v-5zM13 14a1 1 0 011-1h5a1 1 0 011 1v5a1 1 0 01-1 1h-5a1 1 0 01-1-1v-5z" />
      </svg>
    ),
  },
  {
    flag: 'recon',
    app: 'https://recon.stonecode.ai',
    label: 'Recon',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    flag: 'lens',
    app: 'https://lens.stonecode.ai',
    label: 'Lens',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
]

const navItems = [
  {
    path: '/portal/dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    path: '/portal/profile',
    label: 'Profile',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
]

const adminNavItems = [
  {
    path: '/portal/admin/users',
    label: 'Users',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    path: '/portal/admin/inquiries',
    label: 'Inquiries',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
]

export default function PortalLayout() {
  // WidgetProvider wraps the inner layout so its widget_preferences fetch
  // fires the moment the session resolves (in parallel with the profile fetch
  // in AuthContext), instead of waiting for the profile-gated early returns.
  return (
    <WidgetProvider>
      <PortalLayoutInner />
    </WidgetProvider>
  )
}

function PortalLayoutInner() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, isLoading, user, profile, signOut } = useAuth()
  const { hasFeature } = useFeatureFlags()
  const [darkMode, setDarkMode] = useDarkMode()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  const isAdmin = profile?.is_admin === true
  const isDashboard = location.pathname === '/portal/dashboard'
  const availableTools = TOOLS.filter((t) => hasFeature(t.flag))

  // Redirect if not authenticated, or if user lacks portal access
  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    if (profile && profile.portal_access === false) {
      navigate('/no-portal-access', { replace: true })
    }
  }, [isAuthenticated, isLoading, profile, navigate])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const openTool = async (app: SatelliteApp | string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    window.open(buildPortalLaunchUrl(app, session), '_blank', 'noopener,noreferrer')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  // If the profile has loaded and shows no portal access, hold the redirect
  // here so we don't flash portal chrome. We don't block on profile === null
  // anymore — profile loads in the background; chrome (sidebar, header) renders
  // immediately with optional-chained values, and the redirect useEffect
  // navigates app-only users to /no-portal-access once profile arrives.
  if (profile && profile.portal_access === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? 'bg-slate-950' : 'bg-slate-50'
    }`}>
      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 z-50 transform transition-transform duration-300 lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } ${darkMode ? 'bg-slate-900 border-r border-white/5' : 'bg-white border-r border-slate-200'}`}>
        {/* Logo */}
        <div className="p-6">
          <Link to="/" className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              darkMode
                ? 'bg-gradient-to-br from-orange-400 to-orange-600'
                : 'bg-gradient-to-br from-orange-500 to-orange-700'
            }`}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </div>
            <span
              className="text-lg flex items-baseline"
              style={{
                fontFamily: "'Space Grotesk', system-ui, sans-serif",
                letterSpacing: '-0.03em',
              }}
            >
              <span
                className="font-bold bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'url(/stone-texture.jpg)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  WebkitBackgroundClip: 'text',
                  filter: darkMode
                    ? 'brightness(1.4) contrast(1.1)'
                    : 'brightness(0.9) contrast(1.2)',
                }}
              >
                stone
              </span>
              <span
                className="font-light"
                style={{ color: darkMode ? '#ffffff' : '#000000' }}
              >
                code
              </span>
              <span className={`font-light ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                .ai
              </span>
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-colors ${
                  isActive
                    ? darkMode
                      ? 'bg-orange-500/20 text-orange-400'
                      : 'bg-orange-500/10 text-orange-600'
                    : darkMode
                      ? 'text-slate-400 hover:bg-white/5 hover:text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}

          {/* Tools section */}
          {availableTools.length > 0 && (
            <div className={`px-4 py-3 mt-6 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              <span className="text-xs font-semibold uppercase tracking-wider">Tools</span>
            </div>
          )}
          {availableTools.map((tool) => (
            <button
              key={tool.app}
              onClick={() => { setSidebarOpen(false); openTool(tool.app) }}
              className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl transition-colors ${
                darkMode
                  ? 'text-slate-400 hover:bg-white/5 hover:text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tool.icon}
              <span className="font-medium">{tool.label}</span>
              <svg className="w-3.5 h-3.5 ml-auto opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          ))}

          {/* Admin section */}
          {isAdmin && (
            <>
              <div className={`px-4 py-3 mt-6 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                <span className="text-xs font-semibold uppercase tracking-wider">Admin</span>
              </div>
              {adminNavItems.map((item) => {
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-colors ${
                      isActive
                        ? darkMode
                          ? 'bg-orange-500/20 text-orange-400'
                          : 'bg-orange-500/10 text-orange-600'
                        : darkMode
                          ? 'text-slate-400 hover:bg-white/5 hover:text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {item.icon}
                    <span className="font-medium">{item.label}</span>
                  </Link>
                )
              })}
            </>
          )}
        </nav>

        {/* User section */}
        <div className={`absolute bottom-0 left-0 right-0 p-4 border-t ${
          darkMode ? 'border-white/5' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              darkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-500/10 text-orange-600'
            }`}>
              {profile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {profile?.full_name || 'User'}
              </p>
              <p className={`text-xs truncate ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              darkMode
                ? 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className={`sticky top-0 z-30 px-4 sm:px-6 py-2 backdrop-blur-xl ${
          darkMode ? 'bg-slate-950/80 border-b border-white/5' : 'bg-white/95 border-b border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            {/* Left: hamburger (mobile) + dashboard toolbar content */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className={`lg:hidden p-2 rounded-lg ${
                  darkMode
                    ? 'text-slate-400 hover:bg-white/5 hover:text-white'
                    : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {isDashboard && <DashboardToolbar />}
            </div>

            {/* Right: help + dark mode toggle */}
            <div className="flex items-center gap-1">
            {isDashboard && (
              <button
                onClick={() => setHelpOpen(true)}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode
                    ? 'text-slate-400 hover:bg-white/5 hover:text-white'
                    : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
                aria-label="Dashboard help"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition-colors ${
                darkMode
                  ? 'text-slate-400 hover:bg-white/5 hover:text-white'
                  : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="relative p-4 sm:p-6">
          {isDashboard && (
            <QuantumField className="absolute inset-0 w-full h-full pointer-events-none opacity-40" />
          )}
          <div className="relative z-10">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Dashboard Help Modal */}
      <AnimatePresence>
        {helpOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setHelpOpen(false)}
            />
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl pointer-events-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-500/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Dashboard Help</h2>
                  </div>
                  <button
                    onClick={() => setHelpOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-5">
                  {[
                    {
                      icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4',
                      title: 'Add & remove widgets',
                      desc: 'Click the Customize button to enable or disable any of the 12 available widgets.',
                    },
                    {
                      icon: 'M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4',
                      title: 'Drag to rearrange',
                      desc: 'Grab the drag handle (⠿) in any widget header to move it wherever you like.',
                    },
                    {
                      icon: 'M4 8V4m0 0h4M4 4l5 5M20 8V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5M20 16v4m0 0h-4m4 0l-5-5',
                      title: 'Resize widgets',
                      desc: 'Drag the bottom-right corner of any widget to resize it to your preferred height.',
                    },
                    {
                      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
                      title: 'Configure each widget',
                      desc: 'Click the gear icon in a widget\'s header to set location, timezone, playlists, and more.',
                    },
                    {
                      icon: 'M5 15l7-7 7 7',
                      title: 'Collapse widgets',
                      desc: 'Click the chevron in a widget header to collapse it and save screen space.',
                    },
                  ].map(({ icon, title, desc }) => (
                    <div key={title} className="flex gap-4">
                      <div className="w-8 h-8 shrink-0 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center mt-0.5">
                        <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{title}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="px-4 pb-4">
                  <button
                    onClick={() => setHelpOpen(false)}
                    className="w-full py-2 rounded-xl font-medium bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors text-sm"
                  >
                    Got it
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
