import React from 'react'
import { View } from 'react-native'
import { Target, PartyPopper, Sparkles } from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import { useLayoutStore, type TaskLayout } from '~/stores/layoutStore'
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

function useCardStyle(layout: TaskLayout) {
  const theme = useAppTheme()
  const brandColor = theme.colors.brand.primary

  const styles: Record<TaskLayout, object> = {
    default: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
      borderRadius: 16,
      padding: 24,
    },
    compact: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
      borderRadius: 10,
      padding: 16,
    },
    minimal: {
      backgroundColor: 'transparent',
      borderBottomWidth: 1,
      borderBottomColor: `${theme.colors.border.primary}66`,
      borderRadius: 0,
      padding: 16,
      paddingHorizontal: 4,
    },
    detailed: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
      borderRadius: 16,
      borderLeftWidth: 4,
      borderLeftColor: brandColor,
      padding: 24,
    },
    grid: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
      borderRadius: 14,
      padding: 20,
      overflow: 'hidden' as const,
    },
    checklist: {
      backgroundColor: 'transparent',
      borderRadius: 0,
      padding: 16,
      paddingHorizontal: 4,
    },
  }

  return styles[layout]
}

export function FocusCard({ mitTask, dayTheme, totalTasks, completedTasks }: FocusCardProps) {
  const theme = useAppTheme()
  const brandColor = theme.colors.brand.primary
  const layout = useLayoutStore((s) => s.taskLayout)
  const cardStyle = useCardStyle(layout)

  // Determine the focus message based on state
  const getFocusContent = () => {
    // Edge case: All tasks completed
    if (totalTasks > 0 && completedTasks === totalTasks) {
      return {
        icon: <PartyPopper size={32} color={brandColor} />,
        iconBgColor: `${brandColor}1A`,
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
  const isCompact = layout === 'compact' || layout === 'minimal' || layout === 'checklist'
  const iconSize = isCompact ? 44 : 64
  const iconInnerSize = isCompact ? 24 : 32

  return (
    <View className="mx-5 min-h-[100px] justify-center" style={cardStyle}>
      {layout === 'grid' && (
        <View
          style={{
            height: 3,
            backgroundColor: brandColor,
            marginTop: -20,
            marginHorizontal: -20,
            marginBottom: 16,
          }}
        />
      )}
      <View className="flex-row items-center gap-4">
        <View
          className="rounded-full items-center justify-center"
          style={{ width: iconSize, height: iconSize, backgroundColor: content.iconBgColor }}
        >
          {React.cloneElement(content.icon as React.ReactElement<{ size: number }>, {
            size: iconInnerSize,
          })}
        </View>
        <View className="flex-1">
          <Text className={`${isCompact ? 'text-xs' : 'text-sm'} text-content-secondary mb-1`}>
            {content.label}
          </Text>
          <Text
            className={`${isCompact ? 'text-base' : 'text-xl'} font-medium text-content-primary`}
            numberOfLines={2}
          >
            {content.message}
          </Text>
          {content.subtitle && (
            <Text
              className={`${isCompact ? 'text-sm' : 'text-base'} text-content-secondary mt-1`}
            >
              {content.subtitle}
            </Text>
          )}
        </View>
      </View>
    </View>
  )
}
