import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'

import { supabase } from '~/lib/supabase'

export function useTodayPlan() {
  const today = format(new Date(), 'yyyy-MM-dd')

  return useQuery({
    queryKey: ['plan', today],
    queryFn: async () => {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Try to get existing plan for today
      const { data: existingPlan, error: fetchError } = await supabase
        .from('plans')
        .select('*')
        .eq('planned_for', today)
        .maybeSingle()

      if (fetchError) throw fetchError

      if (existingPlan) return existingPlan

      // Create new plan for today
      const { data: newPlan, error: createError } = await supabase
        .from('plans')
        .insert({ planned_for: today, user_id: user.id })
        .select()
        .single()

      if (createError) throw createError

      return newPlan
    },
  })
}

export function usePlan(planId: string | undefined) {
  return useQuery({
    queryKey: ['plan', planId],
    queryFn: async () => {
      if (!planId) return null

      const { data, error } = await supabase.from('plans').select('*').eq('id', planId).single()

      if (error) throw error
      return data
    },
    enabled: !!planId,
  })
}

export function useLockPlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (planId: string) => {
      const { data, error } = await supabase
        .from('plans')
        .update({ locked_at: new Date().toISOString() })
        .eq('id', planId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['plan', data.planned_for] })
      queryClient.invalidateQueries({ queryKey: ['plan', data.id] })
    },
  })
}
