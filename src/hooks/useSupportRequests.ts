import { useMutation } from '@tanstack/react-query'

import { supabase } from '~/lib/supabase'
import { sendDiscordNotification } from '~/lib/discord'
import { useAuth } from '~/hooks/useAuth'
import { useProfile } from '~/hooks/useProfile'
import { getDeviceMetadata } from '~/utils/deviceInfo'
import type { SupportRequest } from '~/types'

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

      // Collect device metadata
      const deviceMetadata = getDeviceMetadata()

      const { data, error } = await supabase
        .from('support_requests')
        .insert({
          user_id: user.id,
          email: profile.email,
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

      // Send Discord notification (fire and forget)
      sendDiscordNotification({
        type: 'support_request',
        email: profile.email,
        category: input.category,
        description: input.description,
        deviceMetadata,
      })

      return data as SupportRequest
    },
  })
}
