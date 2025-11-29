import React, { useState, useMemo, useEffect } from 'react'
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text as RNText,
  TouchableOpacity,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Bell, Moon } from 'lucide-react-native'
import { format } from 'date-fns'

import { Button, Text } from '~/components/ui'
import { GradientOrb } from '~/components/ui/GradientOrb'
import { useTheme } from '~/hooks/useTheme'
import { NotificationService } from '~/lib/notifications'
import { useNotificationStore } from '~/stores/notificationStore'
import { useUpdateProfile } from '~/hooks/useProfile'

export default function NotificationSetupScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'
  const updateProfile = useUpdateProfile()

  const { setEveningReminderId, setPermissionStatus } = useNotificationStore()

  // Default to 8:00 PM
  const defaultTime = useMemo(() => {
    const date = new Date()
    date.setHours(20, 0, 0, 0)
    return date
  }, [])

  const [selectedTime, setSelectedTime] = useState(defaultTime)
  const [loading, setLoading] = useState(false)
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios')

  // Animation values
  const iconAnim = useMemo(() => new Animated.Value(0), [])
  const titleAnim = useMemo(() => new Animated.Value(0), [])
  const contentAnim = useMemo(() => new Animated.Value(0), [])
  const ctaAnim = useMemo(() => new Animated.Value(0), [])

  useEffect(() => {
    const staggerDelay = 120
    const duration = 700

    Animated.stagger(staggerDelay, [
      Animated.timing(iconAnim, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(titleAnim, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentAnim, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(ctaAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start()
  }, [iconAnim, titleAnim, contentAnim, ctaAnim])

  const createAnimatedStyle = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [25, 0],
        }),
      },
    ],
  })

  const handleEnableReminder = async () => {
    setLoading(true)
    try {
      // Initialize notification system
      await NotificationService.initialize()

      // Request permissions
      const granted = await NotificationService.requestPermissions()
      setPermissionStatus(granted ? 'granted' : 'denied')

      if (granted) {
        // Schedule the notification
        const hour = selectedTime.getHours()
        const minute = selectedTime.getMinutes()
        const identifier = await NotificationService.scheduleEveningReminder(hour, minute)
        setEveningReminderId(identifier)

        // Save the time and mark onboarding complete in profile
        const timeString = format(selectedTime, 'HH:mm:ss')
        await updateProfile.mutateAsync({
          planning_reminder_time: timeString,
          notification_onboarding_completed: true,
        })
      } else {
        // User denied permissions, still mark onboarding as complete
        await updateProfile.mutateAsync({ notification_onboarding_completed: true })
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

  const handleSkip = async () => {
    setLoading(true)
    try {
      await updateProfile.mutateAsync({ notification_onboarding_completed: true })
    } catch {
      // Ignore error, just navigate away
    }
    router.replace('/(tabs)')
    setLoading(false)
  }

  const handleTimeChange = (_: unknown, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false)
    }
    if (date) {
      setSelectedTime(date)
    }
  }

  const formattedTime = format(selectedTime, 'h:mm a')

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={isDark ? ['#0f172a', '#1e1b4b', '#0f172a'] : ['#faf5ff', '#f3e8ff', '#faf5ff']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Gradient orb */}
      <GradientOrb
        size={320}
        position="top-right"
        colors={
          isDark
            ? ['#4c1d95', '#7c3aed', '#a855f7', '#c4b5fd']
            : ['#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6']
        }
      />

      {/* Content overlay */}
      <LinearGradient
        colors={
          isDark
            ? ['rgba(15, 23, 42, 0.3)', 'rgba(15, 23, 42, 0.8)', 'rgba(15, 23, 42, 0.95)']
            : ['rgba(250, 245, 255, 0.3)', 'rgba(250, 245, 255, 0.8)', 'rgba(250, 245, 255, 0.95)']
        }
        locations={[0, 0.35, 0.6]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Main content */}
      <View style={[styles.content, { paddingTop: insets.top + 80 }]}>
        {/* Icon and title section */}
        <View style={styles.headerSection}>
          {/* Animated icon */}
          <Animated.View style={[styles.iconContainer, createAnimatedStyle(iconAnim)]}>
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: isDark ? 'rgba(168, 85, 247, 0.15)' : 'rgba(124, 58, 237, 0.1)',
                },
              ]}
            >
              <Moon
                size={48}
                color={isDark ? '#c084fc' : '#7c3aed'}
                strokeWidth={1.5}
                fill={isDark ? 'rgba(192, 132, 252, 0.2)' : 'rgba(124, 58, 237, 0.15)'}
              />
            </View>
          </Animated.View>

          {/* Title */}
          <Animated.View style={createAnimatedStyle(titleAnim)}>
            <RNText style={[styles.title, { color: isDark ? '#a855f7' : '#7c3aed' }]}>
              Build Your{'\n'}Planning Habit
            </RNText>
          </Animated.View>

          {/* Description */}
          <Animated.View style={[styles.descriptionContainer, createAnimatedStyle(contentAnim)]}>
            <Text
              style={[
                styles.description,
                { color: isDark ? 'rgba(250, 245, 255, 0.7)' : 'rgba(30, 27, 75, 0.7)' },
              ]}
            >
              Get a gentle reminder each evening to plan tomorrow&apos;s top 3 tasks. Wake up
              knowing exactly what to focus on.
            </Text>

            {/* Time selector */}
            <View style={styles.timeSection}>
              <View style={styles.timeLabelRow}>
                <Bell size={18} color={isDark ? '#c084fc' : '#7c3aed'} strokeWidth={1.5} />
                <Text
                  style={[
                    styles.timeLabel,
                    { color: isDark ? 'rgba(250, 245, 255, 0.5)' : 'rgba(30, 27, 75, 0.5)' },
                  ]}
                >
                  Daily reminder at
                </Text>
              </View>

              {Platform.OS === 'android' && !showPicker && (
                <TouchableOpacity
                  style={[
                    styles.timeButton,
                    {
                      backgroundColor: isDark
                        ? 'rgba(168, 85, 247, 0.15)'
                        : 'rgba(124, 58, 237, 0.1)',
                    },
                  ]}
                  onPress={() => setShowPicker(true)}
                >
                  <Text style={[styles.timeButtonText, { color: isDark ? '#c084fc' : '#7c3aed' }]}>
                    {formattedTime}
                  </Text>
                </TouchableOpacity>
              )}

              {(Platform.OS === 'ios' || showPicker) && (
                <View style={styles.pickerWrapper}>
                  <DateTimePicker
                    value={selectedTime}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleTimeChange}
                    textColor={isDark ? '#ffffff' : '#1e1b4b'}
                    themeVariant={isDark ? 'dark' : 'light'}
                    style={styles.picker}
                  />
                </View>
              )}
            </View>
          </Animated.View>
        </View>

        {/* CTA section */}
        <View style={[styles.ctaSection, { paddingBottom: insets.bottom + 16 }]}>
          <Animated.View style={[styles.ctaContainer, createAnimatedStyle(ctaAnim)]}>
            {/* Primary CTA */}
            <Button
              variant="primary"
              size="lg"
              onPress={handleEnableReminder}
              loading={loading}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Enable Reminder</Text>
            </Button>

            {/* Skip link */}
            <TouchableOpacity
              style={styles.skipLink}
              onPress={handleSkip}
              activeOpacity={0.7}
              disabled={loading}
            >
              <Text
                style={[
                  styles.skipText,
                  { color: isDark ? 'rgba(250, 245, 255, 0.5)' : 'rgba(30, 27, 75, 0.5)' },
                ]}
              >
                Not now
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 32,
  },
  headerSection: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 16,
  },
  descriptionContainer: {
    alignItems: 'center',
    width: '100%',
  },
  description: {
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: 0.2,
    lineHeight: 24,
    paddingHorizontal: 8,
    marginBottom: 32,
  },
  timeSection: {
    alignItems: 'center',
    width: '100%',
  },
  timeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  timeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  timeButtonText: {
    fontSize: 24,
    fontWeight: '600',
  },
  pickerWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  picker: {
    width: 200,
    height: 120,
  },
  ctaSection: {
    width: '100%',
  },
  ctaContainer: {
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 16,
    paddingVertical: 18,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  skipLink: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '500',
  },
})
