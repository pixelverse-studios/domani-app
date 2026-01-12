import React, { useMemo } from 'react'
import { View, Dimensions } from 'react-native'
import Svg, { Rect, G, ClipPath, Defs, Text as SvgText } from 'react-native-svg'

import { Text, Card } from '~/components/ui'
import { CircularProgress } from '~/components/ui/CircularProgress'
import { useTheme } from '~/hooks/useTheme'
import type { DailyCompletionData, CompletionRateData } from '~/lib/analytics-queries'

interface DailyCompletionChartProps {
  dailyData: DailyCompletionData[]
  completionRate: CompletionRateData | null
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

export function DailyCompletionChart({ dailyData, completionRate }: DailyCompletionChartProps) {
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'
  const screenWidth = Dimensions.get('window').width

  // Get unique categories
  const categories = useMemo(() => getUniqueCategories(dailyData), [dailyData])

  // Colors
  const incompleteColor = isDark ? '#374151' : '#e2e8f0'
  const labelColor = isDark ? '#6b7280' : '#9ca3af'

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

  // Overall stats
  const overallRate = completionRate?.overall ?? 0
  const totalCompleted = completionRate?.completed ?? 0
  const totalTasks = completionRate?.total ?? 0

  return (
    <Card className="p-5 overflow-hidden">
      {/* Header with overall completion rate */}
      <View className="flex-row items-center mb-5">
        <CircularProgress progress={overallRate} size={72} strokeWidth={6} />
        <View className="ml-4 flex-1">
          <Text className="text-base font-semibold text-slate-700 dark:text-slate-200">
            Completion Rate
          </Text>
          <Text className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {totalCompleted} of {totalTasks} tasks done
          </Text>
        </View>
      </View>

      {/* Subtle divider */}
      <View className="h-px bg-slate-100 dark:bg-slate-700/50 -mx-5 mb-4" />

      {/* Section label */}
      <Text className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">
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

          {dailyData.map((day, dayIndex) => {
            const barX = spacing + dayIndex * (barWidth + spacing)

            // Build segments from bottom to top
            const segments: { color: string; height: number }[] = []

            // Add completed by category
            for (const category of categories) {
              const dayCategory = day.categories.find((c) => c.categoryId === category.id)
              const completed = dayCategory?.completed ?? 0
              if (completed > 0) {
                segments.push({
                  color: category.color,
                  height: (completed / maxValue) * chartHeight,
                })
              }
            }

            // Add incomplete on top
            if (day.totalIncomplete > 0) {
              segments.push({
                color: incompleteColor,
                height: (day.totalIncomplete / maxValue) * chartHeight,
              })
            }

            let currentY = chartHeight

            return (
              <G key={day.date}>
                {/* Clipped bar group - segments blend seamlessly */}
                <G clipPath={`url(#clip-${dayIndex})`}>
                  {segments.map((seg, segIndex) => {
                    currentY -= seg.height
                    return (
                      <Rect
                        key={segIndex}
                        x={barX}
                        y={currentY}
                        width={barWidth}
                        height={seg.height + 1}
                        fill={seg.color}
                      />
                    )
                  })}
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
            )
          })}
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
            <Text className="text-xs text-slate-500 dark:text-slate-400">{category.name}</Text>
          </View>
        ))}
        <View className="flex-row items-center">
          <View
            className="w-2.5 h-2.5 rounded-sm mr-1.5"
            style={{ backgroundColor: incompleteColor }}
          />
          <Text className="text-xs text-slate-500 dark:text-slate-400">Remaining</Text>
        </View>
      </View>
    </Card>
  )
}
