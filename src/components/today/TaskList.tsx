import React, { useState, useMemo, useCallback } from 'react'
import { View } from 'react-native'

import { TaskCard } from '~/components/planning/TaskCard'
import { CARD_GAP } from '~/components/planning/task-layouts'
import { Text, ConfirmationModal } from '~/components/ui'
import { useTranslation } from '~/hooks/useTranslation'
import { getMainScreenCopy } from '~/i18n/mainScreenCopy'
import { sortTasksByPriority } from '~/utils/sortTasks'
import { useLayoutStore } from '~/stores/layoutStore'
import type { TaskWithCategory } from '~/types'

interface TaskListProps {
  tasks: TaskWithCategory[]
  onToggle: (taskId: string, completed: boolean) => void
  onTaskPress?: (task: TaskWithCategory) => void
  onDeleteTask?: (task: TaskWithCategory) => void
}

export function TaskList({ tasks, onToggle, onTaskPress, onDeleteTask }: TaskListProps) {
  const { locale } = useTranslation()
  const copy = getMainScreenCopy(locale)
  const [taskToDelete, setTaskToDelete] = useState<TaskWithCategory | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const isGrid = useLayoutStore((s) => s.taskLayout) === 'grid'

  const incompleteTasks = useMemo(
    () => sortTasksByPriority(tasks.filter((task) => !task.completed_at)),
    [tasks],
  )

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
      const task = tasks.find((t) => t.id === taskId)
      if (task) onTaskPress?.(task)
    },
    [tasks, onTaskPress],
  )

  if (incompleteTasks.length === 0) {
    return (
      <View className="items-center justify-center py-8 mx-5">
        <Text className="text-slate-400 text-center">{copy.today.tasksRemaining}</Text>
      </View>
    )
  }

  return (
    <View className="mt-2">
      <View style={isGrid ? { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP, marginHorizontal: 20 } : undefined}>
        {incompleteTasks.map((task) => (
          <View key={task.id} style={isGrid ? undefined : { marginHorizontal: 20 }}>
            <TaskCard
              task={task}
              showCheckbox
              onToggleComplete={onToggle}
              onEdit={handleEdit}
              onDelete={(taskId) => {
                const foundTask = tasks.find((t) => t.id === taskId)
                if (foundTask) handleDeletePress(foundTask)
              }}
            />
          </View>
        ))}
      </View>

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
