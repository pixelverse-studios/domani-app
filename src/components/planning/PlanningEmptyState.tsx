import React from 'react'
import { View } from 'react-native'
import { Calendar } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useTheme } from '~/hooks/useTheme'

interface PlanningEmptyStateProps {
  taskCount?: number
}

export function PlanningEmptyState({ taskCount = 0 }: PlanningEmptyStateProps) {
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'

  const iconColor = isDark ? '#475569' : '#94a3b8' // slate-600 / slate-400
  const countColor = isDark ? '#64748b' : '#94a3b8' // slate-500 / slate-400

  return (
    <View className="mx-5 mt-8">
      {/* Section header */}
      <View className="flex-row items-center mb-4">
        <Text className="text-lg font-sans-semibold text-slate-900 dark:text-white">
          Planned Tasks
        </Text>
        <Text className="font-sans ml-1" style={{ fontSize: 18, color: countColor }}>
          ({taskCount})
        </Text>
      </View>

      {/* Empty state card */}
      <View
        className="items-center justify-center py-12 rounded-xl border border-dashed border-slate-300 dark:border-slate-700"
        style={{ backgroundColor: isDark ? '#1e293b' : '#f8fafc' }}
      >
        <Calendar size={40} color={iconColor} strokeWidth={1.5} />
        <Text
          className="font-sans mt-4"
          style={{ fontSize: 16, color: isDark ? '#64748b' : '#94a3b8' }}
        >
          No tasks planned yet
        </Text>
      </View>
    </View>
  )
}
