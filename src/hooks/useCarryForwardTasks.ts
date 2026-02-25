/**
 * useCarryForwardTasks Hook
 *
 * React Query mutation hook for carrying forward incomplete tasks from
 * yesterday to today's plan.
 *
 * Wraps the carryForwardTasks service function with:
 * - React Query mutation management
 * - Cache invalidation for affected queries
 * - Analytics tracking
 * - Error handling
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { carryForwardTasks, type CarryForwardInput } from '~/lib/rollover'
import type { TaskWithCategory } from '~/types'

/**
 * Hook to carry forward tasks from yesterday to today
 *
 * @returns Mutation object with mutate/mutateAsync functions
 *
 * @example
 * const { mutate, isPending } = useCarryForwardTasks()
 *
 * const handleCarryForward = () => {
 *   mutate({
 *     selectedTaskIds: ['id1', 'id2'],
 *     targetPlanId: todayPlanId,
 *     shouldMakeMIT: true,
 *     keepReminderTimes: false,
 *   })
 * }
 */
export function useCarryForwardTasks() {
  const queryClient = useQueryClient()

  return useMutation<TaskWithCategory[], Error, CarryForwardInput>({
    mutationFn: carryForwardTasks,

    onSuccess: (createdTasks, variables) => {
      // Invalidate the target plan's tasks so they refresh
      queryClient.invalidateQueries({
        queryKey: ['tasks', variables.targetPlanId],
      })

      // Invalidate rollover tasks query (no longer show carried tasks)
      queryClient.invalidateQueries({
        queryKey: ['rolloverTasks'],
      })

      // TODO: Add analytics tracking for tasks_carried_forward event
      console.log(`[useCarryForwardTasks] Carried forward ${createdTasks.length} tasks`)
    },

    onError: (error) => {
      console.error('[useCarryForwardTasks] Mutation failed:', error)
      // Error will be handled by UI component
    },
  })
}
