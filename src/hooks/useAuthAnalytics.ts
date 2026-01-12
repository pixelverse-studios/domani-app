import { useEffect, useRef } from 'react'
import { useAuth } from '~/hooks/useAuth'
import { useAnalytics } from '~/providers/AnalyticsProvider'

/**
 * Hook to track auth events (sign in, sign out) in PostHog.
 * Should be used once at the app root level.
 */
export function useAuthAnalytics() {
  const { user } = useAuth()
  const { track } = useAnalytics()
  const previousUserId = useRef<string | null>(null)

  useEffect(() => {
    const currentUserId = user?.id ?? null

    // Skip if user hasn't changed
    if (currentUserId === previousUserId.current) {
      return
    }

    if (currentUserId && user) {
      // User signed in - track the event
      const provider = user.identities?.[0]?.provider as 'google' | 'apple' | undefined
      if (provider === 'google' || provider === 'apple') {
        track('signed_in', { provider })
      }
    } else if (previousUserId.current && !currentUserId) {
      // User signed out - track the event
      track('signed_out', {})
    }

    previousUserId.current = currentUserId
  }, [user, track])
}
