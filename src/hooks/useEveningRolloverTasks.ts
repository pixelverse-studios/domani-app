/**
 * useEveningRolloverTasks Hook
 *
 * Returns incomplete tasks eligible for rollover review. In morning mode
 * (before the user's planning reminder time), only yesterday's plan is
 * queried — today's tasks are freshly planned, not rollover candidates.
 * In evening mode, both today's and yesterday's plans are queried.
 *
 * This hook only runs when `enabled` is true, to avoid unnecessary
 * queries when the user opens the planning screen normally.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import { useCallback, useMemo } from 'react'

import { supabase } from '~/lib/supabase'
import { wasPromptedInCurrentCycle, markEveningPromptedToday, isPastReminderTime } from '~/lib/rollover'
import { useNotificationStore } from '~/stores/notificationStore'
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
  /** True once both queries have resolved at least once (includes cache hits) */
  isFetched: boolean
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

  // Query 0: Fetch the user's planning_reminder_time — shared by both the tasks
  // query (morning vs evening mode) and the prompt-check query (cycle-aware dedup).
  const { data: planningReminderTime } = useQuery({
    queryKey: ['planningReminderTime'],
    enabled,
    queryFn: async (): Promise<string | null> => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return null
      const { data: profile } = await supabase
        .from('profiles')
        .select('planning_reminder_time')
        .eq('id', user.id)
        .maybeSingle()
      return profile?.planning_reminder_time ?? null
    },
    staleTime: 1000 * 60 * 60, // 1 hour — rarely changes
  })

  // Query 1: Get incomplete tasks from relevant plans.
  // Determines morning vs evening mode internally by checking the user's
  // planning_reminder_time — so both call sites (app-open and notification-tap)
  // get the correct date filtering without threading props.
  const { data: rawTasks = [], isLoading: isLoadingTasks, isFetched: isFetchedTasks } = useQuery({
    queryKey: ['eveningRolloverTasks', today, yesterday, planningReminderTime],
    enabled: enabled && planningReminderTime !== undefined,
    queryFn: async (): Promise<RolloverTask[]> => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return []

      const reminderTime = planningReminderTime

      // Dev bypass: always query both days so seeded/real tasks are found regardless of time
      const { devForceBypass } = useNotificationStore.getState()
      if (devForceBypass) {
        useNotificationStore.setState({ devForceBypass: false })
      }

      // Determine which plan dates to query:
      // - Morning mode (before reminder time): only yesterday's plan
      //   (today's tasks are freshly planned, not rollover candidates)
      // - Evening mode (at/after reminder time, or no reminder set): today + yesterday
      const isBeforeReminder =
        !devForceBypass &&
        !!reminderTime && !isPastReminderTime(reminderTime)
      const planDates = isBeforeReminder ? [yesterday] : [today, yesterday]

      if (__DEV__)
        console.log(
          '[useEveningRolloverTasks] Mode:',
          isBeforeReminder ? 'morning' : 'evening',
          'dates:',
          planDates,
        )

      // Step 1: Get plans for the relevant date(s)
      const { data: plans, error: planError } = await supabase
        .from('plans')
        .select('id')
        .eq('user_id', user.id)
        .in('planned_for', planDates)

      if (planError) throw planError
      if (!plans || plans.length === 0) {
        if (__DEV__)
          console.log('[useEveningRolloverTasks] No plans for dates:', planDates)
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

  // Query 2: Check if user was already prompted in the current rollover cycle.
  // Uses cycle-aware check so a morning rollover prompt (before reminder time)
  // doesn't block the evening planning prompt (after reminder time) on the same day.
  // Default to true (fail closed) to prevent duplicate prompts on error.
  const { data: alreadyPrompted = true, isLoading: isLoadingPrompt, isFetched: isFetchedPrompt } = useQuery({
    queryKey: ['eveningRolloverPromptedInCycle', today, planningReminderTime],
    enabled: enabled && planningReminderTime !== undefined,
    queryFn: async () => {
      // If no reminder time configured, fall back to cycle-aware with a default
      // that effectively checks the full calendar day
      const result = await wasPromptedInCurrentCycle(planningReminderTime ?? '00:00:00')
      if (__DEV__) console.log('[useEveningRolloverTasks] wasPromptedInCurrentCycle:', result, 'reminderTime:', planningReminderTime)
      return result
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  })

  const isLoading = isLoadingTasks || isLoadingPrompt
  const isFetched = isFetchedTasks && isFetchedPrompt

  const shouldShow = !isLoading && !alreadyPrompted && eligibleTasks.length > 0

  const markEveningPrompted = useCallback(async () => {
    await markEveningPromptedToday()
    await queryClient.invalidateQueries({ queryKey: ['eveningRolloverPromptedInCycle'] })
  }, [queryClient])

  return {
    eligibleTasks,
    mitTask,
    otherTasks,
    shouldShow,
    isLoading,
    isFetched,
    markEveningPrompted,
  }
}
