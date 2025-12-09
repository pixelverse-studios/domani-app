import { useMutation } from '@tanstack/react-query'

import { supabase } from '~/lib/supabase'
import { useAuth } from '~/hooks/useAuth'
import { useProfile } from '~/hooks/useProfile'
import type { SupportRequest } from '~/types'

export type SupportCategory =
  | 'technical_issue'
  | 'account_help'
  | 'billing_question'
  | 'other'

interface CreateSupportRequestInput {
  category: SupportCategory
  description: string
}

export function useCreateSupportRequest() {
  const { user } = useAuth()
  const { profile } = useProfile()

  return useMutation({
    mutationFn: async (input: CreateSupportRequestInput): Promise<SupportRequest> => {
      if (!user?.id) throw new Error('Not authenticated')
      if (!profile?.email) throw new Error('No email found')

      const { data, error } = await supabase
        .from('support_requests')
        .insert({
          user_id: user.id,
          email: profile.email,
          category: input.category,
          description: input.description,
        })
        .select()
        .single()

      if (error) throw error
      return data as SupportRequest
    },
  })
}
