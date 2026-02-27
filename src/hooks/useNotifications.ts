import { useEffect, useRef, useCallback } from 'react'
import { Platform, AppState, type AppStateStatus } from 'react-native'
import { router } from 'expo-router'
import Constants from 'expo-constants'

import { NotificationService } from '~/lib/notifications'
import { useNotificationStore } from '~/stores/notificationStore'
import { supabase } from '~/lib/supabase'

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

    // Get current profile to check if token changed
    const { data: profile } = await supabase
      .from('profiles')
      .select('expo_push_token, push_token_invalid_at')
      .eq('id', user.id)
      .single()

    // Only update if token is different or was previously invalid
    if (profile?.expo_push_token !== token || profile?.push_token_invalid_at !== null) {
      const { error } = await supabase
        .from('profiles')
        .update({
          expo_push_token: token,
          push_token_invalid_at: null, // Clear invalid flag on re-registration
        })
        .eq('id', user.id)

      if (error) {
        throw error
      }

      console.log('[Notifications] Push token registered successfully')
    }

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
  const notificationListener = useRef<{ remove: () => void } | null>(null)
  const responseListener = useRef<{ remove: () => void } | null>(null)
  const appStateRef = useRef<AppStateStatus>(AppState.currentState)
  const hasRegisteredToken = useRef(false)

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

    // Initialize notification system on mount
    NotificationService.initialize()

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
        setTimeout(() => {
          registerPushTokenWithRetry()
        }, 500)
      }
    })

    // Reschedule planning reminder on app launch to ensure notification text is current
    // This also validates and cleans up any orphaned notifications from previous app versions
    const reschedulePlanningReminder = async () => {
      try {
        const store = useNotificationStore.getState()

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
        if (!user) {
          console.log('[Notifications] No user found, skipping reschedule')
          return
        }

        console.log(`[Notifications] User authenticated: ${user.id}`)

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('planning_reminder_time, planning_reminder_enabled')
          .eq('id', user.id)
          .single()

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

        // Always cancel ALL existing reminders first to prevent any duplicates
        // This clears orphaned notifications from previous app versions
        console.log('[Notifications] Cancelling all existing reminders...')
        const cancelSuccess = await NotificationService.cancelAllReminders()

        // Verify cancellation worked
        const afterCancel = await NotificationService.getScheduledNotifications()
        console.log(`[Notifications] After cancel: ${afterCancel.length} notifications remaining`)

        if (!cancelSuccess || afterCancel.length > 0) {
          console.warn('[Notifications] WARNING: Some notifications could not be cancelled!')
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
        console.log(`[Notifications] schedulePlanningReminder returned ID: ${newId || 'EMPTY'}`)
        store.setPlanningReminderId(newId)

        // Verify scheduling worked
        const afterSchedule = await NotificationService.getScheduledNotifications()
        console.log(
          `[Notifications] After schedule: ${afterSchedule.length} notifications scheduled`,
        )

        if (afterSchedule.length === 0) {
          console.error(
            '[Notifications] CRITICAL: No notifications scheduled after schedulePlanningReminder!',
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
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        // Fetch tasks with pending reminders (reminder_at in the future, not completed)
        const { data: tasksWithReminders, error } = await supabase
          .from('tasks')
          .select('id, title, is_mit, reminder_at, notification_id')
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
            notification_id: t.notification_id,
          })),
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
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response: { notification: { request: { content: { data?: { url?: unknown } } } } }) => {
        const url = response.notification.request.content.data?.url
        console.log('[Notifications] User tapped notification, URL:', url)

        if (typeof url === 'string') {
          // Small delay to ensure app is ready
          setTimeout(() => {
            router.push(url as `/${string}`)
          }, 100)
        }
      },
    )

    // Check if app was opened from a notification
    Notifications.getLastNotificationResponseAsync().then(
      (
        response: { notification: { request: { content: { data?: { url?: unknown } } } } } | null,
      ) => {
        if (response?.notification) {
          const url = response.notification.request.content.data?.url
          console.log('[Notifications] App opened from notification, URL:', url)

          if (typeof url === 'string') {
            // Longer delay for cold start
            setTimeout(() => {
              router.push(url as `/${string}`)
            }, 500)
          }
        }
      },
    )

    return () => {
      clearTimeout(tokenTimeout)
      clearTimeout(rescheduleTimeout)
      clearTimeout(taskReminderTimeout)
      appStateSubscription.remove()
      notificationListener.current?.remove()
      responseListener.current?.remove()
    }
  }, [handleTokenRegistration])
}

/**
 * Hook to get notification state and actions
 */
export function useNotifications() {
  const store = useNotificationStore()

  const schedulePlanningReminder = async (hour: number, minute: number) => {
    console.log(`[Notifications] schedulePlanningReminder called for ${hour}:${minute}`)

    // Log existing notifications before cancel
    const before = await NotificationService.getScheduledNotifications()
    console.log(`[Notifications] Before cancel: ${before.length} notifications`)

    // Cancel ALL reminders before scheduling new one to prevent duplicates
    // This is more bulletproof than tracking individual IDs which can become stale
    await NotificationService.cancelAllReminders()

    // Verify cancel worked
    const afterCancel = await NotificationService.getScheduledNotifications()
    console.log(`[Notifications] After cancel: ${afterCancel.length} notifications`)

    const identifier = await NotificationService.schedulePlanningReminder(hour, minute)
    store.setPlanningReminderId(identifier)

    // Verify schedule worked
    const afterSchedule = await NotificationService.getScheduledNotifications()
    console.log(
      `[Notifications] After schedule: ${afterSchedule.length} notifications, ID: ${identifier}`,
    )

    return identifier
  }

  const cancelPlanningReminder = async () => {
    // Cancel all to ensure no orphaned notifications
    await NotificationService.cancelAllReminders()
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
