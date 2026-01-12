import { useEffect, useRef } from 'react'
import { useAuth } from '~/hooks/useAuth'
import { setSentryUser } from '~/lib/sentry'

/**
 * Hook to identify/reset users in Sentry when auth state changes.
 * Should be used once at the app root level.
 */
export function useSentryIdentify() {
  const { user } = useAuth()
  const previousUserId = useRef<string | null>(null)

  useEffect(() => {
    const currentUserId = user?.id ?? null

    // Skip if user hasn't changed
    if (currentUserId === previousUserId.current) {
      return
    }

    if (currentUserId && user) {
      // User signed in - identify them in Sentry
      setSentryUser(currentUserId, user.email ?? undefined)
      if (__DEV__) {
        console.log('[Sentry] User identified:', currentUserId)
      }
    } else if (previousUserId.current && !currentUserId) {
      // User signed out - clear Sentry user
      setSentryUser(null)
      if (__DEV__) {
        console.log('[Sentry] User cleared (signed out)')
      }
    }

    previousUserId.current = currentUserId
  }, [user])
}
