import React from 'react'
import { View } from 'react-native'
import { Target, PartyPopper, Sparkles } from 'lucide-react-native'

import { Text } from '~/components/ui'
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
  const iconColor = '#a855f7' // purple-500

  // Determine the focus message based on state
  const getFocusContent = () => {
    // Edge case: All tasks completed
    if (totalTasks > 0 && completedTasks === totalTasks) {
      return {
        icon: <PartyPopper size={32} color="#22c55e" />,
        iconBg: 'bg-green-500/20',
        label: 'All Done!',
        message: "You've crushed it today",
        subtitle: null,
      }
    }

    // Edge case: No tasks at all
    if (totalTasks === 0) {
      return {
        icon: <Sparkles size={32} color={iconColor} />,
        iconBg: 'bg-purple-500/20',
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
          icon: <Target size={32} color={iconColor} />,
          iconBg: 'bg-purple-500/20',
          label: "Today's Focus",
          message: mitTask.title,
          subtitle: 'Your most important task',
        }
      }

      return {
        icon: <Target size={32} color={iconColor} />,
        iconBg: 'bg-purple-500/20',
        label: "Today's Focus",
        message: `${mitTask.title}${themeSuffix}`,
        subtitle: null,
      }
    }

    // No MIT - fall back to day theme display
    return {
      icon: <Target size={32} color={iconColor} />,
      iconBg: 'bg-purple-500/20',
      label: "Today's Vibe",
      message: dayTheme.title,
      subtitle: dayTheme.subtitle,
    }
  }

  const content = getFocusContent()

  return (
    <View className="bg-slate-100 dark:bg-[#1A1A1F] rounded-2xl p-6 mx-5 border border-slate-200/50 dark:border-slate-800/80 min-h-[132px] justify-center">
      <View className="flex-row items-center gap-4">
        <View className={`w-16 h-16 rounded-full ${content.iconBg} items-center justify-center`}>
          {content.icon}
        </View>
        <View className="flex-1">
          <Text className="text-sm text-slate-500 dark:text-slate-400 mb-1">{content.label}</Text>
          <Text
            className="text-xl font-medium text-slate-700 dark:text-slate-300"
            numberOfLines={2}
          >
            {content.message}
          </Text>
          {content.subtitle && (
            <Text className="text-base text-slate-500 dark:text-slate-500 mt-1">
              {content.subtitle}
            </Text>
          )}
        </View>
      </View>
    </View>
  )
}
