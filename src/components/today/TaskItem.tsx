import React from 'react'
import { View, TouchableOpacity } from 'react-native'
import { Circle, CheckCircle, Clock } from 'lucide-react-native'

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

function formatDuration(minutes: number | null): string {
  if (!minutes) return ''
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

interface TaskItemProps {
  task: TaskWithCategory
  onToggle: (taskId: string, completed: boolean) => void
  onPress?: (task: TaskWithCategory) => void
}

export function TaskItem({ task, onToggle, onPress }: TaskItemProps) {
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'

  const isCompleted = !!task.completed_at
  const priority = (task.priority as TaskPriority) || 'medium'
  const colors = PRIORITY_COLORS[priority]
  const duration = formatDuration(task.estimated_duration_minutes)
  const categoryName = task.system_category?.name || task.user_category?.name || 'Uncategorized'

  // Theme-aware icon colors
  const checkboxColor = '#a855f7' // purple-500 - consistent
  const uncheckedColor = isDark ? '#6b7280' : '#9ca3af' // gray-500 / gray-400
  const clockColor = isDark ? '#9ca3af' : '#6b7280' // gray-400 / gray-500

  const handleToggle = () => {
    onToggle(task.id, !isCompleted)
  }

  const handlePress = () => {
    onPress?.(task)
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      className={`bg-slate-100/80 dark:bg-slate-800/50 rounded-xl border-l-4 ${colors.border} mx-5 mb-3`}
    >
      <View className="flex-row items-center p-4">
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

        {/* Content */}
        <View className="flex-1">
          <Text
            className={`text-base font-medium ${isCompleted ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-900 dark:text-white'}`}
            numberOfLines={1}
          >
            {task.title}
          </Text>
          <View className="flex-row items-center mt-1 gap-2">
            <Text className="text-sm text-slate-500 dark:text-slate-400">{categoryName}</Text>
            {duration && (
              <>
                <Text className="text-slate-400 dark:text-slate-600">•</Text>
                <View className="flex-row items-center gap-1">
                  <Clock size={12} color={clockColor} />
                  <Text className="text-sm text-slate-500 dark:text-slate-400">{duration}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Priority badge */}
        <View className={`px-3 py-1 rounded-full ${colors.badge}`}>
          <Text className={`text-xs font-semibold ${colors.text}`}>
            {PRIORITY_LABELS[priority]}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}
