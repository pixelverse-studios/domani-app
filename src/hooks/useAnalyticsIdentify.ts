import { useEffect, useRef } from 'react'
import { useAnalytics } from '~/providers/AnalyticsProvider'
import { useAuth } from '~/hooks/useAuth'

/**
 * Hook to identify/reset users in analytics when auth state changes.
 * Should be used once at the app root level.
 */
export function useAnalyticsIdentify() {
  const { user } = useAuth()
  const { identify, reset } = useAnalytics()
  const previousUserId = useRef<string | null>(null)

  useEffect(() => {
    const currentUserId = user?.id ?? null

    // Skip if user hasn't changed
    if (currentUserId === previousUserId.current) {
      return
    }

    if (currentUserId && user) {
      // User signed in - identify them
      // Only include defined values
      const traits: Record<string, string | number | boolean | null> = {}
      if (user.email) traits.email = user.email
      if (user.identities?.[0]?.provider) traits.auth_provider = user.identities[0].provider
      if (user.created_at) traits.created_at = user.created_at

      identify(currentUserId, traits)
      console.log('[Analytics] User identified:', currentUserId)
    } else if (previousUserId.current && !currentUserId) {
      // User signed out - reset analytics
      reset()
      console.log('[Analytics] User reset (signed out)')
    }

    previousUserId.current = currentUserId
  }, [user, identify, reset])
}
