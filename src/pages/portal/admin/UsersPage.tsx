import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { getAllUsers, getInvitations, getAllFeatureFlags, supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import type { AdminUser, Invitation, FeatureFlag } from '../../../types'

interface UserFlagOverride {
  id: string
  user_id: string
  feature_id: string
  enabled: boolean
}

interface InvitationWithInviter extends Invitation {
  inviter?: { full_name: string | null; email: string }
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

function getInvitationStatus(invitation: Invitation) {
  if (invitation.accepted_at) {
    return { label: 'Accepted', color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/20' }
  }
  if (new Date(invitation.expires_at) < new Date()) {
    return { label: 'Expired', color: 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/20' }
  }
  return { label: 'Pending', color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/20' }
}

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState<'users' | 'invitations' | 'features'>('users')

  // Users state
  const [users, setUsers] = useState<AdminUser[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)
  const [allFlags, setAllFlags] = useState<FeatureFlag[]>([])
  const [userOverrides, setUserOverrides] = useState<UserFlagOverride[]>([])
  const [flagsLoading, setFlagsLoading] = useState(false)
  const [togglingFlagId, setTogglingFlagId] = useState<string | null>(null)
  const [revokingUserId, setRevokingUserId] = useState<string | null>(null)

  // Features state
  const [features, setFeatures] = useState<FeatureFlag[]>([])
  const [featuresLoading, setFeaturesLoading] = useState(true)
  const [showCreateFeatureForm, setShowCreateFeatureForm] = useState(false)
  const [newFeatureName, setNewFeatureName] = useState('')
  const [newFeatureDescription, setNewFeatureDescription] = useState('')
  const [isCreatingFeature, setIsCreatingFeature] = useState(false)

  // Invitations state
  const [invitations, setInvitations] = useState<InvitationWithInviter[]>([])
  const [invitationsLoading, setInvitationsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newInviteEmail, setNewInviteEmail] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createdInvitation, setCreatedInvitation] = useState<{ email: string; url: string } | null>(null)

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadUsers()
    loadInvitations()
    loadFeatures()
  }, [])

  // Clear message after 4 seconds
  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(null), 4000)
    return () => clearTimeout(t)
  }, [message])

  const loadUsers = async () => {
    setUsersLoading(true)
    const { data, error } = await getAllUsers()
    if (!error && data) setUsers(data as AdminUser[])
    setUsersLoading(false)
  }

  const loadFeatures = async () => {
    setFeaturesLoading(true)
    const { data, error } = await getAllFeatureFlags()
    if (!error && data) {
      setFeatures(data)
      setAllFlags(data)
    }
    setFeaturesLoading(false)
  }

  const loadInvitations = async () => {
    setInvitationsLoading(true)
    const { data, error } = await getInvitations()
    if (!error && data) setInvitations(data as InvitationWithInviter[])
    setInvitationsLoading(false)
  }

  // --- Users logic ---

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
      await supabase.from('user_feature_flags').update({ enabled: newValue }).eq('id', existing.id)
      setUserOverrides(prev => prev.map(o => o.id === existing.id ? { ...o, enabled: newValue } : o))
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

  // --- Invitations logic ---

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser?.id) return
    setIsCreating(true)
    setMessage(null)
    try {
      const token = crypto.randomUUID() + '-' + crypto.randomUUID()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)
      const { error } = await supabase.from('invitations').insert({
        email: newInviteEmail,
        token,
        invited_by: currentUser.id,
        expires_at: expiresAt.toISOString(),
      })
      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        const inviteUrl = `${window.location.origin}/accept-invite?token=${token}`
        setCreatedInvitation({ email: newInviteEmail, url: inviteUrl })
        setNewInviteEmail('')
        await loadInvitations()
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to create invitation' })
    }
    setIsCreating(false)
  }

  const handleRevokeInvitation = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return
    const { error } = await supabase.from('invitations').delete().eq('id', id)
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Invitation revoked' })
      await loadInvitations()
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setMessage({ type: 'success', text: 'Copied to clipboard!' })
  }

  // --- Features logic ---

  const handleToggleDefault = async (featureId: string, enabled: boolean) => {
    const { error } = await supabase.from('feature_flags').update({ enabled_default: enabled }).eq('id', featureId)
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setFeatures(prev => prev.map(f => f.id === featureId ? { ...f, enabled_default: enabled } : f))
      setAllFlags(prev => prev.map(f => f.id === featureId ? { ...f, enabled_default: enabled } : f))
    }
  }

  const handleCreateFeature = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreatingFeature(true)
    setMessage(null)
    const { error } = await supabase.from('feature_flags').insert({
      name: newFeatureName.toLowerCase().replace(/\s+/g, '_'),
      description: newFeatureDescription,
      enabled_default: false,
    })
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Feature flag created' })
      setNewFeatureName('')
      setNewFeatureDescription('')
      setShowCreateFeatureForm(false)
      await loadFeatures()
    }
    setIsCreatingFeature(false)
  }

  const handleDeleteFeature = async (featureId: string) => {
    if (!confirm('Delete this feature flag? This will also remove all user overrides.')) return
    const { error } = await supabase.from('feature_flags').delete().eq('id', featureId)
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Feature flag deleted' })
      await loadFeatures()
    }
  }

  const filteredUsers = users.filter(
    u => u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
         u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const pendingCount = invitations.filter(i => !i.accepted_at && new Date(i.expires_at) > new Date()).length

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Users</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {users.length} {users.length === 1 ? 'user' : 'users'}
              {pendingCount > 0 && ` · ${pendingCount} pending ${pendingCount === 1 ? 'invite' : 'invites'}`}
            </p>
          </div>
          {activeTab === 'invitations' && (
            <button
              onClick={() => { setShowCreateModal(true); setCreatedInvitation(null) }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium hover:from-orange-400 hover:to-amber-400 transition-all text-sm"
            >
              Invite User
            </button>
          )}
          {activeTab === 'features' && (
            <button
              onClick={() => setShowCreateFeatureForm(v => !v)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium hover:from-orange-400 hover:to-amber-400 transition-all text-sm"
            >
              {showCreateFeatureForm ? 'Cancel' : 'New Feature'}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/5 mb-6 w-fit">
          {(['users', 'invitations', 'features'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {tab}
              {tab === 'invitations' && pendingCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Message */}
        <AnimatePresence>
          {message && (
            <motion.div
              className={`mb-6 p-4 rounded-xl ${
                message.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                  : 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400'
              }`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* === USERS TAB === */}
        {activeTab === 'users' && (
          <>
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

            {usersLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400">{searchQuery ? 'No users found matching your search' : 'No users yet'}</p>
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
                                <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-medium">Admin</span>
                              )}
                              {isSelf && (
                                <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-xs font-medium">You</span>
                              )}
                            </div>
                            <p className="text-slate-500 text-sm">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right hidden sm:block">
                            <p className="text-slate-500 text-xs">Last seen</p>
                            <p className="text-slate-700 dark:text-slate-300 text-sm font-medium">{formatLastSeen(user.last_sign_in_at)}</p>
                          </div>
                          <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="px-4 pb-4 border-t border-slate-100 dark:border-white/5 pt-4 space-y-4">
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/5">
                                  <p className="text-slate-400 text-xs mb-0.5">Joined</p>
                                  <p className="text-slate-900 dark:text-white font-medium">{new Date(user.created_at).toLocaleDateString()}</p>
                                </div>
                                <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/5">
                                  <p className="text-slate-400 text-xs mb-0.5">Last login</p>
                                  <p className="text-slate-900 dark:text-white font-medium">
                                    {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}
                                  </p>
                                </div>
                              </div>

                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Feature Flags</p>
                                {flagsLoading ? (
                                  <div className="flex items-center gap-2 py-2">
                                    <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-sm text-slate-400">Loading...</span>
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
                                            {flag.description && <p className="text-xs text-slate-500">{flag.description}</p>}
                                          </div>
                                          <button
                                            onClick={() => toggleFlag(flag)}
                                            disabled={isToggling}
                                            className={`relative w-10 h-5 rounded-full transition-colors disabled:opacity-50 ${enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                          >
                                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${enabled ? 'left-5' : 'left-0.5'}`} />
                                          </button>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>

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
          </>
        )}

        {/* === INVITATIONS TAB === */}
        {activeTab === 'invitations' && (
          <>
            {invitationsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : invitations.length === 0 ? (
              <div className="text-center py-12 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center">
                  <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-slate-400 mb-4">No invitations yet</p>
                <button
                  onClick={() => { setShowCreateModal(true); setCreatedInvitation(null) }}
                  className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium"
                >
                  Send your first invitation
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {invitations.map((invitation, index) => {
                  const status = getInvitationStatus(invitation)
                  return (
                    <motion.div
                      key={invitation.id}
                      className="p-4 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-xl"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-slate-900 dark:text-white font-medium">{invitation.email}</p>
                            <p className="text-slate-500 text-sm">
                              Invited by {invitation.inviter?.full_name || invitation.inviter?.email || 'Unknown'}
                              {' · '}
                              {new Date(invitation.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                            {status.label}
                          </span>
                          {!invitation.accepted_at && new Date(invitation.expires_at) > new Date() && (
                            <button
                              onClick={() => handleRevokeInvitation(invitation.id)}
                              className="p-2 rounded-lg text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </>
        )}
        {/* === FEATURES TAB === */}
        {activeTab === 'features' && (
          <>
            {/* Create form */}
            <AnimatePresence>
              {showCreateFeatureForm && (
                <motion.div
                  className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-xl mb-6"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">New Feature Flag</h2>
                  <form onSubmit={handleCreateFeature}>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Name</label>
                        <input
                          type="text"
                          value={newFeatureName}
                          onChange={(e) => setNewFeatureName(e.target.value)}
                          required
                          placeholder="e.g., beta_features"
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-orange-500 outline-none transition-colors"
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          Stored as: {newFeatureName.toLowerCase().replace(/\s+/g, '_') || 'feature_name'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Description</label>
                        <input
                          type="text"
                          value={newFeatureDescription}
                          onChange={(e) => setNewFeatureDescription(e.target.value)}
                          placeholder="What this feature enables"
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-orange-500 outline-none transition-colors"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isCreatingFeature}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium hover:from-orange-400 hover:to-amber-400 transition-all disabled:opacity-50"
                      >
                        {isCreatingFeature ? 'Creating...' : 'Create Feature Flag'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {featuresLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : features.length === 0 ? (
              <div className="text-center py-12 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
                <p className="text-slate-400 mb-4">No feature flags yet</p>
                <button
                  onClick={() => setShowCreateFeatureForm(true)}
                  className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium"
                >
                  Create your first feature flag
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.id}
                    className="p-4 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-xl"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          feature.enabled_default ? 'bg-emerald-100 dark:bg-emerald-500/20' : 'bg-slate-100 dark:bg-slate-800'
                        }`}>
                          <svg className={`w-5 h-5 ${feature.enabled_default ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-slate-900 dark:text-white font-medium font-mono">{feature.name}</p>
                          <p className="text-slate-500 text-sm">{feature.description || 'No description'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <p className="text-slate-400 text-xs">Default</p>
                          <p className={`text-sm font-medium ${feature.enabled_default ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                            {feature.enabled_default ? 'On' : 'Off'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleToggleDefault(feature.id, !feature.enabled_default)}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            feature.enabled_default ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                        >
                          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                            feature.enabled_default ? 'left-7' : 'left-1'
                          }`} />
                        </button>
                        <button
                          onClick={() => handleDeleteFeature(feature.id)}
                          className="p-2 rounded-lg text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            <p className="mt-6 text-xs text-slate-500 dark:text-slate-600">
              The default toggle affects all users. Per-user overrides can be set from the Users tab.
            </p>
          </>
        )}

      </motion.div>

      {/* Create Invitation Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {createdInvitation ? (
                <>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                      <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Invitation Created!</h2>
                    <p className="text-slate-500 dark:text-slate-400">Share this link with <strong>{createdInvitation.email}</strong></p>
                  </div>
                  <div className="flex justify-center mb-6">
                    <div className="p-4 bg-white rounded-xl">
                      <QRCodeSVG value={createdInvitation.url} size={160} />
                    </div>
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Invitation Link</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={createdInvitation.url}
                        readOnly
                        className="flex-1 px-4 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 text-sm"
                      />
                      <button
                        onClick={() => copyToClipboard(createdInvitation.url)}
                        className="px-4 py-2 rounded-lg bg-orange-500/20 text-orange-600 dark:text-orange-400 hover:bg-orange-500/30 transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="w-full py-3 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors font-medium"
                  >
                    Done
                  </button>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">Invite User</h2>
                  <form onSubmit={handleCreateInvitation}>
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Email Address</label>
                      <input
                        type="email"
                        value={newInviteEmail}
                        onChange={(e) => setNewInviteEmail(e.target.value)}
                        required
                        placeholder="user@example.com"
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-500 focus:border-orange-500 outline-none transition-colors"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowCreateModal(false)}
                        className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isCreating}
                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium hover:from-orange-400 hover:to-amber-400 transition-all disabled:opacity-50"
                      >
                        {isCreating ? 'Sending...' : 'Send Invite'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
