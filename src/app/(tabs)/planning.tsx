import React from 'react'
import { View } from 'react-native'
import { Text } from '~/components/ui'

export default function PlanningScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-slate-950 px-6">
      <Text variant="title" className="mb-2">
        Planning
      </Text>
      <Text variant="caption" className="text-center">
        Evening planning screen coming soon. Plan tomorrow&apos;s tasks tonight.
      </Text>
    </View>
  )
}
