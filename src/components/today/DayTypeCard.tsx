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

// Background color classes for icon containers (20% opacity versions)
const ICON_BG_COLORS: Record<DayType['iconName'], string> = {
  Briefcase: 'bg-blue-500/20',
  Heart: 'bg-pink-500/20',
  Home: 'bg-emerald-500/20',
  BookOpen: 'bg-amber-500/20',
  Scale: 'bg-purple-500/20',
}

// Default fallback values for safety
const DEFAULT_ICON = Briefcase
const DEFAULT_ICON_BG = 'bg-slate-500/20'

export function DayTypeCard({ tasks }: DayTypeCardProps) {
  const theme = useAppTheme()
  const dayType = useMemo(() => inferDayType(tasks), [tasks])

  const IconComponent = ICON_MAP[dayType.iconName] || DEFAULT_ICON
  const iconBgClass = ICON_BG_COLORS[dayType.iconName] || DEFAULT_ICON_BG

  return (
    <View
      className="rounded-2xl p-6 mx-5 min-h-[132px] justify-center"
      style={{ backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border.primary }}
    >
      <View className="flex-row items-center gap-4">
        <View className={`w-16 h-16 rounded-full ${iconBgClass} items-center justify-center`}>
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
