import { useEffect } from 'react'
import { useAnalytics } from '~/providers/AnalyticsProvider'

/**
 * Hook to track screen views in PostHog.
 * Call once at the top of each screen component.
 */
export function useScreenTracking(screenName: string) {
  const { screen } = useAnalytics()

  useEffect(() => {
    screen(screenName)
  }, [screen, screenName])
}
