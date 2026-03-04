import React, { useState } from 'react'
import { View, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import { seedEveningRolloverTestData } from '~/lib/devTools'
import { useNotificationStore } from '~/stores/notificationStore'

const EVENING_ROLLOVER_PROMPTED_DATE_KEY = 'evening_rollover_prompted_date'

export function DevToolsSection() {
  const theme = useAppTheme()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [isSeedingEvening, setIsSeedingEvening] = useState(false)
  const [isTriggeringAppOpen, setIsTriggeringAppOpen] = useState(false)
  const [isResettingRollover, setIsResettingRollover] = useState(false)
  const devTriggerRolloverRecheck = useNotificationStore((s) => s.devTriggerRolloverRecheck)

  const brandColor = theme.colors.brand.primary
  const brandBg = `${brandColor}15`
  const brandBorder = `${brandColor}40`

  const handleSeedEveningRollover = async () => {
    setIsSeedingEvening(true)
    try {
      await seedEveningRolloverTestData()
      await queryClient.invalidateQueries({ queryKey: ['eveningRolloverTasks'] })
      await queryClient.invalidateQueries({ queryKey: ['eveningRolloverPromptedToday'] })
      // Navigate to planning screen as if tapping the planning reminder notification
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
      await queryClient.invalidateQueries({ queryKey: ['eveningRolloverTasks'] })
      await queryClient.invalidateQueries({ queryKey: ['eveningRolloverPromptedToday'] })
      // Force useEveningRolloverOnAppOpen to reset and re-check
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
      await AsyncStorage.removeItem(EVENING_ROLLOVER_PROMPTED_DATE_KEY)
      await queryClient.invalidateQueries({ queryKey: ['eveningRolloverTasks'] })
      await queryClient.invalidateQueries({ queryKey: ['eveningRolloverPromptedToday'] })
      devTriggerRolloverRecheck()
      Alert.alert('Rollover Reset', 'Rollover will trigger with your existing tasks on next app open.')
    } catch (error) {
      Alert.alert('Reset Failed', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsResettingRollover(false)
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
        onPress={handleSeedEveningRollover}
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
        onPress={handleTriggerAppOpenRollover}
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
    </View>
  )
}
