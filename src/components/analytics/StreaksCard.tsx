import React, { useEffect, useState } from 'react'
import { View } from 'react-native'
import { Calendar, Flame, Target } from 'lucide-react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
  useAnimatedReaction,
} from 'react-native-reanimated'

import { Text, Card } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'

// Animation timing - faster than main chart (secondary content)
const ICON_DURATION = 400
const NUMBER_DURATION = 600
const STAGGER_DELAY = 50
const INITIAL_DELAY = 100

interface StreaksCardProps {
  planningStreak: number | null
  executionStreak: number | null
  mitCompletionRate: number | null
  animationKey?: number
}

interface AnimatedMetricProps {
  icon: React.ReactNode
  value: number | null
  suffix?: string
  label: string
  sublabel: string
  index: number
  animationKey: number
}

function AnimatedMetric({
  icon,
  value,
  suffix = '',
  label,
  sublabel,
  index,
  animationKey,
}: AnimatedMetricProps) {
  const hasData = value !== null
  const targetValue = value ?? 0

  // Animation values
  const iconScale = useSharedValue(0.85)
  const iconOpacity = useSharedValue(0)
  const contentOpacity = useSharedValue(0)
  const animatedNumber = useSharedValue(0)

  // State for displayed number
  const [displayedNumber, setDisplayedNumber] = useState(0)

  // Update displayed number from animation
  useAnimatedReaction(
    () => Math.round(animatedNumber.value),
    (currentValue) => {
      runOnJS(setDisplayedNumber)(currentValue)
    },
    [animatedNumber],
  )

  useEffect(() => {
    const baseDelay = INITIAL_DELAY + index * STAGGER_DELAY

    // Reset
    iconScale.value = 0.85
    iconOpacity.value = 0
    contentOpacity.value = 0
    animatedNumber.value = 0
    setDisplayedNumber(0)

    // Icon entrance: fade + scale
    iconOpacity.value = withDelay(
      baseDelay,
      withTiming(1, { duration: ICON_DURATION, easing: Easing.out(Easing.cubic) }),
    )
    iconScale.value = withDelay(
      baseDelay,
      withTiming(1, { duration: ICON_DURATION, easing: Easing.out(Easing.cubic) }),
    )

    // Content fade in (slightly after icon starts)
    contentOpacity.value = withDelay(
      baseDelay + 50,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }),
    )

    // Number roll (starts after icon is partially visible)
    if (hasData) {
      animatedNumber.value = withDelay(
        baseDelay + 100,
        withTiming(targetValue, { duration: NUMBER_DURATION, easing: Easing.out(Easing.quad) }),
      )
    }
  }, [
    animationKey,
    index,
    targetValue,
    hasData,
    iconScale,
    iconOpacity,
    contentOpacity,
    animatedNumber,
  ])

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value }],
  }))

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }))

  return (
    <View className="flex-1 items-center">
      <Animated.View
        className="w-11 h-11 rounded-full items-center justify-center mb-2"
        style={iconAnimatedStyle}
      >
        {icon}
      </Animated.View>
      <Animated.View style={contentAnimatedStyle} className="items-center">
        <Text className="text-2xl font-bold text-content-primary">
          {hasData ? `${displayedNumber}${suffix}` : '--'}
        </Text>
        <Text className="text-xs text-content-secondary text-center mt-0.5">
          {label}
        </Text>
        <Text className="text-xs text-content-tertiary">{sublabel}</Text>
      </Animated.View>
    </View>
  )
}

export function StreaksCard({
  planningStreak,
  executionStreak,
  mitCompletionRate,
  animationKey = 0,
}: StreaksCardProps) {
  const theme = useAppTheme()
  const brandColor = theme.colors.brand.primary

  return (
    <Card className="p-5">
      {/* Section header */}
      <Text className="text-xs font-medium text-content-tertiary uppercase tracking-wide mb-4">
        Streaks & Focus
      </Text>

      {/* Horizontal row of metrics */}
      <View className="flex-row justify-between">
        {/* Planning Streak */}
        <AnimatedMetric
          icon={
            <View
              className="w-11 h-11 rounded-full items-center justify-center"
              style={{ backgroundColor: `${brandColor}20` }}
            >
              <Calendar size={22} color={brandColor} strokeWidth={1.5} />
            </View>
          }
          value={planningStreak}
          label="Planning"
          sublabel="streak"
          index={0}
          animationKey={animationKey}
        />

        {/* Divider */}
        <View className="w-px mx-3" style={{ backgroundColor: theme.colors.border.divider }} />

        {/* Execution Streak */}
        <AnimatedMetric
          icon={
            <View
              className="w-11 h-11 rounded-full items-center justify-center"
              style={{ backgroundColor: '#f9731620' }}
            >
              <Flame size={22} color="#f97316" strokeWidth={1.5} />
            </View>
          }
          value={executionStreak}
          label="Execution"
          sublabel="streak"
          index={1}
          animationKey={animationKey}
        />

        {/* Divider */}
        <View className="w-px mx-3" style={{ backgroundColor: theme.colors.border.divider }} />

        {/* MIT Completion */}
        <AnimatedMetric
          icon={
            <View
              className="w-11 h-11 rounded-full items-center justify-center"
              style={{ backgroundColor: `${brandColor}20` }}
            >
              <Target size={22} color={brandColor} strokeWidth={1.5} />
            </View>
          }
          value={mitCompletionRate}
          suffix="%"
          label="MIT"
          sublabel="completion"
          index={2}
          animationKey={animationKey}
        />
      </View>
    </Card>
  )
}
