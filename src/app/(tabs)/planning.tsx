import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { ScrollView, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { addDays } from 'date-fns'

import {
  PlanningHeader,
  PlanningTip,
  AddTaskPlaceholder,
  AddTaskForm,
  PlanningEmptyState,
  TaskList,
  TasksRecap,
  ReminderBanner,
} from '~/components/planning'
import { usePlanForDate } from '~/hooks/usePlans'
import { useCreateTask, useTasks, useDeleteTask, useUpdateTask } from '~/hooks/useTasks'
import { useSystemCategories } from '~/hooks/useCategories'
import { useSubscription } from '~/hooks/useSubscription'
import { useAppConfig } from '~/stores/appConfigStore'
import type { TaskWithCategory } from '~/types'

const FREE_TIER_TASK_LIMIT = 3

type PlanningTarget = 'today' | 'tomorrow'
type Priority = 'high' | 'medium' | 'low'

// Map form category IDs to database category names
const FORM_TO_DB_CATEGORY: Record<string, string> = {
  work: 'Work',
  wellness: 'Wellness',
  personal: 'Personal',
  education: 'Education',
}

// Map database category names back to form IDs
const DB_TO_FORM_CATEGORY: Record<string, string> = {
  Work: 'work',
  Wellness: 'wellness',
  Personal: 'personal',
  Education: 'education',
}

interface TaskFormData {
  title: string
  category: string
  priority: Priority
  notes?: string | null
}

export default function PlanningScreen() {
  const router = useRouter()
  const { defaultPlanningFor, editTaskId, openForm } = useLocalSearchParams<{
    defaultPlanningFor?: 'today' | 'tomorrow'
    editTaskId?: string
    openForm?: string
  }>()
  const [selectedTarget, setSelectedTarget] = useState<PlanningTarget>(
    defaultPlanningFor === 'today' ? 'today' : 'tomorrow',
  )
  const [isFormVisible, setIsFormVisible] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskWithCategory | null>(null)

  // Update target when navigation param changes (tab navigation preserves component state)
  useEffect(() => {
    setSelectedTarget(defaultPlanningFor === 'today' ? 'today' : 'tomorrow')
  }, [defaultPlanningFor])

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
  const { status: subscriptionStatus } = useSubscription()
  const { phase } = useAppConfig()

  // Handle editTaskId param - open edit form when navigating from Today page
  useEffect(() => {
    if (editTaskId && tasks.length > 0) {
      const task = tasks.find((t) => t.id === editTaskId)
      if (task) {
        setEditingTask(task)
        setIsFormVisible(true)
      }
    }
  }, [editTaskId, tasks])

  // Free tier limit logic (disabled during beta - all users get unlimited tasks)
  const isBeta = phase === 'closed_beta' || phase === 'open_beta'
  const isFreeUser = subscriptionStatus === 'free'
  const atTaskLimit = tasks.length >= FREE_TIER_TASK_LIMIT
  // During beta, never show limit UI or enforce limits
  const showLimitUI = !isBeta && isFreeUser
  const enforceLimits = !isBeta && isFreeUser

  // Handle openForm param - auto-open form when navigating from Today's "Add New Task"
  useEffect(() => {
    if (openForm === 'true' && !editTaskId) {
      // Check task limit before opening
      if (enforceLimits && atTaskLimit) {
        Alert.alert(
          'Daily Task Limit Reached',
          'Free accounts can create up to 3 tasks per day. Upgrade to unlock unlimited tasks.',
          [
            { text: 'Maybe Later', style: 'cancel' },
            { text: 'Upgrade', onPress: () => router.push('/subscription') },
          ],
        )
      } else {
        setIsFormVisible(true)
      }
      // Clear the param to prevent re-triggering on tab switch
      router.setParams({ openForm: undefined })
    }
  }, [openForm, editTaskId, enforceLimits, atTaskLimit, router])

  const handleOpenForm = () => {
    // Pre-flight check: prevent free users at limit from opening form (only post-beta)
    if (enforceLimits && atTaskLimit) {
      Alert.alert(
        'Daily Task Limit Reached',
        'Free accounts can create up to 3 tasks per day. Upgrade to unlock unlimited tasks.',
        [
          { text: 'Maybe Later', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/subscription') },
        ],
      )
      return
    }
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

    try {
      if (editingTask) {
        // Update existing task
        await updateTask.mutateAsync({
          taskId: editingTask.id,
          updates: {
            title: task.title,
            priority: task.priority,
            system_category_id: systemCategoryId || null,
            user_category_id: !isSystemCategory ? task.category : null,
            notes: task.notes ?? null,
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
          notes: task.notes,
        })
      }
      // Close form after successful submission
      handleCloseForm()
    } catch (error) {
      if (!editingTask && error instanceof Error && error.message === 'FREE_TIER_LIMIT') {
        Alert.alert(
          'Daily Task Limit Reached',
          'Free accounts can create up to 3 tasks per day. Upgrade to unlock unlimited tasks.',
          [
            { text: 'Maybe Later', style: 'cancel' },
            { text: 'Upgrade', onPress: () => router.push('/subscription') },
          ],
        )
      } else {
        Alert.alert(
          editingTask ? 'Failed to update task' : 'Failed to create task',
          'Please try again.',
        )
      }
    }
  }

  // Find the existing HIGH priority task (excluding self if editing)
  const existingHighPriorityTask = useMemo(() => {
    const highTask = tasks.find(
      (t) => t.priority === 'high' && (!editingTask || t.id !== editingTask.id),
    )
    if (!highTask) return null
    return { id: highTask.id, title: highTask.title }
  }, [tasks, editingTask])

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
      notes: editingTask.notes,
    }
  }, [editingTask])

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask.mutateAsync(taskId)
    } catch (error) {
      Alert.alert('Failed to delete task', 'Please try again.')
    }
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
            existingHighPriorityTask={existingHighPriorityTask}
            editingTaskId={editingTask?.id}
          />
        ) : (
          <AddTaskPlaceholder
            onPress={handleOpenForm}
            disabled={enforceLimits && atTaskLimit}
            atLimit={atTaskLimit}
          />
        )}

        {tasks.length > 0 ? (
          <>
            {selectedTarget === 'tomorrow' && <ReminderBanner />}
            <TaskList
              tasks={tasks}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              showLimit={showLimitUI}
              taskLimit={FREE_TIER_TASK_LIMIT}
            />
            <PlanningTip />
          </>
        ) : (
          <PlanningEmptyState taskCount={0} />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
