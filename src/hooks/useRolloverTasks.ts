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

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import { useCallback, useMemo } from 'react'

import { supabase } from '~/lib/supabase'
import {
  wasPromptedToday,
  markPromptedToday,
  wasCelebratedToday,
  markCelebratedToday,
} from '~/lib/rollover'
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
  /** Whether to show celebration modal (all tasks completed && not already celebrated) */
  shouldShowCelebration: boolean
  /** Total count of yesterday's tasks (for celebration context) */
  yesterdayTaskCount: number
  /** Loading state */
  isLoading: boolean
  /** Mark user as having been prompted today */
  markPrompted: () => Promise<void>
  /** Mark user as having been celebrated today */
  markCelebrated: () => Promise<void>
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
  const queryClient = useQueryClient()

  // Calculate yesterday's date once for all queries
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')

  // Query incomplete tasks from yesterday
  const {
    data: incompleteTasks = [],
    isLoading: isLoadingIncomplete,
  } = useQuery({
    queryKey: ['rolloverTasks'],
    queryFn: async (): Promise<RolloverTask[]> => {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return []

      // Step 1: Get yesterday's plan (tasks link to plans via plan_id, not planned_for)
      const { data: yesterdayPlan } = await supabase
        .from('plans')
        .select('id')
        .eq('user_id', user.id)
        .eq('planned_for', yesterday)
        .maybeSingle()

      if (!yesterdayPlan) return []

      // Step 2: Query incomplete tasks from that plan
      const { data, error } = await supabase
        .from('tasks')
        .select(
          'id, title, priority, system_category_id, user_category_id, reminder_at, is_mit',
        )
        .eq('plan_id', yesterdayPlan.id)
        .is('completed_at', null)
        .order('is_mit', { ascending: false }) // MIT first
        .order('position')

      if (error) throw error

      return (data as RolloverTask[]) || []
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - reasonable for rollover check
  })

  // Query ALL tasks from yesterday to check if all were completed
  const { data: allYesterdayTasks = [], isLoading: isLoadingAll } = useQuery({
    queryKey: ['allYesterdayTasks'],
    queryFn: async (): Promise<{ id: string; completed_at: string | null }[]> => {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return []

      // Step 1: Get yesterday's plan
      const { data: yesterdayPlan } = await supabase
        .from('plans')
        .select('id')
        .eq('user_id', user.id)
        .eq('planned_for', yesterday)
        .maybeSingle()

      if (!yesterdayPlan) return []

      // Step 2: Query all tasks from that plan
      const { data, error } = await supabase
        .from('tasks')
        .select('id, completed_at')
        .eq('plan_id', yesterdayPlan.id)

      if (error) throw error

      return data || []
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  const isLoading = isLoadingIncomplete || isLoadingAll

  // Separate MIT task from other tasks
  const { mitTask, otherTasks } = useMemo(() => {
    const mit = incompleteTasks.find((task) => task.is_mit) || null
    const others = incompleteTasks.filter((task) => !task.is_mit)
    return { mitTask: mit, otherTasks: others }
  }, [incompleteTasks])

  // Check if user was already prompted today
  // This is checked separately from the query to avoid re-querying when prompt status changes
  // Default to true (fail closed) to prevent duplicate prompts on error
  const { data: alreadyPrompted = true } = useQuery({
    queryKey: ['rolloverPromptedToday'],
    queryFn: wasPromptedToday,
    staleTime: 1000 * 60 * 60, // 1 hour - prompt status doesn't change frequently
  })

  // Check if user was already celebrated today
  // Default to true (fail closed) to prevent duplicate celebrations on error
  const { data: alreadyCelebrated = true } = useQuery({
    queryKey: ['celebrationShownToday'],
    queryFn: wasCelebratedToday,
    staleTime: 1000 * 60 * 60, // 1 hour
  })

  // Determine if we should show the rollover prompt
  const shouldShowPrompt = useMemo(() => {
    return !isLoading && !alreadyPrompted && incompleteTasks.length > 0
  }, [isLoading, alreadyPrompted, incompleteTasks.length])

  // Determine if we should show the celebration modal
  // Show when: had tasks yesterday, all are completed, and not already celebrated
  const shouldShowCelebration = useMemo(() => {
    if (isLoading || alreadyCelebrated) return false

    const hadTasksYesterday = allYesterdayTasks.length > 0
    const allTasksCompleted =
      hadTasksYesterday && allYesterdayTasks.every((task) => task.completed_at !== null)

    return hadTasksYesterday && allTasksCompleted
  }, [isLoading, alreadyCelebrated, allYesterdayTasks])

  const yesterdayTaskCount = allYesterdayTasks.length

  // Memoized function to mark user as prompted
  const markPrompted = useCallback(async () => {
    await markPromptedToday()
    // Invalidate the prompt status query so shouldShowPrompt updates
    await queryClient.invalidateQueries({ queryKey: ['rolloverPromptedToday'] })
  }, [queryClient])

  // Memoized function to mark user as celebrated
  const markCelebrated = useCallback(async () => {
    await markCelebratedToday()
    // Invalidate the celebration status query so shouldShowCelebration updates
    await queryClient.invalidateQueries({ queryKey: ['celebrationShownToday'] })
  }, [queryClient])

  return {
    incompleteTasks,
    mitTask,
    otherTasks,
    shouldShowPrompt,
    shouldShowCelebration,
    yesterdayTaskCount,
    isLoading,
    markPrompted,
    markCelebrated,
  }
}
