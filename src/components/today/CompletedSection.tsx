import React, { useState, useMemo, useCallback } from 'react'
import { View, TouchableOpacity } from 'react-native'
import { CheckCircle, ChevronUp, ChevronDown } from 'lucide-react-native'

import { TaskCard } from '~/components/planning/TaskCard'
import { CARD_GAP } from '~/components/planning/task-layouts'
import { Text, ConfirmationModal } from '~/components/ui'
import { useAppTheme } from '~/hooks/useAppTheme'
import { sortTasksByPriority } from '~/utils/sortTasks'
import { useLayoutStore } from '~/stores/layoutStore'
import { useTranslation } from '~/hooks/useTranslation'
import { getMainScreenCopy } from '~/i18n/mainScreenCopy'
import type { TaskWithCategory } from '~/types'

function CompletedTasksList({
  tasks,
  onToggle,
  onEdit,
  onDeletePress,
}: {
  tasks: TaskWithCategory[]
  onToggle: (taskId: string, completed: boolean) => void
  onEdit: (taskId: string) => void
  onDeletePress: (task: TaskWithCategory) => void
}) {
  const isGrid = useLayoutStore((s) => s.taskLayout) === 'grid'

  return (
    <View className="mt-3">
      <View style={isGrid ? { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP, marginHorizontal: 20 } : undefined}>
        {tasks.map((task) => (
          <View key={task.id} style={isGrid ? undefined : { marginHorizontal: 20 }}>
            <TaskCard
              task={task}
              showCheckbox
              onToggleComplete={onToggle}
              onEdit={onEdit}
              onDelete={(taskId) => {
                const foundTask = tasks.find((t) => t.id === taskId)
                if (foundTask) onDeletePress(foundTask)
              }}
            />
          </View>
        ))}
      </View>
    </View>
  )
}

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
  const theme = useAppTheme()
  const { locale } = useTranslation()
  const copy = getMainScreenCopy(locale)
  const brandColor = theme.colors.brand.primary

  const [isExpanded, setIsExpanded] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<TaskWithCategory | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const completedTasks = useMemo(
    () => sortTasksByPriority(tasks.filter((task) => task.completed_at)),
    [tasks],
  )

  const chevronColor = theme.colors.text.tertiary

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
        className="flex-row items-center justify-between rounded-xl mx-5 px-4 py-3"
        style={{ backgroundColor: theme.colors.card }}
        accessibilityLabel={isExpanded ? copy.today.completed : copy.today.completed}
      >
        <View className="flex-row items-center gap-2">
          <CheckCircle size={20} color={brandColor} />
          <Text className="text-base text-content-primary font-medium">
            {copy.today.completed} ({completedTasks.length})
          </Text>
          <View
            className="px-2 py-0.5 rounded-full ml-2"
            style={{ backgroundColor: `${brandColor}1A` }}
          >
            <Text className="text-xs" style={{ color: brandColor }}>
              {copy.today.allDoneMessage}
            </Text>
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
        <CompletedTasksList
          tasks={completedTasks}
          onToggle={onToggle}
          onEdit={handleEdit}
          onDeletePress={handleDeletePress}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={!!taskToDelete}
        title={copy.common.deleteTaskTitle}
        itemName={taskToDelete?.title ?? ''}
        description={copy.common.deleteTaskDescription}
        confirmLabel={copy.common.deleteTaskConfirm}
        cancelLabel={copy.common.cancel}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isLoading={isDeleting}
      />
    </View>
  )
}
