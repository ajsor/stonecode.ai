// Supabase Database Types
// Generated types should be replaced with actual types from `supabase gen types typescript`

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          is_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      invitations: {
        Row: {
          id: string
          email: string
          token: string
          invited_by: string
          expires_at: string
          accepted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          token: string
          invited_by: string
          expires_at: string
          accepted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          token?: string
          invited_by?: string
          expires_at?: string
          accepted_at?: string | null
          created_at?: string
        }
      }
      feature_flags: {
        Row: {
          id: string
          name: string
          description: string | null
          enabled_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          enabled_default?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          enabled_default?: boolean
          created_at?: string
        }
      }
      user_feature_flags: {
        Row: {
          id: string
          user_id: string
          feature_id: string
          enabled: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          feature_id: string
          enabled: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          feature_id?: string
          enabled?: boolean
          created_at?: string
        }
      }
      passkeys: {
        Row: {
          id: string
          user_id: string
          credential_id: string
          public_key: string
          counter: number
          device_type: string | null
          backed_up: boolean
          transports: string[] | null
          created_at: string
          last_used_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          credential_id: string
          public_key: string
          counter?: number
          device_type?: string | null
          backed_up?: boolean
          transports?: string[] | null
          created_at?: string
          last_used_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          credential_id?: string
          public_key?: string
          counter?: number
          device_type?: string | null
          backed_up?: boolean
          transports?: string[] | null
          created_at?: string
          last_used_at?: string | null
        }
      }
      audit_log: {
        Row: {
          id: string
          user_id: string | null
          action: string
          details: Record<string, unknown> | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          details?: Record<string, unknown> | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          details?: Record<string, unknown> | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      mfa_factors: {
        Row: {
          id: string
          user_id: string
          factor_type: 'totp'
          friendly_name: string | null
          verified: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          factor_type: 'totp'
          friendly_name?: string | null
          verified?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          factor_type?: 'totp'
          friendly_name?: string | null
          verified?: boolean
          created_at?: string
        }
      }
      widget_preferences: {
        Row: {
          id: string
          user_id: string
          layout: unknown // JSONB - WidgetLayoutItem[]
          widget_configs: unknown // JSONB - WidgetConfigs
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          layout?: unknown
          widget_configs?: unknown
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          layout?: unknown
          widget_configs?: unknown
          created_at?: string
          updated_at?: string
        }
      }
      google_oauth_tokens: {
        Row: {
          id: string
          user_id: string
          access_token: string
          refresh_token: string
          expires_at: string
          scope: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          access_token: string
          refresh_token: string
          expires_at: string
          scope: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          access_token?: string
          refresh_token?: string
          expires_at?: string
          scope?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// Helper types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Invitation = Database['public']['Tables']['invitations']['Row']
export type FeatureFlag = Database['public']['Tables']['feature_flags']['Row']
export type UserFeatureFlag = Database['public']['Tables']['user_feature_flags']['Row']
export type Passkey = Database['public']['Tables']['passkeys']['Row']
export type AuditLog = Database['public']['Tables']['audit_log']['Row']
export type MfaFactor = Database['public']['Tables']['mfa_factors']['Row']
export type WidgetPreferencesRow = Database['public']['Tables']['widget_preferences']['Row']
export type GoogleOAuthTokenRow = Database['public']['Tables']['google_oauth_tokens']['Row']

// Extended types with joins
export interface ProfileWithFeatures extends Profile {
  user_feature_flags: (UserFeatureFlag & { feature_flags: FeatureFlag })[]
}

export interface InvitationWithInviter extends Invitation {
  inviter: Pick<Profile, 'full_name' | 'email'>
}
