import React from 'react'
import { View } from 'react-native'
import { Calendar, Flame, Target } from 'lucide-react-native'

import { Text, Card } from '~/components/ui'
import { useTheme } from '~/hooks/useTheme'
import { colors } from '~/theme'

interface StreaksCardProps {
  planningStreak: number | null
  executionStreak: number | null
  mitCompletionRate: number | null
}

export function StreaksCard({
  planningStreak,
  executionStreak,
  mitCompletionRate,
}: StreaksCardProps) {
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'

  const dividerColor = isDark ? 'bg-slate-700/50' : 'bg-slate-100'

  // Format values with fallback
  const planning = planningStreak ?? 0
  const execution = executionStreak ?? 0
  const mitRate = mitCompletionRate ?? 0
  const hasPlanningData = planningStreak !== null
  const hasExecutionData = executionStreak !== null
  const hasMitData = mitCompletionRate !== null

  return (
    <Card className="p-5">
      {/* Section header */}
      <Text className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-4">
        Streaks & Focus
      </Text>

      {/* Horizontal row of metrics */}
      <View className="flex-row justify-between">
        {/* Planning Streak */}
        <View className="flex-1 items-center">
          <View
            className="w-11 h-11 rounded-full items-center justify-center mb-2"
            style={{ backgroundColor: `${colors.primary}20` }}
          >
            <Calendar size={22} color={colors.primary} strokeWidth={1.5} />
          </View>
          <Text className="text-2xl font-bold text-slate-900 dark:text-white">
            {hasPlanningData ? planning : '--'}
          </Text>
          <Text className="text-xs text-slate-500 dark:text-slate-400 text-center mt-0.5">
            Planning
          </Text>
          <Text className="text-xs text-slate-400 dark:text-slate-500">streak</Text>
        </View>

        {/* Divider */}
        <View className={`w-px ${dividerColor} mx-3`} />

        {/* Execution Streak */}
        <View className="flex-1 items-center">
          <View
            className="w-11 h-11 rounded-full items-center justify-center mb-2"
            style={{ backgroundColor: '#f9731620' }}
          >
            <Flame size={22} color="#f97316" strokeWidth={1.5} />
          </View>
          <Text className="text-2xl font-bold text-slate-900 dark:text-white">
            {hasExecutionData ? execution : '--'}
          </Text>
          <Text className="text-xs text-slate-500 dark:text-slate-400 text-center mt-0.5">
            Execution
          </Text>
          <Text className="text-xs text-slate-400 dark:text-slate-500">streak</Text>
        </View>

        {/* Divider */}
        <View className={`w-px ${dividerColor} mx-3`} />

        {/* MIT Completion */}
        <View className="flex-1 items-center">
          <View
            className="w-11 h-11 rounded-full items-center justify-center mb-2"
            style={{ backgroundColor: `${colors.primary}20` }}
          >
            <Target size={22} color={colors.primary} strokeWidth={1.5} />
          </View>
          <Text className="text-2xl font-bold text-slate-900 dark:text-white">
            {hasMitData ? `${mitRate}%` : '--'}
          </Text>
          <Text className="text-xs text-slate-500 dark:text-slate-400 text-center mt-0.5">MIT</Text>
          <Text className="text-xs text-slate-400 dark:text-slate-500">completion</Text>
        </View>
      </View>
    </Card>
  )
}
