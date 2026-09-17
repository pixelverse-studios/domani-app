import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { supabase } from '~/lib/supabase'
import { addBreadcrumb } from '~/lib/sentry'
import { NotificationService } from '~/lib/notifications'
import { wasCelebratedToday, markCelebratedToday } from '~/lib/rollover'
import { useCelebrationStore } from '~/stores/celebrationStore'
import { useIncrementCategoryUsage } from '~/hooks/useCategories'
import { useAuth } from '~/hooks/useAuth'
import { useAnalytics } from '~/providers/AnalyticsProvider'
import type { TaskWithCategory, TaskPriority } from '~/types'
import {
  captureAccountOperationToken,
  isAccountOperationTokenCurrent,
  reconcileAccountOperation,
  runAccountOwnedOperation,
} from '~/lib/accountLifecycleCoordinator'

// 5 minutes - tasks change with user action but don't need real-time updates
const TASKS_STALE_TIME = 1000 * 60 * 5

class TaskAccountChangedError extends Error {
  constructor() {
    super('Task operation was cancelled because the authenticated account changed.')
    this.name = 'TaskAccountChangedError'
  }
}

const runTaskAccountOperation = <T>(userId: string, operation: () => Promise<T>): Promise<T> => {
  const blocked = Symbol('task-account-changed')
  return runAccountOwnedOperation<T | typeof blocked>(userId, blocked, operation).then((result) => {
    if (result === blocked) throw new TaskAccountChangedError()
    return result
  })
}

export function useTasks(date: string | undefined) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['tasks', user?.id, date],
    queryFn: async () => {
      if (!user?.id || !date) return []

      const { data, error } = await supabase
        .from('tasks')
        .select(
          `
          *,
          system_category:system_categories(*),
          user_category:user_categories(*)
        `,
        )
        .eq('scheduled_date', date)
        .eq('user_id', user.id)
        .is('rolled_over_at', null)
        .order('position')

      if (error) throw error

      return data as TaskWithCategory[]
    },
    enabled: !!user?.id && !!date,
    placeholderData: [],
    staleTime: TASKS_STALE_TIME,
  })
}

export function useToggleTask() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { track } = useAnalytics()

  return useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      if (!user?.id) throw new Error('Not authenticated')
      const expectedUserId = user.id

      return runTaskAccountOperation(expectedUserId, async () => {
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
          await NotificationService.cancelTaskReminder(
            existingTask.notification_id,
            expectedUserId,
            false,
          )
        }

        return data
      })
    },
    onMutate: async ({ taskId, completed }) => {
      if (!user?.id) return
      const accountToken = captureAccountOperationToken(user.id)

      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['tasks', user.id] })
      if (!isAccountOperationTokenCurrent(accountToken)) return { accountToken }

      const previousTasks = queryClient.getQueriesData({ queryKey: ['tasks', user.id] })

      // Find the task being toggled for analytics
      let taskForAnalytics: TaskWithCategory | undefined
      for (const [, tasks] of previousTasks) {
        const found = (tasks as TaskWithCategory[] | undefined)?.find((t) => t.id === taskId)
        if (found) {
          taskForAnalytics = found
          break
        }
      }

      queryClient.setQueriesData(
        { queryKey: ['tasks', user.id] },
        (old: TaskWithCategory[] | undefined) => {
          if (!old) return old
          return old.map((task) =>
            task.id === taskId
              ? { ...task, completed_at: completed ? new Date().toISOString() : null }
              : task,
          )
        },
      )

      return { previousTasks, taskForAnalytics, accountToken }
    },
    onSuccess: async (data, variables, context) => {
      // Real-time celebration: fire when the last incomplete task is marked complete.
      // Checks the optimistic cache (already updated by onMutate) — no DB round-trip needed.
      // Wrapped in try/catch to isolate celebration logic from the mutation lifecycle:
      // if this throws, onSettled still runs (cache invalidation + analytics stay intact).
      try {
        if (!variables.completed || !isAccountOperationTokenCurrent(context?.accountToken)) return

        const userId = user?.id ?? data.user_id
        if (!userId) return

        const tasks = queryClient.getQueryData<TaskWithCategory[]>([
          'tasks',
          userId,
          data.scheduled_date,
        ])
        if (!tasks || tasks.length === 0) return

        const allComplete = tasks.every((t) => t.completed_at !== null)
        if (!allComplete) return

        // TOCTOU guard: if celebration is already showing (another concurrent completion
        // won the race), skip the async AsyncStorage path entirely.
        if (useCelebrationStore.getState().shouldShowCelebration) return

        // Idempotency: don't show twice if the user toggles a task off and on again
        const alreadyCelebrated = await wasCelebratedToday(userId)
        if (alreadyCelebrated || !isAccountOperationTokenCurrent(context?.accountToken)) return

        await markCelebratedToday(userId)
        if (!isAccountOperationTokenCurrent(context?.accountToken)) return
        useCelebrationStore.getState().trigger(tasks.length)
      } catch (error) {
        if (__DEV__) console.error('[useToggleTask] Celebration trigger failed:', error)
        // Non-fatal — task toggle succeeded; celebration is best-effort
      }
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (!context?.previousTasks || !context.accountToken) return
      reconcileAccountOperation(context.accountToken, (disposition) => {
        if (disposition === 'changed') return
        context.previousTasks?.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      })
    },
    onSettled: (_data, _error, variables, context) => {
      const accountToken = context?.accountToken
      if (!accountToken) return
      reconcileAccountOperation(accountToken, (disposition) => {
        if (disposition === 'changed') return
        queryClient.invalidateQueries({ queryKey: ['tasks', accountToken.userId] })
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
      })
    },
  })
}

interface CreateTaskInput {
  scheduledDate: string
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
  const { user } = useAuth()
  const incrementUsage = useIncrementCategoryUsage()
  const { track } = useAnalytics()

  return useMutation({
    mutationFn: async ({
      scheduledDate,
      title,
      description,
      systemCategoryId,
      userCategoryId,
      priority = 'medium',
      estimatedDurationMinutes,
      notes,
      reminderAt,
    }: CreateTaskInput) => {
      if (!user?.id) throw new Error('Not authenticated')
      const expectedUserId = user.id

      return runTaskAccountOperation(expectedUserId, async () => {
        const { data, error } = await supabase
          .from('tasks')
          .insert({
            user_id: expectedUserId,
            title,
            description,
            system_category_id: systemCategoryId,
            user_category_id: userCategoryId,
            priority,
            estimated_duration_minutes: estimatedDurationMinutes,
            notes,
            reminder_at: null,
            scheduled_date: scheduledDate,
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
        if (reminderAt) {
          const notificationId = await NotificationService.scheduleTaskReminder(
            {
              id: data.id,
              title: data.title,
              is_mit: data.is_mit,
              reminder_at: reminderAt,
              notes: data.notes,
            },
            expectedUserId,
            false,
          )

          // Only persist reminder_at once the local notification is scheduled.
          if (notificationId) {
            const { error: reminderUpdateError } = await supabase
              .from('tasks')
              .update({ reminder_at: reminderAt, notification_id: notificationId })
              .eq('id', data.id)

            if (reminderUpdateError) {
              await NotificationService.cancelTaskReminder(notificationId, expectedUserId, false)
              data.reminder_at = null
              data.notification_id = null
            } else {
              data.reminder_at = reminderAt
              data.notification_id = notificationId
            }
          } else {
            data.reminder_at = null
            data.notification_id = null
          }
        }

        return data as TaskWithCategory
      })
    },
    onMutate: () => ({ accountToken: captureAccountOperationToken(user?.id ?? null) }),
    onSuccess: (data, _variables, context) => {
      const accountToken = context?.accountToken
      if (!accountToken) return
      reconcileAccountOperation(accountToken, (disposition) => {
        if (disposition === 'changed') return
        queryClient.invalidateQueries({
          queryKey: ['tasks', accountToken.userId, data.scheduled_date],
        })
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
      })
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({
      taskId,
      updates,
      originalDate,
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
        scheduled_date: string // Support moving task to different day
        reminder_at: string | null // Update reminder time
        // Note: is_mit is automatically controlled by priority via DB trigger
        // Setting priority to 'top' will auto-set is_mit=true and demote other TOP tasks to HIGH
      }>
      /** Original scheduled_date for cache invalidation when task moves to different day */
      originalDate?: string
    }) => {
      if (!user?.id) throw new Error('Not authenticated')
      const expectedUserId = user.id

      return runTaskAccountOperation(expectedUserId, async () => {
        // Get existing task to check for notification changes
        const { data: existingTask } = await supabase
          .from('tasks')
          .select('notification_id, reminder_at, title, is_mit')
          .eq('id', taskId)
          .single()

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
            await NotificationService.cancelTaskReminder(
              existingTask.notification_id,
              expectedUserId,
              false,
            )
          }

          // Schedule new notification if reminder is set
          if (data.reminder_at) {
            const notificationId = await NotificationService.scheduleTaskReminder(
              {
                id: data.id,
                title: data.title,
                is_mit: data.is_mit,
                reminder_at: data.reminder_at,
                notes: data.notes,
              },
              expectedUserId,
              false,
            )

            // Update task with new notification ID
            if (notificationId) {
              const { error: notificationUpdateError } = await supabase
                .from('tasks')
                .update({ notification_id: notificationId })
                .eq('id', taskId)

              if (notificationUpdateError) {
                await NotificationService.cancelTaskReminder(notificationId, expectedUserId, false)
                await supabase
                  .from('tasks')
                  .update({ reminder_at: null, notification_id: null })
                  .eq('id', taskId)
                data.reminder_at = null
                data.notification_id = null
              } else {
                data.notification_id = notificationId
              }
            } else {
              // Clear reminder fields if scheduling failed or reminder is in the past.
              await supabase
                .from('tasks')
                .update({ reminder_at: null, notification_id: null })
                .eq('id', taskId)
              data.reminder_at = null
              data.notification_id = null
            }
          } else {
            // Clear notification_id since reminder was removed
            await supabase.from('tasks').update({ notification_id: null }).eq('id', taskId)
            data.notification_id = null
          }
        }

        return { data, originalDate }
      })
    },
    onMutate: async ({ taskId, updates, originalDate }) => {
      if (!user?.id) return
      const accountToken = captureAccountOperationToken(user.id)

      // Only do optimistic update when moving between days
      if (!updates.scheduled_date || !originalDate || updates.scheduled_date === originalDate)
        return { accountToken }

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks', user.id, originalDate] })
      await queryClient.cancelQueries({ queryKey: ['tasks', user.id, updates.scheduled_date] })
      if (!isAccountOperationTokenCurrent(accountToken)) return { accountToken }

      // Snapshot previous values for rollback
      const previousOriginal = queryClient.getQueryData<TaskWithCategory[]>([
        'tasks',
        user.id,
        originalDate,
      ])
      const previousTarget = queryClient.getQueryData<TaskWithCategory[]>([
        'tasks',
        user.id,
        updates.scheduled_date,
      ])

      // Remove task from original day cache
      if (previousOriginal) {
        queryClient.setQueryData<TaskWithCategory[]>(
          ['tasks', user.id, originalDate],
          previousOriginal.filter((t) => t.id !== taskId),
        )
      }

      // Add task to target day cache (with updated fields)
      if (previousOriginal) {
        const movedTask = previousOriginal.find((t) => t.id === taskId)
        if (movedTask) {
          const updatedTask = { ...movedTask, ...updates }
          queryClient.setQueryData<TaskWithCategory[]>(
            ['tasks', user.id, updates.scheduled_date],
            [...(previousTarget || []), updatedTask],
          )
        }
      }

      return { previousOriginal, previousTarget, accountToken }
    },
    onError: (_err, { updates, originalDate }, context) => {
      const accountToken = context?.accountToken
      if (!accountToken) return

      reconcileAccountOperation(accountToken, (disposition) => {
        if (disposition === 'changed') return
        // Roll back the optimistic move for either the original generation or
        // a failed transition that retained the same account.
        if (context?.previousOriginal && originalDate) {
          queryClient.setQueryData(
            ['tasks', accountToken.userId, originalDate],
            context.previousOriginal,
          )
        }
        if (updates.scheduled_date) {
          const targetKey = ['tasks', accountToken.userId, updates.scheduled_date] as const
          if (context?.previousTarget !== undefined) {
            queryClient.setQueryData(targetKey, context.previousTarget)
          } else {
            queryClient.removeQueries({ queryKey: targetKey, exact: true })
          }
        }
      })
    },
    onSuccess: ({ data, originalDate }, _variables, context) => {
      const accountToken = context?.accountToken
      if (!accountToken) return

      reconcileAccountOperation(accountToken, (disposition) => {
        if (disposition === 'changed') return
        // Invalidate the new day's tasks
        queryClient.invalidateQueries({
          queryKey: ['tasks', accountToken.userId, data.scheduled_date],
        })
        // If task moved to different day, also invalidate the original day's tasks
        if (originalDate && originalDate !== data.scheduled_date) {
          queryClient.invalidateQueries({
            queryKey: ['tasks', accountToken.userId, originalDate],
          })
        }
      })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { track } = useAnalytics()

  return useMutation({
    mutationFn: async (taskId: string) => {
      if (!user?.id) throw new Error('Not authenticated')
      const expectedUserId = user.id

      return runTaskAccountOperation(expectedUserId, async () => {
        // First get the task to check for notification_id
        const { data: existingTask } = await supabase
          .from('tasks')
          .select('notification_id')
          .eq('id', taskId)
          .single()

        // Cancel notification if task had one scheduled
        if (existingTask?.notification_id) {
          await NotificationService.cancelTaskReminder(
            existingTask.notification_id,
            expectedUserId,
            false,
          )
        }

        // Look up task from cache before deleting for analytics
        const allTaskQueries = queryClient.getQueriesData({ queryKey: ['tasks', expectedUserId] })
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
      })
    },
    onMutate: () => ({ accountToken: captureAccountOperationToken(user?.id ?? null) }),
    onSuccess: ({ taskId, wasCompleted }, _taskId, context) => {
      const accountToken = context?.accountToken
      if (!accountToken) return
      reconcileAccountOperation(accountToken, (disposition) => {
        if (disposition === 'changed') return
        queryClient.invalidateQueries({ queryKey: ['tasks', accountToken.userId] })
        addBreadcrumb('Task deleted', 'task', { taskId })

        // Track task deletion
        track('task_deleted', { was_completed: wasCompleted })
      })
    },
  })
}
