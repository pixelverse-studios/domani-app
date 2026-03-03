/**
 * useEveningRolloverTasks Hook
 *
 * Returns all incomplete tasks from today's and yesterday's plans for the
 * evening rollover prompt, giving the user full visibility and a deliberate
 * choice about what carries forward to tomorrow.
 *
 * This hook only runs when `enabled` is true, to avoid unnecessary
 * queries when the user opens the planning screen normally.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import { useCallback, useMemo } from 'react'

import { supabase } from '~/lib/supabase'
import { wasEveningPromptedToday, markEveningPromptedToday } from '~/lib/rollover'
import type { RolloverTask } from './useRolloverTasks'

interface UseEveningRolloverTasksOptions {
  /** When false (default), all queries are disabled — no network calls made */
  enabled?: boolean
}

export interface UseEveningRolloverTasksResult {
  /** Incomplete tasks from today/yesterday eligible for rollover review */
  eligibleTasks: RolloverTask[]
  /** Today's MIT if incomplete, null otherwise */
  mitTask: RolloverTask | null
  /** Non-MIT incomplete tasks */
  otherTasks: RolloverTask[]
  /** True when there are eligible tasks and user hasn't been prompted yet */
  shouldShow: boolean
  /** True while any query is loading */
  isLoading: boolean
  /** Mark user as having been prompted for evening rollover today */
  markEveningPrompted: () => Promise<void>
}

export function useEveningRolloverTasks({
  enabled = false,
}: UseEveningRolloverTasksOptions = {}): UseEveningRolloverTasksResult {
  const queryClient = useQueryClient()
  // Stable date strings for the lifetime of this hook instance — prevents midnight
  // boundary issues and avoids recreating the query key on every render
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])
  const yesterday = useMemo(() => format(subDays(new Date(), 1), 'yyyy-MM-dd'), [])

  // Query 1: Get today's and yesterday's incomplete tasks (two-step: plans → tasks)
  const { data: rawTasks = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: ['eveningRolloverTasks', today, yesterday],
    enabled,
    queryFn: async (): Promise<RolloverTask[]> => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return []

      // Step 1: Get today's and yesterday's plans
      const { data: plans, error: planError } = await supabase
        .from('plans')
        .select('id')
        .eq('user_id', user.id)
        .in('planned_for', [today, yesterday])

      if (planError) throw planError
      if (!plans || plans.length === 0) {
        if (__DEV__)
          console.log('[useEveningRolloverTasks] No plans for today/yesterday:', today, yesterday)
        return []
      }

      const planIds = plans.map((p) => p.id)

      // Step 2: Get all incomplete tasks for those plans
      // Explicitly scope by user_id for defence-in-depth alongside RLS
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('id, title, priority, system_category_id, user_category_id, reminder_at, is_mit')
        .in('plan_id', planIds)
        .eq('user_id', user.id)
        .is('completed_at', null)
        .is('rolled_over_at', null)

      if (error) throw error
      if (__DEV__) console.log('[useEveningRolloverTasks] Incomplete tasks:', tasks?.length ?? 0)
      return (tasks || []) as RolloverTask[]
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Sort MIT first, then partition into mitTask / otherTasks in one pass.
  // When tasks span two days, there could be two MITs (one per plan).
  // We pick only ONE to feature — the most recent (last in array after sort,
  // but since we want the freshest, we reverse-find). Any extra MITs are
  // demoted to otherTasks so the user still sees them.
  const { eligibleTasks, mitTask, otherTasks } = useMemo(() => {
    const sorted = [...rawTasks].sort((a, b) => {
      if (a.is_mit && !b.is_mit) return -1
      if (!a.is_mit && b.is_mit) return 1
      return 0
    })
    const mits = sorted.filter((t) => t.is_mit)
    // Feature one MIT; demote extras to otherTasks
    const featuredMit = mits.length > 0 ? mits[mits.length - 1] : null
    const demotedMitIds = new Set(mits.filter((t) => t !== featuredMit).map((t) => t.id))
    const others = sorted.filter((t) => !t.is_mit || demotedMitIds.has(t.id))
    return { eligibleTasks: sorted, mitTask: featuredMit, otherTasks: others }
  }, [rawTasks])

  // Query 2: Check if user was already shown the evening prompt today
  // Default to true (fail closed) to prevent duplicate prompts on error.
  // Keyed by `today` so the cache auto-resets at midnight without needing
  // explicit invalidation — consistent with the tasks query key above.
  const { data: alreadyPrompted = true, isLoading: isLoadingPrompt } = useQuery({
    queryKey: ['eveningRolloverPromptedToday', today],
    enabled,
    queryFn: async () => {
      const result = await wasEveningPromptedToday()
      if (__DEV__) console.log('[useEveningRolloverTasks] wasEveningPromptedToday:', result)
      return result
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  })

  const isLoading = isLoadingTasks || isLoadingPrompt

  const shouldShow = !isLoading && !alreadyPrompted && eligibleTasks.length > 0

  const markEveningPrompted = useCallback(async () => {
    await markEveningPromptedToday()
    await queryClient.invalidateQueries({ queryKey: ['eveningRolloverPromptedToday', today] })
  }, [queryClient, today])

  return {
    eligibleTasks,
    mitTask,
    otherTasks,
    shouldShow,
    isLoading,
    markEveningPrompted,
  }
}
