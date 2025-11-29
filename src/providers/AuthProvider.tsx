import React, { createContext, useEffect, useState } from 'react'
import { Alert, Platform } from 'react-native'
import { Session, User } from '@supabase/supabase-js'
import * as WebBrowser from 'expo-web-browser'
import * as AuthSession from 'expo-auth-session'
import * as AppleAuthentication from 'expo-apple-authentication'

import { supabase } from '~/lib/supabase'

// Configure web browser for OAuth
WebBrowser.maybeCompleteAuthSession()

// Get device timezone
const getDeviceTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

// Ensure user has a profile row and set timezone if not already set
const ensureProfileExists = async (userId: string, email: string, fullName?: string | null) => {
  try {
    console.log('[AuthProvider] Checking profile for user:', userId)
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, timezone')
      .eq('id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Profile doesn't exist (no rows returned), create it
        // This is the fallback - normally the database trigger creates the profile
        console.log('[AuthProvider] Profile not found, creating for user:', userId)
        const deviceTimezone = getDeviceTimezone()
        const { error: insertError } = await supabase.from('profiles').insert({
          id: userId,
          email: email,
          full_name: fullName || null,
          timezone: deviceTimezone,
        })
        if (insertError) {
          // If insert fails, it might be because profile was just created by trigger
          // This is expected in some race conditions - log but don't treat as fatal
          console.warn(
            '[AuthProvider] Profile insert failed (may already exist):',
            insertError.code,
          )
        } else {
          console.log('[AuthProvider] Profile created successfully')
        }
      } else {
        // Some other error (not "no rows") - log it
        console.warn('[AuthProvider] Profile query error:', error.code, error.message)
      }
    } else if (profile) {
      console.log('[AuthProvider] Profile found:', profile.id)
      // Profile exists - check if timezone needs to be set
      if (!profile.timezone) {
        const deviceTimezone = getDeviceTimezone()
        console.log('[AuthProvider] Setting device timezone:', deviceTimezone)
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ timezone: deviceTimezone })
          .eq('id', userId)
        if (updateError) {
          console.warn('[AuthProvider] Failed to set timezone:', updateError.message)
        }
      }
    }
  } catch (error) {
    console.error('[AuthProvider] Failed to ensure profile exists:', error)
  }
}

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithApple: () => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Configure OAuth redirect for mobile app
  // Uses the native scheme defined in app.json: domani://
  const redirectTo = AuthSession.makeRedirectUri({
    scheme: 'domani',
    path: 'auth/callback',
    // For development builds, force native scheme instead of exp://
    native: 'domani://auth/callback',
  })

  useEffect(() => {
    // Get initial session - just set state, don't call ensureProfileExists here
    // Profile creation is handled by onAuthStateChange which has proper auth context
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[AuthProvider] Initial session:', session ? 'Found' : 'None')
      console.log('[AuthProvider] User:', session?.user?.email)
      // State will be set by onAuthStateChange callback
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthProvider] Auth state changed:', event)
      console.log('[AuthProvider] Session:', session ? 'Found' : 'None')
      console.log('[AuthProvider] User:', session?.user?.email)

      // Update state immediately - don't block on profile creation
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)

      // Handle profile creation for both initial session and new sign-ins
      // Run in background - don't await to avoid blocking the auth flow
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        // Check for multiple linked providers on sign-in
        if (event === 'SIGNED_IN') {
          const identities = session.user.identities || []

          if (identities.length > 1) {
            console.warn(
              '[AuthProvider] Multiple providers detected:',
              identities.map((i) => i.provider),
            )

            // Sign out and alert the user (run async)
            supabase.auth.signOut().then(() => {
              Alert.alert('Account Already Exists', 'An account with this email already exists.', [
                { text: 'OK' },
              ])
              setSession(null)
              setUser(null)
            })
            return
          }
        }

        // Ensure profile exists and set timezone (run in background)
        const fullName = session.user.user_metadata?.full_name || session.user.user_metadata?.name
        ensureProfileExists(session.user.id, session.user.email!, fullName)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    try {
      console.log('[AuthProvider] Redirect URL:', redirectTo)

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: false,
          queryParams: {
            prompt: 'select_account',
          },
        },
      })

      if (error) throw error

      // Open OAuth URL in browser
      if (data?.url) {
        console.log('[AuthProvider] Opening browser for OAuth...')
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)

        console.log('[AuthProvider] Browser result type:', result.type)

        if (result.type === 'success') {
          console.log('[AuthProvider] OAuth redirect URL:', result.url)

          // Extract the URL from the redirect
          const url = result.url

          // Parse URL parameters from fragment (hash) or query string
          // OAuth tokens come in the fragment: exp://...#access_token=...&refresh_token=...
          let access_token: string | null = null
          let refresh_token: string | null = null

          // Try to parse from fragment first (most common for OAuth)
          const hashIndex = url.indexOf('#')
          if (hashIndex !== -1) {
            const fragment = url.substring(hashIndex + 1)
            const fragmentParams = new URLSearchParams(fragment)
            access_token = fragmentParams.get('access_token')
            refresh_token = fragmentParams.get('refresh_token')
            console.log('[AuthProvider] Parsed tokens from fragment')
          }

          // Fallback to query params if not found in fragment
          if (!access_token || !refresh_token) {
            const params = new URL(url).searchParams
            access_token = access_token || params.get('access_token')
            refresh_token = refresh_token || params.get('refresh_token')
            console.log('[AuthProvider] Parsed tokens from query params')
          }

          console.log('[AuthProvider] Tokens received:', {
            hasAccessToken: !!access_token,
            hasRefreshToken: !!refresh_token,
          })

          if (access_token && refresh_token) {
            // Set the session manually
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            })

            if (sessionError) {
              console.error('[AuthProvider] Session error:', sessionError)
              throw sessionError
            }

            console.log('[AuthProvider] Session set successfully!', sessionData.user?.email)
            // Profile creation is handled by onAuthStateChange callback
          } else {
            console.error('[AuthProvider] No tokens in redirect URL')
          }
        } else {
          console.log('[AuthProvider] OAuth was cancelled or failed')
        }
      }
    } catch (error) {
      console.error('[AuthProvider] Google sign in error:', error)
      throw error
    }
  }

  const signInWithApple = async () => {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign In is only available on iOS')
    }

    try {
      console.log('[AuthProvider] Starting Apple Sign In...')

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      })

      console.log('[AuthProvider] Apple credential received:', JSON.stringify(credential, null, 2))

      if (!credential.identityToken) {
        throw new Error('No identity token received from Apple')
      }

      // Sign in to Supabase with the Apple identity token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      })

      if (error) {
        console.error('[AuthProvider] Supabase Apple auth error:', error)
        throw error
      }

      console.log('[AuthProvider] Apple sign in successful!', data.user?.email)
      console.log('[AuthProvider] Supabase user data:', JSON.stringify(data.user, null, 2))

      // Capture name from Apple if provided (only available on first sign-in)
      if (credential.fullName?.givenName || credential.fullName?.familyName) {
        const fullName = [credential.fullName.givenName, credential.fullName.familyName]
          .filter(Boolean)
          .join(' ')

        if (fullName && data.user) {
          console.log('[AuthProvider] Saving Apple user name:', fullName)
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ full_name: fullName })
            .eq('id', data.user.id)

          if (profileError) {
            console.error('[AuthProvider] Failed to save Apple user name:', profileError)
          }
        }
      }

      // Profile creation is handled by onAuthStateChange callback
    } catch (error: unknown) {
      // Handle user cancellation
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'ERR_REQUEST_CANCELED'
      ) {
        console.log('[AuthProvider] Apple Sign In cancelled by user')
        return
      }
      console.error('[AuthProvider] Apple sign in error:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error('[AuthProvider] Sign out error:', error)
      throw error
    }
  }

  const value = {
    session,
    user,
    loading,
    signInWithGoogle,
    signInWithApple,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
