import { useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { useAuth } from '~/hooks/useAuth'
import { useProfile } from '~/hooks/useProfile'
import { getAnalyticsBaseProperties } from '~/lib/productAnalytics'
import { useAnalytics } from '~/providers/AnalyticsProvider'

export function useAccessStateAnalytics() {
  const { user } = useAuth()
  const { profile } = useProfile()
  const { track } = useAnalytics()

  useEffect(() => {
    const revokedAt = profile?.refunded_at
    if (!user?.id || !revokedAt) return
    const revocationTimestamp = revokedAt

    const storageKey = `analytics:access_revoked:${user.id}:${revocationTimestamp}`

    async function trackRevocationOnce() {
      if (await AsyncStorage.getItem(storageKey)) return

      track('access_revoked', {
        ...getAnalyticsBaseProperties(),
        revoked_at: revocationTimestamp,
      })
      await AsyncStorage.setItem(storageKey, new Date().toISOString())
    }

    trackRevocationOnce().catch((error) => {
      if (__DEV__) console.warn('[Analytics] Failed to track revoked access', error)
    })
  }, [profile?.refunded_at, track, user?.id])
}
