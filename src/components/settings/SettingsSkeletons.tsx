import React from 'react'
import { View } from 'react-native'

/**
 * Base skeleton box component for loading states
 */
export function SkeletonBox({ className }: { className?: string }) {
  return <View className={`bg-slate-200 dark:bg-slate-700 rounded animate-pulse ${className}`} />
}

/**
 * Profile section skeleton
 */
export function ProfileSkeleton() {
  return (
    <View className="mb-6">
      <View className="py-3.5 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl mb-2">
        <View className="flex-row items-center">
          <SkeletonBox className="w-5 h-5 rounded mr-3" />
          <SkeletonBox className="w-24 h-4 rounded" />
          <View className="flex-1" />
          <SkeletonBox className="w-20 h-4 rounded" />
        </View>
      </View>
      <View className="py-3.5 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
        <View className="flex-row items-center">
          <SkeletonBox className="w-5 h-5 rounded mr-3" />
          <SkeletonBox className="w-20 h-4 rounded" />
          <View className="flex-1" />
          <SkeletonBox className="w-32 h-4 rounded" />
        </View>
      </View>
    </View>
  )
}

/**
 * Subscription section skeleton
 */
export function SubscriptionSkeleton() {
  return (
    <View className="mb-6">
      <View className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <SkeletonBox className="w-5 h-5 rounded mr-2" />
            <SkeletonBox className="w-24 h-4 rounded" />
          </View>
          <SkeletonBox className="w-16 h-6 rounded-full" />
        </View>
        <SkeletonBox className="w-48 h-4 rounded mb-3" />
        <SkeletonBox className="w-full h-12 rounded-xl" />
      </View>
    </View>
  )
}

/**
 * Categories section skeleton
 */
export function CategoriesSkeleton() {
  return (
    <View className="mb-6">
      <View className="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3 mb-2 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <SkeletonBox className="w-5 h-5 rounded mr-3" />
          <SkeletonBox className="w-32 h-4 rounded" />
        </View>
        <SkeletonBox className="w-12 h-7 rounded-full" />
      </View>
      <SkeletonBox className="w-full h-14 rounded-xl" />
    </View>
  )
}

/**
 * Notifications section skeleton
 */
export function NotificationsSkeleton() {
  return (
    <View className="mb-6">
      {[1, 2].map((i) => (
        <View key={i} className="py-3.5 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl mb-2">
          <View className="flex-row items-center">
            <SkeletonBox className="w-5 h-5 rounded mr-3" />
            <SkeletonBox className="w-28 h-4 rounded" />
            <View className="flex-1" />
            <SkeletonBox className="w-24 h-4 rounded" />
          </View>
        </View>
      ))}
    </View>
  )
}

/**
 * Preferences section skeleton
 */
export function PreferencesSkeleton() {
  return (
    <View className="mb-6">
      <View className="py-3.5 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl mb-2">
        <View className="flex-row items-center">
          <SkeletonBox className="w-5 h-5 rounded mr-3" />
          <SkeletonBox className="w-28 h-4 rounded" />
          <View className="flex-1" />
          <SkeletonBox className="w-24 h-4 rounded" />
        </View>
      </View>
      <SkeletonBox className="w-full h-20 rounded-xl" />
    </View>
  )
}
