import React, { useMemo } from 'react'
import { View } from 'react-native'
import { Briefcase, Heart, Home, BookOpen, Scale } from 'lucide-react-native'

import { Text } from '~/components/ui'
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

export function DayTypeCard({ tasks }: DayTypeCardProps) {
  const dayType = useMemo(() => inferDayType(tasks), [tasks])

  const IconComponent = ICON_MAP[dayType.iconName]
  const iconBgClass = ICON_BG_COLORS[dayType.iconName]

  return (
    <View className="bg-slate-100 dark:bg-[#1A1A1F] rounded-2xl p-6 mx-5 border border-slate-200/50 dark:border-slate-800/80 min-h-[132px] justify-center">
      <View className="flex-row items-center gap-4">
        <View className={`w-16 h-16 rounded-full ${iconBgClass} items-center justify-center`}>
          <IconComponent size={32} color={dayType.accentColor} />
        </View>
        <View className="flex-1">
          <Text className="text-sm text-slate-500 dark:text-slate-400 mb-1">Today&apos;s Vibe</Text>
          <Text className="text-xl font-medium text-slate-700 dark:text-slate-300">
            {dayType.title}
          </Text>
          <Text className="text-base text-slate-500 dark:text-slate-500 mt-1">
            {dayType.subtitle}
          </Text>
        </View>
      </View>
    </View>
  )
}
