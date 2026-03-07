/**
 * useEveningRolloverOnAppOpen Hook
 *
 * Triggers the evening rollover modal when the app is opened (or returns to
 * foreground) — without requiring the user to tap the planning reminder
 * notification.
 *
 * Uses a cycle-aware prompt check: a cycle starts at the user's
 * planning_reminder_time and runs for 24 hours (e.g., 7 PM through 6:59 PM
 * the next day). The rollover can trigger at any point within that window,
 * including the next morning if the user missed the evening prompt.
 *
 * Checks (in order, short-circuits on failure):
 *   1. eveningRolloverSource !== 'notification'  — notification-tap hasn't claimed the session
 *   2. user has a planning_reminder_time set
 *   3. wasPromptedInCurrentCycle() === false      — user hasn't been prompted in this cycle
 *
 * Once all conditions pass, sets eveningRolloverSource to 'app_open', enables
 * useEveningRolloverTasks, and returns the same surface as the notification-tap path.
 * The returned markEveningPrompted resets eveningRolloverSource to null after marking,
 * unconditionally (matching the handleEveningStartFresh pattern in planning.tsx).
 *
 * Exposes `isBeforeReminderTime` so the consumer can adjust copy/behaviour
 * when the rollover fires in the morning vs. evening.
 *
 * Performance note: planning_reminder_time is cached in a ref after the first
 * successful fetch. Subsequent foreground checks reuse the cached value rather than
 * issuing a new DB round trip.
 *
 * isLoading note: isLoading reflects the useEveningRolloverTasks query state and is
 * false during the async time-check phase (before timeCheckPassed is set). The consumer
 * should not rely on isLoading to detect whether the initial check is still running.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { AppState, type AppStateStatus } from 'react-native'

import { supabase } from '~/lib/supabase'
import { wasPromptedInCurrentCycle, isPastReminderTime } from '~/lib/rollover'
import { useNotificationStore } from '~/stores/notificationStore'
import {
  useEveningRolloverTasks,
  type UseEveningRolloverTasksResult,
} from './useEveningRolloverTasks'

export type UseEveningRolloverOnAppOpenResult = Omit<
  UseEveningRolloverTasksResult,
  'eligibleTasks'
> & {
  /** True when current time is before the planning reminder time (morning mode) */
  isBeforeReminderTime: boolean
  /** True when time checks passed but there are no tasks to roll over (evening only) */
  shouldPromptPlanning: boolean
}

export function useEveningRolloverOnAppOpen(): UseEveningRolloverOnAppOpenResult {
  const [timeCheckPassed, setTimeCheckPassed] = useState(false)
  const [isBeforeReminderTime, setIsBeforeReminderTime] = useState(false)
  // Ref copy prevents timeCheckPassed from being a dep of runCheck,
  // which would otherwise cause the AppState listener to re-register on every activation
  const timeCheckPassedRef = useRef(false)
  const isCheckingRef = useRef(false)
  const appStateRef = useRef<AppStateStatus>(AppState.currentState)
  // Cache reminder time after first fetch — avoids a DB round trip on every foreground
  // transition. undefined = not yet fetched, null = fetched but user has no reminder set
  const reminderTimeRef = useRef<string | null | undefined>(undefined)

  const setEveningRolloverSource = useNotificationStore((s) => s.setEveningRolloverSource)
  const devRecheckCounter = useNotificationStore((s) => s.devRolloverRecheckCounter)

  // Dev-only: reset all internal state so runCheck can fire again
  useEffect(() => {
    if (devRecheckCounter === 0) return
    timeCheckPassedRef.current = false
    isCheckingRef.current = false
    reminderTimeRef.current = undefined
    setTimeCheckPassed(false)
    setIsBeforeReminderTime(false)
    setEveningRolloverSource(null)
    // runCheck will be called by the next effect cycle since timeCheckPassed changed
    runCheck()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devRecheckCounter])

  const runCheck = useCallback(async () => {
    // Prevent concurrent checks and re-running once already activated
    if (isCheckingRef.current || timeCheckPassedRef.current) return
    isCheckingRef.current = true

    // Dev bypass: skip all preconditions, immediately activate
    const { devForceBypass: shouldBypass } = useNotificationStore.getState()

    try {
      if (shouldBypass) {
        if (__DEV__)
          console.log('[useEveningRolloverOnAppOpen] Dev force bypass — skipping all checks')
        // Note: devForceBypass is cleared in useEveningRolloverTasks queryFn after it reads it,
        // so the query can also bypass morning/evening mode detection
      }

      if (!shouldBypass) {
        // 1. Notification-tap flow hasn't claimed the session
        // Read store state directly (not via hook selector) to avoid adding it as a dep
        const { eveningRolloverSource } = useNotificationStore.getState()
        if (eveningRolloverSource === 'notification') {
          if (__DEV__)
            console.log('[useEveningRolloverOnAppOpen] Notification tap owns session, skipping')
          return
        }
      }

      // 2. Get auth user (always needed — can't skip)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      if (!shouldBypass) {
        // 3. User has a planning_reminder_time set
        // Fetch reminder time once and cache in a ref — changes infrequently
        if (reminderTimeRef.current === undefined) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('planning_reminder_time')
            .eq('id', user.id)
            .maybeSingle()
          if (profileError) {
            if (__DEV__)
              console.error('[useEveningRolloverOnAppOpen] Profile query failed:', profileError)
            return
          }
          reminderTimeRef.current = profile?.planning_reminder_time ?? null
        }

        const reminderTime = reminderTimeRef.current
        if (!reminderTime) {
          if (__DEV__)
            console.log('[useEveningRolloverOnAppOpen] No planning_reminder_time set, skipping')
          return
        }

        // 4. User hasn't been prompted in the current cycle
        // wasPromptedInCurrentCycle intentionally propagates AsyncStorage errors
        // — catch here and fail-closed (skip rollover on error)
        let alreadyPrompted: boolean
        try {
          alreadyPrompted = await wasPromptedInCurrentCycle(reminderTime)
        } catch {
          if (__DEV__)
            console.error(
              '[useEveningRolloverOnAppOpen] AsyncStorage error checking prompt status, skipping',
            )
          return
        }
        if (alreadyPrompted) {
          if (__DEV__)
            console.log('[useEveningRolloverOnAppOpen] Already prompted in current cycle, skipping')
          return
        }
      }

      // All conditions passed (or bypassed) — determine mode, claim the session
      // For bypass: fetch reminder time if not cached, default to evening mode
      let beforeReminder = false
      if (reminderTimeRef.current === undefined && !shouldBypass) {
        // Already handled above in non-bypass path
      } else if (reminderTimeRef.current) {
        beforeReminder = !isPastReminderTime(reminderTimeRef.current)
      }

      if (__DEV__)
        console.log(
          '[useEveningRolloverOnAppOpen] Check passed, activating',
          beforeReminder ? '(morning mode)' : '(evening mode)',
          shouldBypass ? '[DEV BYPASS]' : '',
        )
      setIsBeforeReminderTime(beforeReminder)
      setEveningRolloverSource('app_open')
      timeCheckPassedRef.current = true
      setTimeCheckPassed(true)
    } catch (error) {
      if (__DEV__)
        console.error('[useEveningRolloverOnAppOpen] Unexpected error in runCheck:', error)
      // Best-effort background check — swallow error, will retry on next foreground
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
    try {
      await rollover.markEveningPrompted()
    } catch (error) {
      if (__DEV__)
        console.error('[useEveningRolloverOnAppOpen] Failed to mark evening prompted:', error)
      // Non-fatal — proceed so user isn't stuck, matching handleEveningStartFresh pattern
    } finally {
      // Reset unconditionally so the app_open claim is always released
      setEveningRolloverSource(null)
    }
  }, [rollover.markEveningPrompted, setEveningRolloverSource])

  // Time checks passed, queries finished, no tasks to roll over, and it's evening
  const shouldPromptPlanning =
    timeCheckPassed &&
    !rollover.isLoading &&
    !rollover.shouldShow &&
    rollover.eligibleTasks.length === 0 &&
    !isBeforeReminderTime

  return {
    // Gate shouldShow on timeCheckPassed so nothing leaks through while queries load
    shouldShow: timeCheckPassed && rollover.shouldShow,
    isLoading: rollover.isLoading,
    mitTask: rollover.mitTask,
    otherTasks: rollover.otherTasks,
    markEveningPrompted,
    isBeforeReminderTime,
    shouldPromptPlanning,
  }
}
