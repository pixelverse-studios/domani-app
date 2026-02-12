import React, { useMemo, useEffect } from 'react'
import { View, Dimensions } from 'react-native'
import Svg, { Rect, G, ClipPath, Defs, Text as SvgText } from 'react-native-svg'
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
  SharedValue,
} from 'react-native-reanimated'

import { Text, Card } from '~/components/ui'
import { CircularProgress } from '~/components/ui/CircularProgress'
import { useAppTheme } from '~/hooks/useAppTheme'
import type { DailyCompletionData, CompletionRateData } from '~/lib/analytics-queries'

const AnimatedRect = Animated.createAnimatedComponent(Rect)

interface DailyCompletionChartProps {
  dailyData: DailyCompletionData[]
  completionRate: CompletionRateData | null
  animationKey?: number
}

interface BarSegment {
  color: string
  height: number
  y: number
}

interface AnimatedBarProps {
  segments: BarSegment[]
  barX: number
  barWidth: number
  chartHeight: number
  dayIndex: number
  animationKey: number
}

// Animation timing constants
const ANIMATION_DURATION = 500
const STAGGER_DELAY = 60

function AnimatedBar({
  segments,
  barX,
  barWidth,
  chartHeight,
  dayIndex,
  animationKey,
}: AnimatedBarProps) {
  const progress = useSharedValue(0)

  useEffect(() => {
    progress.value = 0
    progress.value = withDelay(
      dayIndex * STAGGER_DELAY,
      withTiming(1, {
        duration: ANIMATION_DURATION,
        easing: Easing.out(Easing.cubic),
      }),
    )
  }, [dayIndex, progress, animationKey])

  return (
    <>
      {segments.map((seg, segIndex) => (
        <AnimatedSegment
          key={segIndex}
          segment={seg}
          barX={barX}
          barWidth={barWidth}
          chartHeight={chartHeight}
          progress={progress}
        />
      ))}
    </>
  )
}

interface AnimatedSegmentProps {
  segment: BarSegment
  barX: number
  barWidth: number
  chartHeight: number
  progress: SharedValue<number>
}

function AnimatedSegment({ segment, barX, barWidth, chartHeight, progress }: AnimatedSegmentProps) {
  const animatedProps = useAnimatedProps(() => {
    const animatedHeight = segment.height * progress.value
    const baseY = chartHeight - (chartHeight - segment.y) * progress.value

    return {
      y: baseY,
      height: animatedHeight + 1,
    }
  })

  return (
    <AnimatedRect x={barX} width={barWidth} fill={segment.color} animatedProps={animatedProps} />
  )
}

// Get unique categories across all days
function getUniqueCategories(
  dailyData: DailyCompletionData[],
): { id: string; name: string; color: string }[] {
  const categoryMap = new Map<string, { id: string; name: string; color: string }>()

  for (const day of dailyData) {
    for (const cat of day.categories) {
      if (!categoryMap.has(cat.categoryId)) {
        categoryMap.set(cat.categoryId, {
          id: cat.categoryId,
          name: cat.categoryName,
          color: cat.categoryColor,
        })
      }
    }
  }

  return Array.from(categoryMap.values())
}

export function DailyCompletionChart({
  dailyData,
  completionRate,
  animationKey = 0,
}: DailyCompletionChartProps) {
  const theme = useAppTheme()
  const screenWidth = Dimensions.get('window').width

  // Get unique categories
  const categories = useMemo(() => getUniqueCategories(dailyData), [dailyData])

  // Colors
  const incompleteColor = theme.colors.border.primary
  const labelColor = theme.colors.text.tertiary

  // Chart dimensions
  const chartPadding = 40
  const chartWidth = screenWidth - chartPadding * 2 - 40
  const chartHeight = 140
  const barRadius = 8
  const labelHeight = 20
  const barWidth = 32
  const spacing = (chartWidth - barWidth * 7) / 8

  // Calculate max value for scaling
  const maxValue = useMemo(() => {
    let max = 0
    for (const day of dailyData) {
      const total = day.totalCompleted + day.totalIncomplete
      if (total > max) max = total
    }
    return Math.max(max, 5)
  }, [dailyData])

  // Pre-compute bar data with segments
  const barData = useMemo(() => {
    return dailyData.map((day, dayIndex) => {
      const barX = spacing + dayIndex * (barWidth + spacing)
      const segments: BarSegment[] = []
      let currentY = chartHeight

      // Add completed by category
      for (const category of categories) {
        const dayCategory = day.categories.find((c) => c.categoryId === category.id)
        const completed = dayCategory?.completed ?? 0
        if (completed > 0) {
          const height = (completed / maxValue) * chartHeight
          currentY -= height
          segments.push({
            color: category.color,
            height,
            y: currentY,
          })
        }
      }

      // Add incomplete on top
      if (day.totalIncomplete > 0) {
        const height = (day.totalIncomplete / maxValue) * chartHeight
        currentY -= height
        segments.push({
          color: incompleteColor,
          height,
          y: currentY,
        })
      }

      return { day, dayIndex, barX, segments }
    })
  }, [dailyData, categories, maxValue, chartHeight, spacing, barWidth, incompleteColor])

  // Overall stats
  const overallRate = completionRate?.overall ?? 0
  const totalCompleted = completionRate?.completed ?? 0
  const totalTasks = completionRate?.total ?? 0

  return (
    <Card className="p-5 overflow-hidden">
      {/* Header with overall completion rate */}
      <View className="flex-row items-center mb-5">
        <CircularProgress
          progress={overallRate}
          size={72}
          strokeWidth={6}
          animationKey={animationKey}
        />
        <View className="ml-4 flex-1">
          <Text className="text-base font-semibold text-content-primary">Completion Rate</Text>
          <Text className="text-sm text-content-secondary mt-0.5">
            {totalCompleted} of {totalTasks} tasks done
          </Text>
        </View>
      </View>

      {/* Subtle divider */}
      <View className="h-px -mx-5 mb-4" style={{ backgroundColor: theme.colors.border.divider }} />

      {/* Section label */}
      <Text className="text-xs font-medium text-content-tertiary uppercase tracking-wide mb-3">
        Last 7 Days
      </Text>

      {/* Chart - Seamless stacked bars with clipPath */}
      <View className="items-center">
        <Svg width={chartWidth} height={chartHeight + labelHeight}>
          <Defs>
            {dailyData.map((_, dayIndex) => (
              <ClipPath key={`clip-${dayIndex}`} id={`clip-${dayIndex}`}>
                <Rect
                  x={spacing + dayIndex * (barWidth + spacing)}
                  y={0}
                  width={barWidth}
                  height={chartHeight}
                  rx={barRadius}
                  ry={barRadius}
                />
              </ClipPath>
            ))}
          </Defs>

          {barData.map(({ day, dayIndex, barX, segments }) => (
            <G key={day.date}>
              {/* Clipped bar group - segments blend seamlessly */}
              <G clipPath={`url(#clip-${dayIndex})`}>
                <AnimatedBar
                  segments={segments}
                  barX={barX}
                  barWidth={barWidth}
                  chartHeight={chartHeight}
                  dayIndex={dayIndex}
                  animationKey={animationKey}
                />
              </G>

              {/* Day label */}
              <SvgText
                x={barX + barWidth / 2}
                y={chartHeight + labelHeight - 4}
                fontSize={11}
                fontWeight="500"
                fill={labelColor}
                textAnchor="middle"
              >
                {day.dayLabel}
              </SvgText>
            </G>
          ))}
        </Svg>
      </View>

      {/* Category legend */}
      <View className="flex-row flex-wrap items-center justify-center mt-4 gap-x-4 gap-y-2">
        {categories.map((category) => (
          <View key={category.id} className="flex-row items-center">
            <View
              className="w-2.5 h-2.5 rounded-sm mr-1.5"
              style={{ backgroundColor: category.color }}
            />
            <Text className="text-xs text-content-secondary">{category.name}</Text>
          </View>
        ))}
        <View className="flex-row items-center">
          <View
            className="w-2.5 h-2.5 rounded-sm mr-1.5"
            style={{ backgroundColor: incompleteColor }}
          />
          <Text className="text-xs text-content-secondary">Unfinished</Text>
        </View>
      </View>
    </Card>
  )
}
