import React from 'react'
import { View } from 'react-native'
import { Target, PartyPopper, Sparkles } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import type { TaskWithCategory, DayType, DayTheme } from '~/types'

// Theme to focus phrase mapping
const THEME_FOCUS_PHRASES: Record<DayTheme, string> = {
  work: 'productivity',
  wellness: 'wellness',
  personal: 'personal time',
  learning: 'learning',
  balanced: 'balance',
}

interface FocusCardProps {
  /** The MIT (Most Important Task) - top priority incomplete task */
  mitTask?: TaskWithCategory | null
  /** The inferred day theme based on remaining tasks */
  dayTheme: DayType
  /** Total number of tasks for the day */
  totalTasks: number
  /** Number of completed tasks */
  completedTasks: number
}

export function FocusCard({ mitTask, dayTheme, totalTasks, completedTasks }: FocusCardProps) {
  const theme = useAppTheme()
  const brandColor = theme.colors.brand.primary

  // Determine the focus message based on state
  const getFocusContent = () => {
    // Edge case: All tasks completed
    if (totalTasks > 0 && completedTasks === totalTasks) {
      return {
        icon: <PartyPopper size={32} color="#22c55e" />,
        iconBgColor: 'rgba(34, 197, 94, 0.2)',
        label: 'All Done!',
        message: "You've crushed it today",
        subtitle: null,
      }
    }

    // Edge case: No tasks at all
    if (totalTasks === 0) {
      return {
        icon: <Sparkles size={32} color={brandColor} />,
        iconBgColor: `${brandColor}1A`,
        label: "Today's Focus",
        message: 'Plan your day',
        subtitle: 'Add tasks to get started',
      }
    }

    // With MIT task
    if (mitTask) {
      // Edge case: Only MIT task (no other tasks to determine theme)
      const hasOtherTasks = totalTasks > 1 || (totalTasks === 1 && !mitTask)
      const themePhrase = THEME_FOCUS_PHRASES[dayTheme.theme] ?? 'your day'
      const themeSuffix = hasOtherTasks ? `, then focus on ${themePhrase}` : ''

      // If MIT is the only task, show simpler message
      if (!hasOtherTasks || dayTheme.theme === 'balanced') {
        return {
          icon: <Target size={32} color={brandColor} />,
          iconBgColor: `${brandColor}1A`,
          label: "Today's Focus",
          message: mitTask.title,
          subtitle: 'Your most important task',
        }
      }

      return {
        icon: <Target size={32} color={brandColor} />,
        iconBgColor: `${brandColor}1A`,
        label: "Today's Focus",
        message: `${mitTask.title}${themeSuffix}`,
        subtitle: null,
      }
    }

    // No MIT - fall back to day theme display
    return {
      icon: <Target size={32} color={brandColor} />,
      iconBgColor: `${brandColor}1A`,
      label: "Today's Vibe",
      message: dayTheme.title,
      subtitle: dayTheme.subtitle,
    }
  }

  const content = getFocusContent()

  return (
    <View
      className="rounded-2xl p-6 mx-5 min-h-[132px] justify-center"
      style={{ backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border.primary }}
    >
      <View className="flex-row items-center gap-4">
        <View
          className="w-16 h-16 rounded-full items-center justify-center"
          style={{ backgroundColor: content.iconBgColor }}
        >
          {content.icon}
        </View>
        <View className="flex-1">
          <Text className="text-sm text-content-secondary mb-1">{content.label}</Text>
          <Text
            className="text-xl font-medium text-content-primary"
            numberOfLines={2}
          >
            {content.message}
          </Text>
          {content.subtitle && (
            <Text className="text-base text-content-secondary mt-1">
              {content.subtitle}
            </Text>
          )}
        </View>
      </View>
    </View>
  )
}
