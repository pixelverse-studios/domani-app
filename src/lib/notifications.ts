import { Platform } from 'react-native'
import { addDays, format } from 'date-fns'
import Constants from 'expo-constants'

import { supabase } from './supabase'

// Check if notifications are supported (not in Expo Go on Android SDK 53+)
const isExpoGo = Constants.appOwnership === 'expo'
const isNotificationsSupported = !(isExpoGo && Platform.OS === 'android')

// Conditionally import and configure notifications
let Notifications: typeof import('expo-notifications') | null = null

if (isNotificationsSupported) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
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

const CHANNEL_ID = 'planning-reminders'

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
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Planning Reminders',
        description: 'Daily reminders to plan tomorrow',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#7c3aed',
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
   * Check if tomorrow's plan is locked (already planned)
   * If locked, we skip sending the evening reminder
   */
  async isTomorrowPlanLocked(): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return false

      const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')

      const { data: plan } = await supabase
        .from('plans')
        .select('locked_at')
        .eq('planned_for', tomorrow)
        .eq('user_id', user.id)
        .maybeSingle()

      return !!plan?.locked_at
    } catch {
      return false
    }
  },

  /**
   * Schedule the evening planning reminder
   * @param hour - Hour in 24-hour format (0-23)
   * @param minute - Minute (0-59)
   * @returns Notification identifier for cancellation
   */
  async scheduleEveningReminder(hour: number, minute: number): Promise<string> {
    if (!Notifications) return ''

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Plan Tomorrow',
        body: 'Take a few minutes to set your top 3 tasks for tomorrow',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { url: '/(tabs)/planning', type: 'evening_reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
      },
    })

    return identifier
  },

  /**
   * Schedule the morning execution reminder
   * @param hour - Hour in 24-hour format (0-23)
   * @param minute - Minute (0-59)
   * @returns Notification identifier for cancellation
   */
  async scheduleMorningReminder(hour: number, minute: number): Promise<string> {
    if (!Notifications) return ''

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time to Execute',
        body: "Your planned tasks are waiting. Let's make today count!",
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { url: '/(tabs)', type: 'morning_reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
      },
    })

    return identifier
  },

  /**
   * Cancel a specific scheduled notification
   */
  async cancelNotification(identifier: string): Promise<void> {
    if (!Notifications) return
    await Notifications.cancelScheduledNotificationAsync(identifier)
  },

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllReminders(): Promise<void> {
    if (!Notifications) return
    await Notifications.cancelAllScheduledNotificationsAsync()
  },

  /**
   * Get all currently scheduled notifications (for debugging)
   */
  async getScheduledNotifications(): Promise<unknown[]> {
    if (!Notifications) return []
    return await Notifications.getAllScheduledNotificationsAsync()
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
}
