import React from 'react'
import { View } from 'react-native'
import { Calendar } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'

interface PlanningEmptyStateProps {
  taskCount?: number
}

export function PlanningEmptyState({ taskCount = 0 }: PlanningEmptyStateProps) {
  const theme = useAppTheme()

  return (
    <View className="mx-5 mt-8">
      {/* Section header */}
      <View className="flex-row items-center mb-4">
        <Text className="text-lg font-sans-semibold text-content-primary">Planned Tasks</Text>
        <Text
          className="font-sans ml-1"
          style={{ fontSize: 18, color: theme.colors.text.tertiary }}
        >
          ({taskCount})
        </Text>
      </View>

      {/* Empty state card */}
      <View
        className="items-center justify-center py-12 rounded-xl border border-dashed"
        style={{
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border.primary,
        }}
      >
        <Calendar size={40} color={theme.colors.text.tertiary} strokeWidth={1.5} />
        <Text
          className="font-sans mt-4"
          style={{ fontSize: 16, color: theme.colors.text.secondary }}
        >
          No tasks planned yet
        </Text>
      </View>
    </View>
  )
}
