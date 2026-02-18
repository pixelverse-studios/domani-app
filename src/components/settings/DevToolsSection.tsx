import React, { useState } from 'react'
import { View, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import { seedRolloverTestData, resetRolloverFlags } from '~/lib/devTools'

const PURPLE = '#7c3aed'
const PURPLE_BG = '#7c3aed18'
const PURPLE_BORDER = '#7c3aed60'

export function DevToolsSection() {
  const theme = useAppTheme()
  const queryClient = useQueryClient()
  const [isSeeding, setIsSeeding] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const invalidateRolloverQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: ['rolloverTasks'] })
    await queryClient.invalidateQueries({ queryKey: ['rolloverPromptedToday'] })
    await queryClient.invalidateQueries({ queryKey: ['celebrationShownToday'] })
  }

  const handleSeedRollover = async () => {
    setIsSeeding(true)
    try {
      await seedRolloverTestData()
      await invalidateRolloverQueries()
      Alert.alert(
        '✅ Test Data Seeded',
        "Yesterday's plan now has:\n• 3 completed tasks\n• 3 incomplete tasks (1 MIT)\n• All with reminder times\n\nFully close and reopen the app to trigger the rollover modal.",
      )
    } catch (error) {
      Alert.alert(
        'Seed Failed',
        error instanceof Error ? error.message : 'Unknown error',
      )
    } finally {
      setIsSeeding(false)
    }
  }

  const handleResetFlags = async () => {
    setIsResetting(true)
    try {
      await resetRolloverFlags()
      await invalidateRolloverQueries()
      Alert.alert(
        '✅ Flags Reset',
        'Rollover prompt flags cleared. Fully close and reopen the app to trigger the modal again.',
      )
    } catch (error) {
      Alert.alert(
        'Reset Failed',
        error instanceof Error ? error.message : 'Unknown error',
      )
    } finally {
      setIsResetting(false)
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

      {/* Seed Rollover Test Data */}
      <TouchableOpacity
        onPress={handleSeedRollover}
        disabled={isSeeding}
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
          marginBottom: 8,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text className="font-sans-semibold text-sm" style={{ color: PURPLE }}>
            🧪 Seed Rollover Test Data
          </Text>
          <Text
            className="font-sans text-xs mt-0.5"
            style={{ color: theme.colors.text.tertiary }}
          >
            Yesterday: 3 done + 3 incomplete (1 MIT) with reminders
          </Text>
        </View>
        {isSeeding && <ActivityIndicator size="small" color={PURPLE} />}
      </TouchableOpacity>

      {/* Reset Flags Only */}
      <TouchableOpacity
        onPress={handleResetFlags}
        disabled={isResetting}
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
            🔄 Reset Rollover Flags
          </Text>
          <Text
            className="font-sans text-xs mt-0.5"
            style={{ color: theme.colors.text.tertiary }}
          >
            Clears "already prompted today" — re-triggers modal on next open
          </Text>
        </View>
        {isResetting && <ActivityIndicator size="small" color={PURPLE} />}
      </TouchableOpacity>
    </View>
  )
}
