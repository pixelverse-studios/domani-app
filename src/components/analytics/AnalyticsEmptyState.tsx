import React from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { BarChart3, Plus } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'

import { Text } from '~/components/ui'
import { colors } from '~/theme'

export function AnalyticsEmptyState() {
  const router = useRouter()
  const iconColor = '#a855f7' // purple-500

  const handleStartPlanning = () => {
    router.push('/(tabs)/planning?defaultPlanningFor=today&openForm=true')
  }

  return (
    <View className="items-center justify-center px-8 py-12">
      {/* Icon with purple circular background */}
      <View className="w-20 h-20 rounded-full bg-purple-500/20 items-center justify-center mb-6">
        <BarChart3 size={36} color={iconColor} />
      </View>

      {/* Heading */}
      <Text className="text-xl font-semibold text-slate-900 dark:text-white mb-3 text-center">
        No analytics yet
      </Text>

      {/* Description */}
      <Text className="text-base text-slate-500 dark:text-slate-400 text-center mb-8 max-w-[280px]">
        Start planning your days to see your productivity insights and trends here.
      </Text>

      {/* CTA Button - gradient background */}
      <TouchableOpacity
        onPress={handleStartPlanning}
        activeOpacity={0.8}
        style={styles.buttonContainer}
      >
        <LinearGradient
          colors={[colors.brand.pink, colors.brand.pink, colors.brand.purple] as const}
          locations={[0, 0.6, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          <Plus size={20} color="#ffffff" />
          <Text className="text-white font-semibold text-base ml-2">Start Planning</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  buttonContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
})
