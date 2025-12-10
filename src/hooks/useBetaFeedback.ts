import { useMutation } from '@tanstack/react-query'

import { supabase } from '~/lib/supabase'
import { sendDiscordNotification } from '~/lib/discord'
import { useAuth } from '~/hooks/useAuth'
import { useProfile } from '~/hooks/useProfile'
import { getDeviceMetadata } from '~/utils/deviceInfo'
import type { BetaFeedback } from '~/types'

export type FeedbackCategory = 'bug_report' | 'feature_idea' | 'what_i_love' | 'general'

interface CreateBetaFeedbackInput {
  category: FeedbackCategory
  message: string
}

export function useCreateBetaFeedback() {
  const { user } = useAuth()
  const { profile } = useProfile()

  return useMutation({
    mutationFn: async (input: CreateBetaFeedbackInput): Promise<BetaFeedback> => {
      if (!user?.id) throw new Error('Not authenticated')
      if (!profile?.email) throw new Error('No email found')

      // Collect device metadata
      const deviceMetadata = getDeviceMetadata()

      const { data, error } = await supabase
        .from('beta_feedback')
        .insert({
          user_id: user.id,
          email: profile.email,
          category: input.category,
          message: input.message,
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
        type: 'beta_feedback',
        email: profile.email,
        category: input.category,
        message: input.message,
        deviceMetadata,
      })

      return data as BetaFeedback
    },
  })
}
