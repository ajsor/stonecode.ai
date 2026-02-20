import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getAllFeatureFlags, supabase } from '../../../lib/supabase'
import type { FeatureFlag } from '../../../types'

export default function FeaturesPage() {
  const [features, setFeatures] = useState<FeatureFlag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [_editingFeature, _setEditingFeature] = useState<string | null>(null)
  const [newFeatureName, setNewFeatureName] = useState('')
  const [newFeatureDescription, setNewFeatureDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadFeatures()
  }, [])

  const loadFeatures = async () => {
    setIsLoading(true)
    const { data, error } = await getAllFeatureFlags()
    if (!error && data) {
      setFeatures(data)
    }
    setIsLoading(false)
  }

  const handleToggleDefault = async (featureId: string, enabled: boolean) => {
    const { error } = await supabase
      .from('feature_flags')
      .update({ enabled_default: enabled })
      .eq('id', featureId)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setFeatures(features.map(f =>
        f.id === featureId ? { ...f, enabled_default: enabled } : f
      ))
    }
  }

  const handleCreateFeature = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
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
      setShowCreateForm(false)
      await loadFeatures()
    }

    setIsCreating(false)
  }

  const handleDeleteFeature = async (featureId: string) => {
    if (!confirm('Are you sure you want to delete this feature flag? This will also remove all user overrides.')) return

    const { error } = await supabase
      .from('feature_flags')
      .delete()
      .eq('id', featureId)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Feature flag deleted' })
      await loadFeatures()
    }
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
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Feature Flags</h1>
            <p className="text-slate-500 dark:text-slate-400">Manage feature toggles for users</p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium hover:from-orange-400 hover:to-amber-400 transition-all"
          >
            {showCreateForm ? 'Cancel' : 'Create Feature'}
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

        {/* Create Form */}
        {showCreateForm && (
          <motion.div
            className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-xl mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">New Feature Flag</h2>
            <form onSubmit={handleCreateFeature}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newFeatureName}
                    onChange={(e) => setNewFeatureName(e.target.value)}
                    required
                    placeholder="e.g., beta_features"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-orange-500 outline-none transition-colors"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Will be formatted as: {newFeatureName.toLowerCase().replace(/\s+/g, '_') || 'feature_name'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
                    Description
                  </label>
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
                  disabled={isCreating}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium hover:from-orange-400 hover:to-amber-400 transition-all disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create Feature Flag'}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Features List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : features.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mb-4">No feature flags yet</p>
            <button
              onClick={() => setShowCreateForm(true)}
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
                      feature.enabled_default
                        ? 'bg-emerald-100 dark:bg-emerald-500/20'
                        : 'bg-slate-100 dark:bg-slate-800'
                    }`}>
                      <svg
                        className={`w-5 h-5 ${feature.enabled_default ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-slate-900 dark:text-white font-medium font-mono">{feature.name}</p>
                      <p className="text-slate-500 text-sm">
                        {feature.description || 'No description'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Toggle */}
                    <button
                      onClick={() => handleToggleDefault(feature.id, !feature.enabled_default)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        feature.enabled_default ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          feature.enabled_default ? 'left-7' : 'left-1'
                        }`}
                      />
                    </button>

                    {/* Delete */}
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

        {/* Info */}
        <div className="mt-8 p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-blue-700 dark:text-blue-400 text-sm">
              <p className="font-medium mb-1">About Feature Flags</p>
              <p className="text-blue-600 dark:text-blue-400/80">
                Feature flags control access to features across the portal. The default toggle affects all users.
                Individual user overrides can be managed from the Users page.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
