import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { isToday, parseISO } from 'date-fns'

import { supabase } from '~/lib/supabase'
import { useAuth } from '~/hooks/useAuth'
import type { Profile, ProfileUpdate } from '~/types'

export function useProfile() {
  const { user } = useAuth()

  const query = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null

      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()

      if (error) throw error
      return data as Profile
    },
    enabled: !!user?.id,
  })

  // Determine if user signed up today
  const isNewUser = query.data?.created_at ? isToday(parseISO(query.data.created_at)) : false

  return {
    ...query,
    profile: query.data,
    isNewUser,
  }
}

export function useUpdateProfile() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updates: ProfileUpdate) => {
      if (!user?.id) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error
      return data as Profile
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['profile', user?.id], data)
    },
  })
}
