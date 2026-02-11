import React, { useState, useMemo } from 'react'
import { Platform, StyleSheet, View, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import DateTimePicker from '@react-native-community/datetimepicker'
import { format } from 'date-fns'

import { Button, Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import { useScreenTracking } from '~/hooks/useScreenTracking'
import { NotificationService } from '~/lib/notifications'
import { useNotificationStore } from '~/stores/notificationStore'
import { useTutorialStore } from '~/stores/tutorialStore'
import { useUpdateProfile } from '~/hooks/useProfile'
import { useAnalytics } from '~/providers/AnalyticsProvider'

/**
 * Detect device timezone using Intl API
 * This is called during notification setup to ensure timezone is saved
 */
function getDeviceTimezone(): string {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (timezone && timezone !== 'UTC') {
      return timezone
    }
    // Fallback to UTC if detection fails
    return 'UTC'
  } catch {
    return 'UTC'
  }
}

export default function NotificationSetupScreen() {
  useScreenTracking('notification_setup')
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const updateProfile = useUpdateProfile()
  const theme = useAppTheme()
  const brandColor = theme.colors.brand.primary
  const { track } = useAnalytics()

  const { setPlanningReminderId, setPermissionStatus } = useNotificationStore()
  const { startTutorial, hasCompletedTutorial } = useTutorialStore()

  // Default Plan Reminder: 9:00 PM
  const defaultPlanTime = useMemo(() => {
    const date = new Date()
    date.setHours(21, 0, 0, 0)
    return date
  }, [])

  const [planTime, setPlanTime] = useState(defaultPlanTime)
  const [loading, setLoading] = useState(false)

  // Android picker visibility state
  const [showPlanPicker, setShowPlanPicker] = useState(Platform.OS === 'ios')

  const handleContinue = async () => {
    setLoading(true)
    try {
      // Initialize notification system
      await NotificationService.initialize()

      // Request permissions
      const granted = await NotificationService.requestPermissions()
      setPermissionStatus(granted ? 'granted' : 'denied')

      if (granted) {
        // Track notifications enabled
        track('notifications_enabled')

        // Cancel any existing local reminders first
        await NotificationService.cancelAllReminders()

        // Schedule the planning reminder (local notification)
        const planHour = planTime.getHours()
        const planMinute = planTime.getMinutes()
        const planningId = await NotificationService.schedulePlanningReminder(planHour, planMinute)
        setPlanningReminderId(planningId)

        // Save time, timezone, and mark onboarding complete
        // We detect and save timezone here to ensure it's properly set during onboarding
        const planTimeString = format(planTime, 'HH:mm:ss')
        const detectedTimezone = getDeviceTimezone()

        await updateProfile.mutateAsync({
          planning_reminder_time: planTimeString,
          notification_onboarding_completed: true,
          timezone: detectedTimezone,
        })

        console.log('[NotificationSetup] Saved timezone:', detectedTimezone)
      } else {
        // Track notifications skipped/denied
        track('notifications_skipped')

        // User denied permissions, still mark onboarding as complete and save timezone
        const detectedTimezone = getDeviceTimezone()
        await updateProfile.mutateAsync({
          notification_onboarding_completed: true,
          timezone: detectedTimezone,
        })
        console.log('[NotificationSetup] Saved timezone (permissions denied):', detectedTimezone)
      }

      // Start tutorial for new users who haven't completed it yet
      if (!hasCompletedTutorial) {
        startTutorial()
      }

      router.replace('/(tabs)')
    } catch (error) {
      console.error('Failed to setup notifications:', error)
      // Still mark as complete so user isn't stuck in a loop
      try {
        await updateProfile.mutateAsync({ notification_onboarding_completed: true })
      } catch {
        // Ignore error, just navigate away
      }
      router.replace('/(tabs)')
    } finally {
      setLoading(false)
    }
  }

  const handlePlanTimeChange = (_: unknown, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowPlanPicker(false)
    }
    if (date) {
      setPlanTime(date)
    }
  }

  // Theme-aware colors
  const themeColors = {
    background: theme.colors.background,
    gradientColors: [theme.colors.background, theme.colors.card, theme.colors.background] as const,
    title: theme.colors.text.primary,
    subtitle: theme.colors.text.secondary,
    sectionTitle: theme.colors.text.primary,
    sectionDescription: theme.colors.text.secondary,
    pickerBackground: `${brandColor}0D`, // 5% opacity
    pickerText: theme.colors.text.primary,
    androidTimeText: brandColor,
    androidButtonBg: `${brandColor}1A`, // 10% opacity
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Gradient background */}
      <LinearGradient
        colors={themeColors.gradientColors}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: themeColors.title }]}>Set Your Reminder</Text>
          <Text style={[styles.subtitle, { color: themeColors.subtitle }]}>
            When to plan for tomorrow
          </Text>
        </View>

        {/* Plan Reminder Section */}
        <View style={styles.reminderSection}>
          <Text style={[styles.sectionTitle, { color: themeColors.sectionTitle }]}>
            Planning Reminder
          </Text>
          <Text style={[styles.sectionDescription, { color: themeColors.sectionDescription }]}>
            When would you like Domani to remind you to plan for tomorrow?
          </Text>

          {Platform.OS === 'android' && !showPlanPicker ? (
            <Button
              variant="ghost"
              onPress={() => setShowPlanPicker(true)}
              style={[styles.androidTimeButton, { backgroundColor: themeColors.androidButtonBg }]}
            >
              <Text style={[styles.androidTimeText, { color: themeColors.androidTimeText }]}>
                {format(planTime, 'h:mm a')}
              </Text>
            </Button>
          ) : (
            <View
              style={[styles.pickerContainer, { backgroundColor: themeColors.pickerBackground }]}
            >
              <DateTimePicker
                value={planTime}
                mode="time"
                display="spinner"
                onChange={handlePlanTimeChange}
                textColor={themeColors.pickerText}
                themeVariant="light"
                style={styles.picker}
              />
            </View>
          )}
        </View>

        {/* Task Reminders Info */}
        <View style={[styles.infoSection, { backgroundColor: themeColors.pickerBackground }]}>
          <Text style={[styles.infoTitle, { color: themeColors.sectionTitle }]}>
            Task Reminders
          </Text>
          <Text style={[styles.infoDescription, { color: themeColors.sectionDescription }]}>
            Each task has its own reminder. You can set individual reminder times when creating or
            editing tasks.
          </Text>
        </View>

        {/* Spacer to push button down */}
        <View style={styles.spacer} />

        {/* Continue Button */}
        <View style={styles.buttonContainer}>
          <Button
            variant="primary"
            size="lg"
            onPress={handleContinue}
            loading={loading}
            style={[
              styles.continueButton,
              { backgroundColor: brandColor, shadowColor: brandColor },
            ]}
          >
            <Text style={styles.continueButtonText}>Continue to Domani</Text>
          </Button>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    textAlign: 'center',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  reminderSection: {
    marginBottom: 24,
  },
  infoSection: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  infoDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  pickerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    height: 165,
    overflow: 'hidden',
  },
  picker: {
    width: 280,
    height: 180,
  },
  androidTimeButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  androidTimeText: {
    fontSize: 24,
    fontWeight: '600',
  },
  spacer: {
    flex: 1,
    minHeight: 8,
  },
  buttonContainer: {
    paddingTop: 8,
  },
  continueButton: {
    borderRadius: 16,
    paddingVertical: 18,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
})
