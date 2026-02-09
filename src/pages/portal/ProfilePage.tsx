import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'
import { updateProfile } from '../../lib/supabase'

export default function ProfilePage() {
  const { profile, user, refreshProfile } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSave = async () => {
    if (!user?.id) return

    setIsSaving(true)
    setMessage(null)

    const { error } = await updateProfile(user.id, { full_name: fullName })

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      await refreshProfile()
      setMessage({ type: 'success', text: 'Profile updated successfully' })
      setIsEditing(false)
    }

    setIsSaving(false)
  }

  const handleCancel = () => {
    setFullName(profile?.full_name || '')
    setIsEditing(false)
    setMessage(null)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl font-bold text-white mb-2">Profile Settings</h1>
        <p className="text-slate-400 mb-8">Manage your account information</p>

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

        {/* Profile Information */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Personal Information</h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 rounded-lg bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 transition-colors text-sm font-medium"
              >
                Edit
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Email
              </label>
              <input
                type="email"
                value={profile?.email || user?.email || ''}
                disabled
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-400"
              />
              <p className="mt-1 text-xs text-slate-500">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Full Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:border-violet-500 outline-none transition-colors"
                  placeholder="Enter your name"
                />
              ) : (
                <input
                  type="text"
                  value={profile?.full_name || 'Not set'}
                  disabled
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white"
                />
              )}
            </div>

            {isEditing && (
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 text-white font-medium hover:from-violet-500 hover:to-blue-500 transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="px-6 py-2 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Account Details */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl mb-6">
          <h2 className="text-lg font-semibold text-white mb-6">Account Details</h2>

          <div className="space-y-4">
            <div className="flex justify-between py-3 border-b border-white/5">
              <span className="text-slate-400">Account Type</span>
              <span className="text-white font-medium">
                {profile?.is_admin ? 'Administrator' : 'Member'}
              </span>
            </div>
            <div className="flex justify-between py-3 border-b border-white/5">
              <span className="text-slate-400">Member Since</span>
              <span className="text-white font-medium">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Unknown'}
              </span>
            </div>
          </div>
        </div>

        {/* Security Section Link */}
        <Link
          to="/portal/profile/security"
          className="flex items-center justify-between p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-semibold">Security Settings</h3>
              <p className="text-slate-400 text-sm">Manage passkeys, MFA, and password</p>
            </div>
          </div>
          <svg className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </motion.div>
    </div>
  )
}
