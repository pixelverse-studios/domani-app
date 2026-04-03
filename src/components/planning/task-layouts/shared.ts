import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'

import type { TaskWithCategory } from '~/types'
import { useAppTheme } from '~/hooks/useAppTheme'

export interface TaskCardProps {
  task: TaskWithCategory
  onEdit?: (taskId: string) => void
  onDelete?: (taskId: string) => void
  onToggleComplete?: (taskId: string, completed: boolean) => void
  showCheckbox?: boolean
}

function formatReminderTime(date: Date): string {
  const minutes = date.getMinutes()
  if (minutes === 0) {
    return format(date, 'h a')
  }
  return format(date, 'h:mm a')
}

export function useTaskCardData(task: TaskWithCategory) {
  const theme = useAppTheme()

  const isCompleted = !!task.completed_at
  const priority = task.priority || 'medium'
  const priorityColor = theme.priority[priority]?.color ?? theme.priority.medium.color
  const priorityBadgeBg = `${priorityColor}26`

  const category = task.user_category || task.system_category
  const categoryName = category?.name || 'Uncategorized'
  const isUserCategory = !!task.user_category
  const hasNotes = !!task.notes?.trim()

  const reminderInfo = useMemo(() => {
    if (!task.reminder_at) return null
    try {
      const reminderDate = parseISO(task.reminder_at)
      return {
        time: formatReminderTime(reminderDate),
        isPast: reminderDate <= new Date(),
      }
    } catch {
      return null
    }
  }, [task.reminder_at])

  const iconColor = theme.colors.text.tertiary
  const dividerColor = `${theme.colors.border.primary}33`
  const buttonBg = theme.colors.interactive.hover

  return {
    theme,
    isCompleted,
    priority,
    priorityColor,
    priorityBadgeBg,
    category,
    categoryName,
    isUserCategory,
    hasNotes,
    reminderInfo,
    iconColor,
    dividerColor,
    buttonBg,
  }
}
