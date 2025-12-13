import React, { useState, useMemo, useCallback } from 'react'
import { View } from 'react-native'
import { FlashList } from '@shopify/flash-list'

import { TaskItem } from './TaskItem'
import { Text, ConfirmationModal } from '~/components/ui'
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
    () => tasks.filter((task) => !task.completed_at),
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

  const renderItem = useCallback(
    ({ item }: { item: TaskWithCategory }) => (
      <TaskItem
        task={item}
        onToggle={onToggle}
        onPress={onTaskPress}
        onDelete={handleDeletePress}
      />
    ),
    [onToggle, onTaskPress, handleDeletePress],
  )

  const keyExtractor = useCallback((item: TaskWithCategory) => item.id, [])

  if (incompleteTasks.length === 0) {
    return (
      <View className="items-center justify-center py-8 mx-5">
        <Text className="text-slate-400 text-center">No tasks remaining. Great job!</Text>
      </View>
    )
  }

  return (
    <View className="mt-2">
      <FlashList
        data={incompleteTasks}
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
