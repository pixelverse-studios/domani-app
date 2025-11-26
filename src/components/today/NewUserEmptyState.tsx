import React from 'react'
import { View, TouchableOpacity } from 'react-native'
import { Calendar, Plus } from 'lucide-react-native'
import { useRouter } from 'expo-router'

import { Text } from '~/components/ui'

export function NewUserEmptyState() {
  const router = useRouter()

  const handlePlanToday = () => {
    router.push('/plan')
  }

  return (
    <View className="items-center justify-center py-12 mx-5">
      {/* Icon with purple gradient background */}
      <View className="w-20 h-20 rounded-full bg-purple-500/20 items-center justify-center mb-6">
        <Calendar size={36} color="#a855f7" />
      </View>

      {/* Heading */}
      <Text className="text-xl font-semibold text-white mb-2">No tasks planned yet</Text>

      {/* Subtext */}
      <Text className="text-base text-slate-400 text-center mb-6">
        Visit the Planning screen to add tasks for today
      </Text>

      {/* CTA Button */}
      <TouchableOpacity
        onPress={handlePlanToday}
        activeOpacity={0.8}
        className="flex-row items-center gap-2 bg-purple-500 px-6 py-3 rounded-full"
      >
        <Plus size={20} color="#ffffff" />
        <Text className="text-white font-semibold text-base">Plan Today</Text>
      </TouchableOpacity>
    </View>
  )
}
