/**
 * Dev Tools — test data seeding utilities
 *
 * Only used in development builds (__DEV__). Never import from production code.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { format, subDays, setHours, setMinutes, setSeconds } from 'date-fns'

import { supabase } from './supabase'

const ROLLOVER_PROMPTED_DATE_KEY = 'rollover_prompted_date'
const CELEBRATION_SHOWN_DATE_KEY = 'celebration_shown_date'

/**
 * Seeds realistic test data for the rollover modal.
 *
 * Creates (or replaces) yesterday's plan with:
 * - 3 completed tasks with past reminder times
 * - 3 incomplete tasks with past reminder times (one MIT via priority=top)
 *
 * Also clears the AsyncStorage rollover/celebration flags so the modal
 * can fire on the next app open.
 */
export async function seedRolloverTestData(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
  const yesterdayDate = subDays(new Date(), 1)

  // Helper: build an ISO timestamp for yesterday at a given hour:minute
  const yesterdayAt = (hour: number, minute: number = 0): string =>
    setSeconds(setMinutes(setHours(yesterdayDate, hour), minute), 0).toISOString()

  // Step 1: Get or create yesterday's plan
  const { data: existingPlan } = await supabase
    .from('plans')
    .select('id')
    .eq('user_id', user.id)
    .eq('planned_for', yesterday)
    .maybeSingle()

  let planId: string

  if (existingPlan) {
    planId = existingPlan.id
    // Wipe existing tasks so the seed is deterministic
    await supabase.from('tasks').delete().eq('plan_id', planId)
  } else {
    const { data: newPlan, error } = await supabase
      .from('plans')
      .insert({ user_id: user.id, planned_for: yesterday })
      .select('id')
      .single()
    if (error) throw error
    planId = newPlan.id
  }

  // Step 2: Insert a realistic mix of tasks
  // priority='top' → DB trigger sets is_mit=true automatically
  const tasks: Array<{
    plan_id: string
    user_id: string
    title: string
    priority: 'top' | 'high' | 'medium' | 'low'
    reminder_at: string
    completed_at: string | null
  }> = [
    // ── Completed ──────────────────────────────────────────────────────────
    {
      plan_id: planId,
      user_id: user.id,
      title: 'Morning workout',
      priority: 'medium',
      reminder_at: yesterdayAt(7, 0),
      completed_at: yesterdayAt(7, 45),
    },
    {
      plan_id: planId,
      user_id: user.id,
      title: 'Team standup',
      priority: 'high',
      reminder_at: yesterdayAt(10, 0),
      completed_at: yesterdayAt(10, 20),
    },
    {
      plan_id: planId,
      user_id: user.id,
      title: 'Review project proposal',
      priority: 'high',
      reminder_at: yesterdayAt(11, 30),
      completed_at: yesterdayAt(12, 5),
    },
    // ── Incomplete ─────────────────────────────────────────────────────────
    {
      plan_id: planId,
      user_id: user.id,
      title: 'Finish quarterly report', // becomes MIT via DB trigger
      priority: 'top',
      reminder_at: yesterdayAt(14, 0),
      completed_at: null,
    },
    {
      plan_id: planId,
      user_id: user.id,
      title: 'Call plumber about kitchen sink',
      priority: 'high',
      reminder_at: yesterdayAt(15, 0),
      completed_at: null,
    },
    {
      plan_id: planId,
      user_id: user.id,
      title: 'Grocery shopping',
      priority: 'medium',
      reminder_at: yesterdayAt(17, 0),
      completed_at: null,
    },
  ]

  const { error: insertError } = await supabase.from('tasks').insert(tasks)
  if (insertError) throw insertError

  // Step 3: Clear prompt flags so the modal fires on next app launch
  await AsyncStorage.removeItem(ROLLOVER_PROMPTED_DATE_KEY)
  await AsyncStorage.removeItem(CELEBRATION_SHOWN_DATE_KEY)
}

/**
 * Resets only the AsyncStorage rollover flags without touching any data.
 * Useful to re-trigger the modal after already dismissing it today.
 */
export async function resetRolloverFlags(): Promise<void> {
  await AsyncStorage.removeItem(ROLLOVER_PROMPTED_DATE_KEY)
  await AsyncStorage.removeItem(CELEBRATION_SHOWN_DATE_KEY)
}
