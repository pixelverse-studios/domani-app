/**
 * useRolloverTasks Hook
 *
 * Detects incomplete tasks from yesterday and determines if the rollover
 * prompt should be shown to the user.
 *
 * This hook:
 * - Queries yesterday's tasks directly by scheduled_date
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
import { useAuth } from '~/hooks/useAuth'
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
  const { user } = useAuth()

  // Calculate yesterday's date once for all queries
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')

  // Query yesterday's tasks directly by scheduled_date
  const { data: rawTasks = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: ['rolloverTasks', user?.id, yesterday],
    queryFn: async (): Promise<
      Array<RolloverTask & { completed_at: string | null; position: number | null }>
    > => {
      if (!user?.id) return []

      const { data: tasks, error } = await supabase
        .from('tasks')
        .select(
          'id, title, priority, system_category_id, user_category_id, reminder_at, is_mit, completed_at, position',
        )
        .eq('scheduled_date', yesterday)
        .eq('user_id', user.id)
        .is('rolled_over_at', null)

      if (error) throw error

      const all = (tasks || []) as Array<
        RolloverTask & { completed_at: string | null; position: number | null }
      >
      if (__DEV__) console.log('[useRolloverTasks] Yesterday:', yesterday, '| Tasks:', all.length)
      return all
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Incomplete tasks only, sorted: MIT first, then by position
  const incompleteTasks = useMemo((): RolloverTask[] => {
    return rawTasks
      .filter((t) => t.completed_at === null)
      .sort((a, b) => {
        if (a.is_mit && !b.is_mit) return -1
        if (!a.is_mit && b.is_mit) return 1
        return (a.position ?? 0) - (b.position ?? 0)
      })
  }, [rawTasks])

  // Separate MIT task from other tasks
  const { mitTask, otherTasks } = useMemo(() => {
    const mit = incompleteTasks.find((task) => task.is_mit) || null
    const others = incompleteTasks.filter((task) => !task.is_mit)
    return { mitTask: mit, otherTasks: others }
  }, [incompleteTasks])

  const yesterdayTaskCount = rawTasks.length

  // Check if user was already prompted today
  // Default to true (fail closed) to prevent duplicate prompts on error
  const { data: alreadyPrompted = true, isLoading: isLoadingPrompt } = useQuery({
    queryKey: ['rolloverPromptedToday', user?.id],
    queryFn: async () => {
      const result = await wasPromptedToday(user?.id)
      if (__DEV__) console.log('[useRolloverTasks] wasPromptedToday:', result)
      return result
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 60, // 1 hour - prompt status doesn't change frequently
  })

  // Check if user was already celebrated today
  // Default to true (fail closed) to prevent duplicate celebrations on error
  const { data: alreadyCelebrated = true, isLoading: isLoadingCelebration } = useQuery({
    queryKey: ['celebrationShownToday', user?.id],
    queryFn: () => wasCelebratedToday(user?.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 60, // 1 hour
  })

  const isLoading = isLoadingTasks || isLoadingPrompt || isLoadingCelebration

  // Determine if we should show the rollover prompt
  const shouldShowPrompt = useMemo(() => {
    return !isLoading && !alreadyPrompted && incompleteTasks.length > 0
  }, [isLoading, alreadyPrompted, incompleteTasks.length])

  // Determine if we should show the celebration modal
  // Show when: had tasks yesterday, all are completed, and not already celebrated
  const shouldShowCelebration = useMemo(() => {
    if (isLoading || alreadyCelebrated) return false
    const hadTasksYesterday = rawTasks.length > 0
    const allTasksCompleted =
      hadTasksYesterday && rawTasks.every((task) => task.completed_at !== null)
    return hadTasksYesterday && allTasksCompleted
  }, [isLoading, alreadyCelebrated, rawTasks])

  // Memoized function to mark user as prompted
  const markPrompted = useCallback(async () => {
    await markPromptedToday(user?.id)
    // Invalidate the prompt status query so shouldShowPrompt updates
    if (user?.id) {
      await queryClient.invalidateQueries({ queryKey: ['rolloverPromptedToday', user.id] })
    }
  }, [queryClient, user?.id])

  // Memoized function to mark user as celebrated
  const markCelebrated = useCallback(async () => {
    await markCelebratedToday(user?.id)
    // Invalidate the celebration status query so shouldShowCelebration updates
    if (user?.id) {
      await queryClient.invalidateQueries({ queryKey: ['celebrationShownToday', user.id] })
    }
  }, [queryClient, user?.id])

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
