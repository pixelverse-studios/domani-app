/**
 * Team notification utility.
 * Sends typed notification events to a Supabase Edge Function, which routes
 * them to the configured Slack channel using server-side secrets.
 */

import { supabase } from '~/lib/supabase'
import type { DeviceMetadata } from '~/utils/deviceInfo'

interface SupportRequestPayload {
  type: 'support_request'
  email: string
  category: string
  description: string
  deviceMetadata?: DeviceMetadata
}

interface FeedbackPayload {
  type: 'feedback'
  email: string
  category: string
  message: string
  deviceMetadata?: DeviceMetadata
}

interface NewSignupPayload {
  type: 'new_signup'
  email: string
  name?: string | null
  signupMethod?: string
  timezone?: string
}

interface PurchaseRefundIntentPayload {
  type: 'purchase_refund_intent'
  email: string
  userId: string
  intent: 'pending_refund_request' | 'duplicate_refund_request'
  platform: 'ios' | 'android'
  source?: string | null
  subscriptionStatus?: string | null
  refundStatus?: string | null
  clientHint?: string | null
  refundStateUpdatedAt?: string | null
}

interface AccountLifecyclePayload {
  type: 'account_lifecycle'
  email: string
  userId: string
  event: 'deletion_scheduled' | 'reactivated'
  deletionScheduledFor?: string | null
  source?: string | null
}

type TeamNotificationPayload =
  | SupportRequestPayload
  | FeedbackPayload
  | NewSignupPayload
  | PurchaseRefundIntentPayload
  | AccountLifecyclePayload

export async function sendTeamNotification(payload: TeamNotificationPayload): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('team-notification', {
      body: payload,
    })

    if (error) {
      console.warn('Team notification failed:', error.message)
    }
  } catch (error) {
    // Fail silently - don't disrupt user experience.
    console.warn('Team notification error:', error)
  }
}
