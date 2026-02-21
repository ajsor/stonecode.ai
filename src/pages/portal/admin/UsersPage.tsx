import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getAllUsers, supabase } from '../../../lib/supabase'
import type { Profile } from '../../../types'

interface FeatureFlag {
  id: string
  name: string
  description: string
  enabled_default: boolean
}

interface UserFlagOverride {
  id: string
  user_id: string
  feature_flag_id: string
  enabled: boolean
}

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)
  const [allFlags, setAllFlags] = useState<FeatureFlag[]>([])
  const [userOverrides, setUserOverrides] = useState<UserFlagOverride[]>([])
  const [flagsLoading, setFlagsLoading] = useState(false)
  const [togglingFlagId, setTogglingFlagId] = useState<string | null>(null)

  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true)
      const { data, error } = await getAllUsers()
      if (!error && data) setUsers(data)
      setIsLoading(false)
    }
    loadUsers()

    // Load all feature flags once
    supabase.from('feature_flags').select('*').order('name').then(({ data }) => {
      if (data) setAllFlags(data)
    })
  }, [])

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

  // Effective value for a flag: user override if it exists, else default
  const getFlagValue = (flag: FeatureFlag): boolean => {
    const override = userOverrides.find(o => o.feature_flag_id === flag.id)
    return override !== undefined ? override.enabled : flag.enabled_default
  }

  const toggleFlag = async (flag: FeatureFlag) => {
    if (!expandedUserId) return
    setTogglingFlagId(flag.id)

    const currentValue = getFlagValue(flag)
    const newValue = !currentValue
    const existing = userOverrides.find(o => o.feature_flag_id === flag.id)

    if (existing) {
      // Update existing override
      await supabase
        .from('user_feature_flags')
        .update({ enabled: newValue })
        .eq('id', existing.id)
      setUserOverrides(prev =>
        prev.map(o => o.id === existing.id ? { ...o, enabled: newValue } : o)
      )
    } else {
      // Insert new override
      const { data } = await supabase
        .from('user_feature_flags')
        .insert({ user_id: expandedUserId, feature_flag_id: flag.id, enabled: newValue })
        .select()
        .single()
      if (data) setUserOverrides(prev => [...prev, data])
    }

    setTogglingFlagId(null)
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
                        </div>
                        <p className="text-slate-500 text-sm">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-slate-500 text-sm hidden sm:block">
                        Joined {new Date(user.created_at).toLocaleDateString()}
                      </p>
                      <svg
                        className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Feature flags panel */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-4 pb-4 border-t border-slate-100 dark:border-white/5 pt-4">
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
