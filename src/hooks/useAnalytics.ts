import { useQuery } from '@tanstack/react-query'

import { supabase } from '~/lib/supabase'
import { checkHasAnalyticsData, AnalyticsSummary } from '~/lib/analytics-queries'

// Analytics data is relatively stable - 5 minute stale time
const ANALYTICS_STALE_TIME = 1000 * 60 * 5

/**
 * Check if the current user has any analytics data
 * Used to determine whether to show empty state
 */
export function useHasAnalyticsData() {
  return useQuery({
    queryKey: ['analytics', 'hasData'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      return checkHasAnalyticsData(user.id)
    },
    staleTime: ANALYTICS_STALE_TIME,
  })
}

/**
 * Fetch all analytics summary data for the current user
 * Returns placeholder nulls for metrics not yet implemented
 *
 * Individual metric hooks will be added as they are implemented:
 * - DOM-245: useCompletionRate
 * - DOM-246: usePlanningStreak
 * - DOM-247: useExecutionStreak
 * - DOM-248: useMitCompletionRate
 */
export function useAnalyticsSummary() {
  return useQuery<AnalyticsSummary>({
    queryKey: ['analytics', 'summary'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const hasData = await checkHasAnalyticsData(user.id)

      // Return placeholder data - will be filled in by subsequent tickets
      return {
        completionRate: null,
        planningStreak: null,
        executionStreak: null,
        mitCompletionRate: null,
        hasData,
      }
    },
    staleTime: ANALYTICS_STALE_TIME,
  })
}
