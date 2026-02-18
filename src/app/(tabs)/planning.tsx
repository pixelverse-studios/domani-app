import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
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
  RolloverModal,
} from '~/components/planning'
import { usePlanForDate } from '~/hooks/usePlans'
import { useCreateTask, useTasks, useDeleteTask, useUpdateTask } from '~/hooks/useTasks'
import { useSystemCategories } from '~/hooks/useCategories'
import { useSubscription } from '~/hooks/useSubscription'
import { useAppConfig } from '~/stores/appConfigStore'
import { useTutorialStore } from '~/stores/tutorialStore'
import { useTutorialAdvancement } from '~/components/tutorial'
import { useTutorialAnalytics } from '~/hooks/useTutorialAnalytics'
import { useScreenTracking } from '~/hooks/useScreenTracking'
import { useAppTheme } from '~/hooks/useAppTheme'
import { useCarryForwardTasks } from '~/hooks/useCarryForwardTasks'
import { useEveningRolloverTasks } from '~/hooks/useEveningRolloverTasks'
import { useAnalytics } from '~/providers/AnalyticsProvider'
import type { TaskWithCategory } from '~/types'

const FREE_TIER_TASK_LIMIT = 3

// Tutorial timing constants
const TUTORIAL_TASK_RENDER_DELAY = 500 // Delay for task to appear in list before advancing

type PlanningTarget = 'today' | 'tomorrow'
type Priority = 'top' | 'high' | 'medium' | 'low'

// Map form category IDs to database category names
const FORM_TO_DB_CATEGORY: Record<string, string> = {
  work: 'Work',
  wellness: 'Wellness',
  personal: 'Personal',
  home: 'Home',
}

// Map database category names back to form IDs
const DB_TO_FORM_CATEGORY: Record<string, string> = {
  Work: 'work',
  Wellness: 'wellness',
  Personal: 'personal',
  Home: 'home',
}

interface TaskFormData {
  title: string
  category: string
  priority: Priority
  notes?: string | null
  plannedFor?: 'today' | 'tomorrow'
  reminderAt?: string | null
}

export default function PlanningScreen() {
  useScreenTracking('planning')
  const theme = useAppTheme()
  const router = useRouter()
  const scrollViewRef = useRef<ScrollView>(null)
  const isMountedRef = useRef(true)

  // Track mounted state to prevent setTimeout callbacks after unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])
  const { defaultPlanningFor, editTaskId, openForm, trigger } = useLocalSearchParams<{
    defaultPlanningFor?: 'today' | 'tomorrow'
    editTaskId?: string
    openForm?: string
    trigger?: string
  }>()
  const [selectedTarget, setSelectedTarget] = useState<PlanningTarget>(
    defaultPlanningFor === 'today' ? 'today' : 'tomorrow',
  )
  const [isFormVisible, setIsFormVisible] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskWithCategory | null>(null)
  const [shouldAutoFocusTitle, setShouldAutoFocusTitle] = useState(false)
  // Separate state for form's day toggle - decoupled from header to prevent race conditions
  // Initialize from defaultPlanningFor to avoid showing wrong day when editing from Today screen
  const [formSelectedDay, setFormSelectedDay] = useState<PlanningTarget>(
    defaultPlanningFor === 'today' ? 'today' : 'tomorrow',
  )

  // Evening rollover state (Flow 2 — triggered by planning reminder notification)
  // When true, we gate openForm behind the evening rollover check
  const [planningReminderTriggered, setPlanningReminderTriggered] = useState(false)
  const [showEveningRollover, setShowEveningRollover] = useState(false)

  // Update target when navigation param changes (tab navigation preserves component state)
  // This effect must run synchronously before the openForm effect to ensure correct target
  useEffect(() => {
    if (defaultPlanningFor) {
      setSelectedTarget(defaultPlanningFor === 'today' ? 'today' : 'tomorrow')
    }
  }, [defaultPlanningFor])

  // Sync form's day toggle when defaultPlanningFor changes (handles component already mounted)
  // This ensures editing from Today screen shows "Today" even if component state persisted "Tomorrow"
  useEffect(() => {
    if (defaultPlanningFor && editTaskId) {
      setFormSelectedDay(defaultPlanningFor === 'today' ? 'today' : 'tomorrow')
    }
  }, [defaultPlanningFor, editTaskId])

  // Get the target date based on selection
  const targetDate = useMemo(() => {
    return selectedTarget === 'today' ? new Date() : addDays(new Date(), 1)
  }, [selectedTarget])

  // Get dates for today and tomorrow
  const todayDate = useMemo(() => new Date(), [])
  const tomorrowDate = useMemo(() => addDays(new Date(), 1), [])

  // Get or create plans for both today and tomorrow (needed for moving tasks between days)
  const { data: todayPlan } = usePlanForDate(todayDate)
  const { data: tomorrowPlan } = usePlanForDate(tomorrowDate)

  // The plan for the currently selected target
  const plan = selectedTarget === 'today' ? todayPlan : tomorrowPlan
  const { data: tasks = [] } = useTasks(plan?.id)
  const { data: systemCategories = [] } = useSystemCategories()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const { status: subscriptionStatus } = useSubscription()
  const { phase } = useAppConfig()
  const { setTutorialTaskId } = useTutorialStore()
  const {
    isActive: isTutorialActive,
    currentStep,
    advanceFromCompleteForm,
  } = useTutorialAdvancement()
  const { trackTutorialTaskCreated } = useTutorialAnalytics()

  // Analytics
  const { track } = useAnalytics()

  // Evening rollover hooks (only active when planning reminder notification was tapped)
  const { mutateAsync: carryForwardTasks } = useCarryForwardTasks()
  const {
    mitTask: eveningMitTask,
    otherTasks: eveningOtherTasks,
    shouldShow: eveningShouldShow,
    isLoading: eveningLoading,
    markEveningPrompted,
  } = useEveningRolloverTasks({ enabled: planningReminderTriggered })

  // Handle editTaskId param - open edit form when navigating from Today page
  useEffect(() => {
    if (editTaskId && tasks.length > 0) {
      const task = tasks.find((t) => t.id === editTaskId)
      if (task) {
        // Set form's day toggle to task's actual day (decoupled from header)
        const taskDay: PlanningTarget = task.plan_id === todayPlan?.id ? 'today' : 'tomorrow'
        setFormSelectedDay(taskDay)

        setEditingTask(task)
        setIsFormVisible(true)

        // Clear editTaskId param to prevent re-triggering when toggling days
        router.setParams({ editTaskId: undefined })
      }
    }
  }, [editTaskId, tasks, todayPlan?.id, router])

  // Free tier limit logic (disabled during beta - all users get unlimited tasks)
  const isBeta = phase === 'closed_beta' || phase === 'open_beta'
  const isFreeUser = subscriptionStatus === 'free'
  const atTaskLimit = tasks.length >= FREE_TIER_TASK_LIMIT
  // During beta, never show limit UI or enforce limits
  const showLimitUI = !isBeta && isFreeUser
  const enforceLimits = !isBeta && isFreeUser

  // Handle openForm param - auto-open form when navigating from Today's "Add New Task"
  // When trigger==='planning_reminder', gate form behind evening rollover check first
  useEffect(() => {
    if (openForm === 'true' && !editTaskId) {
      // Ensure target is set correctly BEFORE opening the form
      // This handles race conditions where the defaultPlanningFor effect hasn't run yet
      const targetDay: PlanningTarget = defaultPlanningFor === 'today' ? 'today' : 'tomorrow'
      if (defaultPlanningFor) {
        setSelectedTarget(targetDay)
      }
      // Initialize form's day toggle for new task
      setFormSelectedDay(targetDay)

      if (trigger === 'planning_reminder') {
        // Gate form behind evening rollover check
        setPlanningReminderTriggered(true)
        router.setParams({ openForm: undefined, trigger: undefined })
        return
      }

      // Normal flow (no trigger) — open form directly
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
      // Clear only the openForm param to prevent re-triggering on tab switch
      // Keep defaultPlanningFor so it can be used if needed
      router.setParams({ openForm: undefined })
    }
  }, [openForm, editTaskId, defaultPlanningFor, trigger, enforceLimits, atTaskLimit, router])

  // Once evening rollover data is ready, decide whether to show modal or open form directly
  // Also wait for tomorrowPlan to be available before showing modal (prevents null guard issues)
  useEffect(() => {
    if (!planningReminderTriggered || eveningLoading) return

    if (eveningShouldShow) {
      if (tomorrowPlan) {
        setShowEveningRollover(true)
      }
      // If tomorrowPlan isn't ready yet, wait — effect re-runs when tomorrowPlan resolves
    } else {
      // No eligible tasks or already prompted — skip rollover, open form directly
      setPlanningReminderTriggered(false)
      setIsFormVisible(true)
    }
  }, [planningReminderTriggered, eveningLoading, eveningShouldShow, tomorrowPlan])

  // Evening rollover handlers
  const handleEveningCarryForward = useCallback(
    async (params: {
      selectedTaskIds: string[]
      makeMitToday: boolean
      keepReminderTimes: boolean
    }) => {
      if (!tomorrowPlan) {
        Alert.alert(
          'Not ready yet',
          "Tomorrow's plan is still loading. Please try again in a moment.",
        )
        return
      }

      try {
        await carryForwardTasks({
          selectedTaskIds: params.selectedTaskIds,
          targetPlanId: tomorrowPlan.id,
          shouldMakeMIT: params.makeMitToday,
          keepReminderTimes: params.keepReminderTimes,
        })

        track('evening_rollover_carried_forward', {
          task_count: params.selectedTaskIds.length,
          mit_carried: !!eveningMitTask && params.selectedTaskIds.includes(eveningMitTask.id),
          mit_made_tomorrow: params.makeMitToday,
          kept_reminders: params.keepReminderTimes,
        })

        await markEveningPrompted()

        // Success: close modal and open planning form
        setShowEveningRollover(false)
        setPlanningReminderTriggered(false)
        setIsFormVisible(true)
      } catch (error) {
        console.error('[EveningRollover] Failed to carry forward tasks:', error)
        // Keep modal open so user can retry or start fresh
        Alert.alert(
          'Something went wrong',
          "We couldn't carry your tasks forward. Please try again.",
        )
      }
    },
    [tomorrowPlan, carryForwardTasks, markEveningPrompted, track, eveningMitTask],
  )

  const handleEveningStartFresh = useCallback(async () => {
    track('evening_rollover_started_fresh', {
      task_count: (eveningMitTask ? 1 : 0) + eveningOtherTasks.length,
      had_mit: !!eveningMitTask,
    })

    try {
      await markEveningPrompted()
    } catch (error) {
      console.error('[EveningRollover] Failed to mark as prompted:', error)
      // Non-fatal — proceed anyway so user isn't stuck
    }
    setShowEveningRollover(false)
    setPlanningReminderTriggered(false)
    setIsFormVisible(true)
  }, [markEveningPrompted, track, eveningMitTask, eveningOtherTasks.length])

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
    // Initialize form's day toggle from header selection for new tasks
    setFormSelectedDay(selectedTarget)
    setEditingTask(null)
    setIsFormVisible(true)
  }

  const handleCloseForm = () => {
    setIsFormVisible(false)
    setEditingTask(null)
    setShouldAutoFocusTitle(false)
  }

  // Reset form when tutorial is replayed (user clicks "Replay Tutorial" from Settings)
  useEffect(() => {
    if (isTutorialActive && currentStep === 'welcome' && isFormVisible) {
      handleCloseForm()
    }
  }, [isTutorialActive, currentStep, isFormVisible, handleCloseForm])

  const handleEditTask = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId)
    if (task) {
      // Set form's day toggle to task's actual day (decoupled from header)
      const taskDay: PlanningTarget = task.plan_id === todayPlan?.id ? 'today' : 'tomorrow'
      setFormSelectedDay(taskDay)

      setEditingTask(task)
      setIsFormVisible(true)
      setShouldAutoFocusTitle(true)
      // Scroll to top after state updates to bring form into view
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true })
      }, 100)
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
        // Determine if task is moving to a different day
        const originalPlanId = editingTask.plan_id
        const targetPlanId = task.plannedFor === 'today' ? todayPlan?.id : tomorrowPlan?.id

        // Build base updates
        const updates: Parameters<typeof updateTask.mutateAsync>[0]['updates'] = {
          title: task.title,
          priority: task.priority,
          system_category_id: systemCategoryId || null,
          user_category_id: !isSystemCategory ? task.category : null,
          notes: task.notes ?? null,
          reminder_at: task.reminderAt ?? null,
        }

        // If day changed, add plan_id to updates
        if (targetPlanId && targetPlanId !== originalPlanId) {
          updates.plan_id = targetPlanId
        }

        // Update existing task
        await updateTask.mutateAsync({
          taskId: editingTask.id,
          updates,
          originalPlanId,
        })
      } else {
        // Create new task - use the plan for the selected target day
        const targetPlanId = task.plannedFor === 'today' ? todayPlan?.id : tomorrowPlan?.id
        if (!targetPlanId) {
          console.error('No plan available for target day')
          return
        }

        const newTask = await createTask.mutateAsync({
          planId: targetPlanId,
          title: task.title,
          priority: task.priority,
          systemCategoryId: systemCategoryId,
          userCategoryId: !isSystemCategory ? task.category : undefined,
          notes: task.notes,
          reminderAt: task.reminderAt,
        })

        // If tutorial is active at complete_form step, store task ID and advance
        if (isTutorialActive && currentStep === 'complete_form') {
          if (!newTask?.id) {
            console.warn('Tutorial: Task created but missing ID, cannot advance')
          } else {
            setTutorialTaskId(newTask.id)
            // Track tutorial task creation for analytics
            trackTutorialTaskCreated()
            // Delay advancement to allow task to appear in list
            setTimeout(() => {
              if (isMountedRef.current) {
                try {
                  advanceFromCompleteForm()
                } catch (error) {
                  console.error('Failed to advance tutorial from complete_form:', error)
                }
              }
            }, TUTORIAL_TASK_RENDER_DELAY)
          }
        }
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

  // Find the existing TOP priority task (excluding self if editing)
  const existingTopPriorityTask = useMemo(() => {
    const topTask = tasks.find(
      (t) => t.priority === 'top' && (!editingTask || t.id !== editingTask.id),
    )
    if (!topTask) return null
    return { id: topTask.id, title: topTask.title }
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

    // Determine which day the task is planned for based on its plan_id
    const plannedFor: PlanningTarget = editingTask.plan_id === todayPlan?.id ? 'today' : 'tomorrow'

    return {
      title: editingTask.title,
      categoryId,
      categoryLabel,
      priority: editingTask.priority as Priority,
      notes: editingTask.notes,
      plannedFor,
      reminderAt: editingTask.reminder_at,
    }
  }, [editingTask, todayPlan?.id])

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask.mutateAsync(taskId)
    } catch (error) {
      Alert.alert('Failed to delete task', 'Please try again.')
    }
  }

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: theme.colors.background }}
      edges={['top']}
    >
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
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
            existingTopPriorityTask={existingTopPriorityTask}
            editingTaskId={editingTask?.id}
            selectedTarget={formSelectedDay}
            onTargetChange={setFormSelectedDay}
            autoFocusTitle={shouldAutoFocusTitle}
            onScrollToCategory={() => {
              // Scroll down to position category section better during tutorial
              scrollViewRef.current?.scrollTo({ y: 120, animated: true })
            }}
            onScrollToBottom={() => {
              // Scroll to show Add Task button during complete_form tutorial step
              // Use fixed position instead of scrollToEnd to leave room for tooltip above
              scrollViewRef.current?.scrollTo({ y: 340, animated: true })
            }}
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
      {/* Evening rollover prompt — shown when user opens planning via reminder notification */}
      <RolloverModal
        visible={showEveningRollover}
        mitTask={eveningMitTask}
        otherTasks={eveningOtherTasks}
        title="Today's Unfinished Tasks"
        subtitle="Before you plan tomorrow, wrap up today"
        onCarryForward={handleEveningCarryForward}
        onStartFresh={handleEveningStartFresh}
      />
    </SafeAreaView>
  )
}
