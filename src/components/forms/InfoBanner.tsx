import React from 'react'
import { View } from 'react-native'
import type { LucideIcon } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'

type BannerVariant = 'purple' | 'green'

interface InfoBannerProps {
  icon: LucideIcon
  title: string
  description: string
  variant?: BannerVariant
}

const greenStyles = {
  bgClass: 'bg-green-500/10',
  borderClass: 'border-green-500/30',
  iconBgClass: 'bg-green-500/20',
  iconColor: '#22c55e',
} as const

export function InfoBanner({
  icon: IconComponent,
  title,
  description,
  variant = 'purple',
}: InfoBannerProps) {
  const theme = useAppTheme()
  const brandColor = theme.colors.brand.primary

  const isGreen = variant === 'green'

  return (
    <View
      className={isGreen ? `${greenStyles.bgClass} rounded-xl p-4 border ${greenStyles.borderClass}` : 'rounded-xl p-4 border'}
      style={!isGreen ? { backgroundColor: `${brandColor}1A`, borderColor: `${brandColor}4D` } : undefined}
    >
      <View className="flex-row items-start">
        <View
          className={isGreen ? `w-10 h-10 rounded-full ${greenStyles.iconBgClass} items-center justify-center mr-3` : 'w-10 h-10 rounded-full items-center justify-center mr-3'}
          style={!isGreen ? { backgroundColor: `${brandColor}33` } : undefined}
        >
          <IconComponent size={20} color={isGreen ? greenStyles.iconColor : brandColor} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-content-primary mb-1">
            {title}
          </Text>
          <Text className="text-sm text-content-secondary">{description}</Text>
        </View>
      </View>
    </View>
  )
}
