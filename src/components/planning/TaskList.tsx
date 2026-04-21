import React, { useState, useCallback, useMemo } from 'react'
import { View } from 'react-native'

import { Text, ConfirmationModal } from '~/components/ui'
import { useTutorialTarget } from '~/components/tutorial'
import { useTutorialStore } from '~/stores/tutorialStore'
import { TaskCard } from './TaskCard'
import { CARD_GAP } from './task-layouts'
import { sortTasksByPriority } from '~/utils/sortTasks'
import { useLayoutStore } from '~/stores/layoutStore'
import { useTranslation } from '~/hooks/useTranslation'
import { getMainScreenCopy } from '~/i18n/mainScreenCopy'
import type { TaskWithCategory } from '~/types'

interface TaskListProps {
  tasks: TaskWithCategory[]
  onEditTask?: (taskId: string) => void
  onDeleteTask?: (taskId: string) => Promise<void>
}

export function TaskList({ tasks, onEditTask, onDeleteTask }: TaskListProps) {
  const { locale } = useTranslation()
  const copy = getMainScreenCopy(locale)
  const [taskToDelete, setTaskToDelete] = useState<TaskWithCategory | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Tutorial state for highlighting the created task
  const { targetRef: taskCreatedRef, measureTarget: measureTaskCreated } =
    useTutorialTarget('task_created')
  const { tutorialTaskId, currentStep, isActive } = useTutorialStore()

  // Sort tasks by priority (high → medium → low), then alphabetically
  const sortedTasks = useMemo(() => sortTasksByPriority(tasks), [tasks])

  const headerText = `${copy.planning.header} (${tasks.length})`

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

  const isGrid = useLayoutStore((s) => s.taskLayout) === 'grid'

  return (
    <View className="mx-5 mt-6">
      {/* Header */}
      <Text className="font-sans-semibold text-lg text-content-primary mb-4">{headerText}</Text>

      {/* Task Cards */}
      <View style={isGrid ? { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP } : undefined}>
        {sortedTasks.map((task) => {
          const isTutorialTask = isTutorialTaskStep && task.id === tutorialTaskId

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
