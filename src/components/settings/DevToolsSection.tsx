import React, { useState } from 'react'
import { View, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import { seedEveningRolloverTestData } from '~/lib/devTools'

const PURPLE = '#7c3aed'
const PURPLE_BG = '#7c3aed18'
const PURPLE_BORDER = '#7c3aed60'

export function DevToolsSection() {
  const theme = useAppTheme()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [isSeedingEvening, setIsSeedingEvening] = useState(false)

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

  return (
    <View style={{ marginBottom: 24 }}>
      <Text
        className="text-xs font-sans-bold text-content-tertiary mb-3"
        style={{ letterSpacing: 1 }}
      >
        DEV TOOLS
      </Text>

      {/* Simulate Evening Planning Reminder */}
      <TouchableOpacity
        onPress={handleSeedEveningRollover}
        disabled={isSeedingEvening}
        activeOpacity={0.7}
        style={{
          backgroundColor: PURPLE_BG,
          borderWidth: 1,
          borderColor: PURPLE_BORDER,
          borderRadius: 12,
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flex: 1 }}>
          <Text className="font-sans-semibold text-sm" style={{ color: PURPLE }}>
            🌙 Simulate Evening Reminder
          </Text>
          <Text className="font-sans text-xs mt-0.5" style={{ color: theme.colors.text.tertiary }}>
            Today: 1 MIT + 2 daytime tasks + 1 filtered (11pm) → opens modal
          </Text>
        </View>
        {isSeedingEvening && <ActivityIndicator size="small" color={PURPLE} />}
      </TouchableOpacity>
    </View>
  )
}
