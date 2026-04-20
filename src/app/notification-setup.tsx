import React, { useState, useMemo } from 'react'
import { Platform, StyleSheet, View, ScrollView, Switch } from 'react-native'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import DateTimePicker from '@react-native-community/datetimepicker'
import { format, differenceInCalendarDays } from 'date-fns'

import { Button, Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import { useScreenTracking } from '~/hooks/useScreenTracking'
import { NotificationService } from '~/lib/notifications'
import { useNotificationStore } from '~/stores/notificationStore'
import { useTutorialStore } from '~/stores/tutorialStore'
import { formatLocalizedDate, formatLocalizedTime } from '~/i18n/date'
import { useUpdateProfile } from '~/hooks/useProfile'
import { useProfile } from '~/hooks/useProfile'
import { useAnalytics } from '~/providers/AnalyticsProvider'
import { useTranslation } from '~/hooks/useTranslation'

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
  const { profile } = useProfile()
  const theme = useAppTheme()
  const { locale, t } = useTranslation()
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
  const [reminderOptedIn, setReminderOptedIn] = useState(true)
  const [loading, setLoading] = useState(false)

  // Android picker visibility state
  const [showPlanPicker, setShowPlanPicker] = useState(Platform.OS === 'ios')

  const trialSummary = useMemo(() => {
    if (!profile?.trial_ends_at) {
      return {
        headline: t('onboarding.notificationSetup.liveHeadline'),
        detail: t('onboarding.notificationSetup.liveDetail'),
      }
    }

    const trialEnd = new Date(profile.trial_ends_at)
    const daysRemaining = Math.max(differenceInCalendarDays(trialEnd, new Date()), 0)
    const endDateLabel = formatLocalizedDate(trialEnd, 'MMMM d', locale)

    if (daysRemaining > 1) {
      return {
        headline: t('onboarding.notificationSetup.daysLeftHeadline', { count: daysRemaining }),
        detail: t('onboarding.notificationSetup.daysLeftDetail', { date: endDateLabel }),
      }
    }

    if (daysRemaining === 1) {
      return {
        headline: t('onboarding.notificationSetup.oneDayHeadline'),
        detail: t('onboarding.notificationSetup.oneDayDetail', { date: endDateLabel }),
      }
    }

    return {
      headline: t('onboarding.notificationSetup.endsTodayHeadline'),
      detail: t('onboarding.notificationSetup.endsTodayDetail', { date: endDateLabel }),
    }
  }, [locale, profile?.trial_ends_at, t])

  const handleContinue = async () => {
    setLoading(true)
    try {
      const planTimeString = format(planTime, 'HH:mm:ss')
      const detectedTimezone = getDeviceTimezone()

      if (reminderOptedIn) {
        // User wants notifications — initialize, request permissions, and schedule if granted
        await NotificationService.initialize()
        const granted = await NotificationService.requestPermissions()
        setPermissionStatus(granted ? 'granted' : 'denied')

        if (granted) {
          track('notifications_enabled')
          await NotificationService.cancelAllReminders()
          const planningId = await NotificationService.schedulePlanningReminder(
            planTime.getHours(),
            planTime.getMinutes(),
          )
          setPlanningReminderId(planningId)
        } else {
          // OS denied — track as skipped; planning_reminder_enabled still saves as true
          // The warning banner in Settings guides recovery once permission is granted
          track('notifications_skipped')
        }
      } else {
        // User opted out — skip permission request and scheduling entirely
        track('notifications_skipped')
      }

      // Always save planning time, timezone, and onboarding flag
      // planning_reminder_enabled reflects the user's toggle choice regardless of OS permission outcome
      await updateProfile.mutateAsync({
        planning_reminder_time: planTimeString,
        planning_reminder_enabled: reminderOptedIn,
        notification_onboarding_completed: true,
        timezone: detectedTimezone,
      })

      console.log('[NotificationSetup] Saved timezone:', detectedTimezone)

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
    eyebrow: theme.colors.brand.primary,
    sectionTitle: theme.colors.text.primary,
    sectionDescription: theme.colors.text.secondary,
    pickerBackground: `${brandColor}0D`, // 5% opacity
    trialCardBackground: `${brandColor}12`, // 7% opacity
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
          <Text style={[styles.eyebrow, { color: themeColors.eyebrow }]}>
            {t('onboarding.notificationSetup.eyebrow')}
          </Text>
          <Text style={[styles.title, { color: themeColors.title }]}>
            {t('onboarding.notificationSetup.title')}
          </Text>
          <Text style={[styles.subtitle, { color: themeColors.subtitle }]}>
            {t('onboarding.notificationSetup.subtitle')}
          </Text>
        </View>

        <View style={[styles.trialCard, { backgroundColor: themeColors.trialCardBackground }]}>
          <Text style={[styles.trialCardTitle, { color: themeColors.sectionTitle }]}>
            {trialSummary.headline}
          </Text>
          <Text style={[styles.trialCardDescription, { color: themeColors.sectionDescription }]}>
            {trialSummary.detail}
          </Text>
        </View>

        {/* Plan Reminder Section */}
        <View style={styles.reminderSection}>
          <Text style={[styles.sectionTitle, { color: themeColors.sectionTitle }]}>
            {t('onboarding.notificationSetup.planningReminderTitle')}
          </Text>
          <Text style={[styles.sectionDescription, { color: themeColors.sectionDescription }]}>
            {t('onboarding.notificationSetup.planningReminderDescription')}
          </Text>

          {/* Notification opt-in toggle */}
          <View style={[styles.toggleRow, { backgroundColor: themeColors.pickerBackground }]}>
            <Text style={[styles.toggleLabel, { color: themeColors.sectionTitle }]}>
              {t('onboarding.notificationSetup.toggleLabel')}
            </Text>
            <Switch
              value={reminderOptedIn}
              onValueChange={setReminderOptedIn}
              trackColor={{
                false: theme.colors.border.primary,
                true: brandColor,
              }}
              thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
              ios_backgroundColor={theme.colors.border.primary}
            />
          </View>

          <View
            style={[styles.pickerWrapper, { opacity: reminderOptedIn ? 1 : 0.4 }]}
            pointerEvents={reminderOptedIn ? 'auto' : 'none'}
          >
            {Platform.OS === 'android' && !showPlanPicker ? (
              <Button
                variant="ghost"
                onPress={() => setShowPlanPicker(true)}
                style={[styles.androidTimeButton, { backgroundColor: themeColors.androidButtonBg }]}
              >
                <Text style={[styles.androidTimeText, { color: themeColors.androidTimeText }]}>
                  {formatLocalizedTime(planTime, locale)}
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
        </View>

        {/* Task Reminders Info */}
        <View style={[styles.infoSection, { backgroundColor: themeColors.pickerBackground }]}>
          <Text style={[styles.infoTitle, { color: themeColors.sectionTitle }]}>
            {t('onboarding.notificationSetup.taskRemindersTitle')}
          </Text>
          <Text style={[styles.infoDescription, { color: themeColors.sectionDescription }]}>
            {t('onboarding.notificationSetup.taskRemindersDescription')}
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
            <Text style={styles.continueButtonText}>
              {t('onboarding.notificationSetup.continue')}
            </Text>
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
    marginBottom: 20,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 10,
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
    lineHeight: 24,
  },
  trialCard: {
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 24,
  },
  trialCardTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
  },
  trialCardDescription: {
    fontSize: 14,
    lineHeight: 20,
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  pickerWrapper: {},
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    marginRight: 12,
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
