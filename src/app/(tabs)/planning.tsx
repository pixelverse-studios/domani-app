import React, { useState, useMemo, useCallback } from 'react'
import { ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { addDays } from 'date-fns'

import {
  PlanningHeader,
  PlanningTip,
  AddTaskPlaceholder,
  AddTaskForm,
  PlanningEmptyState,
  TaskList,
  TasksRecap,
} from '~/components/planning'
import { usePlanForDate } from '~/hooks/usePlans'
import { useCreateTask, useTasks, useDeleteTask, useUpdateTask } from '~/hooks/useTasks'
import { useSystemCategories } from '~/hooks/useCategories'
import type { TaskWithCategory } from '~/types'

type PlanningTarget = 'today' | 'tomorrow'
type Priority = 'high' | 'medium' | 'low'

// Map form category IDs to database category names
const FORM_TO_DB_CATEGORY: Record<string, string> = {
  work: 'Work',
  wellness: 'Health',
  personal: 'Personal',
  education: 'Other',
}

// Map database category names back to form IDs
const DB_TO_FORM_CATEGORY: Record<string, string> = {
  Work: 'work',
  Health: 'wellness',
  Personal: 'personal',
  Other: 'education',
}

interface TaskFormData {
  title: string
  category: string
  priority: Priority
}

export default function PlanningScreen() {
  const [selectedTarget, setSelectedTarget] = useState<PlanningTarget>('today')
  const [isFormVisible, setIsFormVisible] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskWithCategory | null>(null)

  // Get the target date based on selection
  const targetDate = useMemo(() => {
    return selectedTarget === 'today' ? new Date() : addDays(new Date(), 1)
  }, [selectedTarget])

  // Get or create plan for the target date
  const { data: plan } = usePlanForDate(targetDate)
  const { data: tasks = [] } = useTasks(plan?.id)
  const { data: systemCategories = [] } = useSystemCategories()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  const handleOpenForm = () => {
    setEditingTask(null)
    setIsFormVisible(true)
  }

  const handleCloseForm = () => {
    setIsFormVisible(false)
    setEditingTask(null)
  }

  const handleEditTask = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId)
    if (task) {
      setEditingTask(task)
      setIsFormVisible(true)
    }
  }

  // Get system category UUID from form category ID
  const getSystemCategoryId = useCallback(
    (formCategoryId: string): string | undefined => {
      const dbName = FORM_TO_DB_CATEGORY[formCategoryId]
      if (!dbName) return undefined
      const category = systemCategories.find((c) => c.name === dbName)
      return category?.id
    },
    [systemCategories],
  )

  const handleSubmitTask = async (task: TaskFormData) => {
    // Check if it's a system category (form uses lowercase IDs like 'work', 'wellness')
    const isSystemCategory = Object.keys(FORM_TO_DB_CATEGORY).includes(task.category)
    const systemCategoryId = isSystemCategory ? getSystemCategoryId(task.category) : undefined

    if (editingTask) {
      // Update existing task
      await updateTask.mutateAsync({
        taskId: editingTask.id,
        updates: {
          title: task.title,
          priority: task.priority,
          system_category_id: systemCategoryId || null,
          user_category_id: !isSystemCategory ? task.category : null,
        },
      })
    } else {
      // Create new task
      if (!plan?.id) {
        console.error('No plan available')
        return
      }

      await createTask.mutateAsync({
        planId: plan.id,
        title: task.title,
        priority: task.priority,
        systemCategoryId: systemCategoryId,
        userCategoryId: !isSystemCategory ? task.category : undefined,
      })
    }
  }

  // Get initial form values when editing
  const getEditingFormValues = useCallback(() => {
    if (!editingTask) return undefined

    // Determine category ID for the form
    let categoryId: string | undefined
    let categoryLabel: string | undefined

    if (editingTask.system_category) {
      // Map system category name back to form ID
      categoryId = DB_TO_FORM_CATEGORY[editingTask.system_category.name]
      categoryLabel = editingTask.system_category.name
    } else if (editingTask.user_category) {
      // User category uses the actual ID
      categoryId = editingTask.user_category.id
      categoryLabel = editingTask.user_category.name
    }

    return {
      title: editingTask.title,
      categoryId,
      categoryLabel,
      priority: editingTask.priority as Priority,
    }
  }, [editingTask])

  const handleDeleteTask = async (taskId: string) => {
    await deleteTask.mutateAsync(taskId)
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-950" edges={['top']}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <PlanningHeader selectedTarget={selectedTarget} onTargetChange={setSelectedTarget} />

        {tasks.length === 0 && <PlanningTip />}

        {tasks.length > 0 && <TasksRecap tasks={tasks} />}

        {isFormVisible ? (
          <AddTaskForm
            onClose={handleCloseForm}
            onSubmit={handleSubmitTask}
            initialValues={getEditingFormValues()}
            isEditing={!!editingTask}
          />
        ) : (
          <AddTaskPlaceholder onPress={handleOpenForm} />
        )}

        {tasks.length > 0 ? (
          <>
            <TaskList tasks={tasks} onEditTask={handleEditTask} onDeleteTask={handleDeleteTask} />
            <PlanningTip />
          </>
        ) : (
          <PlanningEmptyState taskCount={0} />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
