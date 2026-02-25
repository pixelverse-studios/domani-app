import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { supabase } from '~/lib/supabase'
import { addBreadcrumb } from '~/lib/sentry'
import { NotificationService } from '~/lib/notifications'
import { useIncrementCategoryUsage } from '~/hooks/useCategories'
import { useAnalytics } from '~/providers/AnalyticsProvider'
import type { TaskWithCategory, TaskPriority } from '~/types'

// 5 minutes - tasks change with user action but don't need real-time updates
const TASKS_STALE_TIME = 1000 * 60 * 5

export function useTasks(planId: string | undefined) {
  return useQuery({
    queryKey: ['tasks', planId],
    queryFn: async () => {
      if (!planId) return []

      const { data, error } = await supabase
        .from('tasks')
        .select(
          `
          *,
          system_category:system_categories(*),
          user_category:user_categories(*)
        `,
        )
        .eq('plan_id', planId)
        .order('position')

      if (error) throw error

      return data as TaskWithCategory[]
    },
    enabled: !!planId,
    staleTime: TASKS_STALE_TIME,
  })
}

export function useToggleTask() {
  const queryClient = useQueryClient()
  const { track } = useAnalytics()

  return useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      // First get the task to check for notification_id
      const { data: existingTask } = await supabase
        .from('tasks')
        .select('notification_id')
        .eq('id', taskId)
        .single()

      const { data, error } = await supabase
        .from('tasks')
        .update({
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq('id', taskId)
        .select()
        .single()

      if (error) throw error

      // Cancel notification if task is being completed
      if (completed && existingTask?.notification_id) {
        await NotificationService.cancelTaskReminder(existingTask.notification_id)
      }

      return data
    },
    onMutate: async ({ taskId, completed }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['tasks'] })

      const previousTasks = queryClient.getQueriesData({ queryKey: ['tasks'] })

      // Find the task being toggled for analytics
      let taskForAnalytics: TaskWithCategory | undefined
      for (const [, tasks] of previousTasks) {
        const found = (tasks as TaskWithCategory[] | undefined)?.find((t) => t.id === taskId)
        if (found) {
          taskForAnalytics = found
          break
        }
      }

      queryClient.setQueriesData({ queryKey: ['tasks'] }, (old: TaskWithCategory[] | undefined) => {
        if (!old) return old
        return old.map((task) =>
          task.id === taskId
            ? { ...task, completed_at: completed ? new Date().toISOString() : null }
            : task,
        )
      })

      return { previousTasks, taskForAnalytics }
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        context.previousTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSettled: (_data, _error, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      addBreadcrumb('Task toggled', 'task', {
        taskId: variables.taskId,
        completed: variables.completed,
      })

      // Track completion/uncompletion event
      const task = context?.taskForAnalytics
      if (task) {
        if (variables.completed) {
          // Calculate time to complete in hours
          const createdAt = new Date(task.created_at)
          const timeToCompleteHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60)

          track('task_completed', {
            is_mit: task.is_mit ?? false,
            priority: task.priority ?? 'medium',
            time_to_complete_hours: Math.round(timeToCompleteHours * 10) / 10,
          })
        } else {
          track('task_uncompleted', {
            is_mit: task.is_mit ?? false,
          })
        }
      }
    },
  })
}

interface CreateTaskInput {
  planId: string
  title: string
  description?: string
  systemCategoryId?: string
  userCategoryId?: string
  priority?: TaskPriority
  estimatedDurationMinutes?: number
  notes?: string | null
  reminderAt?: string | null // ISO timestamp for when to send reminder notification
  // Note: is_mit is now automatically controlled by priority via DB trigger
  // TOP priority = is_mit: true, HIGH/MEDIUM/LOW = is_mit: false
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  const incrementUsage = useIncrementCategoryUsage()
  const { track } = useAnalytics()

  return useMutation({
    mutationFn: async ({
      planId,
      title,
      description,
      systemCategoryId,
      userCategoryId,
      priority = 'medium',
      estimatedDurationMinutes,
      notes,
      reminderAt,
    }: CreateTaskInput) => {
      // Get current user for user_id
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Note: is_mit is automatically set by DB trigger based on priority
      // TOP priority tasks are automatically marked as MIT
      // If another TOP task exists, it will be demoted to HIGH by the trigger
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          plan_id: planId,
          user_id: user.id,
          title,
          description,
          system_category_id: systemCategoryId,
          user_category_id: userCategoryId,
          priority,
          estimated_duration_minutes: estimatedDurationMinutes,
          notes,
          reminder_at: reminderAt,
        })
        .select(
          `
          *,
          system_category:system_categories(*),
          user_category:user_categories(*)
        `,
        )
        .single()

      if (error) {
        throw error
      }

      // Schedule reminder notification if set
      if (data.reminder_at) {
        const notificationId = await NotificationService.scheduleTaskReminder({
          id: data.id,
          title: data.title,
          is_mit: data.is_mit,
          reminder_at: data.reminder_at,
        })

        // Update task with notification ID for later cancellation
        if (notificationId) {
          await supabase.from('tasks').update({ notification_id: notificationId }).eq('id', data.id)
          data.notification_id = notificationId
        }
      }

      return data as TaskWithCategory
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', data.plan_id] })
      addBreadcrumb('Task created', 'task', {
        taskId: data.id,
        priority: data.priority,
        isMit: data.is_mit,
      })

      // Track task creation
      const categoryName = data.system_category?.name || data.user_category?.name
      track('task_created', {
        priority: data.priority ?? 'medium',
        has_duration: !!data.estimated_duration_minutes,
        has_notes: !!data.notes,
        ...(categoryName && { category: categoryName }),
      })

      // Increment category usage count for smart sorting
      if (data.system_category_id || data.user_category_id) {
        incrementUsage.mutate({
          systemCategoryId: data.system_category_id,
          userCategoryId: data.user_category_id,
        })
      }
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      taskId,
      updates,
      originalPlanId,
    }: {
      taskId: string
      updates: Partial<{
        title: string
        description: string
        system_category_id: string | null
        user_category_id: string | null
        priority: TaskPriority
        estimated_duration_minutes: number
        position: number
        notes: string | null
        plan_id: string // Support moving task to different plan (day change)
        reminder_at: string | null // Update reminder time
        // Note: is_mit is automatically controlled by priority via DB trigger
        // Setting priority to 'top' will auto-set is_mit=true and demote other TOP tasks to HIGH
      }>
      /** Original plan ID for cache invalidation when task moves to different plan */
      originalPlanId?: string
    }) => {
      // Get existing task to check for notification changes
      const { data: existingTask } = await supabase
        .from('tasks')
        .select('notification_id, reminder_at, title, is_mit')
        .eq('id', taskId)
        .single()

      // Note: When priority is updated to 'top', DB trigger will:
      // 1. Set is_mit = true on this task
      // 2. Demote any other TOP priority tasks to HIGH
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single()

      if (error) throw error

      // Handle reminder notification changes
      const reminderChanged = 'reminder_at' in updates
      const titleChanged = 'title' in updates

      if (reminderChanged || titleChanged) {
        // Cancel existing notification if any
        if (existingTask?.notification_id) {
          await NotificationService.cancelTaskReminder(existingTask.notification_id)
        }

        // Schedule new notification if reminder is set
        if (data.reminder_at) {
          const notificationId = await NotificationService.scheduleTaskReminder({
            id: data.id,
            title: data.title,
            is_mit: data.is_mit,
            reminder_at: data.reminder_at,
          })

          // Update task with new notification ID
          if (notificationId) {
            await supabase
              .from('tasks')
              .update({ notification_id: notificationId })
              .eq('id', taskId)
            data.notification_id = notificationId
          } else {
            // Clear notification_id if scheduling failed or reminder is in the past
            await supabase.from('tasks').update({ notification_id: null }).eq('id', taskId)
            data.notification_id = null
          }
        } else {
          // Clear notification_id since reminder was removed
          await supabase.from('tasks').update({ notification_id: null }).eq('id', taskId)
          data.notification_id = null
        }
      }

      return { data, originalPlanId }
    },
    onSuccess: ({ data, originalPlanId }) => {
      // Invalidate the new plan's tasks
      queryClient.invalidateQueries({ queryKey: ['tasks', data.plan_id] })
      // If task moved to different plan, also invalidate the original plan's tasks
      if (originalPlanId && originalPlanId !== data.plan_id) {
        queryClient.invalidateQueries({ queryKey: ['tasks', originalPlanId] })
      }
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  const { track } = useAnalytics()

  return useMutation({
    mutationFn: async (taskId: string) => {
      // First get the task to check for notification_id
      const { data: existingTask } = await supabase
        .from('tasks')
        .select('notification_id')
        .eq('id', taskId)
        .single()

      // Cancel notification if task had one scheduled
      if (existingTask?.notification_id) {
        await NotificationService.cancelTaskReminder(existingTask.notification_id)
      }

      // Look up task from cache before deleting for analytics
      const allTaskQueries = queryClient.getQueriesData({ queryKey: ['tasks'] })
      let wasCompleted = false
      for (const [, tasks] of allTaskQueries) {
        const found = (tasks as TaskWithCategory[] | undefined)?.find((t) => t.id === taskId)
        if (found) {
          wasCompleted = !!found.completed_at
          break
        }
      }

      const { error } = await supabase.from('tasks').delete().eq('id', taskId)

      if (error) throw error
      return { taskId, wasCompleted }
    },
    onSuccess: ({ taskId, wasCompleted }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      addBreadcrumb('Task deleted', 'task', { taskId })

      // Track task deletion
      track('task_deleted', { was_completed: wasCompleted })
    },
  })
}
