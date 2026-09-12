import { useMutation } from '@tanstack/react-query'

import { supabase } from '~/lib/supabase'
import { sendTeamNotification } from '~/lib/teamNotifications'
import { useAuth } from '~/hooks/useAuth'
import { useProfile } from '~/hooks/useProfile'
import { getDeviceMetadata } from '~/utils/deviceInfo'
import type { SupportRequest } from '~/types'
import { requireAccountOwnedOperation } from '~/lib/accountLifecycleCoordinator'

export type SupportCategory = 'technical_issue' | 'account_help' | 'billing_question' | 'other'

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
      const expectedUserId = user.id
      const expectedEmail = profile.email

      return requireAccountOwnedOperation(expectedUserId, async () => {
        // Collect device metadata
        const deviceMetadata = getDeviceMetadata()

        const { data, error } = await supabase
          .from('support_requests')
          .insert({
            user_id: expectedUserId,
            email: expectedEmail,
            category: input.category,
            description: input.description,
            // Device metadata
            platform: deviceMetadata.platform,
            os_version: deviceMetadata.os_version,
            device_brand: deviceMetadata.device_brand,
            device_model: deviceMetadata.device_model,
            app_version: deviceMetadata.app_version,
            app_build: deviceMetadata.app_build,
            screen_width: deviceMetadata.screen_width,
            screen_height: deviceMetadata.screen_height,
          })
          .select()
          .single()

        if (error) throw error

        await sendTeamNotification({
          type: 'support_request',
          email: expectedEmail,
          category: input.category,
          description: input.description,
          deviceMetadata,
        })

        return data as SupportRequest
      })
    },
  })
}
