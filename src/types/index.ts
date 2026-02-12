export * from './database'
export * from './widgets'

// Auth types
export interface AuthUser {
  id: string
  email: string
  emailVerified: boolean
}

export interface AuthState {
  user: AuthUser | null
  profile: import('./database').Profile | null
  isLoading: boolean
  isAuthenticated: boolean
}

// Feature flag types
export interface FeatureFlagState {
  flags: Record<string, boolean>
  isLoading: boolean
}

// WebAuthn types
export interface WebAuthnCredential {
  id: string
  rawId: ArrayBuffer
  type: 'public-key'
  response: {
    clientDataJSON: ArrayBuffer
    attestationObject?: ArrayBuffer
    authenticatorData?: ArrayBuffer
    signature?: ArrayBuffer
    userHandle?: ArrayBuffer
  }
  authenticatorAttachment?: 'platform' | 'cross-platform'
}

// Form types
export interface LoginFormData {
  email: string
  password?: string
}

export interface SignupFormData {
  email: string
  password: string
  fullName: string
}

export interface InvitationFormData {
  email: string
  message?: string
}

// API response types
export interface ApiResponse<T = unknown> {
  data?: T
  error?: {
    message: string
    code?: string
  }
}
