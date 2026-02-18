/**
 * useEveningRolloverTasks Hook
 *
 * Detects incomplete tasks from today's plan that are eligible for
 * rollover review when the user opens the planning screen via a
 * planning reminder notification (Flow 2: evening rollover).
 *
 * A task is "eligible" if:
 * - It is incomplete (completed_at IS NULL)
 * - AND its reminder_at is NULL (no specific time set)
 *   OR its reminder_at is before the user's planning_reminder_time
 *   (meaning the task was supposed to be done earlier today)
 *
 * This hook only runs when `enabled` is true, to avoid unnecessary
 * queries when the user opens the planning screen normally.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useCallback, useMemo } from 'react'

import { supabase } from '~/lib/supabase'
import { wasEveningPromptedToday, markEveningPromptedToday } from '~/lib/rollover'
import type { RolloverTask } from './useRolloverTasks'

interface UseEveningRolloverTasksOptions {
  /** When false (default), all queries are disabled — no network calls made */
  enabled?: boolean
}

export interface UseEveningRolloverTasksResult {
  /** Incomplete tasks from today eligible for rollover review */
  eligibleTasks: RolloverTask[]
  /** Today's MIT if incomplete and eligible, null otherwise */
  mitTask: RolloverTask | null
  /** Non-MIT eligible incomplete tasks */
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
  // Stable date string for the lifetime of this hook instance — prevents midnight
  // boundary issues and avoids recreating the query key on every render
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])

  // Query 1: Get today's incomplete tasks (two-step: plan → tasks)
  const { data: rawTasks = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: ['eveningRolloverTasks', today],
    enabled,
    queryFn: async (): Promise<RolloverTask[]> => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return []

      // Step 1: Get today's plan
      const { data: plan, error: planError } = await supabase
        .from('plans')
        .select('id')
        .eq('user_id', user.id)
        .eq('planned_for', today)
        .maybeSingle()

      if (planError) throw planError
      if (!plan) {
        if (__DEV__) console.log('[useEveningRolloverTasks] No plan for today:', today)
        return []
      }

      // Step 2: Get all incomplete tasks for today's plan
      // Explicitly scope by user_id for defence-in-depth alongside RLS
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select(
          'id, title, priority, system_category_id, user_category_id, reminder_at, is_mit',
        )
        .eq('plan_id', plan.id)
        .eq('user_id', user.id)
        .is('completed_at', null)

      if (error) throw error
      if (__DEV__)
        console.log('[useEveningRolloverTasks] Incomplete tasks:', tasks?.length ?? 0)
      return (tasks || []) as RolloverTask[]
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Query 2: Get planning_reminder_time from profile (for task eligibility cutoff)
  const { data: planningReminderTime, isLoading: isLoadingProfile } = useQuery({
    // User-scoped key prevents stale data if a different account signs in
    queryKey: ['profileReminderTime'],
    enabled,
    queryFn: async (): Promise<string | null> => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return null

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('planning_reminder_time')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) throw profileError
      return profile?.planning_reminder_time ?? null
    },
    staleTime: 1000 * 60 * 60, // 1 hour — reminder time changes infrequently
  })

  // Filter tasks by eligibility:
  // - No reminder set → always eligible
  // - Reminder before planning_reminder_time → should have been done, now eligible
  // - Reminder after planning_reminder_time → scheduled for later, not eligible
  const eligibleTasks = useMemo((): RolloverTask[] => {
    // Always returns a new sorted array (spread copy prevents in-place mutation)
    const sortedCopy = (tasks: RolloverTask[]) =>
      [...tasks].sort((a, b) => {
        if (a.is_mit && !b.is_mit) return -1
        if (!a.is_mit && b.is_mit) return 1
        return 0
      })

    if (!planningReminderTime) {
      // No reminder time set — all incomplete tasks are eligible
      return sortedCopy(rawTasks)
    }

    // planning_reminder_time is a Postgres time in HH:mm:ss format
    const parts = planningReminderTime.split(':').map(Number)
    if (parts.length < 2 || parts.some(isNaN)) {
      // Unexpected format — treat as no cutoff
      return sortedCopy(rawTasks)
    }
    const [hours, minutes] = parts
    const cutoff = new Date()
    cutoff.setHours(hours, minutes, 0, 0)

    const eligible = rawTasks.filter((task) => {
      if (!task.reminder_at) return true
      return new Date(task.reminder_at) < cutoff
    })

    return sortedCopy(eligible)
  }, [rawTasks, planningReminderTime])

  // Separate MIT from other tasks
  const { mitTask, otherTasks } = useMemo(() => {
    const mit = eligibleTasks.find((t) => t.is_mit) ?? null
    const others = eligibleTasks.filter((t) => !t.is_mit)
    return { mitTask: mit, otherTasks: others }
  }, [eligibleTasks])

  // Query 3: Check if user was already shown the evening prompt today
  // Default to true (fail closed) to prevent duplicate prompts on error
  const { data: alreadyPrompted = true, isLoading: isLoadingPrompt } = useQuery({
    queryKey: ['eveningRolloverPromptedToday'],
    enabled,
    queryFn: async () => {
      const result = await wasEveningPromptedToday()
      if (__DEV__) console.log('[useEveningRolloverTasks] wasEveningPromptedToday:', result)
      return result
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  })

  const isLoading = isLoadingTasks || isLoadingProfile || isLoadingPrompt

  const shouldShow = !isLoading && !alreadyPrompted && eligibleTasks.length > 0

  const markEveningPrompted = useCallback(async () => {
    await markEveningPromptedToday()
    await queryClient.invalidateQueries({ queryKey: ['eveningRolloverPromptedToday'] })
  }, [queryClient])

  return {
    eligibleTasks,
    mitTask,
    otherTasks,
    shouldShow,
    isLoading,
    markEveningPrompted,
  }
}
