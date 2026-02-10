import React, { useMemo } from 'react'
import { View } from 'react-native'
import { Briefcase, Heart, Home, BookOpen, Scale } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import { inferDayType } from '~/utils/dayTypeInference'
import type { TaskWithCategory, DayType } from '~/types'

interface DayTypeCardProps {
  tasks: TaskWithCategory[]
}

// Icon component map for dynamic rendering
const ICON_MAP = {
  Briefcase,
  Heart,
  Home,
  BookOpen,
  Scale,
} as const

// Background colors with 20% opacity matching the accent colors from dayTypeInference
const ICON_BG_COLORS_HEX: Record<DayType['iconName'], string> = {
  Briefcase: '#8B9DAF33', // Muted blue-gray with 20% opacity
  Heart: '#D77A6133', // Terracotta with 20% opacity
  Home: '#7D9B8A33', // Sage green with 20% opacity
  BookOpen: '#E8B86D33', // Warm amber with 20% opacity
  Scale: '#7D9B8A33', // Sage green with 20% opacity
}

// Default fallback values for safety
const DEFAULT_ICON = Briefcase
const DEFAULT_ICON_BG = '#8B9DAF33'

export function DayTypeCard({ tasks }: DayTypeCardProps) {
  const theme = useAppTheme()
  const dayType = useMemo(() => inferDayType(tasks), [tasks])

  const IconComponent = ICON_MAP[dayType.iconName] || DEFAULT_ICON
  const iconBgColor = ICON_BG_COLORS_HEX[dayType.iconName] || DEFAULT_ICON_BG

  return (
    <View
      className="rounded-2xl p-6 mx-5 min-h-[132px] justify-center"
      style={{ backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border.primary }}
    >
      <View className="flex-row items-center gap-4">
        <View
          className="w-16 h-16 rounded-full items-center justify-center"
          style={{ backgroundColor: iconBgColor }}
        >
          <IconComponent size={32} color={dayType.accentColor} />
        </View>
        <View className="flex-1">
          <Text className="text-sm text-content-secondary mb-1">Today&apos;s Vibe</Text>
          <Text className="text-xl font-medium text-content-primary">
            {dayType.title}
          </Text>
          <Text className="text-base text-content-secondary mt-1">
            {dayType.subtitle}
          </Text>
        </View>
      </View>
    </View>
  )
}
