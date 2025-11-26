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
    <View className="bg-slate-800/50 rounded-2xl p-5 mx-5 border border-slate-700/50">
      <View className="flex-row items-center gap-5">
        <CircularProgress progress={percentage} size={90} strokeWidth={8} />
        <View className="flex-1">
          <Text className="text-sm text-slate-400 mb-3">Today&apos;s Progress</Text>
          <View className="flex-row gap-6">
            <View>
              <Text className="text-2xl font-bold text-purple-400">{completed}</Text>
              <Text className="text-sm text-slate-400">Completed</Text>
            </View>
            <View>
              <Text className="text-2xl font-bold text-white">{remaining}</Text>
              <Text className="text-sm text-slate-400">Remaining</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}
