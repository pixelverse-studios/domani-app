import React, { createContext, useEffect, useRef, useState } from 'react'
import { Alert, Platform, NativeModules } from 'react-native'
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import * as WebBrowser from 'expo-web-browser'
import * as AppleAuthentication from 'expo-apple-authentication'

import { supabase, sendAccountEmail } from '~/lib/supabase'
import { sendTeamNotification } from '~/lib/teamNotifications'
import { captureException, addBreadcrumb } from '~/lib/sentry'
import { completeOAuthCallback, resolveOAuthRedirectUrl, runSingleFlight } from '~/lib/authSession'
import { useTranslation } from '~/hooks/useTranslation'
import { formatLocalizedDate } from '~/i18n/date'
import type { AppLocale } from '~/i18n'
import type { TranslationKey, TranslationValues } from '~/i18n/types'

// Configure web browser for OAuth
WebBrowser.maybeCompleteAuthSession()

// Get device timezone using multiple fallback methods
const getDeviceTimezone = (): string => {
  try {
    // Method 1: Try React Native's native settings module (iOS)
    if (Platform.OS === 'ios') {
      const iosTimezone = NativeModules.SettingsManager?.settings?.AppleLocale
      // This doesn't give timezone directly, so skip to next method
    }

    // Method 2: Use Intl API - works in Hermes engine
    const intlTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (intlTimezone && intlTimezone !== 'UTC') {
      console.log('[AuthProvider] Got timezone from Intl API:', intlTimezone)
      return intlTimezone
    }

    // Method 3: Calculate offset and map to common timezone
    const offset = new Date().getTimezoneOffset()
    const offsetHours = -offset / 60
    console.log('[AuthProvider] Timezone offset hours:', offsetHours)

    // Map common US offsets to IANA timezones
    const offsetMap: Record<number, string> = {
      [-8]: 'America/Los_Angeles', // PST/PDT
      [-7]: 'America/Denver', // MST/MDT
      [-6]: 'America/Chicago', // CST/CDT
      [-5]: 'America/New_York', // EST/EDT
      [-4]: 'America/New_York', // EDT (Atlantic)
      [0]: 'Europe/London', // GMT
      [1]: 'Europe/Paris', // CET
    }

    if (offsetMap[offsetHours]) {
      console.log('[AuthProvider] Mapped offset to timezone:', offsetMap[offsetHours])
      return offsetMap[offsetHours]
    }

    console.log('[AuthProvider] Could not determine timezone, using UTC')
    return 'UTC'
  } catch (error) {
    console.warn('[AuthProvider] Failed to get device timezone:', error)
    captureException(error as Error, { context: 'getDeviceTimezone' })
    return 'UTC'
  }
}

// Check if account is pending deletion and prompt for reactivation
const checkPendingDeletion = async (
  userId: string,
  userEmail: string,
  signOutFn: () => Promise<void>,
  onReactivated: () => void,
  locale: AppLocale,
  t: (key: TranslationKey, values?: TranslationValues) => string,
): Promise<boolean> => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('deleted_at, deletion_scheduled_for')
      .eq('id', userId)
      .single()

    if (error || !profile?.deleted_at) {
      return false // No pending deletion
    }

    // Account is pending deletion - show reactivation prompt
    const deletionDate = formatLocalizedDate(
      new Date(profile.deletion_scheduled_for!),
      'MMMM d, yyyy',
      locale,
    )

    return new Promise((resolve) => {
      Alert.alert(
        t('auth.pendingDeletion.title'),
        t('auth.pendingDeletion.message', { date: deletionDate }),
        [
          {
            text: t('auth.actions.reactivate'),
            onPress: async () => {
              // Cancel the deletion
              const { error: cancelError } = await supabase.rpc(
                'cancel_current_user_account_deletion',
              )
              if (cancelError) {
                console.error('[AuthProvider] Failed to cancel deletion:', cancelError)
              } else {
                // Signal that account was reactivated for celebration
                onReactivated()

                // Send reactivation email (don't block on failure)
                sendAccountEmail({
                  type: 'account_reactivation',
                })

                sendTeamNotification({
                  type: 'account_lifecycle',
                  email: userEmail,
                  userId,
                  event: 'reactivated',
                  deletionScheduledFor: profile.deletion_scheduled_for ?? null,
                  source: 'sign_in_reactivation_prompt',
                })
              }
              resolve(false) // Continue with login
            },
          },
          {
            text: t('auth.actions.keepDeletion'),
            style: 'destructive',
            onPress: async () => {
              await signOutFn()
              resolve(true) // Block login
            },
          },
        ],
        { cancelable: false },
      )
    })
  } catch (error) {
    console.error('[AuthProvider] Failed to check pending deletion:', error)
    captureException(error as Error, { context: 'checkPendingDeletion', userId })
    return false
  }
}

// Validate that the user actually exists in the database
// Returns true if valid, false if orphaned session (user deleted)
const validateUserExists = async (userId: string): Promise<boolean> => {
  try {
    // Try to fetch the profile - if it fails with 23503 on insert or user doesn't exist,
    // we have an orphaned session
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      // If we get a permission error, the user likely doesn't exist in auth.users
      // (RLS policies reference auth.uid() which would be invalid)
      console.warn('[AuthProvider] Error checking user existence:', error.code, error.message)
      return false
    }

    // If profile exists, user is valid
    if (profile) {
      return true
    }

    // Profile doesn't exist - try to verify the user exists in auth by attempting
    // to get the current user from the server (not cache)
    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData.user) {
      console.warn('[AuthProvider] User does not exist on server:', authError?.message)
      return false
    }

    // User exists in auth but no profile yet - this is valid (profile will be created)
    return true
  } catch (error) {
    console.error('[AuthProvider] Failed to validate user:', error)
    captureException(error as Error, { context: 'validateUserExists', userId })
    return false
  }
}

// Ensure user has a profile row and set timezone if not already set
const ensureProfileExists = async (
  userId: string,
  email: string,
  fullName?: string | null,
  signupMethod?: string,
) => {
  try {
    console.log('[AuthProvider] Checking profile for user:', userId)
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, timezone, created_at')
      .eq('id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('[AuthProvider] Profile not found, recovering for user:', userId)
        const { data: recoveredProfile, error: recoverError } = await supabase.rpc(
          'ensure_current_user_profile',
        )

        if (recoverError) {
          console.warn(
            '[AuthProvider] Profile recovery failed:',
            recoverError.code,
            recoverError.message,
          )
          return
        }

        console.log('[AuthProvider] Profile recovered successfully')

        const createdAt = recoveredProfile?.created_at
          ? new Date(recoveredProfile.created_at).getTime()
          : 0
        if (createdAt && Date.now() - createdAt < 60_000) {
          sendTeamNotification({
            type: 'new_signup',
            email,
            name: fullName,
            signupMethod,
            timezone: recoveredProfile?.timezone ?? undefined,
          })
        }

        if (!recoveredProfile?.timezone || recoveredProfile.timezone === 'UTC') {
          const deviceTimezone = getDeviceTimezone()
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ timezone: deviceTimezone })
            .eq('id', userId)

          if (updateError) {
            console.warn('[AuthProvider] Failed to set recovered profile timezone:', updateError)
          }
        }
      } else {
        // Some other error (not "no rows") - log it
        console.warn('[AuthProvider] Profile query error:', error.code, error.message)
      }
    } else if (profile) {
      console.log('[AuthProvider] Profile found:', profile.id, 'timezone:', profile.timezone)

      // Check if this is a brand new signup (created within the last 60 seconds)
      const createdAt = new Date(profile.created_at).getTime()
      const isNewSignup = Date.now() - createdAt < 60_000
      if (isNewSignup) {
        sendTeamNotification({
          type: 'new_signup',
          email,
          name: fullName,
          signupMethod,
          timezone: profile.timezone ?? undefined,
        })
      }

      // Profile exists - check if timezone needs to be set
      // Treat null, undefined, or 'UTC' as "not set" since UTC is the old default
      if (!profile.timezone || profile.timezone === 'UTC') {
        const deviceTimezone = getDeviceTimezone()
        console.log('[AuthProvider] Setting device timezone:', deviceTimezone)
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ timezone: deviceTimezone })
          .eq('id', userId)
        if (updateError) {
          console.warn('[AuthProvider] Failed to set timezone:', updateError.message)
        } else {
          console.log('[AuthProvider] Timezone updated successfully')
        }
      }
    }
  } catch (error) {
    console.error('[AuthProvider] Failed to ensure profile exists:', error)
    captureException(error as Error, { context: 'ensureProfileExists', userId })
  }
}

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<boolean>
  signInWithApple: () => Promise<boolean>
  signOut: () => Promise<void>
  accountReactivated: boolean
  clearAccountReactivated: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { locale, t } = useTranslation()
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [accountReactivated, setAccountReactivated] = useState(false)
  const googleSignInPromiseRef = useRef<Promise<boolean> | null>(null)

  const redirectTo = resolveOAuthRedirectUrl({
    isDev: __DEV__,
    platform: Platform.OS,
    platformVersion: Platform.Version,
  })

  useEffect(() => {
    let isMounted = true
    let authTransitionId = 0
    let initialValidationTimer: ReturnType<typeof setTimeout> | null = null

    const applyAuthState = (event: AuthChangeEvent, nextSession: Session | null) => {
      if (!isMounted) return

      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setLoading(false)

      if ((event !== 'SIGNED_IN' && event !== 'INITIAL_SESSION') || !nextSession?.user) return

      if (event === 'SIGNED_IN') {
        const identities = nextSession.user.identities || []

        if (identities.length > 1) {
          console.warn(
            '[AuthProvider] Multiple providers detected:',
            identities.map((identity) => identity.provider),
          )

          void supabase.auth.signOut().then(() => {
            if (!isMounted) return
            Alert.alert(
              t('auth.errors.accountExistsTitle'),
              t('auth.errors.accountExistsMessage'),
              [{ text: t('auth.actions.ok') }],
            )
            setSession(null)
            setUser(null)
          })
          return
        }
      }

      const fullName =
        nextSession.user.user_metadata?.full_name || nextSession.user.user_metadata?.name

      if (event === 'SIGNED_IN') {
        void checkPendingDeletion(
          nextSession.user.id,
          nextSession.user.email!,
          async () => {
            const { error } = await supabase.auth.signOut()
            if (!error && isMounted) {
              setSession(null)
              setUser(null)
            }
          },
          () => setAccountReactivated(true),
          locale,
          t,
        )
      }

      const signupMethod = nextSession.user.app_metadata?.provider
      void ensureProfileExists(nextSession.user.id, nextSession.user.email!, fullName, signupMethod)
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      const transitionId = ++authTransitionId
      console.log('[AuthProvider] Auth state changed:', event)
      console.log('[AuthProvider] Session:', nextSession ? 'Found' : 'None')

      if (event !== 'INITIAL_SESSION' || !nextSession?.user) {
        applyAuthState(event, nextSession)
        return
      }

      // Supabase invokes auth listeners while holding an exclusive auth lock.
      // Defer any Supabase API calls until the listener has returned and released it.
      setLoading(true)
      initialValidationTimer = setTimeout(() => {
        void (async () => {
          console.log('[AuthProvider] Validating cached session for user:', nextSession.user.id)
          const isValid = await validateUserExists(nextSession.user.id)
          if (!isMounted || authTransitionId !== transitionId) return

          if (!isValid) {
            console.warn('[AuthProvider] Orphaned session detected - user no longer exists')
            await supabase.auth.signOut()
            if (!isMounted || authTransitionId !== transitionId) return
            setSession(null)
            setUser(null)
            setLoading(false)
            return
          }

          console.log('[AuthProvider] Session validated successfully')
          applyAuthState(event, nextSession)
        })()
      }, 0)
    })

    return () => {
      isMounted = false
      authTransitionId += 1
      if (initialValidationTimer) clearTimeout(initialValidationTimer)
      subscription.unsubscribe()
    }
  }, [locale, t])

  const signInWithGoogle = () =>
    runSingleFlight(googleSignInPromiseRef, async () => {
      console.log('[AuthProvider] Starting Google Sign In...')

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
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

        if (result.type !== 'success') return false

        await completeOAuthCallback(result.url, (code) =>
          supabase.auth.exchangeCodeForSession(code),
        )
        addBreadcrumb('Google sign in completed', 'auth', { provider: 'google' })
        return true
      } else {
        throw new Error('Google sign in could not start.')
      }
    }).catch((error) => {
      console.error('[AuthProvider] Google sign in error:', error)
      throw error
    })

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

      // Note: Don't log credential object as it contains identity tokens

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

      console.log('[AuthProvider] Apple sign in successful!')
      addBreadcrumb('Apple sign in completed', 'auth', { provider: 'apple' })
      // Note: Don't log full user data as it may contain sensitive information

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
      return true
    } catch (error: unknown) {
      // Handle user cancellation
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'ERR_REQUEST_CANCELED'
      ) {
        console.log('[AuthProvider] Apple Sign In cancelled by user')
        return false
      }
      console.error('[AuthProvider] Apple sign in error:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      addBreadcrumb('User signing out', 'auth')
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error('[AuthProvider] Sign out error:', error)
      throw error
    }
  }

  const clearAccountReactivated = () => setAccountReactivated(false)

  const value = {
    session,
    user,
    loading,
    signInWithGoogle,
    signInWithApple,
    signOut,
    accountReactivated,
    clearAccountReactivated,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
