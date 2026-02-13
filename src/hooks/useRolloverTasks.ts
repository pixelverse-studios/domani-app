/**
 * useRolloverTasks Hook
 *
 * Detects incomplete tasks from yesterday and determines if the rollover
 * prompt should be shown to the user.
 *
 * This hook:
 * - Queries incomplete tasks from yesterday
 * - Separates MIT (Most Important Task) from other tasks
 * - Checks if user was already prompted today
 * - Provides a function to mark user as prompted
 *
 * Used by rollover modals to prevent duplicate prompts and structure the
 * rollover experience around the user's MIT.
 */

import { useQuery } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import { useCallback, useMemo } from 'react'

import { supabase } from '~/lib/supabase'
import { wasPromptedToday, markPromptedToday } from '~/lib/rollover'
import type { TaskPriority } from '~/types'

/**
 * Rollover task data structure
 * Contains minimal task info needed for rollover UI
 */
export interface RolloverTask {
  id: string
  title: string
  priority: TaskPriority
  system_category_id: string | null
  user_category_id: string | null
  reminder_at: string | null
  is_mit: boolean
}

/**
 * Result of useRolloverTasks hook
 */
export interface UseRolloverTasksResult {
  /** All incomplete tasks from yesterday */
  incompleteTasks: RolloverTask[]
  /** Yesterday's MIT if incomplete, null otherwise */
  mitTask: RolloverTask | null
  /** Non-MIT incomplete tasks from yesterday */
  otherTasks: RolloverTask[]
  /** Whether to show the rollover prompt (has tasks && not already prompted) */
  shouldShowPrompt: boolean
  /** Loading state */
  isLoading: boolean
  /** Mark user as having been prompted today */
  markPrompted: () => Promise<void>
}

/**
 * Hook to get incomplete tasks from yesterday for rollover prompt
 *
 * @returns Object containing incomplete tasks, MIT task, and prompt state
 *
 * @example
 * const { incompleteTasks, mitTask, shouldShowPrompt, markPrompted } = useRolloverTasks()
 *
 * if (shouldShowPrompt) {
 *   // Show rollover modal
 *   await markPrompted() // Mark as shown after user sees it
 * }
 */
export function useRolloverTasks(): UseRolloverTasksResult {
  // Query incomplete tasks from yesterday
  const {
    data: incompleteTasks = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['rolloverTasks'],
    queryFn: async (): Promise<RolloverTask[]> => {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return []

      // Calculate yesterday's date in yyyy-MM-dd format
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')

      // Query incomplete tasks from yesterday
      const { data, error } = await supabase
        .from('tasks')
        .select(
          'id, title, priority, system_category_id, user_category_id, reminder_at, is_mit',
        )
        .eq('user_id', user.id)
        .eq('planned_for', yesterday)
        .is('completed_at', null)
        .order('is_mit', { ascending: false }) // MIT first
        .order('position')

      if (error) throw error

      return (data as RolloverTask[]) || []
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - reasonable for rollover check
  })

  // Separate MIT task from other tasks
  const { mitTask, otherTasks } = useMemo(() => {
    const mit = incompleteTasks.find((task) => task.is_mit) || null
    const others = incompleteTasks.filter((task) => !task.is_mit)
    return { mitTask: mit, otherTasks: others }
  }, [incompleteTasks])

  // Check if user was already prompted today
  // This is checked separately from the query to avoid re-querying when prompt status changes
  const { data: alreadyPrompted = true } = useQuery({
    queryKey: ['rolloverPromptedToday'],
    queryFn: wasPromptedToday,
    staleTime: 1000 * 60 * 60, // 1 hour - prompt status doesn't change frequently
  })

  // Determine if we should show the prompt
  const shouldShowPrompt = useMemo(() => {
    return !isLoading && !alreadyPrompted && incompleteTasks.length > 0
  }, [isLoading, alreadyPrompted, incompleteTasks.length])

  // Memoized function to mark user as prompted
  const markPrompted = useCallback(async () => {
    await markPromptedToday()
    // Refetch prompt status to update UI
    await refetch()
  }, [refetch])

  return {
    incompleteTasks,
    mitTask,
    otherTasks,
    shouldShowPrompt,
    isLoading,
    markPrompted,
  }
}
