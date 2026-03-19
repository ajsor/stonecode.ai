import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getAllUsers, supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import type { AdminUser } from '../../../types'

interface FeatureFlag {
  id: string
  name: string
  description: string
  enabled_default: boolean
}

interface UserFlagOverride {
  id: string
  user_id: string
  feature_id: string
  enabled: boolean
}

function formatLastSeen(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const d = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 30) return `${diffDays}d ago`
  return d.toLocaleDateString()
}

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)
  const [allFlags, setAllFlags] = useState<FeatureFlag[]>([])
  const [userOverrides, setUserOverrides] = useState<UserFlagOverride[]>([])
  const [flagsLoading, setFlagsLoading] = useState(false)
  const [togglingFlagId, setTogglingFlagId] = useState<string | null>(null)
  const [revokingUserId, setRevokingUserId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadUsers()
    supabase.from('feature_flags').select('*').order('name').then(({ data }) => {
      if (data) setAllFlags(data)
    })
  }, [])

  const loadUsers = async () => {
    setIsLoading(true)
    const { data, error } = await getAllUsers()
    if (!error && data) setUsers(data as AdminUser[])
    setIsLoading(false)
  }

  const loadUserFlags = async (userId: string) => {
    setFlagsLoading(true)
    const { data } = await supabase
      .from('user_feature_flags')
      .select('*')
      .eq('user_id', userId)
    setUserOverrides(data || [])
    setFlagsLoading(false)
  }

  const handleExpand = (userId: string) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null)
      return
    }
    setExpandedUserId(userId)
    loadUserFlags(userId)
  }

  const getFlagValue = (flag: FeatureFlag): boolean => {
    const override = userOverrides.find(o => o.feature_id === flag.id)
    return override !== undefined ? override.enabled : flag.enabled_default
  }

  const toggleFlag = async (flag: FeatureFlag) => {
    if (!expandedUserId) return
    setTogglingFlagId(flag.id)

    const currentValue = getFlagValue(flag)
    const newValue = !currentValue
    const existing = userOverrides.find(o => o.feature_id === flag.id)

    if (existing) {
      await supabase
        .from('user_feature_flags')
        .update({ enabled: newValue })
        .eq('id', existing.id)
      setUserOverrides(prev =>
        prev.map(o => o.id === existing.id ? { ...o, enabled: newValue } : o)
      )
    } else {
      const { data } = await supabase
        .from('user_feature_flags')
        .insert({ user_id: expandedUserId, feature_id: flag.id, enabled: newValue })
        .select()
        .single()
      if (data) setUserOverrides(prev => [...prev, data])
    }

    setTogglingFlagId(null)
  }

  const handleRevoke = async (userId: string, email: string) => {
    if (!confirm(`Revoke access for ${email}?\n\nThis will permanently delete their account and cannot be undone.`)) return

    setRevokingUserId(userId)
    setMessage(null)

    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-revoke-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ userId }),
    })

    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== userId))
      setExpandedUserId(null)
      setMessage({ type: 'success', text: `Access revoked for ${email}` })
    } else {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }))
      setMessage({ type: 'error', text: err.error || 'Failed to revoke access' })
    }

    setRevokingUserId(null)
  }

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Users</h1>
            <p className="text-slate-500 dark:text-slate-400">
              {users.length} {users.length === 1 ? 'user' : 'users'} total
            </p>
          </div>
        </div>

        {message && (
          <motion.div
            className={`mb-6 p-4 rounded-xl ${
              message.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                : 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400'
            }`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {message.text}
          </motion.div>
        )}

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-orange-500 outline-none transition-colors"
            />
          </div>
        </div>

        {/* Users List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <p className="text-slate-400">
              {searchQuery ? 'No users found matching your search' : 'No users yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user, index) => {
              const isExpanded = expandedUserId === user.id
              const isSelf = user.id === currentUser?.id
              return (
                <motion.div
                  key={user.id}
                  className="rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-xl overflow-hidden"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {/* User row */}
                  <button
                    onClick={() => handleExpand(user.id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold ${
                        user.is_admin
                          ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        {user.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-slate-900 dark:text-white font-medium">
                            {user.full_name || 'Unnamed User'}
                          </p>
                          {user.is_admin && (
                            <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-medium">
                              Admin
                            </span>
                          )}
                          {isSelf && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-xs font-medium">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 text-sm">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-slate-500 text-xs">Last seen</p>
                        <p className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                          {formatLastSeen(user.last_sign_in_at)}
                        </p>
                      </div>
                      <svg
                        className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded panel */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-4 pb-4 border-t border-slate-100 dark:border-white/5 pt-4 space-y-4">

                          {/* Account info */}
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/5">
                              <p className="text-slate-400 text-xs mb-0.5">Joined</p>
                              <p className="text-slate-900 dark:text-white font-medium">
                                {new Date(user.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/5">
                              <p className="text-slate-400 text-xs mb-0.5">Last login</p>
                              <p className="text-slate-900 dark:text-white font-medium">
                                {user.last_sign_in_at
                                  ? new Date(user.last_sign_in_at).toLocaleDateString()
                                  : 'Never'}
                              </p>
                            </div>
                          </div>

                          {/* Feature flags */}
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                              Feature Flags
                            </p>
                            {flagsLoading ? (
                              <div className="flex items-center gap-2 py-2">
                                <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                                <span className="text-sm text-slate-400">Loading flags...</span>
                              </div>
                            ) : allFlags.length === 0 ? (
                              <p className="text-sm text-slate-400 py-2">No feature flags defined yet.</p>
                            ) : (
                              <div className="space-y-2">
                                {allFlags.map((flag) => {
                                  const enabled = getFlagValue(flag)
                                  const isToggling = togglingFlagId === flag.id
                                  return (
                                    <div key={flag.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 dark:bg-white/5">
                                      <div>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white font-mono">{flag.name}</p>
                                        {flag.description && (
                                          <p className="text-xs text-slate-500">{flag.description}</p>
                                        )}
                                      </div>
                                      <button
                                        onClick={() => toggleFlag(flag)}
                                        disabled={isToggling}
                                        className={`relative w-10 h-5 rounded-full transition-colors disabled:opacity-50 ${
                                          enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                                        }`}
                                      >
                                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                                          enabled ? 'left-5' : 'left-0.5'
                                        }`} />
                                      </button>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>

                          {/* Revoke access */}
                          {!isSelf && (
                            <div className="pt-2 border-t border-slate-100 dark:border-white/5">
                              <button
                                onClick={() => handleRevoke(user.id, user.email)}
                                disabled={revokingUserId === user.id}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 border border-red-200 dark:border-red-500/20 transition-colors text-sm font-medium disabled:opacity-50"
                              >
                                {revokingUserId === user.id ? (
                                  <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                  </svg>
                                )}
                                {revokingUserId === user.id ? 'Revoking...' : 'Revoke Access'}
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>
    </div>
  )
}
