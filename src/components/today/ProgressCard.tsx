import React from 'react'
import { View } from 'react-native'

import { Text } from '~/components/ui'
import { CircularProgress } from '~/components/ui/CircularProgress'

interface ProgressCardProps {
  completed: number
  total: number
}

export function ProgressCard({ completed, total }: ProgressCardProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
  const remaining = total - completed

  return (
    <View className="bg-slate-100 dark:bg-[#1A1A1F] rounded-2xl p-6 mx-5 border border-slate-200/50 dark:border-slate-800/80">
      <View className="flex-row items-center gap-6">
        <CircularProgress progress={percentage} size={100} strokeWidth={9} />
        <View className="flex-1">
          <Text className="text-xl font-medium text-slate-700 dark:text-slate-300 mb-4">
            Today&apos;s Progress
          </Text>
          <View className="flex-row gap-10">
            <View className="items-center">
              <Text className="text-4xl font-bold text-green-500 dark:text-green-400">
                {completed}
              </Text>
              <Text className="text-base text-slate-500 dark:text-slate-500">Completed</Text>
            </View>
            <View className="items-center">
              <Text className="text-4xl font-bold text-orange-500 dark:text-orange-400">
                {remaining}
              </Text>
              <Text className="text-base text-slate-500 dark:text-slate-500">Remaining</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}
