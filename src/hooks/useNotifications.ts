import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'
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

/**
 * Hook to handle notification responses (when user taps a notification)
 * Should be called in the root layout to enable deep linking
 */
export function useNotificationObserver() {
  const notificationListener = useRef<{ remove: () => void } | null>(null)
  const responseListener = useRef<{ remove: () => void } | null>(null)

  useEffect(() => {
    // Skip if notifications aren't supported
    if (!Notifications) return

    // Initialize notification system on mount
    NotificationService.initialize()

    // Register push token for server-side notifications (execution reminders)
    const registerPushToken = async () => {
      try {
        const token = await NotificationService.getExpoPushToken()
        if (token) {
          const {
            data: { user },
          } = await supabase.auth.getUser()
          if (user) {
            // Only update if token is different to avoid unnecessary writes
            const { data: profile } = await supabase
              .from('profiles')
              .select('expo_push_token')
              .eq('id', user.id)
              .single()

            if (profile?.expo_push_token !== token) {
              await supabase.from('profiles').update({ expo_push_token: token }).eq('id', user.id)
              console.log('[Notifications] Push token registered')
            }
          }
        }
      } catch (error) {
        console.error('[Notifications] Failed to register push token:', error)
      }
    }

    // Register token after a short delay to ensure auth is ready
    const tokenTimeout = setTimeout(registerPushToken, 2000)

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

        // Cancel existing if present
        if (store.planningReminderId) {
          await NotificationService.cancelNotification(store.planningReminderId)
        }

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
      notificationListener.current?.remove()
      responseListener.current?.remove()
    }
  }, [])
}

/**
 * Hook to get notification state and actions
 */
export function useNotifications() {
  const store = useNotificationStore()

  const schedulePlanningReminder = async (hour: number, minute: number) => {
    // Always cancel existing reminder before scheduling new one to prevent duplicates
    if (store.planningReminderId) {
      await NotificationService.cancelNotification(store.planningReminderId)
    }
    const identifier = await NotificationService.schedulePlanningReminder(hour, minute)
    store.setPlanningReminderId(identifier)
    return identifier
  }

  const cancelPlanningReminder = async () => {
    if (store.planningReminderId) {
      await NotificationService.cancelNotification(store.planningReminderId)
      store.setPlanningReminderId(null)
    }
  }

  // Note: Execution reminders are now handled server-side via Edge Function
  // No local scheduling methods needed

  const requestPermissions = async () => {
    const granted = await NotificationService.requestPermissions()
    store.setPermissionStatus(granted ? 'granted' : 'denied')
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
