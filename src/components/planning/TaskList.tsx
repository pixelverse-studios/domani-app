import React, { useState, useCallback } from 'react'
import { View } from 'react-native'
import { FlashList } from '@shopify/flash-list'

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

  const handleDeletePress = useCallback((taskId: string) => {
    const task = tasks.find((t) => t.id === taskId)
    if (task) {
      setTaskToDelete(task)
    }
  }, [tasks])

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

  const renderItem = useCallback(
    ({ item }: { item: TaskWithCategory }) => (
      <TaskCard task={item} onEdit={onEditTask} onDelete={handleDeletePress} />
    ),
    [onEditTask, handleDeletePress],
  )

  const keyExtractor = useCallback((item: TaskWithCategory) => item.id, [])

  return (
    <View className="mx-5 mt-6">
      {/* Header */}
      <Text className="font-sans-semibold text-lg text-slate-900 dark:text-white mb-4">
        Planned Tasks ({tasks.length})
      </Text>

      {/* Task Cards */}
      <FlashList
        data={tasks}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        scrollEnabled={false}
      />

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
