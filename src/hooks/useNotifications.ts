import { useEffect, useRef, useCallback } from 'react'
import { Platform, AppState, type AppStateStatus } from 'react-native'
import { router } from 'expo-router'
import Constants from 'expo-constants'

import { NotificationService } from '~/lib/notifications'
import { useNotificationStore } from '~/stores/notificationStore'
import { supabase } from '~/lib/supabase'
import { getAllowedNotificationRoute } from '~/lib/navigationSecurity'
import { useAuth } from '~/hooks/useAuth'

// Check if notifications are supported (not in Expo Go on Android SDK 53+)
const isExpoGo = Constants.appOwnership === 'expo'
const isNotificationsSupported = !(isExpoGo && Platform.OS === 'android')

// Conditionally get the notifications module
const Notifications = isNotificationsSupported ? require('expo-notifications') : null

// Retry configuration for push token registration
const MAX_RETRY_ATTEMPTS = 3
const INITIAL_RETRY_DELAY_MS = 1000

/**
 * Register push token with retry logic and exponential backoff
 * @param attempt Current attempt number (1-based)
 * @returns True if registration succeeded, false otherwise
 */
async function registerPushTokenWithRetry(attempt: number = 1): Promise<boolean> {
  try {
    const token = await NotificationService.getExpoPushToken()
    if (!token) {
      console.log(`[Notifications] No push token available (attempt ${attempt})`)
      return false
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      console.log('[Notifications] No authenticated user')
      return false
    }

    // The RPC atomically assigns this opaque device token to the current
    // authenticated profile and removes it from any previous account owner.
    const { error } = await supabase.rpc('set_current_user_expo_push_token', {
      p_token: token,
    })

    if (error) throw error

    console.log('[Notifications] Push token registered successfully')

    return true
  } catch (error) {
    console.error(`[Notifications] Push token registration failed (attempt ${attempt}):`, error)

    // Retry with exponential backoff
    if (attempt < MAX_RETRY_ATTEMPTS) {
      const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1)
      console.log(`[Notifications] Retrying in ${delay}ms...`)
      await new Promise((resolve) => setTimeout(resolve, delay))
      return registerPushTokenWithRetry(attempt + 1)
    }

    console.error('[Notifications] Max retry attempts reached')
    return false
  }
}

/**
 * Hook to handle notification responses (when user taps a notification)
 * Should be called in the root layout to enable deep linking
 */
export function useNotificationObserver() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const notificationListener = useRef<{ remove: () => void } | null>(null)
  const responseListener = useRef<{ remove: () => void } | null>(null)
  const appStateRef = useRef<AppStateStatus>(AppState.currentState)
  const hasRegisteredToken = useRef(false)
  const hasCheckedPermission = useRef(false)
  const handledResponseIds = useRef(new Set<string>())

  // Memoized function to handle push token registration
  const handleTokenRegistration = useCallback(async () => {
    if (hasRegisteredToken.current) return

    const success = await registerPushTokenWithRetry()
    if (success) {
      hasRegisteredToken.current = true
    }
  }, [])

  useEffect(() => {
    // Skip if notifications aren't supported
    if (!Notifications) return

    let cancelled = false
    let foregroundRegistrationTimeout: ReturnType<typeof setTimeout> | null = null
    const navigationTimeouts = new Set<ReturnType<typeof setTimeout>>()
    const store = useNotificationStore.getState()

    hasRegisteredToken.current = false
    hasCheckedPermission.current = false
    store.setHasValidatedIds(false)
    store.setPlanningReminderId(null)
    store.setEveningRolloverSource(null)

    // Local notifications contain account-owned task titles and notes. Remove
    // them before rebuilding notification state for a newly authenticated user.
    const notificationReset = NotificationService.cancelAllReminders()

    const belongsToCurrentUser = async () => {
      if (cancelled) return false
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()
      return !cancelled && currentUser?.id === userId
    }

    if (!userId) {
      void notificationReset
      return
    }

    // Initialize notification system on mount
    void NotificationService.initialize()

    // iOS only registers the app with the system (making it appear in
    // Settings → Notifications) after the first requestPermissionsAsync call.
    // When a user reinstalls the app, iOS resets permission state — but our
    // DB flag `notification_onboarding_completed` persists, causing us to skip
    // the notification-setup screen that would normally re-request permission.
    // Detect the undetermined iOS state and silently re-request so the app is
    // registered with iOS and notifications can resume working.
    const ensurePermissionRequested = async () => {
      if (hasCheckedPermission.current) return
      hasCheckedPermission.current = true
      try {
        const status = await NotificationService.getPermissionStatus()
        if (status === 'undetermined') {
          await NotificationService.requestPermissions()
        }
      } catch (error) {
        console.warn('[Notifications] Failed to ensure permission state:', error)
      }
    }
    ensurePermissionRequested()

    // Register push token for future push notification features
    // Initial registration with a short delay to ensure auth is ready
    const tokenTimeout = setTimeout(handleTokenRegistration, 2000)

    // AppState listener to re-register token when app comes to foreground
    // This handles cases where user re-grants permissions in settings
    const appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
      const wasBackground = appStateRef.current.match(/inactive|background/)
      appStateRef.current = nextAppState

      // App came to foreground
      if (wasBackground && nextAppState === 'active') {
        // Reset flag to allow re-registration attempt
        hasRegisteredToken.current = false
        // Small delay for stability
        foregroundRegistrationTimeout = setTimeout(() => {
          if (!cancelled) void registerPushTokenWithRetry()
        }, 500)
      }
    })

    // Reschedule planning reminder on app launch to ensure notification text is current
    // This also validates and cleans up any orphaned notifications from previous app versions
    const reschedulePlanningReminder = async () => {
      try {
        await notificationReset
        if (cancelled) return

        // Check if we've already validated this session
        if (store.hasValidatedIds) {
          console.log('[Notifications] Already validated notifications this session, skipping')
          return
        }

        console.log('[Notifications] Starting planning reminder reschedule...')

        // Verify actual permission status (user may have revoked in iOS/Android settings)
        const permissionStatus = await NotificationService.getPermissionStatus()
        console.log(`[Notifications] Permission check: ${permissionStatus}`)
        store.setPermissionStatus(permissionStatus)

        const hasPermissions = permissionStatus === 'granted'

        if (!hasPermissions) {
          console.log('[Notifications] Permissions not granted, skipping schedule')
          store.setHasValidatedIds(true)
          return
        }

        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user || user.id !== userId) {
          console.log('[Notifications] No user found, skipping reschedule')
          return
        }

        console.log(`[Notifications] User authenticated: ${user.id}`)

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('planning_reminder_time, planning_reminder_enabled')
          .eq('id', user.id)
          .single()

        if (cancelled) return
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser()
        if (currentUser?.id !== userId) return

        if (profileError) {
          console.error('[Notifications] Error fetching profile:', profileError)
          return
        }

        console.log(
          `[Notifications] Profile planning_reminder_time: ${profile?.planning_reminder_time || 'NOT SET'}`,
        )

        // Log existing scheduled notifications before any action
        const existingNotifications = await NotificationService.getScheduledNotifications()
        console.log(
          `[Notifications] Found ${existingNotifications.length} existing scheduled notifications:`,
          JSON.stringify(
            existingNotifications.map((n: unknown) => {
              const notif = n as {
                identifier: string
                content?: { title?: string; body?: string }
                trigger?: unknown
              }
              return {
                id: notif.identifier,
                title: notif.content?.title,
                body: notif.content?.body?.substring(0, 30),
                trigger: notif.trigger,
              }
            }),
          ),
        )

        // Cancel existing planning reminders only; task reminders are managed separately.
        console.log('[Notifications] Cancelling existing planning reminders...')
        const cancelSuccess = await NotificationService.cancelPlanningReminders()

        // Verify cancellation worked
        const planningAfterCancel =
          await NotificationService.getScheduledNotificationsByType('planning_reminder')
        console.log(
          `[Notifications] After cancel: ${planningAfterCancel.length} planning reminders remaining`,
        )

        if (!cancelSuccess || planningAfterCancel.length > 0) {
          console.warn('[Notifications] WARNING: Some planning reminders could not be cancelled!')
        }

        // Only schedule new notification if user has a reminder time configured and
        // has opted in to planning reminder notifications
        if (!profile?.planning_reminder_time || !profile?.planning_reminder_enabled) {
          console.log(
            '[Notifications] Skipping schedule: time=%s, enabled=%s',
            profile?.planning_reminder_time || 'NOT SET',
            profile?.planning_reminder_enabled ? 'true' : 'false',
          )
          store.setHasValidatedIds(true)
          return
        }

        // Parse the time and reschedule
        const { hour, minute } = NotificationService.parseTimeString(profile.planning_reminder_time)

        // Schedule fresh notification with current text
        console.log(`[Notifications] Scheduling new reminder for ${hour}:${minute}`)
        const newId = await NotificationService.schedulePlanningReminder(hour, minute)
        if (!(await belongsToCurrentUser())) {
          if (newId) await NotificationService.cancelNotification(newId)
          return
        }
        console.log(`[Notifications] schedulePlanningReminder returned ID: ${newId || 'EMPTY'}`)
        store.setPlanningReminderId(newId)

        // Verify scheduling worked
        const afterSchedule =
          await NotificationService.getScheduledNotificationsByType('planning_reminder')
        console.log(
          `[Notifications] After schedule: ${afterSchedule.length} planning reminders scheduled`,
        )

        if (afterSchedule.length === 0) {
          console.error(
            '[Notifications] CRITICAL: No planning reminders scheduled after schedulePlanningReminder!',
          )
        } else {
          // Log details of the scheduled notification
          const scheduled = afterSchedule[0] as {
            identifier: string
            content?: { title?: string; body?: string }
            trigger?: { hour?: number; minute?: number }
          }
          console.log(
            `[Notifications] Scheduled notification details:`,
            JSON.stringify({
              id: scheduled.identifier,
              title: scheduled.content?.title,
              body: scheduled.content?.body,
              triggerHour: scheduled.trigger?.hour,
              triggerMinute: scheduled.trigger?.minute,
            }),
          )
        }

        // Mark as validated for this session
        store.setHasValidatedIds(true)
        console.log('[Notifications] Rescheduled planning reminder with fresh content')
      } catch (error) {
        console.error('[Notifications] Failed to reschedule planning reminder:', error)
      }
    }

    // Reschedule pending task reminders on app launch
    // This ensures notifications survive app reinstalls or device restarts
    const rescheduleTaskReminders = async () => {
      try {
        await notificationReset
        if (cancelled) return

        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user || user.id !== userId) return

        // Fetch tasks with pending reminders (reminder_at in the future, not completed)
        const { data: tasksWithReminders, error } = await supabase
          .from('tasks')
          .select('id, title, is_mit, reminder_at, notes, notification_id')
          .eq('user_id', user.id)
          .gt('reminder_at', new Date().toISOString())
          .is('completed_at', null)

        if (error) {
          console.error('[Notifications] Failed to fetch tasks with reminders:', error)
          return
        }

        if (!tasksWithReminders || tasksWithReminders.length === 0) {
          console.log('[Notifications] No pending task reminders to reschedule')
          return
        }

        if (cancelled) return
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser()
        if (currentUser?.id !== userId) return

        console.log(
          `[Notifications] Rescheduling ${tasksWithReminders.length} pending task reminders`,
        )

        // Reschedule all task reminders
        const results = await NotificationService.rescheduleTaskReminders(
          tasksWithReminders.map((t) => ({
            id: t.id,
            title: t.title,
            is_mit: t.is_mit,
            reminder_at: t.reminder_at!,
            notes: t.notes,
            notification_id: t.notification_id,
          })),
          belongsToCurrentUser,
        )

        // Update notification IDs in database
        for (const [taskId, notificationId] of results) {
          await supabase.from('tasks').update({ notification_id: notificationId }).eq('id', taskId)
        }

        console.log(`[Notifications] Successfully rescheduled ${results.size} task reminders`)
      } catch (error) {
        console.error('[Notifications] Failed to reschedule task reminders:', error)
      }
    }

    // Reschedule after auth is ready
    const rescheduleTimeout = setTimeout(reschedulePlanningReminder, 2500)

    // Reschedule task reminders slightly after planning reminder
    const taskReminderTimeout = setTimeout(rescheduleTaskReminders, 3000)

    // Handle notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification: { request: { content: { title: string } } }) => {
        console.log('[Notifications] Received in foreground:', notification.request.content.title)
      },
    )

    // Handle notification interactions (user taps notification)
    type NotificationResponse = {
      notification: { request: { identifier: string; content: { data?: { url?: unknown } } } }
    }

    const handleNotificationResponse = (response: NotificationResponse, delayMs: number) => {
      const request = response.notification.request
      if (handledResponseIds.current.has(request.identifier)) return

      const route = getAllowedNotificationRoute(request.content.data?.url)
      if (!route) {
        console.warn('[Notifications] Rejected unapproved notification destination')
        void Notifications.clearLastNotificationResponseAsync().catch((error: unknown) => {
          console.warn('[Notifications] Failed to clear rejected notification response:', error)
        })
        return
      }

      handledResponseIds.current.add(request.identifier)
      void Notifications.clearLastNotificationResponseAsync().catch((error: unknown) => {
        console.warn('[Notifications] Failed to clear handled notification response:', error)
      })
      const timeout = setTimeout(() => {
        navigationTimeouts.delete(timeout)
        if (!cancelled) router.push(route)
      }, delayMs)
      navigationTimeouts.add(timeout)
    }

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response: NotificationResponse) => handleNotificationResponse(response, 100),
    )

    // Check if app was opened from a notification
    Notifications.getLastNotificationResponseAsync().then(
      (response: NotificationResponse | null) => {
        if (response) handleNotificationResponse(response, 500)
      },
    )

    return () => {
      cancelled = true
      clearTimeout(tokenTimeout)
      clearTimeout(rescheduleTimeout)
      clearTimeout(taskReminderTimeout)
      if (foregroundRegistrationTimeout) clearTimeout(foregroundRegistrationTimeout)
      navigationTimeouts.forEach((timeout) => clearTimeout(timeout))
      appStateSubscription.remove()
      notificationListener.current?.remove()
      responseListener.current?.remove()
    }
  }, [handleTokenRegistration, userId])
}

/**
 * Hook to get notification state and actions
 */
export function useNotifications() {
  const store = useNotificationStore()

  const schedulePlanningReminder = async (hour: number, minute: number) => {
    console.log(`[Notifications] schedulePlanningReminder called for ${hour}:${minute}`)

    // Log existing notifications before cancel
    const before = await NotificationService.getScheduledNotificationsByType('planning_reminder')
    console.log(`[Notifications] Before cancel: ${before.length} planning reminders`)

    // Cancel planning reminders before scheduling new one to prevent duplicates.
    const cancelOk = await NotificationService.cancelPlanningReminders()
    if (!cancelOk) {
      console.warn(
        '[Notifications] cancelPlanningReminders returned false — orphaned planning reminders may remain',
      )
    }

    // Verify cancel worked
    const afterCancel =
      await NotificationService.getScheduledNotificationsByType('planning_reminder')
    console.log(`[Notifications] After cancel: ${afterCancel.length} planning reminders`)

    try {
      const identifier = await NotificationService.schedulePlanningReminder(hour, minute)
      store.setPlanningReminderId(identifier)

      // Verify schedule worked
      const afterSchedule =
        await NotificationService.getScheduledNotificationsByType('planning_reminder')
      console.log(
        `[Notifications] After schedule: ${afterSchedule.length} planning reminders, ID: ${identifier}`,
      )

      return identifier
    } catch (error) {
      // Clear store ID since we know no notification is scheduled
      store.setPlanningReminderId(null)
      console.error('[Notifications] Failed to schedule planning reminder:', error)
      throw error
    }
  }

  const cancelPlanningReminder = async () => {
    // Cancel planning reminders only; disabling the daily planning reminder should
    // not remove per-task reminders.
    const success = await NotificationService.cancelPlanningReminders()
    if (!success) {
      console.warn(
        '[Notifications] cancelPlanningReminders returned false — some planning reminders may remain',
      )
    }
    store.setPlanningReminderId(null)
  }

  // Note: Execution reminders are now handled server-side via Edge Function
  // No local scheduling methods needed

  const requestPermissions = async () => {
    const granted = await NotificationService.requestPermissions()
    store.setPermissionStatus(granted ? 'granted' : 'denied')

    // If permissions granted, trigger token registration
    if (granted) {
      // Register token with retry
      registerPushTokenWithRetry()
    }

    return granted
  }

  const checkPermissions = async () => {
    const status = await NotificationService.getPermissionStatus()
    store.setPermissionStatus(status)
    return status === 'granted'
  }

  /**
   * Get detailed permission status (granted, denied, undetermined)
   */
  const getPermissionStatus = async () => {
    const status = await NotificationService.getPermissionStatus()
    store.setPermissionStatus(status)
    return status
  }

  /**
   * Open device settings so user can enable notifications
   */
  const openSettings = async () => {
    await NotificationService.openSettings()
  }

  return {
    planningReminderId: store.planningReminderId,
    permissionStatus: store.permissionStatus,
    schedulePlanningReminder,
    cancelPlanningReminder,
    requestPermissions,
    checkPermissions,
    getPermissionStatus,
    openSettings,
  }
}
