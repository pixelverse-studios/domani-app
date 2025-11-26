import React from 'react'
import { View, TouchableOpacity } from 'react-native'
import { Bell } from 'lucide-react-native'
import { format } from 'date-fns'

import { Text } from '~/components/ui'

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
  const today = new Date()
  const dayOfWeek = format(today, 'EEEE')
  const month = format(today, 'MMMM')
  const day = today.getDate()
  const formattedDate = `${month} ${day}${getOrdinalSuffix(day)}`

  return (
    <View className="flex-row items-start justify-between px-5 pt-4 pb-2">
      <View>
        <Text className="text-sm text-purple-500 font-medium mb-1">{getGreeting()}</Text>
        <Text className="text-sm text-slate-400 mb-1">{dayOfWeek}</Text>
        <Text className="text-3xl font-bold text-white">{formattedDate}</Text>
        <Text className="text-lg text-slate-400 mt-1">Today</Text>
      </View>
      <TouchableOpacity
        onPress={onNotificationPress}
        className="w-10 h-10 rounded-full bg-slate-800 items-center justify-center mt-2"
        accessibilityLabel="Notifications"
      >
        <Bell size={20} color="#9ca3af" />
      </TouchableOpacity>
    </View>
  )
}
