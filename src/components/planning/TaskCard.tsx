import React, { useState, useMemo } from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native'
import {
  Pencil,
  Trash2,
  FileText,
  ChevronDown,
  ChevronUp,
  Circle,
  CheckCircle,
  Bell,
  Crown,
} from 'lucide-react-native'
import { format, parseISO, isFuture } from 'date-fns'

import { Text } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import type { TaskWithCategory } from '~/types'
import { getCategoryIcon } from '~/utils/categoryIcons'

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

interface TaskCardProps {
  task: TaskWithCategory
  onEdit?: (taskId: string) => void
  onDelete?: (taskId: string) => void
  onToggleComplete?: (taskId: string, completed: boolean) => void
  showCheckbox?: boolean
}

/**
 * Format a reminder time for display.
 * Returns a compact format like "9 AM" or "1:30 PM"
 * @param date - Already-parsed Date object to avoid inconsistent parsing
 */
function formatReminderTime(date: Date): string {
  const minutes = date.getMinutes()

  // Use format without minutes if on the hour
  if (minutes === 0) {
    return format(date, 'h a') // "9 AM"
  }
  return format(date, 'h:mm a') // "1:30 PM"
}

export function TaskCard({
  task,
  onEdit,
  onDelete,
  onToggleComplete,
  showCheckbox = false,
}: TaskCardProps) {
  const theme = useAppTheme()
  const [isNotesExpanded, setIsNotesExpanded] = useState(false)

  const isCompleted = !!task.completed_at
  const priority = task.priority || 'medium'

  const priorityColor = theme.priority[priority]?.color ?? theme.priority.medium.color
  const priorityBadgeBg = `${priorityColor}26` // 15% opacity

  // Get category info (prefer user category, fall back to system category)
  const category = task.user_category || task.system_category
  const categoryName = category?.name || 'Uncategorized'
  const isUserCategory = !!task.user_category

  const hasNotes = !!task.notes?.trim()

  // Check if task has a future reminder
  // Use parseISO to correctly handle Postgres timestamp format
  // Postgres returns "2026-01-23 14:06:23.592+00" which iOS JavaScriptCore
  // may misinterpret as local time. parseISO handles this correctly.
  const reminderInfo = useMemo(() => {
    if (!task.reminder_at) return null

    try {
      const reminderDate = parseISO(task.reminder_at)
      if (!isFuture(reminderDate)) return null

      return {
        time: formatReminderTime(reminderDate),
      }
    } catch {
      return null
    }
  }, [task.reminder_at])

  const handleToggleNotes = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setIsNotesExpanded((prev) => !prev)
  }

  const iconColor = theme.colors.text.tertiary
  const dividerColor = `${theme.colors.border.primary}33`
  const buttonBg = theme.colors.interactive.hover

  const handleToggleComplete = () => {
    onToggleComplete?.(task.id, !isCompleted)
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border.primary,
          borderLeftColor: priorityColor,
        },
      ]}
    >
      {/* Main Layout: Checkbox (floating left) + Content Block (aligned) */}
      <View style={styles.cardLayout}>
        {/* Checkbox - floating on left */}
        {showCheckbox && (
          <TouchableOpacity
            onPress={handleToggleComplete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.checkbox}
            accessibilityLabel={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
          >
            {isCompleted ? (
              <CheckCircle size={24} color={theme.colors.brand.primary} />
            ) : (
              <Circle size={24} color={theme.colors.text.tertiary} />
            )}
          </TouchableOpacity>
        )}

        {/* Content Block - all content aligned */}
        <View style={styles.contentBlock}>
          {/* Top Row: Task Title + Priority Badge */}
          <View style={styles.topRow}>
            <View style={styles.titleContainer}>
              <Text
                className={`font-sans-semibold text-base ${
                  isCompleted ? 'text-content-muted line-through' : 'text-content-primary'
                }`}
                numberOfLines={2}
              >
                {task.title}
              </Text>
            </View>

            <View
              style={[
                styles.priorityBadge,
                {
                  backgroundColor: priorityBadgeBg,
                  flexDirection: 'row',
                  alignItems: 'center',
                },
              ]}
            >
              {priority === 'top' && (
                <Crown size={12} color={priorityColor} style={{ marginRight: 4 }} />
              )}
              <Text
                className="font-sans-medium text-xs capitalize"
                style={{ color: priorityColor }}
              >
                {priority}
              </Text>
            </View>
          </View>

          {/* Horizontal Divider */}
          <View style={[styles.divider, { backgroundColor: dividerColor }]} />

          {/* Bottom Row: Category + Reminder (LEFT) + Action Buttons (RIGHT) */}
          <View style={styles.bottomRow}>
            {/* Category and Reminder Info */}
            <View style={styles.metadataContainer}>
              {/* Category Icon + Name */}
              <View style={styles.categoryContainer}>
                {getCategoryIcon({
                  category: category ? { name: categoryName, icon: category.icon || undefined } : null,
                  color: isUserCategory ? theme.colors.brand.light : iconColor,
                  size: 14,
                })}
                <Text className="font-sans text-sm text-content-secondary ml-1.5" numberOfLines={1}>
                  {categoryName}
                </Text>
              </View>

              {/* Reminder Indicator */}
              {reminderInfo && (
                <View style={styles.reminderContainer}>
                  <Bell size={12} color={theme.colors.brand.primary} />
                  <Text
                    className="font-sans text-xs ml-1"
                    style={{ color: theme.colors.brand.primary }}
                    numberOfLines={1}
                  >
                    {reminderInfo.time}
                  </Text>
                </View>
              )}
            </View>

            {/* Action Buttons: Notes Toggle + Edit + Delete */}
            <View style={styles.actionsRow}>
              {/* Notes Toggle Button - only show if task has notes */}
              {hasNotes && (
                <TouchableOpacity
                  onPress={handleToggleNotes}
                  style={[styles.notesToggle, { backgroundColor: buttonBg }]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={isNotesExpanded ? 'Hide notes' : 'Show notes'}
                >
                  <FileText size={14} color={iconColor} />
                  {isNotesExpanded ? (
                    <ChevronUp size={14} color={iconColor} />
                  ) : (
                    <ChevronDown size={14} color={iconColor} />
                  )}
                </TouchableOpacity>
              )}

              {/* Edit Button */}
              <TouchableOpacity
                onPress={() => onEdit?.(task.id)}
                style={[styles.actionButton, { backgroundColor: buttonBg }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Edit task"
              >
                <Pencil size={16} color={theme.colors.brand.light} />
              </TouchableOpacity>

              {/* Delete Button */}
              <TouchableOpacity
                onPress={() => onDelete?.(task.id)}
                style={[styles.actionButton, { backgroundColor: buttonBg }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Delete task"
              >
                <Trash2 size={16} color={theme.colors.accent.brick} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Expandable Notes Section - full width */}
      {hasNotes && isNotesExpanded && (
        <View style={styles.notesSection}>
          <View style={[styles.divider, { backgroundColor: dividerColor }]} />

          <View style={styles.notesContainer}>
            <View style={styles.notesHeader}>
              <FileText size={14} color={iconColor} />
              <Text className="font-sans-medium text-sm text-content-secondary ml-1.5">Notes</Text>
            </View>
            <View style={[styles.notesContent, { backgroundColor: buttonBg }]}>
              <Text className="font-sans text-sm text-content-primary">{task.notes}</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 16,
    marginBottom: 12,
  },
  cardLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    marginRight: 12,
    marginTop: 2,
  },
  contentBlock: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  titleContainer: {
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metadataContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
    gap: 12,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  reminderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 2,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesSection: {
    marginTop: 0,
  },
  notesContainer: {
    marginTop: 12,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notesContent: {
    borderRadius: 8,
    padding: 12,
  },
})
