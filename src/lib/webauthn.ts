import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
  platformAuthenticatorIsAvailable,
} from '@simplewebauthn/browser'
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/browser'
import { supabase } from './supabase'

// Check if WebAuthn is supported
export const isWebAuthnSupported = (): boolean => {
  return browserSupportsWebAuthn()
}

// Check if platform authenticator (Face ID, Touch ID, Windows Hello) is available
export const isPlatformAuthenticatorAvailable = async (): Promise<boolean> => {
  return platformAuthenticatorIsAvailable()
}

// Check if conditional UI (autofill) is supported
export const isAutofillSupported = async (): Promise<boolean> => {
  return browserSupportsWebAuthnAutofill()
}

// Get registration options from the server
export const getRegistrationOptions = async (
  userId: string,
  email: string
): Promise<PublicKeyCredentialCreationOptionsJSON | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('webauthn-registration-options', {
      body: { userId, email },
    })

    if (error) {
      console.error('Error getting registration options:', error)
      return null
    }

    return data as PublicKeyCredentialCreationOptionsJSON
  } catch (err) {
    console.error('Failed to get registration options:', err)
    return null
  }
}

// Register a new passkey
export const registerPasskey = async (
  userId: string,
  email: string
): Promise<{ success: boolean; error?: string }> => {
  if (!isWebAuthnSupported()) {
    return { success: false, error: 'WebAuthn is not supported in this browser' }
  }

  try {
    // Get registration options from server
    const options = await getRegistrationOptions(userId, email)
    if (!options) {
      return { success: false, error: 'Failed to get registration options' }
    }

    // Start the registration ceremony
    let registration: RegistrationResponseJSON
    try {
      registration = await startRegistration({ optionsJSON: options })
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          return { success: false, error: 'Registration was cancelled' }
        }
        return { success: false, error: err.message }
      }
      return { success: false, error: 'Registration failed' }
    }

    // Verify registration with server
    const { error } = await supabase.functions.invoke('webauthn-registration-verify', {
      body: { userId, registration },
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Passkey registration failed:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// Get authentication options from the server
export const getAuthenticationOptions = async (
  email?: string
): Promise<PublicKeyCredentialRequestOptionsJSON | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('webauthn-authentication-options', {
      body: { email },
    })

    if (error) {
      console.error('Error getting authentication options:', error)
      return null
    }

    return data as PublicKeyCredentialRequestOptionsJSON
  } catch (err) {
    console.error('Failed to get authentication options:', err)
    return null
  }
}

// Authenticate with a passkey
export const authenticateWithPasskey = async (
  email?: string
): Promise<{ success: boolean; error?: string }> => {
  if (!isWebAuthnSupported()) {
    return { success: false, error: 'WebAuthn is not supported in this browser' }
  }

  try {
    // Get authentication options from server
    const options = await getAuthenticationOptions(email)
    if (!options) {
      return { success: false, error: 'Failed to get authentication options' }
    }

    // Start the authentication ceremony
    let authentication: AuthenticationResponseJSON
    try {
      authentication = await startAuthentication({ optionsJSON: options })
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          return { success: false, error: 'Authentication was cancelled' }
        }
        return { success: false, error: err.message }
      }
      return { success: false, error: 'Authentication failed' }
    }

    // Verify authentication with server
    const { data, error } = await supabase.functions.invoke('webauthn-authentication-verify', {
      body: { authentication },
    })

    if (error) {
      return { success: false, error: error.message }
    }

    // If verification succeeded, the server returns a session token
    if (data?.session) {
      await supabase.auth.setSession(data.session)
    }

    return { success: true }
  } catch (err) {
    console.error('Passkey authentication failed:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// Delete a passkey
export const deletePasskey = async (
  passkeyId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('passkeys')
      .delete()
      .eq('id', passkeyId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Failed to delete passkey:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// Get the user's passkeys
export const getPasskeys = async (userId: string) => {
  const { data, error } = await supabase
    .from('passkeys')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to get passkeys:', error)
    return []
  }

  return data
}
