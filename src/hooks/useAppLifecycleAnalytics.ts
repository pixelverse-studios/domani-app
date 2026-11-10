import { useEffect, useRef } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { getAnalyticsBaseProperties } from '~/lib/productAnalytics'
import { useAnalytics } from '~/providers/AnalyticsProvider'

const FIRST_OPEN_RECORDED_KEY = 'analytics:first_open:v1'

export function useAppLifecycleAnalytics() {
  const { track } = useAnalytics()
  const appState = useRef<AppStateStatus>(AppState.currentState)

  useEffect(() => {
    let active = true

    async function trackColdStart() {
      const baseProperties = getAnalyticsBaseProperties()
      const firstOpenRecorded = await AsyncStorage.getItem(FIRST_OPEN_RECORDED_KEY)

      if (!active) return

      if (!firstOpenRecorded) {
        track('first_open', baseProperties)
        await AsyncStorage.setItem(FIRST_OPEN_RECORDED_KEY, new Date().toISOString())
      }

      if (active) {
        track('app_opened', { ...baseProperties, session_source: 'cold_start' })
      }
    }

    trackColdStart().catch((error) => {
      if (__DEV__) console.warn('[Analytics] Failed to track cold start', error)
    })

    const subscription = AppState.addEventListener('change', (nextState) => {
      const becameActive = appState.current !== 'active' && nextState === 'active'
      appState.current = nextState

      if (becameActive) {
        track('app_opened', {
          ...getAnalyticsBaseProperties(),
          session_source: 'foreground',
        })
      }
    })

    return () => {
      active = false
      subscription.remove()
    }
  }, [track])
}
