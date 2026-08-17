import { Platform } from 'react-native'
import { AppEventsLogger } from 'react-native-fbsdk-next'

import { initializeMetaAppEvents } from '~/lib/metaAppEvents'
import { supabase } from '~/lib/supabase'
import type { Json } from '~/types/supabase'

export type MetaAcquisitionEventResult = 'logged' | 'duplicate' | 'not_configured' | 'error'

export const META_EVENT_REPLAY_INTERVAL_MS = 5 * 60 * 1000

type MetaEventKey =
  | 'completed_registration'
  | 'start_trial'
  | 'planning_activated'
  | 'purchase'
  | 'purchase_restored'
type RegistrationMethod = 'google' | 'apple'
type ScheduledFor = 'today' | 'tomorrow'
type MetaEventPayload = Record<string, string | number>

interface MetaEventClaim {
  claim_token: string
  event_key: string
  event_payload: Json
}

interface PurchaseEventInput {
  userId: string
  productId: string
  amount?: number | null
  currency?: string | null
  offer?: string | null
  store?: string | null
}

const replayPromises = new Map<string, Promise<number>>()

function payloadObject(payload: Json): Record<string, Json | undefined> {
  if (!payload || Array.isArray(payload) || typeof payload !== 'object') {
    throw new Error('Meta app event payload is not an object')
  }
  return payload
}

function requiredString(payload: Record<string, Json | undefined>, key: string) {
  const value = payload[key]
  if (typeof value !== 'string' || !value) {
    throw new Error(`Meta app event payload is missing ${key}`)
  }
  return value
}

function optionalString(payload: Record<string, Json | undefined>, key: string) {
  const value = payload[key]
  return typeof value === 'string' && value ? value : undefined
}

function logClaimedEvent(eventKey: string, rawPayload: Json) {
  const payload = payloadObject(rawPayload)
  const platform = requiredString(payload, 'platform')

  if (eventKey === 'completed_registration') {
    AppEventsLogger.logEvent(AppEventsLogger.AppEvents.CompletedRegistration, {
      [AppEventsLogger.AppEventParams.RegistrationMethod]: requiredString(payload, 'method'),
      platform,
    })
    return
  }

  if (eventKey === 'start_trial') {
    const offer = optionalString(payload, 'offer')
    AppEventsLogger.logEvent(AppEventsLogger.AppEvents.StartTrial, {
      platform,
      ...(offer && { offer }),
    })
    return
  }

  if (eventKey === 'planning_activated') {
    AppEventsLogger.logEvent('planning_activated', {
      platform,
      scheduled_for: requiredString(payload, 'scheduled_for'),
    })
    return
  }

  const productId = requiredString(payload, 'product_id')
  const offer = optionalString(payload, 'offer')
  const store = optionalString(payload, 'store')
  const parameters = {
    product_id: productId,
    platform,
    ...(offer && { offer }),
    ...(store && { store }),
  }

  if (eventKey === 'purchase') {
    const amount = payload.amount
    const currency = optionalString(payload, 'currency')
    if (typeof amount === 'number' && Number.isFinite(amount) && amount >= 0 && currency) {
      AppEventsLogger.logPurchase(amount, currency, parameters)
      return
    }
    AppEventsLogger.logEvent(AppEventsLogger.AppEvents.Purchased, parameters)
    return
  }

  if (eventKey === 'purchase_restored') {
    AppEventsLogger.logEvent('purchase_restored', parameters)
    return
  }

  throw new Error(`Unsupported claimed Meta app event: ${eventKey}`)
}

async function deliverClaim(userId: string, claim: MetaEventClaim) {
  logClaimedEvent(claim.event_key, claim.event_payload)

  const { data, error } = await supabase.rpc('complete_meta_app_event_claim', {
    p_claim_token: claim.claim_token,
    p_event_key: claim.event_key,
    p_user_id: userId,
  })
  if (error) throw error
  if (!data) throw new Error('Meta app event claim could not be completed')
}

async function claimAndLog(
  userId: string,
  eventKey: MetaEventKey,
  eventPayload: MetaEventPayload,
): Promise<MetaAcquisitionEventResult> {
  try {
    if (!(await initializeMetaAppEvents())) return 'not_configured'

    const { data, error } = await supabase.rpc('claim_meta_app_event', {
      p_event_key: eventKey,
      p_event_payload: eventPayload,
      p_user_id: userId,
    })
    if (error) throw error

    const claim = data?.[0]
    if (!claim) return 'duplicate'

    await deliverClaim(userId, claim)
    return 'logged'
  } catch (error) {
    console.warn('[Meta App Events] Failed to log acquisition event', {
      eventKey,
      error,
    })
    return 'error'
  }
}

async function drainPendingMetaAppEvents(userId: string) {
  if (!(await initializeMetaAppEvents())) return 0

  const { data, error } = await supabase.rpc('claim_pending_meta_app_events', {
    p_user_id: userId,
  })
  if (error) throw error

  let deliveredCount = 0
  for (const claim of data ?? []) {
    try {
      await deliverClaim(userId, claim)
      deliveredCount += 1
    } catch (error) {
      console.warn('[Meta App Events] Failed to replay pending event', {
        eventKey: claim.event_key,
        error,
      })
    }
  }
  return deliveredCount
}

export function replayPendingMetaAppEvents(userId: string) {
  const existing = replayPromises.get(userId)
  if (existing) return existing

  const replay = drainPendingMetaAppEvents(userId).finally(() => {
    replayPromises.delete(userId)
  })
  replayPromises.set(userId, replay)
  return replay
}

export function logMetaCompletedRegistration(input: {
  userId: string
  method: RegistrationMethod
}) {
  return claimAndLog(input.userId, 'completed_registration', {
    method: input.method,
    platform: Platform.OS,
  })
}

export function logMetaStartTrial(input: { userId: string; offer?: string | null }) {
  return claimAndLog(input.userId, 'start_trial', {
    platform: Platform.OS,
    ...(input.offer && { offer: input.offer }),
  })
}

export function logMetaPlanningActivated(input: { userId: string; scheduledFor: ScheduledFor }) {
  return claimAndLog(input.userId, 'planning_activated', {
    platform: Platform.OS,
    scheduled_for: input.scheduledFor,
  })
}

export function logMetaPurchase(input: PurchaseEventInput) {
  const hasValue =
    typeof input.amount === 'number' &&
    Number.isFinite(input.amount) &&
    input.amount >= 0 &&
    !!input.currency

  return claimAndLog(input.userId, 'purchase', {
    platform: Platform.OS,
    product_id: input.productId,
    ...(input.offer && { offer: input.offer }),
    ...(input.store && { store: input.store }),
    ...(hasValue && {
      amount: input.amount as number,
      currency: input.currency!.trim().toUpperCase(),
    }),
  })
}

export function logMetaPurchaseRestored(input: PurchaseEventInput) {
  return claimAndLog(input.userId, 'purchase_restored', {
    platform: Platform.OS,
    product_id: input.productId,
    ...(input.offer && { offer: input.offer }),
    ...(input.store && { store: input.store }),
  })
}
