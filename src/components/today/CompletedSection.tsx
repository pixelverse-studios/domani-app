import React, { useState, useMemo, useCallback } from 'react'
import { View, TouchableOpacity } from 'react-native'
import { CheckCircle, ChevronUp, ChevronDown } from 'lucide-react-native'

import { TaskCard } from '~/components/planning/TaskCard'
import { Text, ConfirmationModal } from '~/components/ui'
import { useTheme } from '~/hooks/useTheme'
import { sortTasksByPriority } from '~/utils/sortTasks'
import type { TaskWithCategory } from '~/types'

interface CompletedSectionProps {
  tasks: TaskWithCategory[]
  onToggle: (taskId: string, completed: boolean) => void
  onTaskPress?: (task: TaskWithCategory) => void
  onDeleteTask?: (task: TaskWithCategory) => void
}

export function CompletedSection({
  tasks,
  onToggle,
  onTaskPress,
  onDeleteTask,
}: CompletedSectionProps) {
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'

  const [isExpanded, setIsExpanded] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<TaskWithCategory | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const completedTasks = useMemo(
    () => sortTasksByPriority(tasks.filter((task) => task.completed_at)),
    [tasks],
  )

  // Theme-aware icon colors
  const checkColor = '#a855f7' // purple-500 - consistent
  const chevronColor = isDark ? '#9ca3af' : '#6b7280' // gray-400 / gray-500

  const handleDeletePress = useCallback((task: TaskWithCategory) => {
    setTaskToDelete(task)
  }, [])

  const handleConfirmDelete = async () => {
    if (!taskToDelete || !onDeleteTask) return

    setIsDeleting(true)
    try {
      await onDeleteTask(taskToDelete)
      setTaskToDelete(null)
    } catch (error) {
      console.error('Failed to delete task:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCancelDelete = () => {
    setTaskToDelete(null)
  }

  const handleEdit = useCallback(
    (taskId: string) => {
      const task = completedTasks.find((t) => t.id === taskId)
      if (task) onTaskPress?.(task)
    },
    [completedTasks, onTaskPress],
  )

  if (completedTasks.length === 0) {
    return null
  }

  return (
    <View className="mt-4">
      {/* Header */}
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        className="flex-row items-center justify-between bg-slate-100/50 dark:bg-slate-800/30 rounded-xl mx-5 px-4 py-3"
        accessibilityLabel={isExpanded ? 'Collapse completed tasks' : 'Expand completed tasks'}
      >
        <View className="flex-row items-center gap-2">
          <CheckCircle size={20} color={checkColor} />
          <Text className="text-base text-slate-600 dark:text-slate-300 font-medium">
            Completed ({completedTasks.length})
          </Text>
          <View className="bg-purple-500/20 px-2 py-0.5 rounded-full ml-2">
            <Text className="text-xs text-purple-600 dark:text-purple-400">Great job!</Text>
          </View>
        </View>
        {isExpanded ? (
          <ChevronUp size={20} color={chevronColor} />
        ) : (
          <ChevronDown size={20} color={chevronColor} />
        )}
      </TouchableOpacity>

      {/* Expanded content */}
      {isExpanded && (
        <View className="mt-3">
          {completedTasks.map((task) => (
            <View key={task.id} style={{ marginHorizontal: 20 }}>
              <TaskCard
                task={task}
                showCheckbox
                onToggleComplete={onToggle}
                onEdit={handleEdit}
                onDelete={(taskId) => {
                  const foundTask = completedTasks.find((t) => t.id === taskId)
                  if (foundTask) handleDeletePress(foundTask)
                }}
              />
            </View>
          ))}
        </View>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={!!taskToDelete}
        title="Delete Task?"
        itemName={taskToDelete?.title ?? ''}
        description="Are you sure you want to delete:"
        confirmLabel="Delete Task"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isLoading={isDeleting}
      />
    </View>
  )
}
