import React, { useState, useCallback, useMemo } from 'react'
import { View } from 'react-native'

import { Text, ConfirmationModal } from '~/components/ui'
import { useTutorialTarget } from '~/components/tutorial'
import { useTutorialStore } from '~/stores/tutorialStore'
import { TaskCard } from './TaskCard'
import { sortTasksByPriority } from '~/utils/sortTasks'
import type { TaskWithCategory } from '~/types'

interface TaskListProps {
  tasks: TaskWithCategory[]
  onEditTask?: (taskId: string) => void
  onDeleteTask?: (taskId: string) => Promise<void>
  showLimit?: boolean
  taskLimit?: number
}

export function TaskList({
  tasks,
  onEditTask,
  onDeleteTask,
  showLimit,
  taskLimit = 3,
}: TaskListProps) {
  const [taskToDelete, setTaskToDelete] = useState<TaskWithCategory | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Tutorial state for highlighting the created task
  const { targetRef: taskCreatedRef, measureTarget: measureTaskCreated } =
    useTutorialTarget('task_created')
  const { tutorialTaskId, currentStep, isActive } = useTutorialStore()

  // Sort tasks by priority (high → medium → low), then alphabetically
  const sortedTasks = useMemo(() => sortTasksByPriority(tasks), [tasks])

  // Format header text based on whether to show limit
  const headerText = showLimit
    ? `Planned Tasks (${tasks.length}/${taskLimit})`
    : `Planned Tasks (${tasks.length})`

  const handleDeletePress = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId)
      if (task) {
        setTaskToDelete(task)
      }
    },
    [tasks],
  )

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

  // Check if we should highlight a task for tutorial
  const isTutorialTaskStep = isActive && currentStep === 'task_created' && tutorialTaskId

  return (
    <View className="mx-5 mt-6">
      {/* Header */}
      <Text className="font-sans-semibold text-lg text-slate-900 dark:text-white mb-4">
        {headerText}
      </Text>

      {/* Task Cards */}
      {sortedTasks.map((task) => {
        const isTutorialTask = isTutorialTaskStep && task.id === tutorialTaskId

        // Always wrap in View for consistent JSX structure to prevent React re-mounts
        return (
          <View
            key={task.id}
            ref={isTutorialTask ? taskCreatedRef : undefined}
            onLayout={isTutorialTask ? measureTaskCreated : undefined}
          >
            <TaskCard task={task} onEdit={onEditTask} onDelete={handleDeletePress} />
          </View>
        )
      })}

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
