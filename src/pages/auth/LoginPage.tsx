import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'

type AuthMode = 'password' | 'magic-link' | 'passkey'

export default function LoginPage() {
  const navigate = useNavigate()
  const { signIn, signInWithMagicLink, isAuthenticated, isLoading: authLoading } = useAuth()

  // Support ?redirect=<url> for external tools like mb-dashboard
  const redirectParam = new URLSearchParams(window.location.search).get('redirect')

  const handlePostLoginRedirect = async () => {
    if (redirectParam) {
      // Pass session tokens so the external app can auth without re-login
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const url = `${redirectParam}#access_token=${session.access_token}&refresh_token=${session.refresh_token}&type=portal`
        window.location.href = url
        return
      }
    }
    navigate('/portal/dashboard')
  }

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return true
  })
  const [authMode, setAuthMode] = useState<AuthMode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      handlePostLoginRedirect()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading])

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      setError(error.message)
      setIsLoading(false)
    } else {
      await handlePostLoginRedirect()
    }
  }

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const { error } = await signInWithMagicLink(email)

    setIsLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setMagicLinkSent(true)
    }
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className={`min-h-screen flex items-center justify-center px-4 ${
        darkMode ? 'bg-slate-950' : 'bg-slate-100'
      }`}>
        <div className={`max-w-md w-full p-8 rounded-2xl backdrop-blur-xl border ${
          darkMode
            ? 'bg-white/5 border-white/10'
            : 'bg-white/60 border-white/20'
        }`}>
          <h1 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Configuration Required
          </h1>
          <p className={`mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Supabase environment variables are not configured. Please set:
          </p>
          <ul className={`list-disc list-inside mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            <li><code className="text-orange-400">VITE_SUPABASE_URL</code></li>
            <li><code className="text-orange-400">VITE_SUPABASE_ANON_KEY</code></li>
          </ul>
          <Link
            to="/"
            className={`inline-block px-4 py-2 rounded-lg ${
              darkMode
                ? 'bg-white/10 hover:bg-white/20 text-white'
                : 'bg-black/10 hover:bg-black/20 text-slate-900'
            }`}
          >
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen relative overflow-hidden transition-colors duration-500 ${
      darkMode ? 'bg-slate-950' : 'bg-slate-100'
    }`}>
      {/* Background gradient */}
      <div className={`fixed inset-0 ${
        darkMode
          ? 'bg-gradient-to-br from-orange-950/30 via-slate-950 to-amber-950/30'
          : 'bg-gradient-to-br from-orange-100/50 via-slate-100 to-amber-100/50'
      }`} />

      {/* Theme toggle */}
      <motion.button
        onClick={() => setDarkMode(!darkMode)}
        className={`fixed top-4 right-4 sm:top-6 sm:right-6 z-40 p-3 rounded-2xl backdrop-blur-xl border ${
          darkMode
            ? 'bg-white/5 border-white/10 text-slate-300'
            : 'bg-black/5 border-black/10 text-slate-700'
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
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
      </motion.button>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <motion.div
          className={`w-full max-w-md p-8 rounded-2xl backdrop-blur-xl border ${
            darkMode
              ? 'bg-white/5 border-white/10'
              : 'bg-white/60 border-white/20'
          }`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Logo */}
          <Link to="/" className="flex items-center justify-center mb-8">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              darkMode
                ? 'bg-gradient-to-br from-orange-400 to-orange-600'
                : 'bg-gradient-to-br from-orange-500 to-orange-700'
            }`}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-white"
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
          </Link>

          <h1 className={`text-2xl font-bold text-center mb-2 ${
            darkMode ? 'text-white' : 'text-slate-900'
          }`}>
            Welcome back
          </h1>
          <p className={`text-center mb-8 ${
            darkMode ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Sign in to your account
          </p>

          {/* Auth mode tabs */}
          <div className={`flex rounded-xl p-1 mb-6 ${
            darkMode ? 'bg-white/5' : 'bg-black/5'
          }`}>
            {(['password', 'magic-link'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setAuthMode(mode)
                  setError(null)
                  setMagicLinkSent(false)
                }}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  authMode === mode
                    ? darkMode
                      ? 'bg-white/10 text-white'
                      : 'bg-white text-slate-900 shadow-sm'
                    : darkMode
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode === 'password' ? 'Password' : 'Magic Link'}
              </button>
            ))}
          </div>

          {error && (
            <motion.div
              className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.div>
          )}

          {magicLinkSent ? (
            <motion.div
              className="text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                darkMode ? 'bg-green-500/20' : 'bg-green-500/10'
              }`}>
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Check your email
              </h2>
              <p className={`mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                We sent a magic link to <strong>{email}</strong>
              </p>
              <button
                onClick={() => setMagicLinkSent(false)}
                className={`text-sm ${darkMode ? 'text-orange-400 hover:text-orange-300' : 'text-orange-600 hover:text-orange-700'}`}
              >
                Try a different email
              </button>
            </motion.div>
          ) : (
            <form onSubmit={authMode === 'password' ? handlePasswordLogin : handleMagicLinkLogin}>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={`w-full px-4 py-3 rounded-xl border transition-colors ${
                      darkMode
                        ? 'bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-orange-500'
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-orange-500'
                    } outline-none`}
                    placeholder="you@example.com"
                  />
                </div>

                {authMode === 'password' && (
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className={`w-full px-4 py-3 rounded-xl border transition-colors ${
                        darkMode
                          ? 'bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-orange-500'
                          : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-orange-500'
                      } outline-none`}
                      placeholder="Enter your password"
                    />
                  </div>
                )}

                <motion.button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3 px-4 rounded-xl font-medium text-white transition-all ${
                    isLoading
                      ? 'bg-orange-500/50 cursor-not-allowed'
                      : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400'
                  }`}
                  whileHover={!isLoading ? { scale: 1.02 } : {}}
                  whileTap={!isLoading ? { scale: 0.98 } : {}}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Signing in...
                    </span>
                  ) : authMode === 'password' ? (
                    'Sign In'
                  ) : (
                    'Send Magic Link'
                  )}
                </motion.button>
              </div>
            </form>
          )}

          <div className={`mt-8 pt-6 border-t text-center text-sm ${
            darkMode ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-600'
          }`}>
            This portal is invitation-only.
            <br />
            <Link to="/" className={`${
              darkMode ? 'text-orange-400 hover:text-orange-300' : 'text-orange-600 hover:text-orange-700'
            }`}>
              Back to home
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
