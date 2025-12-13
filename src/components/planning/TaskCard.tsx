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

export function TaskCard({ task, onEdit, onDelete }: TaskCardProps) {
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'
  const [isNotesExpanded, setIsNotesExpanded] = useState(false)

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
      {/* Main Content Row */}
      <View style={styles.contentRow}>
        {/* Task Info */}
        <View style={styles.taskInfo}>
          {/* Title */}
          <Text
            className="font-sans-semibold text-base text-slate-900 dark:text-white"
            numberOfLines={2}
          >
            {task.title}
          </Text>

          {/* Category Badge */}
          <View style={styles.categoryRow}>
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
        </View>

        {/* Right Side: Priority Badge + Notes Toggle + Actions */}
        <View style={styles.rightSection}>
          {/* Priority Badge */}
          <View style={[styles.priorityBadge, { backgroundColor: priorityConfig.badge.bg }]}>
            <Text
              className="font-sans-medium text-xs capitalize"
              style={{ color: priorityConfig.badge.text }}
            >
              {priority}
            </Text>
          </View>

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

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
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

      {/* Expandable Notes Section */}
      {hasNotes && isNotesExpanded && (
        <View style={styles.notesSection}>
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
  contentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  taskInfo: {
    flex: 1,
    marginRight: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    flexWrap: 'wrap',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 2,
  },
  notesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.2)',
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
