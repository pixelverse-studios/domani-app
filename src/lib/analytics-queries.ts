import { supabase } from '~/lib/supabase'

/**
 * Analytics Query Utilities
 *
 * This file contains shared utilities and types for analytics data fetching.
 * Individual metric queries will be added here as they are implemented:
 * - DOM-245: Completion Rate
 * - DOM-246: Planning Streak
 * - DOM-247: Execution Streak
 * - DOM-248: MIT Completion Rate
 */

export interface AnalyticsSummary {
  completionRate: number | null
  planningStreak: number | null
  executionStreak: number | null
  mitCompletionRate: number | null
  hasData: boolean
}

/**
 * Check if the user has any analytics data (any completed plans or tasks)
 */
export async function checkHasAnalyticsData(userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (error) {
    return false
  }

  return (count ?? 0) > 0
}

/**
 * Placeholder for completion rate query
 * Will be implemented in DOM-245
 */
export async function fetchCompletionRate(_userId: string): Promise<number | null> {
  // TODO: Implement in DOM-245
  return null
}

/**
 * Placeholder for planning streak query
 * Will be implemented in DOM-246
 */
export async function fetchPlanningStreak(_userId: string): Promise<number | null> {
  // TODO: Implement in DOM-246
  return null
}

/**
 * Placeholder for execution streak query
 * Will be implemented in DOM-247
 */
export async function fetchExecutionStreak(_userId: string): Promise<number | null> {
  // TODO: Implement in DOM-247
  return null
}

/**
 * Placeholder for MIT completion rate query
 * Will be implemented in DOM-248
 */
export async function fetchMitCompletionRate(_userId: string): Promise<number | null> {
  // TODO: Implement in DOM-248
  return null
}
