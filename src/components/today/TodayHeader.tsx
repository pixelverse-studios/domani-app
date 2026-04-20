import React from 'react'
import { View, TouchableOpacity } from 'react-native'
import { Bell, Sun, CloudMoon, Moon } from 'lucide-react-native'

import { Text, Badge } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import { useProfile } from '~/hooks/useProfile'
import { useTranslation } from '~/hooks/useTranslation'
import { formatLocalizedMonthDay, formatLocalizedWeekday } from '~/i18n/date'
import { useAppConfig } from '~/stores/appConfigStore'
import { PHASE_DISPLAY } from '~/types'

type GreetingInfo = {
  text: string
  icon: 'sun' | 'cloudMoon' | 'moon'
}

function getGreeting(
  hour: number,
  t: (key: 'greetings.morning' | 'greetings.afternoon' | 'greetings.evening') => string,
): GreetingInfo {
  if (hour < 12) return { text: t('greetings.morning'), icon: 'sun' }
  if (hour < 17) return { text: t('greetings.afternoon'), icon: 'cloudMoon' }
  return { text: t('greetings.evening'), icon: 'moon' }
}

interface TodayHeaderProps {
  onNotificationPress?: () => void
}

export function TodayHeader({ onNotificationPress }: TodayHeaderProps) {
  const theme = useAppTheme()
  const brandColor = theme.colors.brand.primary
  const { profile } = useProfile()
  const { phase, showBadge } = useAppConfig()
  const { locale, t } = useTranslation()

  // Get badge display info for current phase (with fallback for safety)
  const phaseDisplay = PHASE_DISPLAY[phase] ?? { label: '', variant: 'default' as const }

  const today = new Date()
  const dayOfWeek = formatLocalizedWeekday(today, locale, 'long')
  const formattedDate = formatLocalizedMonthDay(today, locale)
  const greeting = getGreeting(today.getHours(), t)

  // Get first name from profile
  const firstName = profile?.full_name?.split(' ')[0]

  // Get the appropriate greeting icon element
  const iconProps = { size: 16, color: brandColor }
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

  return (
    <View className="flex-row items-start justify-between px-5 pt-4 pb-2">
      <View>
        {/* Greeting with icon and beta badge */}
        <View className="flex-row items-center mb-2">
          {greetingIcon}
          <Text className="font-sans-medium ml-1.5" style={{ fontSize: 16, color: brandColor }}>
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
        <Text className="mb-1" style={{ fontSize: 14, color: theme.colors.text.secondary }}>
          {dayOfWeek}
        </Text>
        {/* Date - very large and bold, the main focal point */}
        <Text
          className="font-sans-bold text-content-primary"
          style={{ fontSize: 36, lineHeight: 44 }}
        >
          {formattedDate}
        </Text>
        {/* Today label - brand color */}
        <Text className="font-sans-medium mt-2" style={{ fontSize: 18, color: brandColor }}>
          {t('common.today')}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onNotificationPress}
        className="w-10 h-10 rounded-full items-center justify-center mt-2"
        style={{ backgroundColor: theme.colors.card }}
        accessibilityLabel={t('common.notifications')}
      >
        <Bell size={20} color={theme.colors.text.tertiary} />
      </TouchableOpacity>
    </View>
  )
}
