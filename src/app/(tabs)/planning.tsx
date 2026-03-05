import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { ScrollView, Alert, LayoutAnimation } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { addDays, format } from 'date-fns'

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
import { useNotificationStore } from '~/stores/notificationStore'
import { useUIStore } from '~/stores/uiStore'
import { useTutorialStore } from '~/stores/tutorialStore'
import { useTutorialAdvancement } from '~/components/tutorial'
import { useTutorialAnalytics } from '~/hooks/useTutorialAnalytics'
import { useScreenTracking } from '~/hooks/useScreenTracking'
import { useAppTheme } from '~/hooks/useAppTheme'
import { useCarryForwardTasks } from '~/hooks/useCarryForwardTasks'
import { useEveningRolloverTasks } from '~/hooks/useEveningRolloverTasks'
import { useAnalytics } from '~/providers/AnalyticsProvider'
import type { TaskWithCategory } from '~/types'

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

  const setEveningRolloverSource = useNotificationStore((s) => s.setEveningRolloverSource)
  const recapLayout = useUIStore((s) => s.recapLayout)

  // Animate layout changes when recap variant switches
  const prevRecapLayout = useRef(recapLayout)
  useEffect(() => {
    if (prevRecapLayout.current !== recapLayout) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
      prevRecapLayout.current = recapLayout
    }
  }, [recapLayout])

  // Evening rollover state (Flow 2 — triggered by planning reminder notification)
  // When true, we gate openForm behind the evening rollover check
  const [planningReminderTriggered, setPlanningReminderTriggered] = useState(false)
  const [showEveningRollover, setShowEveningRollover] = useState(false)

  // Update target when navigation param changes (tab navigation preserves component state)
  // Clear param after consuming to prevent stale state on tab re-selection
  useEffect(() => {
    if (defaultPlanningFor) {
      setSelectedTarget(defaultPlanningFor === 'today' ? 'today' : 'tomorrow')
      // Only clear if not consumed by openForm/editTaskId effects
      // (they clear it themselves once the task is found or form is opened)
      if (!openForm && !editTaskId) {
        router.setParams({ defaultPlanningFor: undefined })
      }
    }
  }, [defaultPlanningFor, openForm, editTaskId, router])

  // Get dates for today and tomorrow
  const todayDate = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])
  const tomorrowDate = useMemo(() => format(addDays(new Date(), 1), 'yyyy-MM-dd'), [])

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
        // Ensure header matches the task's day so the task list context is correct
        const taskDay: PlanningTarget = task.plan_id === todayPlan?.id ? 'today' : 'tomorrow'
        setSelectedTarget(taskDay)

        setEditingTask(task)
        setIsFormVisible(true)

        // Clear params to prevent re-triggering and stale state on tab re-selection
        router.setParams({ editTaskId: undefined, defaultPlanningFor: undefined })
      }
    }
  }, [editTaskId, tasks, todayPlan?.id, router])

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

      if (trigger === 'planning_reminder') {
        // Claim the session so the app-open flow knows not to trigger
        setEveningRolloverSource('notification')
        // Gate form behind evening rollover check
        setPlanningReminderTriggered(true)
        router.setParams({ openForm: undefined, trigger: undefined, defaultPlanningFor: undefined })
        return
      }

      // Normal flow (no trigger) — open form directly
      setIsFormVisible(true)
      // Clear params to prevent re-triggering and stale state on tab re-selection
      router.setParams({ openForm: undefined, defaultPlanningFor: undefined })
    }
  }, [openForm, editTaskId, defaultPlanningFor, trigger, router])

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
      // Reset source so the app-open flow isn't blocked for the rest of the session
      setPlanningReminderTriggered(false)
      setEveningRolloverSource(null)
      setIsFormVisible(true)
    }

    return () => {
      // If we claimed the session but tomorrowPlan never resolved (e.g. network error),
      // release the claim on unmount so the app-open flow isn't permanently blocked
      if (planningReminderTriggered && !tomorrowPlan) {
        setEveningRolloverSource(null)
      }
    }
  }, [
    planningReminderTriggered,
    eveningLoading,
    eveningShouldShow,
    tomorrowPlan,
    setEveningRolloverSource,
  ])

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
          source: 'notification',
        })

        await markEveningPrompted()
        // Reset inside try (not finally) — keep source claimed while modal is open for retry
        setEveningRolloverSource(null)

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
    [
      tomorrowPlan,
      carryForwardTasks,
      markEveningPrompted,
      track,
      eveningMitTask,
      setEveningRolloverSource,
    ],
  )

  const handleEveningStartFresh = useCallback(async () => {
    track('evening_rollover_started_fresh', {
      task_count: (eveningMitTask ? 1 : 0) + eveningOtherTasks.length,
      had_mit: !!eveningMitTask,
      source: 'notification',
    })

    try {
      await markEveningPrompted()
    } catch (error) {
      console.error('[EveningRollover] Failed to mark as prompted:', error)
      // Non-fatal — proceed anyway so user isn't stuck
    }
    setEveningRolloverSource(null)
    setShowEveningRollover(false)
    setPlanningReminderTriggered(false)
    setIsFormVisible(true)
  }, [
    markEveningPrompted,
    track,
    eveningMitTask,
    eveningOtherTasks.length,
    setEveningRolloverSource,
  ])

  const handleCloseForm = useCallback(() => {
    setIsFormVisible(false)
    setEditingTask(null)
    setShouldAutoFocusTitle(false)
  }, [])

  const handleTargetChange = useCallback(
    (target: PlanningTarget) => {
      setSelectedTarget(target)
      // Always reset form state when switching days — handleCloseForm is idempotent
      handleCloseForm()
    },
    [handleCloseForm],
  )

  const handleOpenForm = useCallback(() => {
    setEditingTask(null)
    setIsFormVisible(true)
  }, [])

  // Reset form when tutorial is replayed (user clicks "Replay Tutorial" from Settings)
  useEffect(() => {
    if (isTutorialActive && currentStep === 'welcome' && isFormVisible) {
      handleCloseForm()
    }
  }, [isTutorialActive, currentStep, isFormVisible, handleCloseForm])

  const handleEditTask = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId)
      if (task) {
        // Sync header to task's day so submission targets the correct plan
        const taskDay: PlanningTarget = task.plan_id === todayPlan?.id ? 'today' : 'tomorrow'
        setSelectedTarget(taskDay)

        setEditingTask(task)
        setIsFormVisible(true)
        setShouldAutoFocusTitle(true)
        // Scroll to top after state updates to bring form into view
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: 0, animated: true })
        }, 100)
      }
    },
    [tasks, todayPlan?.id],
  )

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
        const targetPlanId = selectedTarget === 'today' ? todayPlan?.id : tomorrowPlan?.id

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
        // Create new task - use the plan for the header's selected day
        const targetPlanId = selectedTarget === 'today' ? todayPlan?.id : tomorrowPlan?.id
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
      Alert.alert(
        editingTask ? 'Failed to update task' : 'Failed to create task',
        'Please try again.',
      )
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
  const editingFormValues = useMemo(() => {
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
      reminderAt: editingTask.reminder_at,
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
        <PlanningHeader
          selectedTarget={selectedTarget}
          onTargetChange={handleTargetChange}
          dateSuffix={
            recapLayout === 'inline' && tasks.length > 0
              ? <TasksRecap tasks={tasks} variant="inline" />
              : undefined
          }
        />

        {recapLayout !== 'inline' && tasks.length > 0 && (
          <TasksRecap tasks={tasks} variant={recapLayout} />
        )}

        {isFormVisible ? (
          <AddTaskForm
            onClose={handleCloseForm}
            onSubmit={handleSubmitTask}
            initialValues={editingFormValues}
            isEditing={!!editingTask}
            existingTopPriorityTask={existingTopPriorityTask}
            editingTaskId={editingTask?.id}
            selectedTarget={selectedTarget}
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
          <AddTaskPlaceholder onPress={handleOpenForm} />
        )}

        <PlanningTip />

        {tasks.length > 0 ? (
          <TaskList tasks={tasks} onEditTask={handleEditTask} onDeleteTask={handleDeleteTask} />
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
        mitToggleLabel="Make this tomorrow's top priority"
        onCarryForward={handleEveningCarryForward}
        onStartFresh={handleEveningStartFresh}
      />
    </SafeAreaView>
  )
}
