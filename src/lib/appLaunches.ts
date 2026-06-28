import { supabase } from './supabase'

// Fire-and-forget log when a user clicks a satellite app tile in the
// portal sidebar. Powers /portal/admin/utilization. Failure is silent —
// telemetry must never block the actual launch.
export async function logAppLaunch(app: string, source = 'portal-sidebar'): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('app_launches').insert({
      user_id: user.id,
      app,
      source,
    })
  } catch (err) {
    console.warn('logAppLaunch failed:', err)
  }
}

// Aggregate payload returned by the admin RPC. Mirrors the JSONB shape
// in migration 031.
export interface AppUtilization {
  generated_at: string
  active_users: {
    dau: number
    wau: number
    mau: number
    total_users: number
  }
  active_app_users: {
    dau_apps: number
    wau_apps: number
    mau_apps: number
  }
  apps: {
    app: string
    launches_7d: number
    launches_prev_7d: number
    launches_30d: number
    users_30d: number
    granted: number
    ever_launched: number
    active_7d: number
    returning: number
  }[]
  daily_series: { day: string; launches: number }[]
  top_users: { user_id: string; label: string; launches: number }[]
}

export async function getAppUtilization(): Promise<AppUtilization> {
  const { data, error } = await supabase.rpc('get_admin_app_utilization')
  if (error) throw error
  return data as AppUtilization
}
