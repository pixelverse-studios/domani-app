import React from 'react'
import { View } from 'react-native'
import { Target } from 'lucide-react-native'

import { Text } from '~/components/ui'
import type { TaskWithCategory } from '~/types'

interface FocusCardProps {
  task?: TaskWithCategory | null
}

export function FocusCard({ task }: FocusCardProps) {
  const isEmpty = !task
  const iconColor = '#a855f7' // purple-500 - consistent across themes

  return (
    <View className="bg-slate-100/80 dark:bg-slate-800/50 rounded-2xl p-5 mx-5 border border-slate-200/50 dark:border-slate-700/50">
      <View className="flex-row items-center gap-3">
        <View className="w-12 h-12 rounded-full bg-purple-500/20 items-center justify-center">
          <Target size={24} color={iconColor} />
        </View>
        <View className="flex-1">
          <Text className="text-sm text-slate-500 dark:text-slate-400 mb-1">
            Today&apos;s Focus
          </Text>
          {isEmpty ? (
            <Text className="text-base text-slate-600 dark:text-slate-300">
              No focus set for today.
            </Text>
          ) : (
            <Text
              className="text-base text-slate-900 dark:text-white font-medium"
              numberOfLines={2}
            >
              {task.title}
            </Text>
          )}
        </View>
      </View>
    </View>
  )
}
