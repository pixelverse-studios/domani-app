import { supabase } from '~/lib/supabase'
import type { AnalyticsBaseProperties, AnalyticsEvent } from '~/providers/AnalyticsProvider'
import type { Json } from '~/types/supabase'

export const POSTHOG_TRIAL_REPLAY_INTERVAL_MS = 5 * 60 * 1000

export type TrialStartedProperties = Extract<
  AnalyticsEvent,
  { name: 'trial_started' }
>['properties']

interface PostHogTrialClaim {
  claim_token: string
  event_uuid: string
  event_timestamp: string
  event_properties: Json
}

type CaptureTrialStarted = (
  properties: TrialStartedProperties,
  eventUuid: string,
  eventTimestamp: string,
) => Promise<boolean>

const deliveries = new Map<string, Promise<'delivered' | 'not_claimed' | 'error'>>()

function parseProperties(value: Json): TrialStartedProperties {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    throw new Error('PostHog trial event properties are malformed')
  }

  const platform = value.platform
  const trialExpiresAt = value.trial_expires_at
  if ((platform !== 'ios' && platform !== 'android') || typeof trialExpiresAt !== 'string') {
    throw new Error('PostHog trial event properties are incomplete')
  }

  const nullableString = (key: string) => {
    const property = value[key]
    return typeof property === 'string' ? property : null
  }

  return {
    platform,
    app_version: nullableString('app_version'),
    app_build: nullableString('app_build'),
    country: nullableString('country'),
    offer: nullableString('offer'),
    signup_cohort: nullableString('signup_cohort'),
    trial_expires_at: trialExpiresAt,
  }
}

async function deliver(
  userId: string,
  clientProperties: AnalyticsBaseProperties,
  capture: CaptureTrialStarted,
) {
  try {
    const { data, error } = await supabase.rpc('claim_posthog_trial_started', {
      p_client_properties: { ...clientProperties },
      p_user_id: userId,
    })
    if (error) throw error

    const claim = data?.[0] as PostHogTrialClaim | undefined
    if (!claim) return 'not_claimed' as const

    const captured = await capture(
      parseProperties(claim.event_properties),
      claim.event_uuid,
      claim.event_timestamp,
    )
    if (!captured) return 'error' as const

    const { data: completed, error: completionError } = await supabase.rpc(
      'complete_posthog_trial_started',
      {
        p_claim_token: claim.claim_token,
        p_user_id: userId,
      },
    )
    if (completionError) throw completionError
    if (!completed) throw new Error('PostHog trial event claim could not be completed')
    return 'delivered' as const
  } catch (error) {
    console.warn('[PostHog Trial] Failed to deliver trial_started', { error })
    return 'error' as const
  }
}

export function deliverPostHogTrialStarted(
  userId: string,
  clientProperties: AnalyticsBaseProperties,
  capture: CaptureTrialStarted,
) {
  const existing = deliveries.get(userId)
  if (existing) return existing

  const delivery = deliver(userId, clientProperties, capture).finally(() => {
    deliveries.delete(userId)
  })
  deliveries.set(userId, delivery)
  return delivery
}
