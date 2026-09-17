import { Platform, Linking } from 'react-native'
import { parseISO } from 'date-fns'
import Constants from 'expo-constants'

import { getTheme } from '~/theme/themes'
import { supabase } from './supabase'
import { captureException, addBreadcrumb } from './sentry'
import { runAccountOwnedOperation } from './accountLifecycleCoordinator'

// Check if notifications are supported (not in Expo Go on Android SDK 53+)
const isExpoGo = Constants.appOwnership === 'expo'
const isNotificationsSupported = !(isExpoGo && Platform.OS === 'android')

// Conditionally import and configure notifications
let Notifications: typeof import('expo-notifications') | null = null

if (isNotificationsSupported) {
  Notifications = require('expo-notifications')

  // Configure how notifications appear when app is foregrounded
  if (Notifications) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    })
  }
}

const PLANNING_CHANNEL_ID = 'planning-reminders'
const TASK_CHANNEL_ID = 'task-reminders'
type NotificationType = 'planning_reminder' | 'task_reminder'

const getNotificationType = (notification: unknown): NotificationType | null => {
  const data = (notification as { content?: { data?: { type?: unknown } } })?.content?.data
  return data?.type === 'planning_reminder' || data?.type === 'task_reminder' ? data.type : null
}

export const NotificationService = {
  /**
   * Check if notifications are supported on this platform/environment
   */
  isSupported(): boolean {
    return isNotificationsSupported
  },

  /**
   * Initialize notification system - call once on app startup
   * Creates Android notification channel
   */
  async initialize(): Promise<void> {
    if (!Notifications) return

    if (Platform.OS === 'android') {
      addBreadcrumb('Initializing Android notification channels', 'notifications', {
        planningChannelId: PLANNING_CHANNEL_ID,
        taskChannelId: TASK_CHANNEL_ID,
      })

      await Notifications.setNotificationChannelAsync(PLANNING_CHANNEL_ID, {
        name: 'Planning Reminders',
        description: 'Daily reminders to plan tomorrow',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: getTheme().colors.brand.primary,
      })

      await Notifications.setNotificationChannelAsync(TASK_CHANNEL_ID, {
        name: 'Task Reminders',
        description: 'Reminders for individual tasks',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: getTheme().colors.brand.primary,
      })

      addBreadcrumb('Android notification channels initialized', 'notifications', {
        planningChannelId: PLANNING_CHANNEL_ID,
        taskChannelId: TASK_CHANNEL_ID,
      })
    }
  },

  /**
   * Check if notification permissions are currently granted
   */
  async hasPermissions(): Promise<boolean> {
    if (!Notifications) return false

    const settings = await Notifications.getPermissionsAsync()
    return (
      settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    )
  },

  /**
   * Get detailed permission status for verification and display
   * Returns 'granted', 'denied', or 'undetermined'
   */
  async getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
    if (!Notifications) return 'denied'

    const settings = await Notifications.getPermissionsAsync()

    if (settings.granted) {
      return 'granted'
    }

    // Check iOS-specific statuses
    if (Platform.OS === 'ios' && settings.ios) {
      const iosStatus = settings.ios.status
      if (iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL) {
        return 'granted'
      }
      if (iosStatus === Notifications.IosAuthorizationStatus.DENIED) {
        return 'denied'
      }
      if (iosStatus === Notifications.IosAuthorizationStatus.NOT_DETERMINED) {
        return 'undetermined'
      }
    }

    // For Android or fallback
    if (settings.canAskAgain) {
      return 'undetermined'
    }

    return 'denied'
  },

  /**
   * Open device settings so user can enable notifications
   * On iOS, opens the app-specific notification settings
   * On Android, opens the app settings page
   */
  async openSettings(): Promise<void> {
    if (Platform.OS === 'ios') {
      await Linking.openSettings()
    } else {
      // On Android, openSettings opens the app info page where notifications can be enabled
      await Linking.openSettings()
    }
  },

  /**
   * Request notification permissions from the user
   * Returns true if granted, false if denied
   */
  async requestPermissions(): Promise<boolean> {
    if (!Notifications) return false

    const { status: existingStatus } = await Notifications.getPermissionsAsync()

    if (existingStatus === 'granted') {
      return true
    }

    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    })

    return status === 'granted'
  },

  /**
   * Schedule the planning reminder
   * @param hour - Hour in 24-hour format (0-23)
   * @param minute - Minute (0-59)
   * @returns Notification identifier for cancellation
   */
  async schedulePlanningReminder(
    hour: number,
    minute: number,
    ownerUserId: string,
    coordinate: boolean = true,
  ): Promise<string> {
    if (!Notifications) return ''

    const schedule = async () => {
      try {
        await this.initialize()
        const identifier = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Plan Tomorrow',
            body: 'A few minutes now sets you up for success tomorrow.',
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
            data: {
              url: '/(tabs)/planning?defaultPlanningFor=tomorrow&openForm=true&trigger=planning_reminder',
              type: 'planning_reminder',
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
            channelId: Platform.OS === 'android' ? PLANNING_CHANNEL_ID : undefined,
          },
        })

        addBreadcrumb('Planning reminder scheduled', 'notifications', { hour, minute, identifier })
        return identifier
      } catch (error) {
        console.error('[Notifications] Failed to schedule planning reminder:', error)
        captureException(error instanceof Error ? error : new Error(String(error)), {
          method: 'schedulePlanningReminder',
          hour,
          minute,
        })
        return ''
      }
    }

    return coordinate ? runAccountOwnedOperation(ownerUserId, '', schedule) : schedule()
  },

  /**
   * Cancel a specific scheduled notification
   */
  async cancelNotification(identifier: string): Promise<void> {
    if (!Notifications) return
    await Notifications.cancelScheduledNotificationAsync(identifier)
  },

  /**
   * Cancel scheduled notifications by Domani notification type.
   * This avoids planning reminder maintenance deleting task reminders.
   */
  async cancelRemindersByType(type: NotificationType): Promise<boolean> {
    if (!Notifications) return true

    const matchingNotifications = await this.getScheduledNotificationsByType(type)

    for (const notification of matchingNotifications) {
      const identifier = (notification as { identifier: string }).identifier
      try {
        await Notifications.cancelScheduledNotificationAsync(identifier)
      } catch (error) {
        console.error(`[Notifications] Failed to cancel ${type} notification:`, error)
        captureException(error instanceof Error ? error : new Error(String(error)), {
          method: 'cancelRemindersByType',
          type,
          notificationId: identifier,
        })
      }
    }

    const remainingCount = (await this.getScheduledNotificationsByType(type)).length

    addBreadcrumb('Notifications cancelled by type', 'notifications', {
      type,
      attempted: matchingNotifications.length,
      remaining: remainingCount,
    })

    return remainingCount === 0
  },

  async cancelPlanningReminders(ownerUserId: string, coordinate: boolean = true): Promise<boolean> {
    const cancel = () => this.cancelRemindersByType('planning_reminder')
    return coordinate ? runAccountOwnedOperation(ownerUserId, false, cancel) : cancel()
  },

  /**
   * Cancel all scheduled notifications with verification and retry
   * @returns true if all notifications were cancelled, false if some remain
   */
  async cancelAllReminders(): Promise<boolean> {
    if (!Notifications) return true

    const MAX_RETRIES = 3

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      // Cancel all scheduled notifications
      await Notifications.cancelAllScheduledNotificationsAsync()

      // Verify cancellation worked
      const remaining = await Notifications.getAllScheduledNotificationsAsync()

      if (remaining.length === 0) {
        if (attempt > 1) {
          console.log(`[Notifications] cancelAllReminders succeeded on attempt ${attempt}`)
        }
        return true
      }

      console.warn(
        `[Notifications] cancelAllReminders attempt ${attempt}: ${remaining.length} notifications still exist`,
      )

      // If notifications remain, try cancelling each individually
      for (const notification of remaining) {
        try {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier)
        } catch (error) {
          console.error(
            `[Notifications] Failed to cancel notification ${notification.identifier}:`,
            error,
          )
        }
      }

      // Small delay before retry
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    // Final check
    const finalRemaining = await Notifications.getAllScheduledNotificationsAsync()
    if (finalRemaining.length > 0) {
      console.error(
        `[Notifications] CRITICAL: ${finalRemaining.length} notifications could not be cancelled after ${MAX_RETRIES} attempts`,
      )
      captureException(
        new Error(
          `Failed to cancel ${finalRemaining.length} notifications after ${MAX_RETRIES} attempts`,
        ),
        { method: 'cancelAllReminders', remainingCount: finalRemaining.length },
      )
      return false
    }

    return true
  },

  /**
   * Get all currently scheduled notifications (for debugging)
   */
  async getScheduledNotifications(): Promise<unknown[]> {
    if (!Notifications) return []
    return await Notifications.getAllScheduledNotificationsAsync()
  },

  async restoreScheduledNotifications(scheduledNotifications: unknown[]): Promise<boolean> {
    if (!Notifications) return true

    try {
      await Notifications.cancelAllScheduledNotificationsAsync()
      for (const notification of scheduledNotifications) {
        const request = notification as {
          content: import('expo-notifications').NotificationContent
          trigger: import('expo-notifications').NotificationTrigger
        }
        const trigger = request.trigger as unknown as {
          type?: string
          timestamp?: number
          dateComponents?: Record<string, unknown> & { timeZone?: string }
        }
        let restorableTrigger: import('expo-notifications').NotificationTriggerInput
        if (trigger.type === 'calendar' && trigger.dateComponents) {
          const {
            timeZone,
            isLeapMonth: _isLeapMonth,
            calendar: _calendar,
            ...dateComponents
          } = trigger.dateComponents
          restorableTrigger = {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            repeats: Boolean((request.trigger as { repeats?: boolean }).repeats),
            ...(timeZone ? { timezone: timeZone } : {}),
            ...dateComponents,
          } as import('expo-notifications').CalendarTriggerInput
        } else if (trigger.type === 'date' && typeof trigger.timestamp === 'number') {
          restorableTrigger = {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: trigger.timestamp * 1000,
          }
        } else {
          restorableTrigger =
            request.trigger as import('expo-notifications').NotificationTriggerInput
        }
        const identifier = await Notifications.scheduleNotificationAsync({
          content:
            request.content as unknown as import('expo-notifications').NotificationContentInput,
          trigger: restorableTrigger,
        })
        const taskId = request.content.data?.taskId
        if (typeof taskId === 'string') {
          const { error } = await supabase
            .from('tasks')
            .update({ notification_id: identifier })
            .eq('id', taskId)
          if (error) {
            console.warn('[Notifications] Restored task reminder but could not refresh its ID')
          }
        }
      }
      return true
    } catch (error) {
      console.error('[Notifications] Failed to restore scheduled reminders:', error)
      captureException(error instanceof Error ? error : new Error(String(error)), {
        method: 'restoreScheduledNotifications',
        reminderCount: scheduledNotifications.length,
      })
      return false
    }
  },

  async getScheduledNotificationsByType(type: NotificationType): Promise<unknown[]> {
    if (!Notifications) return []
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync()
    return scheduledNotifications.filter(
      (notification: unknown) => getNotificationType(notification) === type,
    )
  },

  /**
   * Get the next trigger date for a specific time (for debugging/display)
   */
  async getNextTriggerDate(hour: number, minute: number): Promise<Date | null> {
    if (!Notifications) return null

    const trigger = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    } as const
    const date = await Notifications.getNextTriggerDateAsync(trigger)
    return date ? new Date(date) : null
  },

  /**
   * Parse time string (HH:mm:ss) to hour and minute
   */
  parseTimeString(timeString: string): { hour: number; minute: number } {
    const [hours, minutes] = timeString.split(':')
    return {
      hour: parseInt(hours, 10),
      minute: parseInt(minutes, 10),
    }
  },

  /**
   * Get Expo Push Token for push notifications
   * This token is used by the backend Edge Function to send push notifications
   * @returns Push token string or null if unavailable
   */
  async getExpoPushToken(): Promise<string | null> {
    if (!Notifications) return null

    try {
      // Get the project ID from expo config
      const projectId = Constants.expoConfig?.extra?.eas?.projectId

      if (!projectId) {
        console.warn('[Notifications] No EAS project ID found - push notifications unavailable')
        return null
      }

      // Check if we have permission first
      const hasPermission = await this.hasPermissions()
      if (!hasPermission) {
        console.warn('[Notifications] No permission for push notifications')
        return null
      }

      const token = await Notifications.getExpoPushTokenAsync({ projectId })
      return token.data
    } catch (error) {
      console.error('[Notifications] Failed to get push token:', error)
      captureException(error instanceof Error ? error : new Error(String(error)), {
        method: 'getExpoPushToken',
      })
      return null
    }
  },

  /**
   * Schedule a reminder notification for a specific task
   * @param task - Task object with id, title, is_mit, and reminder_at
   * @returns Notification identifier for cancellation, or null if scheduling failed
   */
  async scheduleTaskReminder(
    task: {
      id: string
      title: string
      is_mit: boolean
      reminder_at: string
      notes?: string | null
    },
    ownerUserId: string,
    coordinate: boolean = true,
  ): Promise<string | null> {
    if (!Notifications) return null

    const schedule = async () => {
      try {
        await this.initialize()

        // Use parseISO to correctly handle Postgres timestamp format
        // Postgres returns "2026-01-23 14:06:23.592+00" which iOS JavaScriptCore
        // may misinterpret as local time. parseISO handles this correctly.
        const reminderDate = parseISO(task.reminder_at)

        // Don't schedule if reminder is in the past
        if (reminderDate <= new Date()) {
          console.log(`[Notifications] Skipping past reminder for task ${task.id}`)
          addBreadcrumb('Task reminder skipped because reminder is in the past', 'notifications', {
            taskId: task.id,
            reminderAt: task.reminder_at,
          })
          return null
        }

        const permissionStatus = await this.getPermissionStatus()
        addBreadcrumb('Task reminder permission checked', 'notifications', {
          taskId: task.id,
          permissionStatus,
        })

        let canSchedule = permissionStatus === 'granted'
        if (!canSchedule && permissionStatus === 'undetermined') {
          canSchedule = await this.requestPermissions()
          addBreadcrumb('Task reminder permission requested', 'notifications', {
            taskId: task.id,
            granted: canSchedule,
          })
        }

        if (!canSchedule) {
          console.warn(
            `[Notifications] Cannot schedule task reminder without permission: ${permissionStatus}`,
          )
          addBreadcrumb(
            'Task reminder not scheduled because permission is unavailable',
            'notifications',
            {
              taskId: task.id,
              permissionStatus,
            },
          )
          return null
        }

        addBreadcrumb('Task reminder schedule attempted', 'notifications', {
          taskId: task.id,
          reminderAt: task.reminder_at,
          channelId: Platform.OS === 'android' ? TASK_CHANNEL_ID : undefined,
        })

        const identifier = await Notifications.scheduleNotificationAsync({
          content: {
            title: task.title,
            body: task.notes || '',
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
            data: {
              taskId: task.id,
              url: '/(tabs)',
              type: 'task_reminder',
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: reminderDate,
            channelId: Platform.OS === 'android' ? TASK_CHANNEL_ID : undefined,
          },
        })

        console.log(`[Notifications] Scheduled reminder for task ${task.id} at ${reminderDate}`)
        addBreadcrumb('Task reminder scheduled', 'notifications', {
          taskId: task.id,
          reminderAt: task.reminder_at,
          identifier,
        })
        return identifier
      } catch (error) {
        console.error(`[Notifications] Failed to schedule task reminder:`, error)
        captureException(error instanceof Error ? error : new Error(String(error)), {
          method: 'scheduleTaskReminder',
          taskId: task.id,
          reminderAt: task.reminder_at,
          isMit: task.is_mit,
        })
        return null
      }
    }

    return coordinate ? runAccountOwnedOperation(ownerUserId, null, schedule) : schedule()
  },

  /**
   * Cancel a task's scheduled reminder notification
   * @param notificationId - The notification identifier to cancel
   */
  async cancelTaskReminder(
    notificationId: string | null,
    ownerUserId: string,
    coordinate: boolean = true,
  ): Promise<void> {
    if (!Notifications || !notificationId) return

    const cancel = async () => {
      try {
        await Notifications.cancelScheduledNotificationAsync(notificationId)
        console.log(`[Notifications] Cancelled task reminder: ${notificationId}`)
      } catch (error) {
        console.error(`[Notifications] Failed to cancel task reminder:`, error)
        captureException(error instanceof Error ? error : new Error(String(error)), {
          method: 'cancelTaskReminder',
          notificationId,
        })
      }
    }

    return coordinate ? runAccountOwnedOperation(ownerUserId, undefined, cancel) : cancel()
  },

  /**
   * Reschedule all pending task reminders
   * Call on app launch to ensure notifications are scheduled after app reinstall
   * @param tasks - Array of tasks with pending reminders
   * @returns Map of task ID to new notification ID
   */
  async rescheduleTaskReminders(
    tasks: Array<{
      id: string
      title: string
      is_mit: boolean
      reminder_at: string
      notes?: string | null
      notification_id: string | null
    }>,
    ownerUserId: string,
    shouldContinue?: () => boolean | Promise<boolean>,
  ): Promise<Map<string, string>> {
    return runAccountOwnedOperation(ownerUserId, new Map<string, string>(), async (isCurrent) => {
      const results = new Map<string, string>()

      for (const task of tasks) {
        if (!isCurrent() || (shouldContinue && !(await shouldContinue()))) break

        // Cancel existing notification if any (might be stale)
        if (task.notification_id) {
          await this.cancelTaskReminder(task.notification_id, ownerUserId, false)
        }

        // Schedule new notification
        const newId = await this.scheduleTaskReminder(task, ownerUserId, false)
        if (newId) {
          if (!isCurrent() || (shouldContinue && !(await shouldContinue()))) {
            await this.cancelTaskReminder(newId, ownerUserId, false)
            break
          }

          const { error } = await supabase
            .from('tasks')
            .update({ notification_id: newId })
            .eq('id', task.id)
            .eq('user_id', ownerUserId)

          if (error) {
            await this.cancelTaskReminder(newId, ownerUserId, false)
            console.warn('[Notifications] Could not persist rescheduled task reminder ID:', error)
            continue
          }

          if (!isCurrent() || (shouldContinue && !(await shouldContinue()))) break
          results.set(task.id, newId)
        }
      }

      console.log(`[Notifications] Rescheduled ${results.size} task reminders`)
      addBreadcrumb('Task reminders rescheduled', 'notifications', {
        total: tasks.length,
        scheduled: results.size,
        failed: tasks.length - results.size,
      })
      return results
    })
  },
}
