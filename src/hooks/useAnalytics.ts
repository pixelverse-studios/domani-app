import { useQuery } from '@tanstack/react-query'

import { supabase } from '~/lib/supabase'
import {
  checkHasAnalyticsData,
  fetchCompletionRate,
  fetchDailyCompletions,
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
 * Fetch completion rate data for the current user
 */
export function useCompletionRate() {
  return useQuery<CompletionRateData | null>({
    queryKey: ['analytics', 'completionRate'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      return fetchCompletionRate(user.id)
    },
    staleTime: ANALYTICS_STALE_TIME,
  })
}

/**
 * Fetch daily completion data for the last N days
 */
export function useDailyCompletions(days: number = 7) {
  return useQuery<DailyCompletionData[]>({
    queryKey: ['analytics', 'dailyCompletions', days],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      return fetchDailyCompletions(user.id, days)
    },
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
  return useQuery<AnalyticsSummary>({
    queryKey: ['analytics', 'summary'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Fetch all metrics in parallel
      const [hasData, completionRate] = await Promise.all([
        checkHasAnalyticsData(user.id),
        fetchCompletionRate(user.id),
      ])

      return {
        completionRate,
        planningStreak: null,
        executionStreak: null,
        mitCompletionRate: null,
        hasData,
      }
    },
    staleTime: ANALYTICS_STALE_TIME,
  })
}
