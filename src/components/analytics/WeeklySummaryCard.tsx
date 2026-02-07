import React, { useEffect, useState } from 'react'
import { View } from 'react-native'
import { Trophy, Activity, CheckCircle2 } from 'lucide-react-native'
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
import { DailyCompletionData } from '~/lib/analytics-queries'

// Animation timing - matches StreaksCard
const ICON_DURATION = 400
const NUMBER_DURATION = 600
const STAGGER_DELAY = 50
const INITIAL_DELAY = 150 // Slightly later since it's lower on screen

interface WeeklySummaryCardProps {
  dailyData: DailyCompletionData[]
  animationKey?: number
}

interface MostProductiveDay {
  dayLabel: string
  taskCount: number
}

/**
 * Find the day with the most completed tasks
 */
function getMostProductiveDay(dailyData: DailyCompletionData[]): MostProductiveDay | null {
  if (dailyData.length === 0) return null

  let best: MostProductiveDay | null = null

  for (const day of dailyData) {
    if (day.totalCompleted > 0 && (!best || day.totalCompleted > best.taskCount)) {
      best = { dayLabel: day.dayLabel, taskCount: day.totalCompleted }
    }
  }

  return best
}

/**
 * Calculate consistency score based on coefficient of variation
 * Lower variation = higher consistency
 * Returns 0-100 where 100 is perfectly consistent
 */
function getConsistencyScore(dailyData: DailyCompletionData[]): number | null {
  // Need at least 2 days with tasks to calculate consistency
  const daysWithTasks = dailyData.filter((d) => d.totalCompleted + d.totalIncomplete > 0)
  if (daysWithTasks.length < 2) return null

  const completionRates = daysWithTasks.map((d) => {
    const total = d.totalCompleted + d.totalIncomplete
    return total > 0 ? d.totalCompleted / total : 0
  })

  // Calculate mean
  const mean = completionRates.reduce((a, b) => a + b, 0) / completionRates.length
  if (mean === 0) return null

  // Calculate standard deviation
  const squaredDiffs = completionRates.map((rate) => Math.pow(rate - mean, 2))
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / completionRates.length
  const stdDev = Math.sqrt(variance)

  // Coefficient of variation (0 = perfectly consistent, higher = less consistent)
  const cv = stdDev / mean

  // Convert to 0-100 score where 100 is most consistent
  // CV typically ranges from 0 to 1+, so we cap and invert
  const score = Math.max(0, Math.min(100, Math.round((1 - cv) * 100)))

  return score
}

/**
 * Count days where all tasks were completed (100% completion)
 */
function getPerfectDaysCount(dailyData: DailyCompletionData[]): number {
  return dailyData.filter((d) => d.totalCompleted > 0 && d.totalIncomplete === 0).length
}

/**
 * Get a consistency label based on score
 */
function getConsistencyLabel(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 75) return 'Great'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Fair'
  return 'Building'
}

interface AnimatedMetricProps {
  icon: React.ReactNode
  index: number
  animationKey: number
  children: React.ReactNode
}

function AnimatedMetric({ icon, index, animationKey, children }: AnimatedMetricProps) {
  const iconScale = useSharedValue(0.85)
  const iconOpacity = useSharedValue(0)
  const contentOpacity = useSharedValue(0)

  useEffect(() => {
    const baseDelay = INITIAL_DELAY + index * STAGGER_DELAY

    // Reset
    iconScale.value = 0.85
    iconOpacity.value = 0
    contentOpacity.value = 0

    // Icon entrance: fade + scale
    iconOpacity.value = withDelay(
      baseDelay,
      withTiming(1, { duration: ICON_DURATION, easing: Easing.out(Easing.cubic) }),
    )
    iconScale.value = withDelay(
      baseDelay,
      withTiming(1, { duration: ICON_DURATION, easing: Easing.out(Easing.cubic) }),
    )

    // Content fade in
    contentOpacity.value = withDelay(
      baseDelay + 50,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }),
    )
  }, [animationKey, index, iconScale, iconOpacity, contentOpacity])

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
        {children}
      </Animated.View>
    </View>
  )
}

interface AnimatedNumberProps {
  value: number
  animationKey: number
  index: number
}

function AnimatedNumber({ value, animationKey, index }: AnimatedNumberProps) {
  const animatedNumber = useSharedValue(0)
  const [displayedNumber, setDisplayedNumber] = useState(0)

  useAnimatedReaction(
    () => Math.round(animatedNumber.value),
    (currentValue) => {
      runOnJS(setDisplayedNumber)(currentValue)
    },
    [animatedNumber],
  )

  useEffect(() => {
    const baseDelay = INITIAL_DELAY + index * STAGGER_DELAY + 100
    animatedNumber.value = 0
    setDisplayedNumber(0)
    animatedNumber.value = withDelay(
      baseDelay,
      withTiming(value, { duration: NUMBER_DURATION, easing: Easing.out(Easing.quad) }),
    )
  }, [animationKey, index, value, animatedNumber])

  return (
    <Text className="text-2xl font-bold text-content-primary">{displayedNumber}</Text>
  )
}

export function WeeklySummaryCard({ dailyData, animationKey = 0 }: WeeklySummaryCardProps) {
  const theme = useAppTheme()

  // Calculate metrics
  const mostProductiveDay = getMostProductiveDay(dailyData)
  const consistencyScore = getConsistencyScore(dailyData)
  const perfectDays = getPerfectDaysCount(dailyData)

  const hasProductiveData = mostProductiveDay !== null
  const hasConsistencyData = consistencyScore !== null

  // Color palette - using distinct colors for visual variety
  const trophyColor = '#eab308' // yellow-500 for trophy
  const activityColor = '#8b5cf6' // violet-500 for activity
  const checkColor = '#22c55e' // green-500 for perfect days

  return (
    <Card className="p-5">
      {/* Section header */}
      <Text className="text-xs font-medium text-content-tertiary uppercase tracking-wide mb-4">
        Weekly Summary
      </Text>

      {/* Horizontal row of metrics */}
      <View className="flex-row justify-between">
        {/* Most Productive Day */}
        <AnimatedMetric
          icon={
            <View
              className="w-11 h-11 rounded-full items-center justify-center"
              style={{ backgroundColor: `${trophyColor}20` }}
            >
              <Trophy size={22} color={trophyColor} strokeWidth={1.5} />
            </View>
          }
          index={0}
          animationKey={animationKey}
        >
          <Text className="text-base font-bold text-content-primary">
            {hasProductiveData ? mostProductiveDay.dayLabel : '--'}
          </Text>
          <Text className="text-xs text-content-secondary text-center mt-0.5">
            {hasProductiveData ? `${mostProductiveDay.taskCount} tasks` : 'Best day'}
          </Text>
          <Text className="text-xs text-content-tertiary">completed</Text>
        </AnimatedMetric>

        {/* Divider */}
        <View className="w-px mx-3" style={{ backgroundColor: theme.colors.border.divider }} />

        {/* Consistency Score */}
        <AnimatedMetric
          icon={
            <View
              className="w-11 h-11 rounded-full items-center justify-center"
              style={{ backgroundColor: `${activityColor}20` }}
            >
              <Activity size={22} color={activityColor} strokeWidth={1.5} />
            </View>
          }
          index={1}
          animationKey={animationKey}
        >
          <Text className="text-base font-bold text-content-primary">
            {hasConsistencyData ? getConsistencyLabel(consistencyScore) : '--'}
          </Text>
          <Text className="text-xs text-content-secondary text-center mt-0.5">
            {hasConsistencyData ? `${consistencyScore}%` : 'Consistency'}
          </Text>
          <Text className="text-xs text-content-tertiary">score</Text>
        </AnimatedMetric>

        {/* Divider */}
        <View className="w-px mx-3" style={{ backgroundColor: theme.colors.border.divider }} />

        {/* Perfect Days */}
        <AnimatedMetric
          icon={
            <View
              className="w-11 h-11 rounded-full items-center justify-center"
              style={{ backgroundColor: `${checkColor}20` }}
            >
              <CheckCircle2 size={22} color={checkColor} strokeWidth={1.5} />
            </View>
          }
          index={2}
          animationKey={animationKey}
        >
          <AnimatedNumber value={perfectDays} animationKey={animationKey} index={2} />
          <Text className="text-xs text-content-secondary text-center mt-0.5">
            Perfect
          </Text>
          <Text className="text-xs text-content-tertiary">
            {perfectDays === 1 ? 'day' : 'days'}
          </Text>
        </AnimatedMetric>
      </View>
    </Card>
  )
}
