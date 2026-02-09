import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase, validateInvitation, isSupabaseConfigured } from '../../lib/supabase'

type SetupStep = 'validating' | 'invalid' | 'setup' | 'success'

export default function AcceptInvitePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return true
  })
  const [step, setStep] = useState<SetupStep>('validating')
  const [invitationEmail, setInvitationEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  // Validate invitation token
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setStep('invalid')
        return
      }

      if (!isSupabaseConfigured()) {
        setStep('invalid')
        setError('System not configured')
        return
      }

      const { data, error } = await validateInvitation(token)

      if (error || !data) {
        setStep('invalid')
        setError('This invitation link is invalid or has expired.')
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setInvitationEmail((data as any).email)
      setStep('setup')
    }

    validateToken()
  }, [token])

  const handleSetupAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setIsLoading(true)

    try {
      // Create the user account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: invitationEmail,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        setIsLoading(false)
        return
      }

      if (!authData.user) {
        setError('Failed to create account')
        setIsLoading(false)
        return
      }

      // Mark invitation as accepted
      await supabase
        .from('invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('token', token)

      // Create profile
      await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: invitationEmail,
          full_name: fullName,
          is_admin: false,
        })

      setStep('success')

      // Redirect after a short delay
      setTimeout(() => {
        navigate('/portal/dashboard')
      }, 2000)
    } catch (err) {
      setError('An unexpected error occurred')
      setIsLoading(false)
    }
  }

  const renderContent = () => {
    switch (step) {
      case 'validating':
        return (
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
              Validating invitation...
            </p>
          </div>
        )

      case 'invalid':
        return (
          <div className="text-center">
            <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
              darkMode ? 'bg-red-500/20' : 'bg-red-500/10'
            }`}>
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Invalid Invitation
            </h2>
            <p className={`mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {error || 'This invitation link is invalid or has expired.'}
            </p>
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
        )

      case 'success':
        return (
          <div className="text-center">
            <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
              darkMode ? 'bg-green-500/20' : 'bg-green-500/10'
            }`}>
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Account Created!
            </h2>
            <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
              Redirecting to your dashboard...
            </p>
          </div>
        )

      case 'setup':
        return (
          <>
            <h1 className={`text-2xl font-bold text-center mb-2 ${
              darkMode ? 'text-white' : 'text-slate-900'
            }`}>
              Create your account
            </h1>
            <p className={`text-center mb-8 ${
              darkMode ? 'text-slate-400' : 'text-slate-600'
            }`}>
              You've been invited to join stonecode.ai
            </p>

            {error && (
              <motion.div
                className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSetupAccount}>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={invitationEmail}
                    disabled
                    className={`w-full px-4 py-3 rounded-xl border ${
                      darkMode
                        ? 'bg-white/5 border-white/10 text-slate-400'
                        : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className={`w-full px-4 py-3 rounded-xl border transition-colors ${
                      darkMode
                        ? 'bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-violet-500'
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-violet-500'
                    } outline-none`}
                    placeholder="John Doe"
                  />
                </div>

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
                    minLength={8}
                    className={`w-full px-4 py-3 rounded-xl border transition-colors ${
                      darkMode
                        ? 'bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-violet-500'
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-violet-500'
                    } outline-none`}
                    placeholder="At least 8 characters"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className={`w-full px-4 py-3 rounded-xl border transition-colors ${
                      darkMode
                        ? 'bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-violet-500'
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-violet-500'
                    } outline-none`}
                    placeholder="Confirm your password"
                  />
                </div>

                <motion.button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3 px-4 rounded-xl font-medium text-white transition-all ${
                    isLoading
                      ? 'bg-violet-500/50 cursor-not-allowed'
                      : 'bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500'
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
                      Creating account...
                    </span>
                  ) : (
                    'Create Account'
                  )}
                </motion.button>
              </div>
            </form>
          </>
        )
    }
  }

  return (
    <div className={`min-h-screen relative overflow-hidden transition-colors duration-500 ${
      darkMode ? 'bg-slate-950' : 'bg-slate-100'
    }`}>
      {/* Background gradient */}
      <div className={`fixed inset-0 ${
        darkMode
          ? 'bg-gradient-to-br from-violet-950/50 via-slate-950 to-blue-950/50'
          : 'bg-gradient-to-br from-violet-100/50 via-slate-100 to-blue-100/50'
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
                ? 'bg-gradient-to-br from-violet-500 to-blue-600'
                : 'bg-gradient-to-br from-violet-600 to-blue-700'
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

          {renderContent()}
        </motion.div>
      </div>
    </div>
  )
}
