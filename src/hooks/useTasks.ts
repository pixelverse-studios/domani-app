import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { supabase } from '~/lib/supabase'
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
      const { data, error } = await supabase
        .from('tasks')
        .update({
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq('id', taskId)
        .select()
        .single()

      if (error) throw error
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
  // Note: is_mit is now automatically controlled by priority via DB trigger
  // HIGH priority = is_mit: true, MEDIUM/LOW = is_mit: false
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
    }: CreateTaskInput) => {
      // Get current user for user_id
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Note: is_mit is automatically set by DB trigger based on priority
      // HIGH priority tasks are automatically marked as MIT
      // If another HIGH task exists, it will be demoted to MEDIUM by the trigger
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
        // Check for free tier limit error
        if (error.code === '23514' || error.message.includes('task limit')) {
          throw new Error('FREE_TIER_LIMIT')
        }
        throw error
      }

      return data as TaskWithCategory
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', data.plan_id] })

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
        // Note: is_mit is automatically controlled by priority via DB trigger
        // Setting priority to 'high' will auto-set is_mit=true and demote other HIGH tasks
      }>
      /** Original plan ID for cache invalidation when task moves to different plan */
      originalPlanId?: string
    }) => {
      // Note: When priority is updated to 'high', DB trigger will:
      // 1. Set is_mit = true on this task
      // 2. Demote any other HIGH priority tasks to MEDIUM
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single()

      if (error) throw error
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
      return { wasCompleted }
    },
    onSuccess: ({ wasCompleted }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })

      // Track task deletion
      track('task_deleted', { was_completed: wasCompleted })
    },
  })
}
