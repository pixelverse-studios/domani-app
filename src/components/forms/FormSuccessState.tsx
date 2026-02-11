import React from 'react'
import { View, TouchableOpacity } from 'react-native'
import { Check } from 'lucide-react-native'
import type { LucideIcon } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import { InfoBanner } from './InfoBanner'

interface FormSuccessStateProps {
  icon?: LucideIcon
  title?: string
  message: string
  actionLabel: string
  actionIcon?: LucideIcon
  onAction: () => void
  banner: {
    icon: LucideIcon
    title: string
    description: string
  }
}

export function FormSuccessState({
  icon: TitleIcon,
  title,
  message,
  actionLabel,
  actionIcon: ActionIcon,
  onAction,
  banner,
}: FormSuccessStateProps) {
  const theme = useAppTheme()
  const brandColor = theme.colors.brand.primary

  return (
    <View className="flex-1 items-center justify-center py-8">
      {/* Green Checkmark Circle */}
      <View className="w-24 h-24 rounded-full bg-green-500 items-center justify-center mb-6">
        <Check size={48} color="#ffffff" strokeWidth={3} />
      </View>

      {/* Title with Icon (optional) */}
      {TitleIcon && title && (
        <View className="flex-row items-center mb-3">
          <TitleIcon size={24} color="#22c55e" />
          <Text className="text-xl font-bold text-content-primary ml-2">{title}</Text>
        </View>
      )}

      {/* Success Message */}
      <Text className="text-base text-content-secondary text-center px-4 mb-8">{message}</Text>

      {/* Action Button */}
      <TouchableOpacity
        onPress={onAction}
        activeOpacity={0.8}
        className="w-full py-4 rounded-xl flex-row items-center justify-center mb-5"
        style={{ backgroundColor: brandColor }}
      >
        {ActionIcon && <ActionIcon size={20} color="#ffffff" />}
        <Text className={`text-white font-semibold text-base ${ActionIcon ? 'ml-2' : ''}`}>
          {actionLabel}
        </Text>
      </TouchableOpacity>

      {/* Banner */}
      <View className="w-full">
        <InfoBanner
          icon={banner.icon}
          title={banner.title}
          description={banner.description}
          variant="green"
        />
      </View>
    </View>
  )
}
