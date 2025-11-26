import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { supabase } from '~/lib/supabase'
import type { TaskWithCategory, TaskPriority } from '~/types'

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
  })
}

export function useToggleTask() {
  const queryClient = useQueryClient()

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

      queryClient.setQueriesData({ queryKey: ['tasks'] }, (old: TaskWithCategory[] | undefined) => {
        if (!old) return old
        return old.map((task) =>
          task.id === taskId
            ? { ...task, completed_at: completed ? new Date().toISOString() : null }
            : task,
        )
      })

      return { previousTasks }
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        context.previousTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
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
  isMit?: boolean
}

export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      planId,
      title,
      description,
      systemCategoryId,
      userCategoryId,
      priority = 'medium',
      estimatedDurationMinutes,
      isMit = false,
    }: CreateTaskInput) => {
      // Get current user for user_id
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          plan_id: planId,
          user_id: user.id,
          title,
          description,
          system_category_id: systemCategoryId,
          user_category_id: userCategoryId,
          is_mit: isMit,
          priority,
          estimated_duration_minutes: estimatedDurationMinutes,
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
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      taskId,
      updates,
    }: {
      taskId: string
      updates: Partial<{
        title: string
        description: string
        system_category_id: string | null
        user_category_id: string | null
        priority: TaskPriority
        estimated_duration_minutes: number
        is_mit: boolean
        position: number
      }>
    }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', data.plan_id] })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
