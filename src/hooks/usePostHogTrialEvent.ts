import { useCallback, useEffect } from 'react'
import { AppState } from 'react-native'

import { useAnalytics } from '~/providers/AnalyticsProvider'
import { useAuth } from '~/hooks/useAuth'
import { useProfile } from '~/hooks/useProfile'
import { getAnalyticsBaseProperties } from '~/lib/productAnalytics'
import {
  deliverPostHogTrialStarted,
  POSTHOG_TRIAL_REPLAY_INTERVAL_MS,
} from '~/lib/posthogTrialEvents'

export function usePostHogTrialEvent() {
  const { user } = useAuth()
  const { profile } = useProfile()
  const { captureTrialStarted } = useAnalytics()
  const userId = user?.id
  const trialStartedAt = profile?.trial_started_at
  const trialEndsAt = profile?.trial_ends_at

  const replay = useCallback(() => {
    if (!userId || !trialStartedAt || !trialEndsAt) return

    void deliverPostHogTrialStarted(userId, getAnalyticsBaseProperties(), captureTrialStarted)
  }, [captureTrialStarted, trialEndsAt, trialStartedAt, userId])

  useEffect(() => {
    replay()
    if (!userId || !trialStartedAt || !trialEndsAt) return

    const interval = setInterval(replay, POSTHOG_TRIAL_REPLAY_INTERVAL_MS)
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') replay()
    })

    return () => {
      clearInterval(interval)
      appStateSubscription.remove()
    }
  }, [replay, trialEndsAt, trialStartedAt, userId])
}
