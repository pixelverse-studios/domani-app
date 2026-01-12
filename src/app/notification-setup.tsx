import React, { useState, useMemo } from 'react'
import { Platform, StyleSheet, View, ScrollView, Switch } from 'react-native'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import DateTimePicker from '@react-native-community/datetimepicker'
import { format } from 'date-fns'

import { Button, Text } from '~/components/ui'
import { useTheme } from '~/hooks/useTheme'
import { useScreenTracking } from '~/hooks/useScreenTracking'
import { NotificationService } from '~/lib/notifications'
import { useNotificationStore } from '~/stores/notificationStore'
import { useUpdateProfile } from '~/hooks/useProfile'

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
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'

  const { setPlanningReminderId, setPermissionStatus } = useNotificationStore()
  const [executionReminderEnabled, setExecutionReminderEnabled] = useState(false)

  // Default Plan Reminder: 9:00 PM
  const defaultPlanTime = useMemo(() => {
    const date = new Date()
    date.setHours(21, 0, 0, 0)
    return date
  }, [])

  // Default Execute Reminder: 8:00 AM
  const defaultExecuteTime = useMemo(() => {
    const date = new Date()
    date.setHours(8, 0, 0, 0)
    return date
  }, [])

  const [planTime, setPlanTime] = useState(defaultPlanTime)
  const [executeTime, setExecuteTime] = useState(defaultExecuteTime)
  const [loading, setLoading] = useState(false)

  // Android picker visibility state
  const [showPlanPicker, setShowPlanPicker] = useState(Platform.OS === 'ios')
  const [showExecutePicker, setShowExecutePicker] = useState(Platform.OS === 'ios')

  const handleContinue = async () => {
    setLoading(true)
    try {
      // Initialize notification system
      await NotificationService.initialize()

      // Request permissions
      const granted = await NotificationService.requestPermissions()
      setPermissionStatus(granted ? 'granted' : 'denied')

      if (granted) {
        // Cancel any existing local reminders first
        await NotificationService.cancelAllReminders()

        // Schedule the planning reminder (local notification)
        const planHour = planTime.getHours()
        const planMinute = planTime.getMinutes()
        const planningId = await NotificationService.schedulePlanningReminder(planHour, planMinute)
        setPlanningReminderId(planningId)

        // Note: Execution reminder is handled server-side via Edge Function
        // We only save the time preference here - the server will send push notifications

        // Save times, timezone, and mark onboarding complete
        // We detect and save timezone here to ensure it's properly set during onboarding
        const planTimeString = format(planTime, 'HH:mm:ss')
        const executeTimeString = executionReminderEnabled ? format(executeTime, 'HH:mm:ss') : null
        const detectedTimezone = getDeviceTimezone()

        await updateProfile.mutateAsync({
          planning_reminder_time: planTimeString,
          execution_reminder_time: executeTimeString,
          notification_onboarding_completed: true,
          timezone: detectedTimezone,
        })

        console.log('[NotificationSetup] Saved timezone:', detectedTimezone)
      } else {
        // User denied permissions, still mark onboarding as complete and save timezone
        const detectedTimezone = getDeviceTimezone()
        await updateProfile.mutateAsync({
          notification_onboarding_completed: true,
          timezone: detectedTimezone,
        })
        console.log('[NotificationSetup] Saved timezone (permissions denied):', detectedTimezone)
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

  const handleExecuteTimeChange = (_: unknown, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowExecutePicker(false)
    }
    if (date) {
      setExecuteTime(date)
    }
  }

  // Theme-aware colors
  const colors = {
    background: isDark ? '#0c0c1a' : '#f8f7fc',
    gradientColors: isDark
      ? (['#0c0c1a', '#12122a', '#0c0c1a'] as const)
      : (['#f8f7fc', '#f3f0ff', '#f8f7fc'] as const),
    title: isDark ? '#ffffff' : '#1e1b4b',
    subtitle: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(30, 27, 75, 0.5)',
    sectionTitle: isDark ? '#ffffff' : '#1e1b4b',
    sectionDescription: isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(30, 27, 75, 0.5)',
    pickerBackground: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(124, 58, 237, 0.05)',
    pickerText: isDark ? '#ffffff' : '#1e1b4b',
    androidTimeText: isDark ? '#a78bfa' : '#7c3aed',
    androidButtonBg: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(124, 58, 237, 0.1)',
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Gradient background */}
      <LinearGradient
        colors={colors.gradientColors}
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
          <Text style={[styles.title, { color: colors.title }]}>Set Your Reminders</Text>
          <Text style={[styles.subtitle, { color: colors.subtitle }]}>
            When to plan and execute
          </Text>
        </View>

        {/* Plan Reminder Section */}
        <View style={styles.reminderSection}>
          <Text style={[styles.sectionTitle, { color: colors.sectionTitle }]}>Plan Reminder</Text>
          <Text style={[styles.sectionDescription, { color: colors.sectionDescription }]}>
            When would you like Domani to remind you to plan for tomorrow?
          </Text>

          {Platform.OS === 'android' && !showPlanPicker ? (
            <Button
              variant="ghost"
              onPress={() => setShowPlanPicker(true)}
              style={[styles.androidTimeButton, { backgroundColor: colors.androidButtonBg }]}
            >
              <Text style={[styles.androidTimeText, { color: colors.androidTimeText }]}>
                {format(planTime, 'h:mm a')}
              </Text>
            </Button>
          ) : (
            <View style={[styles.pickerContainer, { backgroundColor: colors.pickerBackground }]}>
              <DateTimePicker
                value={planTime}
                mode="time"
                display="spinner"
                onChange={handlePlanTimeChange}
                textColor={colors.pickerText}
                themeVariant={isDark ? 'dark' : 'light'}
                style={styles.picker}
              />
            </View>
          )}
        </View>

        {/* Execute Reminder Section */}
        <View style={styles.reminderSection}>
          <Text style={[styles.sectionTitle, { color: colors.sectionTitle }]}>
            Execution Reminder
          </Text>
          <Text style={[styles.sectionDescription, { color: colors.sectionDescription }]}>
            Optional: Get a morning reminder to start your tasks
          </Text>

          {/* Toggle to enable/disable */}
          <View style={[styles.toggleRow, { backgroundColor: colors.pickerBackground }]}>
            <Text style={[styles.toggleLabel, { color: colors.sectionTitle }]}>
              Enable reminder
            </Text>
            <Switch
              value={executionReminderEnabled}
              onValueChange={setExecutionReminderEnabled}
              trackColor={{
                false: isDark ? '#334155' : '#e2e8f0',
                true: isDark ? '#a78bfa' : '#8b5cf6',
              }}
              thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
              ios_backgroundColor={isDark ? '#334155' : '#e2e8f0'}
            />
          </View>

          {/* Time picker - only shown when enabled */}
          {executionReminderEnabled && (
            <>
              {Platform.OS === 'android' && !showExecutePicker ? (
                <Button
                  variant="ghost"
                  onPress={() => setShowExecutePicker(true)}
                  style={[styles.androidTimeButton, { backgroundColor: colors.androidButtonBg }]}
                >
                  <Text style={[styles.androidTimeText, { color: colors.androidTimeText }]}>
                    {format(executeTime, 'h:mm a')}
                  </Text>
                </Button>
              ) : (
                <View
                  style={[styles.pickerContainer, { backgroundColor: colors.pickerBackground }]}
                >
                  <DateTimePicker
                    value={executeTime}
                    mode="time"
                    display="spinner"
                    onChange={handleExecuteTimeChange}
                    textColor={colors.pickerText}
                    themeVariant={isDark ? 'dark' : 'light'}
                    style={styles.picker}
                  />
                </View>
              )}
            </>
          )}
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
            style={styles.continueButton}
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
    marginBottom: 20,
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
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  spacer: {
    flex: 1,
    minHeight: 8,
  },
  buttonContainer: {
    paddingTop: 8,
  },
  continueButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 16,
    paddingVertical: 18,
    shadowColor: '#7c3aed',
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
