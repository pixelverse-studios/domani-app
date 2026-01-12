import React, { useState, useCallback } from 'react'
import { View, ScrollView, RefreshControl } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { Calendar, Flame, Target, CheckCircle2 } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { MetricCard, AnalyticsSkeleton, AnalyticsEmptyState } from '~/components/analytics'
import { useAnalyticsSummary } from '~/hooks/useAnalytics'
import { colors } from '~/theme'

export default function AnalyticsScreen() {
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)

  const { data: analytics, isLoading, error } = useAnalyticsSummary()

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['analytics'] })
    setRefreshing(false)
  }, [queryClient])

  // Loading state
  if (isLoading && !refreshing) {
    return (
      <View className="flex-1 bg-white dark:bg-slate-950">
        <View className="px-5 pt-4 pb-2">
          <Text variant="title">Analytics</Text>
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
      <View className="flex-1 items-center justify-center bg-white dark:bg-slate-950 px-6">
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
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View className="px-5 pt-4 pb-2">
          <Text variant="title">Analytics</Text>
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
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Header */}
      <View className="px-5 pt-4 pb-4">
        <Text variant="title">Analytics</Text>
        <Text variant="caption" className="mt-1">
          Track your productivity trends
        </Text>
      </View>

      {/* Metrics Grid */}
      <View className="px-5 gap-4 pb-8">
        {/* Completion Rate - uses progress ring */}
        <MetricCard
          title="Completion Rate"
          value={analytics.completionRate ?? '--'}
          showProgress={analytics.completionRate !== null}
          progress={analytics.completionRate ?? 0}
          subtitle="Overall task completion"
          icon={CheckCircle2}
          accentColor={colors.success}
        />

        {/* Planning Streak */}
        <MetricCard
          title="Planning Streak"
          value={analytics.planningStreak ?? '--'}
          subtitle={analytics.planningStreak === 1 ? 'day' : 'days'}
          icon={Calendar}
          accentColor={colors.primary}
        />

        {/* Execution Streak */}
        <MetricCard
          title="Execution Streak"
          value={analytics.executionStreak ?? '--'}
          subtitle={analytics.executionStreak === 1 ? 'day' : 'days'}
          icon={Flame}
          accentColor="#f97316" // orange-500
        />

        {/* MIT Completion Rate - uses progress ring */}
        <MetricCard
          title="MIT Completion"
          value={analytics.mitCompletionRate ?? '--'}
          showProgress={analytics.mitCompletionRate !== null}
          progress={analytics.mitCompletionRate ?? 0}
          subtitle="Most Important Tasks"
          icon={Target}
          accentColor={colors.primary}
        />
      </View>
    </ScrollView>
  )
}
