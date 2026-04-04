import React from 'react'
import { View } from 'react-native'

import { Text } from '~/components/ui'
import { CircularProgress } from '~/components/ui/CircularProgress'
import { useAppTheme } from '~/hooks/useAppTheme'
import { useLayoutStore, type TaskLayout } from '~/stores/layoutStore'

interface ProgressCardProps {
  completed: number
  total: number
}

function useCardStyle(layout: TaskLayout) {
  const theme = useAppTheme()
  const brandColor = theme.colors.brand.primary

  const styles: Record<TaskLayout, object> = {
    default: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
      borderRadius: 16,
      padding: 24,
    },
    compact: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
      borderRadius: 10,
      padding: 16,
    },
    minimal: {
      backgroundColor: 'transparent',
      borderBottomWidth: 1,
      borderBottomColor: `${theme.colors.border.primary}66`,
      borderRadius: 0,
      padding: 16,
      paddingHorizontal: 4,
    },
    detailed: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
      borderRadius: 16,
      borderLeftWidth: 4,
      borderLeftColor: brandColor,
      padding: 24,
    },
    grid: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
      borderRadius: 14,
      padding: 20,
      overflow: 'hidden' as const,
    },
    checklist: {
      backgroundColor: 'transparent',
      borderRadius: 0,
      padding: 16,
      paddingHorizontal: 4,
    },
  }

  return styles[layout]
}

export function ProgressCard({ completed, total }: ProgressCardProps) {
  const theme = useAppTheme()
  const layout = useLayoutStore((s) => s.taskLayout)
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
  const remaining = total - completed
  const cardStyle = useCardStyle(layout)

  const isCompact = layout === 'compact' || layout === 'minimal' || layout === 'checklist'
  const circleSize = isCompact ? 72 : 100
  const circleStroke = isCompact ? 7 : 9

  return (
    <View className="mx-5" style={cardStyle}>
      {layout === 'grid' && (
        <View
          style={{
            height: 3,
            backgroundColor: theme.colors.brand.primary,
            marginTop: -20,
            marginHorizontal: -20,
            marginBottom: 16,
          }}
        />
      )}
      <View className="flex-row items-center gap-6">
        <CircularProgress progress={percentage} size={circleSize} strokeWidth={circleStroke} />
        <View className="flex-1">
          <Text
            className={`${isCompact ? 'text-base' : 'text-xl'} font-medium text-content-primary mb-4`}
          >
            Today&apos;s Progress
          </Text>
          <View className="flex-row gap-10">
            <View className="items-center">
              <Text
                className={`${isCompact ? 'text-2xl' : 'text-4xl'} font-bold text-brand-primary`}
              >
                {completed}
              </Text>
              <Text className={`${isCompact ? 'text-sm' : 'text-base'} text-content-secondary`}>
                Completed
              </Text>
            </View>
            <View className="items-center">
              <Text
                className={`${isCompact ? 'text-2xl' : 'text-4xl'} font-bold`}
                style={{ color: theme.colors.accent.terracotta }}
              >
                {remaining}
              </Text>
              <Text className={`${isCompact ? 'text-sm' : 'text-base'} text-content-secondary`}>
                Unfinished
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}
