import { useEffect, useRef } from 'react'
import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'

import { NotificationService } from '~/lib/notifications'
import { useNotificationStore } from '~/stores/notificationStore'

/**
 * Hook to handle notification responses (when user taps a notification)
 * Should be called in the root layout to enable deep linking
 */
export function useNotificationObserver() {
  const notificationListener = useRef<Notifications.EventSubscription | null>(null)
  const responseListener = useRef<Notifications.EventSubscription | null>(null)

  useEffect(() => {
    // Initialize notification system on mount
    NotificationService.initialize()

    // Handle notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[Notifications] Received in foreground:', notification.request.content.title)
    })

    // Handle notification interactions (user taps notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url
      console.log('[Notifications] User tapped notification, URL:', url)

      if (typeof url === 'string') {
        // Small delay to ensure app is ready
        setTimeout(() => {
          router.push(url as `/${string}`)
        }, 100)
      }
    })

    // Check if app was opened from a notification
    Notifications.getLastNotificationResponseAsync().then((response) => {
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
    })

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

  const scheduleEveningReminder = async (hour: number, minute: number) => {
    const identifier = await NotificationService.scheduleEveningReminder(hour, minute)
    store.setEveningReminderId(identifier)
    return identifier
  }

  const cancelEveningReminder = async () => {
    if (store.eveningReminderId) {
      await NotificationService.cancelNotification(store.eveningReminderId)
      store.setEveningReminderId(null)
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
    eveningReminderId: store.eveningReminderId,
    permissionStatus: store.permissionStatus,
    scheduleEveningReminder,
    cancelEveningReminder,
    requestPermissions,
    checkPermissions,
  }
}
