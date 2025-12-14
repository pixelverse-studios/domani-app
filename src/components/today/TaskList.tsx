import React, { useState, useMemo, useCallback } from 'react'
import { View } from 'react-native'

import { TaskCard } from '~/components/planning/TaskCard'
import { Text, ConfirmationModal } from '~/components/ui'
import { sortTasksByPriority } from '~/utils/sortTasks'
import type { TaskWithCategory } from '~/types'

interface TaskListProps {
  tasks: TaskWithCategory[]
  onToggle: (taskId: string, completed: boolean) => void
  onTaskPress?: (task: TaskWithCategory) => void
  onDeleteTask?: (task: TaskWithCategory) => void
}

export function TaskList({ tasks, onToggle, onTaskPress, onDeleteTask }: TaskListProps) {
  const [taskToDelete, setTaskToDelete] = useState<TaskWithCategory | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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
        <Text className="text-slate-400 text-center">No tasks remaining. Great job!</Text>
      </View>
    )
  }

  return (
    <View className="mt-2">
      {incompleteTasks.map((task) => (
        <View key={task.id} style={{ marginHorizontal: 20 }}>
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
