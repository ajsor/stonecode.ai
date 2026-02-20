import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { getInvitations, supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import type { Invitation } from '../../../types'

interface InvitationWithInviter extends Invitation {
  inviter?: { full_name: string | null; email: string }
}

export default function InvitationsPage() {
  const { user } = useAuth()
  const [invitations, setInvitations] = useState<InvitationWithInviter[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newInviteEmail, setNewInviteEmail] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createdInvitation, setCreatedInvitation] = useState<{ email: string; url: string } | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadInvitations()
  }, [])

  const loadInvitations = async () => {
    setIsLoading(true)
    const { data, error } = await getInvitations()
    if (!error && data) {
      setInvitations(data as InvitationWithInviter[])
    }
    setIsLoading(false)
  }

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return

    setIsCreating(true)
    setMessage(null)

    try {
      // Generate a secure token
      const token = crypto.randomUUID() + '-' + crypto.randomUUID()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

      const { error } = await supabase.from('invitations').insert({
        email: newInviteEmail,
        token,
        invited_by: user.id,
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
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to create invitation' })
    }

    setIsCreating(false)
  }

  const handleRevokeInvitation = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return

    const { error } = await supabase
      .from('invitations')
      .delete()
      .eq('id', id)

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

  const getInvitationStatus = (invitation: Invitation) => {
    if (invitation.accepted_at) {
      return { label: 'Accepted', color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/20' }
    }
    if (new Date(invitation.expires_at) < new Date()) {
      return { label: 'Expired', color: 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/20' }
    }
    return { label: 'Pending', color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/20' }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Invitations</h1>
            <p className="text-slate-500 dark:text-slate-400">Invite new users to the portal</p>
          </div>
          <button
            onClick={() => {
              setShowCreateModal(true)
              setCreatedInvitation(null)
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium hover:from-orange-400 hover:to-amber-400 transition-all"
          >
            Create Invitation
          </button>
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

        {/* Invitations List */}
        {isLoading ? (
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
              onClick={() => setShowCreateModal(true)}
              className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium"
            >
              Create your first invitation
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
                      <p className="text-slate-500 dark:text-slate-400">
                        Share this link with <strong>{createdInvitation.email}</strong>
                      </p>
                    </div>

                    {/* QR Code */}
                    <div className="flex justify-center mb-6">
                      <div className="p-4 bg-white rounded-xl">
                        <QRCodeSVG value={createdInvitation.url} size={160} />
                      </div>
                    </div>

                    {/* URL */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
                        Invitation Link
                      </label>
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
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">Create Invitation</h2>

                    <form onSubmit={handleCreateInvitation}>
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                          Email Address
                        </label>
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
                          {isCreating ? 'Creating...' : 'Create'}
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
