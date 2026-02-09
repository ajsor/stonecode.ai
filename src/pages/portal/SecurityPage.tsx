import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  registerPasskey,
  getPasskeys,
  deletePasskey,
} from '../../lib/webauthn'
import type { Passkey } from '../../types'

export default function SecurityPage() {
  const { user } = useAuth()
  const [passkeys, setPasskeys] = useState<Passkey[]>([])
  const [isLoadingPasskeys, setIsLoadingPasskeys] = useState(true)
  const [isRegistering, setIsRegistering] = useState(false)
  const [webauthnSupported, setWebauthnSupported] = useState(false)
  const [platformAvailable, setPlatformAvailable] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const checkSupport = async () => {
      setWebauthnSupported(isWebAuthnSupported())
      setPlatformAvailable(await isPlatformAuthenticatorAvailable())
    }
    checkSupport()
  }, [])

  useEffect(() => {
    const loadPasskeys = async () => {
      if (!user?.id) return
      setIsLoadingPasskeys(true)
      const keys = await getPasskeys(user.id)
      setPasskeys(keys)
      setIsLoadingPasskeys(false)
    }
    loadPasskeys()
  }, [user?.id])

  const handleRegisterPasskey = async () => {
    if (!user?.id || !user?.email) return

    setIsRegistering(true)
    setMessage(null)

    const result = await registerPasskey(user.id, user.email)

    if (result.success) {
      setMessage({ type: 'success', text: 'Passkey registered successfully!' })
      // Reload passkeys
      const keys = await getPasskeys(user.id)
      setPasskeys(keys)
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to register passkey' })
    }

    setIsRegistering(false)
  }

  const handleDeletePasskey = async (passkeyId: string) => {
    if (!confirm('Are you sure you want to remove this passkey?')) return

    const result = await deletePasskey(passkeyId)

    if (result.success) {
      setPasskeys(passkeys.filter((p) => p.id !== passkeyId))
      setMessage({ type: 'success', text: 'Passkey removed' })
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to remove passkey' })
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-6">
          <Link to="/portal/profile" className="text-slate-400 hover:text-white transition-colors">
            Profile
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-white">Security</span>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Security Settings</h1>
        <p className="text-slate-400 mb-8">Manage your authentication methods</p>

        {message && (
          <motion.div
            className={`mb-6 p-4 rounded-xl ${
              message.type === 'success'
                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {message.text}
          </motion.div>
        )}

        {/* Passkeys Section */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Passkeys</h2>
                <p className="text-slate-500 text-sm">Sign in with Face ID, Touch ID, or Windows Hello</p>
              </div>
            </div>
          </div>

          {!webauthnSupported ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
              Your browser doesn't support passkeys. Try using a modern browser like Chrome, Safari, or Edge.
            </div>
          ) : (
            <>
              {isLoadingPasskeys ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : passkeys.length > 0 ? (
                <div className="space-y-3 mb-6">
                  {passkeys.map((passkey) => (
                    <div
                      key={passkey.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {passkey.device_type || 'Passkey'}
                          </p>
                          <p className="text-slate-500 text-sm">
                            Added {new Date(passkey.created_at).toLocaleDateString()}
                            {passkey.last_used_at && (
                              <> · Last used {new Date(passkey.last_used_at).toLocaleDateString()}</>
                            )}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeletePasskey(passkey.id)}
                        className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                    <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                    </svg>
                  </div>
                  <p className="text-slate-400 mb-2">No passkeys registered</p>
                  <p className="text-slate-500 text-sm">
                    Add a passkey to sign in faster and more securely
                  </p>
                </div>
              )}

              <button
                onClick={handleRegisterPasskey}
                disabled={isRegistering}
                className="w-full py-3 px-4 rounded-xl font-medium text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRegistering ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Registering...
                  </span>
                ) : platformAvailable ? (
                  'Add Passkey (Face ID / Touch ID)'
                ) : (
                  'Add Security Key'
                )}
              </button>
            </>
          )}
        </div>

        {/* Password Section */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Password</h2>
              <p className="text-slate-500 text-sm">Change your password</p>
            </div>
          </div>

          <button
            className="w-full py-3 px-4 rounded-xl font-medium bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white transition-colors"
          >
            Change Password
          </button>
        </div>

        {/* MFA Section */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Two-Factor Authentication</h2>
              <p className="text-slate-500 text-sm">Add an extra layer of security with TOTP</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/50 border border-white/5 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-slate-500" />
              <span className="text-slate-400">Two-factor authentication is not enabled</span>
            </div>
          </div>

          <button
            className="w-full py-3 px-4 rounded-xl font-medium bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white transition-colors"
          >
            Enable 2FA
          </button>
        </div>
      </motion.div>
    </div>
  )
}
