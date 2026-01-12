import React, { useEffect, useMemo } from 'react'
import { View, Animated, Easing } from 'react-native'

import { Card } from '~/components/ui'

function SkeletonBox({ className }: { className?: string }) {
  const opacity = useMemo(() => new Animated.Value(0.3), [])

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    )
    animation.start()
    return () => animation.stop()
  }, [opacity])

  return (
    <Animated.View
      style={{ opacity }}
      className={`bg-slate-200 dark:bg-slate-700 rounded-lg ${className || ''}`}
    />
  )
}

function SkeletonMetricCard() {
  return (
    <Card className="p-5">
      <View className="flex-row items-center gap-4">
        {/* Circle skeleton for icon/progress */}
        <SkeletonBox className="w-14 h-14 rounded-full" />

        {/* Content skeleton */}
        <View className="flex-1">
          <SkeletonBox className="h-4 w-24 mb-2" />
          <SkeletonBox className="h-8 w-16" />
        </View>
      </View>
    </Card>
  )
}

export function AnalyticsSkeleton() {
  return (
    <View className="px-5 gap-4">
      <SkeletonMetricCard />
      <SkeletonMetricCard />
      <SkeletonMetricCard />
      <SkeletonMetricCard />
    </View>
  )
}
