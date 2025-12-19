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
const Notifications = isNotificationsSupported
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('expo-notifications')
  : null

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

    // Register push token for server-side notifications (execution reminders)
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
    const reschedulePlanningReminder = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
          .from('profiles')
          .select('planning_reminder_time')
          .eq('id', user.id)
          .single()

        if (!profile?.planning_reminder_time) return

        // Parse the time and reschedule
        const { hour, minute } = NotificationService.parseTimeString(profile.planning_reminder_time)
        const store = useNotificationStore.getState()

        // Cancel ALL existing reminders first to prevent any duplicates
        // This is more bulletproof than tracking individual IDs
        await NotificationService.cancelAllReminders()

        // Schedule fresh notification with current text
        const newId = await NotificationService.schedulePlanningReminder(hour, minute)
        store.setPlanningReminderId(newId)

        console.log('[Notifications] Rescheduled planning reminder with fresh content')
      } catch (error) {
        console.error('[Notifications] Failed to reschedule planning reminder:', error)
      }
    }

    // Reschedule after auth is ready
    const rescheduleTimeout = setTimeout(reschedulePlanningReminder, 2500)

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
    // Cancel ALL reminders before scheduling new one to prevent duplicates
    // This is more bulletproof than tracking individual IDs which can become stale
    await NotificationService.cancelAllReminders()
    const identifier = await NotificationService.schedulePlanningReminder(hour, minute)
    store.setPlanningReminderId(identifier)
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
    const hasPermissions = await NotificationService.hasPermissions()
    store.setPermissionStatus(hasPermissions ? 'granted' : 'denied')
    return hasPermissions
  }

  return {
    planningReminderId: store.planningReminderId,
    permissionStatus: store.permissionStatus,
    schedulePlanningReminder,
    cancelPlanningReminder,
    requestPermissions,
    checkPermissions,
  }
}
