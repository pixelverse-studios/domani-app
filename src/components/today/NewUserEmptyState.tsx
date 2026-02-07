import React from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Calendar, Plus } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import { useTutorialTarget, useTutorialAdvancement } from '~/components/tutorial'

export function EmptyState() {
  const router = useRouter()
  const theme = useAppTheme()
  const brandColor = theme.colors.brand.primary
  const { targetRef, measureTarget } = useTutorialTarget('plan_today_button')
  const { advanceFromTodayButton } = useTutorialAdvancement()

  const handlePlanToday = () => {
    advanceFromTodayButton()
    router.push('/(tabs)/planning?defaultPlanningFor=today&openForm=true')
  }

  return (
    <View className="items-center justify-center mx-5 mt-8">
      {/* Icon with brand circular background */}
      <View
        className="w-20 h-20 rounded-full items-center justify-center mb-6"
        style={{ backgroundColor: `${brandColor}1A` }}
      >
        <Calendar size={36} color={brandColor} />
      </View>

      {/* Heading */}
      <Text className="text-xl font-semibold text-content-primary mb-8">
        No tasks planned yet
      </Text>

      {/* CTA Button - gradient background */}
      <View ref={targetRef} onLayout={measureTarget}>
        <TouchableOpacity
          onPress={handlePlanToday}
          activeOpacity={0.8}
          style={styles.buttonContainer}
        >
        <LinearGradient
          colors={[theme.colors.brand.primary, theme.colors.brand.primary, theme.colors.brand.dark] as const}
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
