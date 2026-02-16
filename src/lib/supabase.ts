import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase environment variables not set. Auth features will not work. ' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
  )
}

// Create Supabase client without strict database typing for flexibility
// In production, generate proper types with `supabase gen types typescript`
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
)

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey)
}

// Auth helpers
export const signInWithPassword = async (email: string, password: string) => {
  return supabase.auth.signInWithPassword({ email, password })
}

export const signInWithMagicLink = async (email: string) => {
  return supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/portal/dashboard`,
    },
  })
}

export const signOut = async () => {
  return supabase.auth.signOut()
}

export const getCurrentUser = async () => {
  return supabase.auth.getUser()
}

export const getCurrentSession = async () => {
  return supabase.auth.getSession()
}

// Profile helpers
export const getProfile = async (userId: string) => {
  return supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
}

export const updateProfile = async (
  userId: string,
  updates: { full_name?: string | null; avatar_url?: string | null }
) => {
  return supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
}

// Invitation helpers
export const validateInvitation = async (token: string) => {
  return supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()
}

export const getInvitations = async () => {
  return supabase
    .from('invitations')
    .select(`
      *,
      inviter:profiles!invited_by(full_name, email)
    `)
    .order('created_at', { ascending: false })
}

// Feature flag helpers
export const getUserFeatureFlags = async (userId: string) => {
  const { data: userFlags } = await supabase
    .from('user_feature_flags')
    .select(`
      *,
      feature_flags(*)
    `)
    .eq('user_id', userId)

  const { data: defaultFlags } = await supabase
    .from('feature_flags')
    .select('*')

  // Merge default flags with user overrides
  const flags: Record<string, boolean> = {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultFlags?.forEach((flag: any) => {
    flags[flag.name] = flag.enabled_default
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userFlags?.forEach((userFlag: any) => {
    const feature = userFlag.feature_flags
    if (feature) {
      flags[feature.name] = userFlag.enabled
    }
  })

  return flags
}

// Passkey helpers
export const getUserPasskeys = async (userId: string) => {
  return supabase
    .from('passkeys')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
}

export const deletePasskey = async (passkeyId: string) => {
  return supabase
    .from('passkeys')
    .delete()
    .eq('id', passkeyId)
}

// Audit log helpers
export const logAuditEvent = async (
  action: string,
  details?: Record<string, unknown>,
  userId?: string
) => {
  return supabase
    .from('audit_log')
    .insert({
      user_id: userId,
      action,
      details,
      ip_address: null, // Set server-side
      user_agent: navigator.userAgent,
    })
}

// Admin helpers
export const getAllUsers = async () => {
  return supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
}

export const getAllFeatureFlags = async () => {
  return supabase
    .from('feature_flags')
    .select('*')
    .order('name', { ascending: true })
}

export const updateUserFeatureFlag = async (
  userId: string,
  featureId: string,
  enabled: boolean
) => {
  return supabase
    .from('user_feature_flags')
    .upsert({
      user_id: userId,
      feature_id: featureId,
      enabled,
    }, {
      onConflict: 'user_id,feature_id',
    })
}

// Widget preference helpers
export const getWidgetPreferences = async (userId: string) => {
  return supabase
    .from('widget_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()
}

export const saveWidgetPreferences = async (
  userId: string,
  layout: unknown,
  widgetConfigs: unknown,
  layoutVersion?: number
) => {
  // Store layout_version inside widget_configs to avoid DB migration
  const configs = layoutVersion !== undefined
    ? { ...(widgetConfigs as object), _layoutVersion: layoutVersion }
    : widgetConfigs
  return supabase
    .from('widget_preferences')
    .upsert({
      user_id: userId,
      layout,
      widget_configs: configs,
    }, {
      onConflict: 'user_id',
    })
    .select()
    .single()
}

// Google OAuth token helpers
export const getGoogleOAuthTokens = async (userId: string) => {
  return supabase
    .from('google_oauth_tokens')
    .select('*')
    .eq('user_id', userId)
    .single()
}

export const saveGoogleOAuthTokens = async (
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: string,
  scope: string
) => {
  return supabase
    .from('google_oauth_tokens')
    .upsert({
      user_id: userId,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      scope,
    }, {
      onConflict: 'user_id',
    })
    .select()
    .single()
}

export const deleteGoogleOAuthTokens = async (userId: string) => {
  return supabase
    .from('google_oauth_tokens')
    .delete()
    .eq('user_id', userId)
}
