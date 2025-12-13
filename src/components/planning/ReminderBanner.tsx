import React from 'react'
import { View } from 'react-native'
import { Bell } from 'lucide-react-native'
import { format, parse } from 'date-fns'

import { Text } from '~/components/ui'
import { useTheme } from '~/hooks/useTheme'
import { useProfile } from '~/hooks/useProfile'

export function ReminderBanner() {
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'
  const { profile } = useProfile()

  // Don't show if user hasn't set up reminders
  if (!profile?.execution_reminder_time) {
    return null
  }

  // Parse the time string (format: "HH:mm:ss") and format for display
  const formatReminderTime = (timeString: string): string => {
    try {
      const time = parse(timeString, 'HH:mm:ss', new Date())
      return format(time, 'h:mm a') // e.g., "8:00 AM"
    } catch {
      return timeString
    }
  }

  const displayTime = formatReminderTime(profile.execution_reminder_time)
  const purpleColor = isDark ? '#a78bfa' : '#8b5cf6'
  const textColor = isDark ? '#94a3b8' : '#64748b'

  return (
    <View
      className="mx-5 mt-4 p-4 rounded-xl flex-row items-center"
      style={{
        backgroundColor: isDark ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.08)',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.15)',
      }}
    >
      <Bell size={18} color={purpleColor} />
      <Text
        className="font-sans ml-3 flex-1"
        style={{ fontSize: 14, color: textColor }}
      >
        Reminder set for tomorrow at{' '}
        <Text className="font-sans-medium" style={{ color: purpleColor }}>
          {displayTime}
        </Text>
      </Text>
    </View>
  )
}
