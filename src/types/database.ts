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
          portal_access: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          is_admin?: boolean
          portal_access?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          is_admin?: boolean
          portal_access?: boolean
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
          app: string
          message: string | null
          metadata: Record<string, unknown> | null
        }
        Insert: {
          id?: string
          email: string
          token: string
          invited_by: string
          expires_at: string
          accepted_at?: string | null
          created_at?: string
          app?: string
          message?: string | null
          metadata?: Record<string, unknown> | null
        }
        Update: {
          id?: string
          email?: string
          token?: string
          invited_by?: string
          expires_at?: string
          accepted_at?: string | null
          created_at?: string
          app?: string
          message?: string | null
          metadata?: Record<string, unknown> | null
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
      landing_conversations: {
        Row: {
          id: string
          session_id: string
          started_at: string
          last_message_at: string
          message_count: number
          total_tokens: number
          ip_address: string | null
          user_agent: string | null
          flag_categories: string[]
          flag_notes: string | null
          reviewed: boolean
          admin_notes: string | null
          ended_reason: string | null
        }
        Insert: {
          id?: string
          session_id: string
          started_at?: string
          last_message_at?: string
          message_count?: number
          total_tokens?: number
          ip_address?: string | null
          user_agent?: string | null
          flag_categories?: string[]
          flag_notes?: string | null
          reviewed?: boolean
          admin_notes?: string | null
          ended_reason?: string | null
        }
        Update: {
          reviewed?: boolean
          admin_notes?: string | null
          flag_notes?: string | null
        }
      }
      landing_messages: {
        Row: {
          id: number
          conversation_id: string
          role: 'user' | 'assistant' | 'tool' | 'system'
          content: unknown
          tokens_in: number | null
          tokens_out: number | null
          created_at: string
        }
        Insert: {
          conversation_id: string
          role: 'user' | 'assistant' | 'tool' | 'system'
          content: unknown
          tokens_in?: number | null
          tokens_out?: number | null
          created_at?: string
        }
        Update: never
      }
      landing_leads: {
        Row: {
          id: string
          conversation_id: string | null
          name: string | null
          email: string | null
          phone: string | null
          interest: string | null
          synopsis: string
          contact_preference: string | null
          status: 'new' | 'reviewed' | 'contacted' | 'closed'
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          conversation_id?: string | null
          name?: string | null
          email?: string | null
          phone?: string | null
          interest?: string | null
          synopsis: string
          contact_preference?: string | null
          status?: 'new' | 'reviewed' | 'contacted' | 'closed'
          admin_notes?: string | null
        }
        Update: {
          status?: 'new' | 'reviewed' | 'contacted' | 'closed'
          admin_notes?: string | null
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
export type LandingConversation = Database['public']['Tables']['landing_conversations']['Row']
export type LandingMessage = Database['public']['Tables']['landing_messages']['Row']
export type LandingLead = Database['public']['Tables']['landing_leads']['Row']

// Admin view type (includes last_sign_in_at from auth.users via get_admin_users RPC)
export interface AdminUser {
  id: string
  email: string
  full_name: string | null
  is_admin: boolean
  created_at: string
  last_sign_in_at: string | null
}

// Extended types with joins
export interface ProfileWithFeatures extends Profile {
  user_feature_flags: (UserFeatureFlag & { feature_flags: FeatureFlag })[]
}

export interface InvitationWithInviter extends Invitation {
  inviter: Pick<Profile, 'full_name' | 'email'>
}
