import React from 'react'
import { View } from 'react-native'
import { Text } from '~/components/ui'

export default function FeedbackScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-slate-950 px-6">
      <Text variant="title" className="mb-2">
        Feedback
      </Text>
      <Text variant="caption" className="text-center">
        Share your thoughts and help us improve Domani.
      </Text>
    </View>
  )
}
