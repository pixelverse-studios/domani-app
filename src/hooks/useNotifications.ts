import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import { router } from 'expo-router'
import Constants from 'expo-constants'

import { NotificationService } from '~/lib/notifications'
import { useNotificationStore } from '~/stores/notificationStore'

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

  const scheduleExecutionReminder = async (hour: number, minute: number) => {
    // Always cancel existing reminder before scheduling new one to prevent duplicates
    if (store.executionReminderId) {
      await NotificationService.cancelNotification(store.executionReminderId)
    }
    const identifier = await NotificationService.scheduleExecutionReminder(hour, minute)
    store.setExecutionReminderId(identifier)
    return identifier
  }

  const cancelExecutionReminder = async () => {
    if (store.executionReminderId) {
      await NotificationService.cancelNotification(store.executionReminderId)
      store.setExecutionReminderId(null)
    }
  }

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
    executionReminderId: store.executionReminderId,
    permissionStatus: store.permissionStatus,
    schedulePlanningReminder,
    cancelPlanningReminder,
    scheduleExecutionReminder,
    cancelExecutionReminder,
    requestPermissions,
    checkPermissions,
  }
}
