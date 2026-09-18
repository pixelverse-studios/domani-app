import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useAnalytics } from '~/providers/AnalyticsProvider'
import { useAuth } from '~/hooks/useAuth'
import {
  getAccountLifecycleSnapshot,
  subscribeToAccountLifecycle,
} from '~/lib/accountLifecycleCoordinator'

/**
 * Hook to identify/reset users in analytics when auth state changes.
 * Should be used once at the app root level.
 */
export function useAnalyticsIdentify() {
  const { user, loading } = useAuth()
  const { identify, reset } = useAnalytics()
  const { generation } = useSyncExternalStore(
    subscribeToAccountLifecycle,
    getAccountLifecycleSnapshot,
  )
  const previousGeneration = useRef<number | null>(null)
  const previousUserId = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    if (loading) return
    const currentUserId = user?.id ?? null

    // Re-identify a retained account after a failed transition cleared analytics state.
    if (currentUserId === previousUserId.current && generation === previousGeneration.current) {
      return
    }

    if (currentUserId && user) {
      if (previousUserId.current && previousUserId.current !== currentUserId) {
        reset()
      }

      // User signed in - identify them
      // Only include defined values
      const traits: Record<string, string | number | boolean | null> = {}
      if (user.email) traits.email = user.email
      if (user.created_at) traits.created_at = user.created_at
      if (user.identities?.[0]?.provider) traits.auth_provider = user.identities[0].provider

      identify(currentUserId, traits)
      console.log('[Analytics] User identified:', currentUserId)
    } else if (!currentUserId) {
      // User signed out - reset analytics
      reset()
      console.log('[Analytics] User reset (signed out)')
    }

    previousGeneration.current = generation
    previousUserId.current = currentUserId
  }, [user, loading, generation, identify, reset])
}
