import React from 'react'
import { View, TouchableOpacity } from 'react-native'
import { Bell, Sun, CloudMoon, Moon } from 'lucide-react-native'
import { format } from 'date-fns'

import { Text, Badge } from '~/components/ui'
import { useTheme } from '~/hooks/useTheme'
import { useProfile } from '~/hooks/useProfile'
import { useAppConfig } from '~/stores/appConfigStore'
import { PHASE_DISPLAY } from '~/types'
import { colors } from '~/theme'

type GreetingInfo = {
  text: string
  icon: 'sun' | 'cloudMoon' | 'moon'
}

function getGreeting(): GreetingInfo {
  const hour = new Date().getHours()
  if (hour < 12) return { text: 'Good morning', icon: 'sun' }
  if (hour < 17) return { text: 'Good afternoon', icon: 'cloudMoon' }
  return { text: 'Good evening', icon: 'moon' }
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
  const { profile } = useProfile()
  const { phase, showBadge } = useAppConfig()

  // Get badge display info for current phase
  const phaseDisplay = PHASE_DISPLAY[phase]

  const today = new Date()
  const dayOfWeek = format(today, 'EEEE')
  const month = format(today, 'MMMM')
  const day = today.getDate()
  const formattedDate = `${month} ${day}${getOrdinalSuffix(day)}`
  const greeting = getGreeting()

  // Get first name from profile
  const firstName = profile?.full_name?.split(' ')[0]

  // Icon colors adapt to theme
  const bellColor = isDark ? '#cbd5e1' : '#64748b' // slate-300 / slate-500

  // Get the appropriate greeting icon element
  const iconProps = { size: 16, color: colors.brand.pink }
  const greetingIcon = (() => {
    switch (greeting.icon) {
      case 'sun':
        return <Sun {...iconProps} />
      case 'cloudMoon':
        return <CloudMoon {...iconProps} />
      case 'moon':
        return <Moon {...iconProps} />
    }
  })()

  // Text colors
  const grayColor = isDark ? '#94a3b8' : '#64748b' // slate-400 / slate-500

  return (
    <View className="flex-row items-start justify-between px-5 pt-4 pb-2">
      <View>
        {/* Greeting with icon and beta badge */}
        <View className="flex-row items-center mb-2">
          {greetingIcon}
          <Text
            className="font-sans-medium ml-1.5"
            style={{ fontSize: 16, color: colors.brand.pink }}
          >
            {greeting.text}
            {firstName ? `, ${firstName}` : ''}
          </Text>
          {showBadge && phaseDisplay.label && (
            <Badge variant={phaseDisplay.variant} className="ml-2 py-0.5 px-2">
              {phaseDisplay.label}
            </Badge>
          )}
        </View>
        {/* Day of week - smaller, lighter */}
        <Text className="mb-1" style={{ fontSize: 14, color: grayColor }}>
          {dayOfWeek}
        </Text>
        {/* Date - very large and bold, the main focal point */}
        <Text
          className="font-sans-bold text-slate-900 dark:text-white"
          style={{ fontSize: 36, lineHeight: 44 }}
        >
          {formattedDate}
        </Text>
        {/* Today label - brand color */}
        <Text className="font-sans-medium mt-2" style={{ fontSize: 18, color: colors.brand.pink }}>
          Today
        </Text>
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
