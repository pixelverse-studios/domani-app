import { useQuery } from '@tanstack/react-query'

import { useAuth } from '~/hooks/useAuth'
import {
  checkHasAnalyticsData,
  fetchCompletionRate,
  fetchDailyCompletions,
  fetchExecutionStreak,
  fetchPlanningStreak,
  fetchMitCompletionRate,
  AnalyticsSummary,
  CompletionRateData,
  DailyCompletionData,
} from '~/lib/analytics-queries'

// Analytics data is relatively stable - 5 minute stale time
const ANALYTICS_STALE_TIME = 1000 * 60 * 5

/**
 * Check if the current user has any analytics data
 * Used to determine whether to show empty state
 */
export function useHasAnalyticsData() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['analytics', user?.id, 'hasData'],
    queryFn: async () => {
      if (!user?.id) throw new Error('Not authenticated')

      return checkHasAnalyticsData(user.id)
    },
    enabled: !!user?.id,
    staleTime: ANALYTICS_STALE_TIME,
  })
}

/**
 * Fetch completion rate data for the current user
 */
export function useCompletionRate() {
  const { user } = useAuth()

  return useQuery<CompletionRateData | null>({
    queryKey: ['analytics', user?.id, 'completionRate'],
    queryFn: async () => {
      if (!user?.id) throw new Error('Not authenticated')

      return fetchCompletionRate(user.id)
    },
    enabled: !!user?.id,
    staleTime: ANALYTICS_STALE_TIME,
  })
}

/**
 * Fetch daily completion data for the last N days
 */
export function useDailyCompletions(days: number = 7) {
  const { user } = useAuth()

  return useQuery<DailyCompletionData[]>({
    queryKey: ['analytics', user?.id, 'dailyCompletions', days],
    queryFn: async () => {
      if (!user?.id) throw new Error('Not authenticated')

      return fetchDailyCompletions(user.id, days)
    },
    enabled: !!user?.id,
    staleTime: ANALYTICS_STALE_TIME,
  })
}

/**
 * Fetch all analytics summary data for the current user
 *
 * Individual metric hooks:
 * - useCompletionRate (DOM-245) - implemented
 * - DOM-246: usePlanningStreak
 * - DOM-247: useExecutionStreak
 * - DOM-248: useMitCompletionRate
 */
export function useAnalyticsSummary() {
  const { user } = useAuth()

  return useQuery<AnalyticsSummary>({
    queryKey: ['analytics', user?.id, 'summary'],
    queryFn: async () => {
      if (!user?.id) throw new Error('Not authenticated')

      // Fetch all metrics in parallel
      const [hasData, completionRate, executionStreak, planningStreak, mitCompletionRate] =
        await Promise.all([
          checkHasAnalyticsData(user.id),
          fetchCompletionRate(user.id),
          fetchExecutionStreak(user.id),
          fetchPlanningStreak(user.id),
          fetchMitCompletionRate(user.id),
        ])

      return {
        completionRate,
        planningStreak,
        executionStreak,
        mitCompletionRate,
        hasData,
      }
    },
    enabled: !!user?.id,
    staleTime: ANALYTICS_STALE_TIME,
  })
}
