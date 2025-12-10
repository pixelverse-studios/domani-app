import React from 'react'
import { View } from 'react-native'
import type { LucideIcon } from 'lucide-react-native'

import { Text } from '~/components/ui'

type BannerVariant = 'purple' | 'green'

interface InfoBannerProps {
  icon: LucideIcon
  title: string
  description: string
  variant?: BannerVariant
}

const variantStyles = {
  purple: {
    bgClass: 'bg-purple-500/10',
    borderClass: 'border-purple-500/30',
    iconBgClass: 'bg-purple-500/20',
    iconColor: '#a855f7',
  },
  green: {
    bgClass: 'bg-green-500/10',
    borderClass: 'border-green-500/30',
    iconBgClass: 'bg-green-500/20',
    iconColor: '#22c55e',
  },
} as const

export function InfoBanner({
  icon: IconComponent,
  title,
  description,
  variant = 'purple',
}: InfoBannerProps) {
  const styles = variantStyles[variant]

  return (
    <View className={`${styles.bgClass} rounded-xl p-4 border ${styles.borderClass}`}>
      <View className="flex-row items-start">
        <View
          className={`w-10 h-10 rounded-full ${styles.iconBgClass} items-center justify-center mr-3`}
        >
          <IconComponent size={20} color={styles.iconColor} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-slate-900 dark:text-white mb-1">
            {title}
          </Text>
          <Text className="text-sm text-slate-500 dark:text-slate-400">{description}</Text>
        </View>
      </View>
    </View>
  )
}
