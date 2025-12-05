import React, { useEffect } from 'react'
import { View, TouchableOpacity } from 'react-native'
import { Calendar } from 'lucide-react-native'
import { format, addDays } from 'date-fns'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated'

import { Text } from '~/components/ui'
import { useTheme } from '~/hooks/useTheme'

type PlanningTarget = 'today' | 'tomorrow'

const TOGGLE_PADDING = 4
const TODAY_WIDTH = 68
const TOMORROW_WIDTH = 92

// Spring config for fluid, water-like motion
const FLUID_SPRING = {
  damping: 15,
  stiffness: 150,
  mass: 1,
}

// Slightly stiffer spring for width (settles faster)
const WIDTH_SPRING = {
  damping: 18,
  stiffness: 180,
  mass: 1,
}

function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th'
  switch (day % 10) {
    case 1:
      return 'st'
    case 2:
      return 'nd'
    case 3:
      return 'rd'
    default:
      return 'th'
  }
}

interface PlanningHeaderProps {
  selectedTarget: PlanningTarget
  onTargetChange: (target: PlanningTarget) => void
}

export function PlanningHeader({ selectedTarget, onTargetChange }: PlanningHeaderProps) {
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'

  const targetDate = selectedTarget === 'today' ? new Date() : addDays(new Date(), 1)
  const dayOfWeek = format(targetDate, 'EEEE')
  const month = format(targetDate, 'MMMM')
  const day = targetDate.getDate()
  const formattedDate = `${dayOfWeek}, ${month} ${day}${getOrdinalSuffix(day)}`

  const purpleColor = isDark ? '#a78bfa' : '#8b5cf6'
  const calendarIconColor = isDark ? '#a78bfa' : '#7c3aed'

  // Animation values
  const indicatorPosition = useSharedValue(selectedTarget === 'today' ? 0 : TODAY_WIDTH)
  const indicatorWidth = useSharedValue(selectedTarget === 'today' ? TODAY_WIDTH : TOMORROW_WIDTH)
  const scaleY = useSharedValue(1)
  const scaleX = useSharedValue(1)

  useEffect(() => {
    const targetPosition = selectedTarget === 'today' ? 0 : TODAY_WIDTH
    const targetWidth = selectedTarget === 'today' ? TODAY_WIDTH : TOMORROW_WIDTH

    // Fluid squash/stretch animation - compress vertically and stretch horizontally when moving
    scaleY.value = withSequence(withTiming(0.85, { duration: 100 }), withSpring(1, FLUID_SPRING))
    scaleX.value = withSequence(withTiming(1.08, { duration: 100 }), withSpring(1, FLUID_SPRING))

    // Main position animation with spring physics
    indicatorPosition.value = withSpring(targetPosition, FLUID_SPRING)

    // Width animates with slightly different spring for organic feel
    indicatorWidth.value = withSpring(targetWidth, WIDTH_SPRING)
  }, [selectedTarget, indicatorPosition, indicatorWidth, scaleX, scaleY])

  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: indicatorPosition.value },
      { scaleX: scaleX.value },
      { scaleY: scaleY.value },
    ],
    width: indicatorWidth.value,
  }))

  return (
    <View className="px-5 pt-4 pb-2">
      {/* Top row: Planning for label + toggle */}
      <View className="flex-row items-center justify-between mb-6">
        {/* Planning for label with calendar icon */}
        <View className="flex-row items-center">
          <Calendar size={18} color={calendarIconColor} />
          <Text className="font-sans-medium ml-2" style={{ fontSize: 16, color: purpleColor }}>
            Planning for
          </Text>
        </View>

        {/* Today/Tomorrow Toggle with Animation */}
        <View
          className="flex-row bg-slate-200 dark:bg-slate-800 rounded-full"
          style={{ padding: TOGGLE_PADDING }}
        >
          {/* Animated sliding indicator */}
          <Animated.View
            className="absolute bg-purple-600 rounded-full"
            style={[
              {
                top: TOGGLE_PADDING,
                left: TOGGLE_PADDING,
                height: 36,
              },
              animatedIndicatorStyle,
            ]}
          />

          {/* Today button */}
          <TouchableOpacity
            onPress={() => onTargetChange('today')}
            className="items-center justify-center rounded-full"
            style={{ width: TODAY_WIDTH, height: 36 }}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedTarget === 'today' }}
          >
            <Animated.Text
              className={`font-sans-medium ${
                selectedTarget === 'today' ? 'text-white' : 'text-slate-500 dark:text-slate-400'
              }`}
              style={{ fontSize: 14 }}
            >
              Today
            </Animated.Text>
          </TouchableOpacity>

          {/* Tomorrow button */}
          <TouchableOpacity
            onPress={() => onTargetChange('tomorrow')}
            className="items-center justify-center rounded-full"
            style={{ width: TOMORROW_WIDTH, height: 36 }}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedTarget === 'tomorrow' }}
          >
            <Animated.Text
              className={`font-sans-medium ${
                selectedTarget === 'tomorrow' ? 'text-white' : 'text-slate-500 dark:text-slate-400'
              }`}
              style={{ fontSize: 14 }}
            >
              Tomorrow
            </Animated.Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Date display */}
      <View>
        {/* Today/Tomorrow - large title */}
        <Text
          className="font-sans-bold text-slate-900 dark:text-white mb-1"
          style={{ fontSize: 36, lineHeight: 44 }}
        >
          {selectedTarget === 'today' ? 'Today' : 'Tomorrow'}
        </Text>
        {/* Full date */}
        <Text className="font-sans text-slate-500 dark:text-slate-400" style={{ fontSize: 18 }}>
          {formattedDate}
        </Text>
      </View>
    </View>
  )
}
