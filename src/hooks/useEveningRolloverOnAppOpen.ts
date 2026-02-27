/**
 * useEveningRolloverOnAppOpen Hook
 *
 * Triggers the evening rollover modal when the app is opened (or returns to
 * foreground) at or after the user's planning_reminder_time — without requiring
 * the user to tap the planning reminder notification.
 *
 * Checks (in order, short-circuits on failure):
 *   1. eveningRolloverSource !== 'notification'  — notification-tap hasn't claimed the session
 *   2. wasEveningPromptedToday() === false        — user hasn't already been prompted today
 *   3. user has a planning_reminder_time set
 *   4. current time >= planning_reminder_time
 *
 * Once all conditions pass, sets eveningRolloverSource to 'app_open', enables
 * useEveningRolloverTasks, and returns the same surface as the notification-tap path.
 * The returned markEveningPrompted resets eveningRolloverSource to null after marking.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { AppState, type AppStateStatus } from 'react-native'

import { supabase } from '~/lib/supabase'
import { wasEveningPromptedToday } from '~/lib/rollover'
import { useNotificationStore } from '~/stores/notificationStore'
import { useEveningRolloverTasks } from './useEveningRolloverTasks'
import type { RolloverTask } from './useRolloverTasks'

export interface UseEveningRolloverOnAppOpenResult {
  /** True when time check passed and rollover tasks exist to show */
  shouldShow: boolean
  /** True while rollover task queries are loading */
  isLoading: boolean
  /** Today's MIT if incomplete and eligible, null otherwise */
  mitTask: RolloverTask | null
  /** Non-MIT eligible incomplete tasks */
  otherTasks: RolloverTask[]
  /** Mark user as prompted and release the app_open session claim */
  markEveningPrompted: () => Promise<void>
}

/**
 * Returns true if the current time is at or past the given planning reminder time.
 * Expects Postgres time format: HH:mm:ss
 */
function isPastReminderTime(planningReminderTime: string): boolean {
  const parts = planningReminderTime.split(':').map(Number)
  if (parts.length < 2 || parts.some(isNaN)) return false
  const [hours, minutes] = parts
  const reminderToday = new Date()
  reminderToday.setHours(hours, minutes, 0, 0)
  return new Date() >= reminderToday
}

export function useEveningRolloverOnAppOpen(): UseEveningRolloverOnAppOpenResult {
  const [timeCheckPassed, setTimeCheckPassed] = useState(false)
  // Ref copy prevents timeCheckPassed from being a dep of runCheck,
  // which would otherwise cause the AppState listener to re-register on every activation
  const timeCheckPassedRef = useRef(false)
  const isCheckingRef = useRef(false)
  const appStateRef = useRef<AppStateStatus>(AppState.currentState)

  const setEveningRolloverSource = useNotificationStore((s) => s.setEveningRolloverSource)

  const runCheck = useCallback(async () => {
    // Prevent concurrent checks and re-running once already activated
    if (isCheckingRef.current || timeCheckPassedRef.current) return
    isCheckingRef.current = true

    try {
      // 1. Notification-tap flow hasn't claimed the session
      // Read store state directly (not via hook selector) to avoid adding it as a dep
      const { eveningRolloverSource } = useNotificationStore.getState()
      if (eveningRolloverSource === 'notification') {
        if (__DEV__)
          console.log('[useEveningRolloverOnAppOpen] Notification tap owns session, skipping')
        return
      }

      // 2. User hasn't already been prompted today
      const alreadyPrompted = await wasEveningPromptedToday()
      if (alreadyPrompted) {
        if (__DEV__) console.log('[useEveningRolloverOnAppOpen] Already prompted today, skipping')
        return
      }

      // 3 & 4. User has a planning_reminder_time and current time is past it
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('planning_reminder_time')
        .eq('id', user.id)
        .maybeSingle()

      const reminderTime = profile?.planning_reminder_time
      if (!reminderTime) {
        if (__DEV__)
          console.log('[useEveningRolloverOnAppOpen] No planning_reminder_time set, skipping')
        return
      }

      if (!isPastReminderTime(reminderTime)) {
        if (__DEV__)
          console.log('[useEveningRolloverOnAppOpen] Before reminder time, skipping')
        return
      }

      // All conditions passed — claim the session and enable rollover queries
      if (__DEV__) console.log('[useEveningRolloverOnAppOpen] Time check passed, activating')
      setEveningRolloverSource('app_open')
      timeCheckPassedRef.current = true
      setTimeCheckPassed(true)
    } finally {
      isCheckingRef.current = false
    }
  }, [setEveningRolloverSource]) // setEveningRolloverSource is a stable Zustand setter

  useEffect(() => {
    // Check on mount
    runCheck()

    // Re-check whenever app returns to foreground
    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasBackground = appStateRef.current.match(/inactive|background/)
      appStateRef.current = nextState
      if (wasBackground && nextState === 'active') {
        runCheck()
      }
    })

    return () => subscription.remove()
  }, [runCheck])

  const rollover = useEveningRolloverTasks({ enabled: timeCheckPassed })

  const markEveningPrompted = useCallback(async () => {
    await rollover.markEveningPrompted()
    // Release the session claim so other flows aren't blocked after completion
    setEveningRolloverSource(null)
  }, [rollover.markEveningPrompted, setEveningRolloverSource])

  return {
    // Gate shouldShow on timeCheckPassed so nothing leaks through while queries load
    shouldShow: timeCheckPassed && rollover.shouldShow,
    isLoading: rollover.isLoading,
    mitTask: rollover.mitTask,
    otherTasks: rollover.otherTasks,
    markEveningPrompted,
  }
}
