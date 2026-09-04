import { useMutation } from '@tanstack/react-query'

import { supabase } from '~/lib/supabase'
import { sendTeamNotification } from '~/lib/teamNotifications'
import { useAuth } from '~/hooks/useAuth'
import { useProfile } from '~/hooks/useProfile'
import { useAnalytics } from '~/providers/AnalyticsProvider'
import { getDeviceMetadata } from '~/utils/deviceInfo'
import type { Feedback } from '~/types'
import { requireAccountOwnedOperation } from '~/lib/accountLifecycleCoordinator'

export type FeedbackCategory = 'bug_report' | 'feature_idea' | 'what_i_love' | 'general'

interface CreateFeedbackInput {
  category: FeedbackCategory
  message: string
}

export function useCreateFeedback() {
  const { user } = useAuth()
  const { profile } = useProfile()
  const { track } = useAnalytics()

  return useMutation({
    mutationFn: async (input: CreateFeedbackInput): Promise<Feedback> => {
      if (!user?.id) throw new Error('Not authenticated')
      if (!profile?.email) throw new Error('No email found')
      const expectedUserId = user.id
      const expectedEmail = profile.email

      return requireAccountOwnedOperation(expectedUserId, async () => {
        // Collect device metadata
        const deviceMetadata = getDeviceMetadata()

        const { data, error } = await supabase
          .from('beta_feedback')
          .insert({
            user_id: expectedUserId,
            email: expectedEmail,
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

        // Track feedback submission
        track('feedback_submitted', { category: input.category })

        await sendTeamNotification({
          type: 'feedback',
          email: expectedEmail,
          category: input.category,
          message: input.message,
          deviceMetadata,
        })

        return data as Feedback
      })
    },
  })
}
