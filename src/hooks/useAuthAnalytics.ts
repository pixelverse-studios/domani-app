import { useEffect, useRef } from 'react'
import { useAuth } from '~/hooks/useAuth'
import { useProfile } from '~/hooks/useProfile'
import { useAnalytics } from '~/providers/AnalyticsProvider'
import { getAnalyticsBaseProperties } from '~/lib/productAnalytics'
import {
  logMetaCompletedRegistration,
  logMetaStartTrial,
} from '~/lib/metaAcquisitionEvents'
import { requestMetaTrackingPermission } from '~/lib/metaAppEvents'

const RECENT_AUTH_WINDOW_MS = 2 * 60 * 1000

export function isRecentAuthTimestamp(timestamp: string | undefined, now = Date.now()) {
  if (!timestamp) return false
  const value = new Date(timestamp).getTime()
  return Number.isFinite(value) && Math.abs(now - value) <= RECENT_AUTH_WINDOW_MS
}

/**
 * Hook to track auth events (sign in, sign out) in PostHog.
 * Should be used once at the app root level.
 */
export function useAuthAnalytics() {
  const { user } = useAuth()
  const { profile } = useProfile()
  const { track } = useAnalytics()
  const previousUserId = useRef<string | null>(null)
  const metaAcquisitionUserId = useRef<string | null>(null)

  useEffect(() => {
    const currentUserId = user?.id ?? null

    // Skip if user hasn't changed
    if (currentUserId === previousUserId.current) {
      return
    }

    if (currentUserId && user) {
      const provider = user.identities?.[0]?.provider as 'google' | 'apple' | undefined
      const isCompletedSignIn = isRecentAuthTimestamp(user.last_sign_in_at)

      // Ignore restored cached sessions. A completed sign-in is only emitted when
      // Supabase reports a recent authentication timestamp.
      if ((provider === 'google' || provider === 'apple') && isCompletedSignIn) {
        const isNewRegistration = isRecentAuthTimestamp(user.created_at)

        track('signed_in', { provider })
        track('sign_in_completed', {
          ...getAnalyticsBaseProperties(),
          provider,
          is_new_registration: isNewRegistration,
        })
      }
    } else if (previousUserId.current && !currentUserId) {
      // User signed out - track the event
      track('signed_out', {})
    }

    previousUserId.current = currentUserId
  }, [user, track])

  useEffect(() => {
    const userId = user?.id
    const provider = user?.identities?.[0]?.provider as 'google' | 'apple' | undefined
    const hasAutomaticTrial =
      profile?.id === userId &&
      profile?.tier === 'trialing' &&
      isRecentAuthTimestamp(profile?.trial_started_at ?? undefined)

    if (
      !userId ||
      metaAcquisitionUserId.current === userId ||
      (provider !== 'google' && provider !== 'apple') ||
      !isRecentAuthTimestamp(user.created_at) ||
      !hasAutomaticTrial
    ) {
      return
    }

    metaAcquisitionUserId.current = userId

    void requestMetaTrackingPermission()
      .catch(() => undefined)
      .then(() =>
        Promise.all([
          logMetaCompletedRegistration({ userId, method: provider }),
          logMetaStartTrial({ userId }),
        ]),
      )
  }, [profile?.id, profile?.tier, profile?.trial_started_at, user])
}
