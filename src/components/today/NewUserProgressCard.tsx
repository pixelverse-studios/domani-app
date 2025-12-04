import React from 'react'
import { View } from 'react-native'
import { TrendingUp } from 'lucide-react-native'

import { Text } from '~/components/ui'

export function ProgressPlaceholderCard() {
  const iconColor = '#a855f7' // purple-500 - consistent across themes

  return (
    <View className="bg-slate-100/80 dark:bg-slate-800/50 rounded-2xl p-5 mx-5 border border-dashed border-slate-300 dark:border-slate-600">
      <View className="flex-row items-center gap-4">
        <View className="w-12 h-12 rounded-full bg-purple-500/20 items-center justify-center">
          <TrendingUp size={24} color={iconColor} />
        </View>
        <View className="flex-1">
          <Text className="text-base text-slate-500 dark:text-slate-300">
            Your progress will be tracked here once you add tasks
          </Text>
        </View>
      </View>
    </View>
  )
}

// Keep backward compatibility alias
export const NewUserProgressCard = ProgressPlaceholderCard
