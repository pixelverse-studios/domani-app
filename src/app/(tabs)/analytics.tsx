import React, { useState, useCallback } from 'react'
import { View, ScrollView, RefreshControl } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQueryClient } from '@tanstack/react-query'

import { Text } from '~/components/ui'
import {
  AnalyticsSkeleton,
  AnalyticsEmptyState,
  DailyCompletionChart,
  StreaksCard,
} from '~/components/analytics'
import { useAnalyticsSummary, useDailyCompletions } from '~/hooks/useAnalytics'
import { colors } from '~/theme'

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)

  const { data: analytics, isLoading, error } = useAnalyticsSummary()
  const { data: dailyData } = useDailyCompletions(7)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['analytics'] })
    setRefreshing(false)
  }, [queryClient])

  // Loading state
  if (isLoading && !refreshing) {
    return (
      <View className="flex-1 bg-white dark:bg-slate-950">
        <View className="px-5 pb-2" style={{ paddingTop: insets.top + 16 }}>
          <Text variant="title">Progress</Text>
          <Text variant="caption" className="mt-1">
            Track your productivity trends
          </Text>
        </View>
        <AnalyticsSkeleton />
      </View>
    )
  }

  // Error state
  if (error) {
    return (
      <View
        className="flex-1 items-center justify-center bg-white dark:bg-slate-950 px-6"
        style={{ paddingTop: insets.top }}
      >
        <Text variant="title" className="mb-2">
          Something went wrong
        </Text>
        <Text variant="caption" className="text-center">
          Unable to load analytics. Pull down to retry.
        </Text>
      </View>
    )
  }

  // Empty state - no data yet
  if (!analytics?.hasData) {
    return (
      <ScrollView
        className="flex-1 bg-white dark:bg-slate-950"
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View className="px-5 pt-4 pb-2">
          <Text variant="title">Progress</Text>
          <Text variant="caption" className="mt-1">
            Track your productivity trends
          </Text>
        </View>
        <View className="flex-1 justify-center">
          <AnalyticsEmptyState />
        </View>
      </ScrollView>
    )
  }

  // Main analytics view with metrics
  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-slate-950"
      contentContainerStyle={{ paddingTop: insets.top }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Header */}
      <View className="px-5 pt-4 pb-4">
        <Text variant="title">Progress</Text>
        <Text variant="caption" className="mt-1">
          Track your productivity trends
        </Text>
      </View>

      {/* Metrics Grid */}
      <View className="px-5 gap-4 pb-8">
        {/* Daily Completion Chart - combines completion rate, chart, and category breakdown */}
        {dailyData && dailyData.length > 0 && (
          <DailyCompletionChart dailyData={dailyData} completionRate={analytics.completionRate} />
        )}

        {/* Streaks & Focus Card - Combined view of all streak metrics */}
        <StreaksCard
          planningStreak={analytics.planningStreak}
          executionStreak={analytics.executionStreak}
          mitCompletionRate={analytics.mitCompletionRate}
        />
      </View>
    </ScrollView>
  )
}
