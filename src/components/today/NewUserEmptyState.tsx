import React from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Calendar, Plus } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'

import { Text } from '~/components/ui'
import { colors } from '~/theme'

export function EmptyState() {
  const router = useRouter()
  const iconColor = '#a855f7' // purple-500

  const handlePlanToday = () => {
    router.push('/(tabs)/planning?defaultPlanningFor=today')
  }

  return (
    <View className="items-center justify-center mx-5 mt-8">
      {/* Icon with purple circular background */}
      <View className="w-20 h-20 rounded-full bg-purple-500/20 items-center justify-center mb-6">
        <Calendar size={36} color={iconColor} />
      </View>

      {/* Heading */}
      <Text className="text-xl font-semibold text-slate-900 dark:text-white mb-8">
        No tasks planned yet
      </Text>

      {/* CTA Button - gradient background */}
      <TouchableOpacity
        onPress={handlePlanToday}
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
          <Text className="text-white font-semibold text-base ml-2">Plan Today</Text>
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

// Keep backward compatibility alias
export const NewUserEmptyState = EmptyState
