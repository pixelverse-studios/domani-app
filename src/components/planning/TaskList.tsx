import React, { useState } from 'react'
import { View } from 'react-native'

import { Text, ConfirmationModal } from '~/components/ui'
import { TaskCard } from './TaskCard'
import type { TaskWithCategory } from '~/types'

interface TaskListProps {
  tasks: TaskWithCategory[]
  onEditTask?: (taskId: string) => void
  onDeleteTask?: (taskId: string) => Promise<void>
}

export function TaskList({ tasks, onEditTask, onDeleteTask }: TaskListProps) {
  const [taskToDelete, setTaskToDelete] = useState<TaskWithCategory | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeletePress = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId)
    if (task) {
      setTaskToDelete(task)
    }
  }

  const handleConfirmDelete = async () => {
    if (!taskToDelete || !onDeleteTask) return

    setIsDeleting(true)
    try {
      await onDeleteTask(taskToDelete.id)
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

  return (
    <View className="mx-5 mt-6">
      {/* Header */}
      <Text className="font-sans-semibold text-lg text-slate-900 dark:text-white mb-4">
        Planned Tasks ({tasks.length})
      </Text>

      {/* Task Cards */}
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} onEdit={onEditTask} onDelete={handleDeletePress} />
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
