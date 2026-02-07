import React from 'react'
import { View } from 'react-native'
import { TrendingUp } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'

export function ProgressPlaceholderCard() {
  const theme = useAppTheme()
  const brandColor = theme.colors.brand.primary

  return (
    <View
      className="rounded-2xl p-5 mx-5 border border-dashed"
      style={{ backgroundColor: theme.colors.card, borderColor: theme.colors.border.primary }}
    >
      <View className="flex-row items-center gap-4">
        <View
          className="w-12 h-12 rounded-full items-center justify-center"
          style={{ backgroundColor: `${brandColor}1A` }}
        >
          <TrendingUp size={24} color={brandColor} />
        </View>
        <View className="flex-1">
          <Text className="text-base text-content-secondary">
            Your progress will be tracked here once you add tasks
          </Text>
        </View>
      </View>
    </View>
  )
}

// Keep backward compatibility alias
export const NewUserProgressCard = ProgressPlaceholderCard
