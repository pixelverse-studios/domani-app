import React, { useState } from 'react'
import { View, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native'
import {
  Pencil,
  Trash2,
  Heart,
  Briefcase,
  User,
  BookOpen,
  Star,
  FileText,
  ChevronDown,
  ChevronUp,
  Circle,
  CheckCircle,
} from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useTheme } from '~/hooks/useTheme'
import type { TaskWithCategory } from '~/types'

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

const PRIORITY_COLORS = {
  high: {
    border: '#ef4444',
    badge: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' },
  },
  medium: {
    border: '#f97316',
    badge: { bg: 'rgba(249, 115, 22, 0.15)', text: '#f97316' },
  },
  low: {
    border: '#22c55e',
    badge: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e' },
  },
}

// Get icon for category based on name/icon field
function getCategoryIcon(category: { name: string; icon?: string } | null, color: string) {
  if (!category) return <Star size={14} color={color} />

  const iconName = category.icon?.toLowerCase() || category.name.toLowerCase()

  switch (iconName) {
    case 'briefcase':
    case 'work':
      return <Briefcase size={14} color={color} />
    case 'heart':
    case 'health':
    case 'wellness':
      return <Heart size={14} color={color} />
    case 'user':
    case 'personal':
      return <User size={14} color={color} />
    case 'book-open':
    case 'education':
    case 'other':
      return <BookOpen size={14} color={color} />
    default:
      // User-created categories use star icon
      return <Star size={14} color={color} />
  }
}

export function TaskCard({
  task,
  onEdit,
  onDelete,
  onToggleComplete,
  showCheckbox = false,
}: TaskCardProps) {
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'
  const [isNotesExpanded, setIsNotesExpanded] = useState(false)

  const isCompleted = !!task.completed_at
  const priority = task.priority || 'medium'
  const priorityConfig = PRIORITY_COLORS[priority]

  // Get category info (prefer user category, fall back to system category)
  const category = task.user_category || task.system_category
  const categoryName = category?.name || 'Uncategorized'
  const isUserCategory = !!task.user_category

  const hasNotes = !!task.notes?.trim()

  const handleToggleNotes = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setIsNotesExpanded((prev) => !prev)
  }

  const iconColor = isDark ? '#94a3b8' : '#64748b'
  const cardBg = isDark ? '#1e293b' : '#ffffff'
  const borderColor = isDark ? '#334155' : '#e2e8f0'
  const dividerColor = isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.2)'
  const checkboxColor = '#a855f7' // purple-500
  const uncheckedColor = isDark ? '#6b7280' : '#9ca3af'

  const handleToggleComplete = () => {
    onToggleComplete?.(task.id, !isCompleted)
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: cardBg,
          borderColor: borderColor,
          borderLeftColor: priorityConfig.border,
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
              <CheckCircle size={24} color={checkboxColor} />
            ) : (
              <Circle size={24} color={uncheckedColor} />
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
                  isCompleted
                    ? 'text-slate-400 dark:text-slate-500 line-through'
                    : 'text-slate-900 dark:text-white'
                }`}
                numberOfLines={2}
              >
                {task.title}
              </Text>
            </View>

            <View style={[styles.priorityBadge, { backgroundColor: priorityConfig.badge.bg }]}>
              <Text
                className="font-sans-medium text-xs capitalize"
                style={{ color: priorityConfig.badge.text }}
              >
                {priority}
              </Text>
            </View>
          </View>

          {/* Horizontal Divider */}
          <View style={[styles.divider, { backgroundColor: dividerColor }]} />

          {/* Bottom Row: Category (LEFT) + Action Buttons (RIGHT) */}
          <View style={styles.bottomRow}>
            {/* Category Icon + Name */}
            <View style={styles.categoryContainer}>
              {getCategoryIcon(
                category ? { name: categoryName, icon: category.icon || undefined } : null,
                isUserCategory ? '#a78bfa' : iconColor,
              )}
              <Text
                className="font-sans text-sm text-slate-500 dark:text-slate-400 ml-1.5"
                numberOfLines={1}
              >
                {categoryName}
              </Text>
            </View>

            {/* Action Buttons: Notes Toggle + Edit + Delete */}
            <View style={styles.actionsRow}>
              {/* Notes Toggle Button - only show if task has notes */}
              {hasNotes && (
                <TouchableOpacity
                  onPress={handleToggleNotes}
                  style={[styles.notesToggle, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}
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
                style={[styles.actionButton, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Edit task"
              >
                <Pencil size={16} color="#a78bfa" />
              </TouchableOpacity>

              {/* Delete Button */}
              <TouchableOpacity
                onPress={() => onDelete?.(task.id)}
                style={[styles.actionButton, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Delete task"
              >
                <Trash2 size={16} color="#ef4444" />
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
              <Text className="font-sans-medium text-sm text-slate-500 dark:text-slate-400 ml-1.5">
                Notes
              </Text>
            </View>
            <View
              style={[
                styles.notesContent,
                { backgroundColor: isDark ? '#0f172a' : '#f1f5f9' },
              ]}
            >
              <Text className="font-sans text-sm text-slate-700 dark:text-slate-300">
                {task.notes}
              </Text>
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
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
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
