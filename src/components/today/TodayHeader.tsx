import React from 'react'
import { View, TouchableOpacity } from 'react-native'
import { Bell } from 'lucide-react-native'
import { format } from 'date-fns'

import { Text } from '~/components/ui'
import { useTheme } from '~/hooks/useTheme'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th'
  switch (day % 10) {
    case 1:
      return 'st'
    case 2:
      return 'nd'
    case 3:
      return 'rd'
    default:
      return 'th'
  }
}

interface TodayHeaderProps {
  onNotificationPress?: () => void
}

export function TodayHeader({ onNotificationPress }: TodayHeaderProps) {
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'

  const today = new Date()
  const dayOfWeek = format(today, 'EEEE')
  const month = format(today, 'MMMM')
  const day = today.getDate()
  const formattedDate = `${month} ${day}${getOrdinalSuffix(day)}`

  // Icon color adapts to theme
  const bellColor = isDark ? '#cbd5e1' : '#64748b' // slate-300 / slate-500

  return (
    <View className="flex-row items-start justify-between px-5 pt-4 pb-2">
      <View>
        <Text className="text-sm text-purple-600 dark:text-purple-400 font-medium mb-1">
          {getGreeting()}
        </Text>
        <Text className="text-sm text-slate-500 dark:text-slate-300 mb-1">{dayOfWeek}</Text>
        <Text className="text-3xl font-bold text-slate-900 dark:text-white">{formattedDate}</Text>
        <Text className="text-lg text-slate-500 dark:text-slate-300 mt-1">Today</Text>
      </View>
      <TouchableOpacity
        onPress={onNotificationPress}
        className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center mt-2"
        accessibilityLabel="Notifications"
      >
        <Bell size={20} color={bellColor} />
      </TouchableOpacity>
    </View>
  )
}
