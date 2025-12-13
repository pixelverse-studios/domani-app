import React from 'react'
import { View, TouchableOpacity } from 'react-native'
import {
  Circle,
  CheckCircle,
  Trash2,
  Star,
  Briefcase,
  Heart,
  User,
  BookOpen,
} from 'lucide-react-native'

import { Text } from '~/components/ui'
import { useTheme } from '~/hooks/useTheme'
import type { TaskWithCategory, TaskPriority } from '~/types'

const PRIORITY_COLORS: Record<TaskPriority, { border: string; badge: string; text: string }> = {
  high: { border: 'border-l-red-500', badge: 'bg-red-500/20', text: 'text-red-400' },
  medium: { border: 'border-l-orange-500', badge: 'bg-orange-500/20', text: 'text-orange-400' },
  low: { border: 'border-l-green-500', badge: 'bg-green-500/20', text: 'text-green-400' },
}

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
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
      return <BookOpen size={14} color={color} />
    default:
      // User-created categories use star icon
      return <Star size={14} color={color} />
  }
}

interface TaskItemProps {
  task: TaskWithCategory
  onToggle: (taskId: string, completed: boolean) => void
  onPress?: (task: TaskWithCategory) => void
  onDelete?: (task: TaskWithCategory) => void
}

export function TaskItem({ task, onToggle, onPress, onDelete }: TaskItemProps) {
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'

  const isCompleted = !!task.completed_at
  const priority = (task.priority as TaskPriority) || 'medium'
  const colors = PRIORITY_COLORS[priority]
  const category = task.system_category || task.user_category
  const categoryName = category?.name || 'Uncategorized'
  const categoryIcon = category?.icon || 'star'

  // Theme-aware icon colors
  const checkboxColor = '#a855f7' // purple-500 - consistent
  const uncheckedColor = isDark ? '#6b7280' : '#9ca3af' // gray-500 / gray-400
  const deleteColor = isDark ? '#6b7280' : '#9ca3af' // gray-500 / gray-400
  const categoryIconColor = isDark ? '#94a3b8' : '#64748b' // slate-400 / slate-500

  const handleToggle = () => {
    onToggle(task.id, !isCompleted)
  }

  const handlePress = () => {
    onPress?.(task)
  }

  const handleDelete = () => {
    onDelete?.(task)
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      className={`bg-slate-100/80 dark:bg-slate-800/50 rounded-xl border-l-4 ${colors.border} mx-5 mb-3`}
    >
      <View className="p-4">
        {/* Top row: Checkbox, Title, Priority badge, Delete */}
        <View className="flex-row items-center">
          {/* Checkbox */}
          <TouchableOpacity
            onPress={handleToggle}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="mr-3"
            accessibilityLabel={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
          >
            {isCompleted ? (
              <CheckCircle size={24} color={checkboxColor} />
            ) : (
              <Circle size={24} color={uncheckedColor} />
            )}
          </TouchableOpacity>

          {/* Title */}
          <Text
            className={`flex-1 text-base font-medium ${isCompleted ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-900 dark:text-white'}`}
            numberOfLines={1}
          >
            {task.title}
          </Text>

          {/* Priority badge */}
          <View className={`px-3 py-1 rounded-full ${colors.badge} mr-3`}>
            <Text className={`text-xs font-semibold ${colors.text}`}>
              {PRIORITY_LABELS[priority]}
            </Text>
          </View>

          {/* Delete button */}
          <TouchableOpacity
            onPress={handleDelete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Delete task"
          >
            <Trash2 size={18} color={deleteColor} />
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View className="h-px bg-slate-200 dark:bg-slate-700/50 my-3 ml-9" />

        {/* Bottom row: Category badge */}
        <View className="flex-row ml-9">
          <View className="flex-row items-center px-3 py-1.5 rounded-lg bg-slate-200/80 dark:bg-slate-700/50 border border-slate-300/50 dark:border-slate-600/50">
            {getCategoryIcon(category ?? null, categoryIconColor)}
            <Text className="text-sm text-slate-600 dark:text-slate-400 ml-1.5">
              {categoryName}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}
