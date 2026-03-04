import React, { useState } from 'react'
import { View, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import { seedEveningRolloverTestData, previewTaskNotification } from '~/lib/devTools'
import { clearEveningPromptState } from '~/lib/rollover'
import { useNotificationStore } from '~/stores/notificationStore'

function invalidateRolloverQueries(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['eveningRolloverTasks'] }),
    queryClient.invalidateQueries({ queryKey: ['eveningRolloverPromptedToday'] }),
  ])
}

export function DevToolsSection() {
  const theme = useAppTheme()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [isSeedingEvening, setIsSeedingEvening] = useState(false)
  const [isTriggeringAppOpen, setIsTriggeringAppOpen] = useState(false)
  const [isResettingRollover, setIsResettingRollover] = useState(false)
  const [isPreviewingNotifs, setIsPreviewingNotifs] = useState(false)
  const devTriggerRolloverRecheck = useNotificationStore((s) => s.devTriggerRolloverRecheck)

  const brandColor = theme.colors.brand.primary
  const brandBg = `${brandColor}15`
  const brandBorder = `${brandColor}40`

  const confirmDestructiveSeed = (action: () => Promise<void>) => {
    Alert.alert(
      'Replace Tasks?',
      'This will delete all tasks on today\'s plan and replace them with test data.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', style: 'destructive', onPress: action },
      ],
    )
  }

  const handleSeedEveningRollover = async () => {
    setIsSeedingEvening(true)
    try {
      await seedEveningRolloverTestData()
      await invalidateRolloverQueries(queryClient)
      router.push(
        '/(tabs)/planning?defaultPlanningFor=tomorrow&openForm=true&trigger=planning_reminder',
      )
    } catch (error) {
      Alert.alert('Seed Failed', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsSeedingEvening(false)
    }
  }

  const handleTriggerAppOpenRollover = async () => {
    setIsTriggeringAppOpen(true)
    try {
      await seedEveningRolloverTestData()
      await invalidateRolloverQueries(queryClient)
      devTriggerRolloverRecheck()
    } catch (error) {
      Alert.alert('Trigger Failed', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsTriggeringAppOpen(false)
    }
  }

  const handleResetRolloverFlag = async () => {
    setIsResettingRollover(true)
    try {
      await clearEveningPromptState()
      await invalidateRolloverQueries(queryClient)
      devTriggerRolloverRecheck()
      Alert.alert('Rollover Reset', 'Rollover will re-check with your existing tasks now.')
    } catch (error) {
      Alert.alert('Reset Failed', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsResettingRollover(false)
    }
  }

  const handlePreviewNotifications = async () => {
    setIsPreviewingNotifs(true)
    try {
      await previewTaskNotification()
      Alert.alert('Notification Queued', 'Sample notification arriving in 1 second.')
    } catch (error) {
      Alert.alert('Preview Failed', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsPreviewingNotifs(false)
    }
  }

  return (
    <View style={{ marginBottom: 24 }}>
      <Text
        className="text-xs font-sans-bold text-content-tertiary mb-3"
        style={{ letterSpacing: 1 }}
      >
        DEV TOOLS
      </Text>

      {/* Simulate Evening Planning Reminder (notification-tap path) */}
      <TouchableOpacity
        onPress={() => confirmDestructiveSeed(handleSeedEveningRollover)}
        disabled={isSeedingEvening}
        activeOpacity={0.7}
        style={{
          backgroundColor: brandBg,
          borderWidth: 1,
          borderColor: brandBorder,
          borderRadius: 12,
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text className="font-sans-semibold text-sm" style={{ color: brandColor }}>
            Simulate Evening Reminder
          </Text>
          <Text className="font-sans text-xs mt-0.5" style={{ color: theme.colors.text.tertiary }}>
            Seeds tasks + opens notification-tap rollover flow
          </Text>
        </View>
        {isSeedingEvening && <ActivityIndicator size="small" color={brandColor} />}
      </TouchableOpacity>

      {/* Trigger App-Open Rollover (unified cycle path) */}
      <TouchableOpacity
        onPress={() => confirmDestructiveSeed(handleTriggerAppOpenRollover)}
        disabled={isTriggeringAppOpen}
        activeOpacity={0.7}
        style={{
          backgroundColor: brandBg,
          borderWidth: 1,
          borderColor: brandBorder,
          borderRadius: 12,
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text className="font-sans-semibold text-sm" style={{ color: brandColor }}>
            Trigger App-Open Rollover
          </Text>
          <Text className="font-sans text-xs mt-0.5" style={{ color: theme.colors.text.tertiary }}>
            Seeds tasks + triggers rollover modal (bypasses time check)
          </Text>
        </View>
        {isTriggeringAppOpen && <ActivityIndicator size="small" color={brandColor} />}
      </TouchableOpacity>

      {/* Reset rollover flag only — uses existing tasks, no seeding */}
      <TouchableOpacity
        onPress={handleResetRolloverFlag}
        disabled={isResettingRollover}
        activeOpacity={0.7}
        style={{
          backgroundColor: brandBg,
          borderWidth: 1,
          borderColor: brandBorder,
          borderRadius: 12,
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flex: 1 }}>
          <Text className="font-sans-semibold text-sm" style={{ color: brandColor }}>
            Reset Rollover Flag
          </Text>
          <Text className="font-sans text-xs mt-0.5" style={{ color: theme.colors.text.tertiary }}>
            No seeding — triggers rollover with your real tasks
          </Text>
        </View>
        {isResettingRollover && <ActivityIndicator size="small" color={brandColor} />}
      </TouchableOpacity>

      {/* Preview task reminder notifications for all priority levels */}
      <TouchableOpacity
        onPress={handlePreviewNotifications}
        disabled={isPreviewingNotifs}
        activeOpacity={0.7}
        style={{
          backgroundColor: brandBg,
          borderWidth: 1,
          borderColor: brandBorder,
          borderRadius: 12,
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 10,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text className="font-sans-semibold text-sm" style={{ color: brandColor }}>
            Preview Task Notification
          </Text>
          <Text className="font-sans text-xs mt-0.5" style={{ color: theme.colors.text.tertiary }}>
            Sample reminder with title + notes body
          </Text>
        </View>
        {isPreviewingNotifs && <ActivityIndicator size="small" color={brandColor} />}
      </TouchableOpacity>
    </View>
  )
}
