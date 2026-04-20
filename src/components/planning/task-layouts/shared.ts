import { useMemo } from 'react'
import { parseISO } from 'date-fns'

import type { TaskWithCategory } from '~/types'
import { useAppTheme } from '~/hooks/useAppTheme'
import { useTranslation } from '~/hooks/useTranslation'
import { formatLocalizedTime } from '~/i18n/date'
import { getLocalizedCategoryName } from '~/constants/systemCategories'

export interface TaskCardProps {
  task: TaskWithCategory
  onEdit?: (taskId: string) => void
  onDelete?: (taskId: string) => void
  onToggleComplete?: (taskId: string, completed: boolean) => void
  showCheckbox?: boolean
}

function formatReminderTime(date: Date, locale: ReturnType<typeof useTranslation>['locale']): string {
  return formatLocalizedTime(date, locale, { compact: true })
}

export function useTaskCardData(task: TaskWithCategory) {
  const theme = useAppTheme()
  const { locale, t } = useTranslation()

  const isCompleted = !!task.completed_at
  const priority = task.priority || 'medium'
  const priorityColor = theme.priority[priority]?.color ?? theme.priority.medium.color
  const priorityBadgeBg = `${priorityColor}26`

  const category = task.user_category || task.system_category
  const categoryName = category
    ? task.system_category
      ? getLocalizedCategoryName(category.name, locale)
      : category.name
    : t('common.uncategorized')
  const isUserCategory = !!task.user_category
  const hasNotes = !!task.notes?.trim()

  const reminderInfo = useMemo(() => {
    if (!task.reminder_at) return null
    try {
      const reminderDate = parseISO(task.reminder_at)
      return {
        time: formatReminderTime(reminderDate, locale),
        isPast: reminderDate <= new Date(),
      }
    } catch {
      return null
    }
  }, [locale, task.reminder_at])

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
