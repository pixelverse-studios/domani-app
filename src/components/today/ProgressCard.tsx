import React from 'react'
import { View } from 'react-native'

import { Text } from '~/components/ui'
import { CircularProgress } from '~/components/ui/CircularProgress'
import { useAppTheme } from '~/hooks/useAppTheme'

interface ProgressCardProps {
  completed: number
  total: number
}

export function ProgressCard({ completed, total }: ProgressCardProps) {
  const theme = useAppTheme()
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
  const remaining = total - completed

  return (
    <View
      className="rounded-2xl p-6 mx-5"
      style={{
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.border.primary,
      }}
    >
      <View className="flex-row items-center gap-6">
        <CircularProgress progress={percentage} size={100} strokeWidth={9} />
        <View className="flex-1">
          <Text className="text-xl font-medium text-content-primary mb-4">
            Today&apos;s Progress
          </Text>
          <View className="flex-row gap-10">
            <View className="items-center">
              <Text className="text-4xl font-bold text-brand-primary">{completed}</Text>
              <Text className="text-base text-content-secondary">Completed</Text>
            </View>
            <View className="items-center">
              <Text
                className="text-4xl font-bold"
                style={{ color: theme.colors.accent.terracotta }}
              >
                {remaining}
              </Text>
              <Text className="text-base text-content-secondary">Unfinished</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}
