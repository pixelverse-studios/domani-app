import React from 'react'
import { View } from 'react-native'
import { Trophy, Activity, CheckCircle2 } from 'lucide-react-native'

import { Text, Card } from '~/components/ui'
import { useTheme } from '~/hooks/useTheme'
import { DailyCompletionData } from '~/lib/analytics-queries'

interface WeeklySummaryCardProps {
  dailyData: DailyCompletionData[]
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

export function WeeklySummaryCard({ dailyData }: WeeklySummaryCardProps) {
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'
  const dividerColor = isDark ? 'bg-slate-700/50' : 'bg-slate-100'

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
      <Text className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-4">
        Weekly Summary
      </Text>

      {/* Horizontal row of metrics */}
      <View className="flex-row justify-between">
        {/* Most Productive Day */}
        <View className="flex-1 items-center">
          <View
            className="w-11 h-11 rounded-full items-center justify-center mb-2"
            style={{ backgroundColor: `${trophyColor}20` }}
          >
            <Trophy size={22} color={trophyColor} strokeWidth={1.5} />
          </View>
          <Text className="text-base font-bold text-slate-900 dark:text-white">
            {hasProductiveData ? mostProductiveDay.dayLabel : '--'}
          </Text>
          <Text className="text-xs text-slate-500 dark:text-slate-400 text-center mt-0.5">
            {hasProductiveData ? `${mostProductiveDay.taskCount} tasks` : 'Best day'}
          </Text>
          <Text className="text-xs text-slate-400 dark:text-slate-500">completed</Text>
        </View>

        {/* Divider */}
        <View className={`w-px ${dividerColor} mx-3`} />

        {/* Consistency Score */}
        <View className="flex-1 items-center">
          <View
            className="w-11 h-11 rounded-full items-center justify-center mb-2"
            style={{ backgroundColor: `${activityColor}20` }}
          >
            <Activity size={22} color={activityColor} strokeWidth={1.5} />
          </View>
          <Text className="text-base font-bold text-slate-900 dark:text-white">
            {hasConsistencyData ? getConsistencyLabel(consistencyScore) : '--'}
          </Text>
          <Text className="text-xs text-slate-500 dark:text-slate-400 text-center mt-0.5">
            {hasConsistencyData ? `${consistencyScore}%` : 'Consistency'}
          </Text>
          <Text className="text-xs text-slate-400 dark:text-slate-500">score</Text>
        </View>

        {/* Divider */}
        <View className={`w-px ${dividerColor} mx-3`} />

        {/* Perfect Days */}
        <View className="flex-1 items-center">
          <View
            className="w-11 h-11 rounded-full items-center justify-center mb-2"
            style={{ backgroundColor: `${checkColor}20` }}
          >
            <CheckCircle2 size={22} color={checkColor} strokeWidth={1.5} />
          </View>
          <Text className="text-2xl font-bold text-slate-900 dark:text-white">{perfectDays}</Text>
          <Text className="text-xs text-slate-500 dark:text-slate-400 text-center mt-0.5">
            Perfect
          </Text>
          <Text className="text-xs text-slate-400 dark:text-slate-500">
            {perfectDays === 1 ? 'day' : 'days'}
          </Text>
        </View>
      </View>
    </Card>
  )
}
