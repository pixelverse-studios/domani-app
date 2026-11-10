import AsyncStorage from '@react-native-async-storage/async-storage'
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
const deliveryPromises = new Map<string, Promise<MetaAcquisitionEventResult>>()
const META_EVENT_INTENT_PREFIX = '@domani/meta-app-event-intent'

interface StoredMetaEventIntent {
  eventKey: MetaEventKey
  eventPayload: MetaEventPayload
}

function intentStorageKey(userId: string, eventKey: MetaEventKey) {
  return `${META_EVENT_INTENT_PREFIX}:${userId}:${eventKey}`
}

async function persistIntent(
  userId: string,
  eventKey: MetaEventKey,
  eventPayload: MetaEventPayload,
) {
  await AsyncStorage.setItem(
    intentStorageKey(userId, eventKey),
    JSON.stringify({ eventKey, eventPayload } satisfies StoredMetaEventIntent),
  )
}

function removeIntent(userId: string, eventKey: MetaEventKey) {
  return AsyncStorage.removeItem(intentStorageKey(userId, eventKey))
}

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
  const { data, error } = await supabase.rpc('authorize_meta_app_event_dispatch', {
    p_claim_token: claim.claim_token,
    p_event_key: claim.event_key,
    p_user_id: userId,
  })
  if (error) throw error
  if (!data) throw new Error('Meta app event dispatch could not be authorized')

  try {
    logClaimedEvent(claim.event_key, claim.event_payload)
  } catch (nativeError) {
    const { data: retryAllowed, error: retryError } = await supabase.rpc(
      'retry_failed_meta_app_event_dispatch',
      {
        p_claim_token: claim.claim_token,
        p_event_key: claim.event_key,
        p_user_id: userId,
      },
    )
    if (retryError || !retryAllowed) {
      console.warn('[Meta App Events] Failed to return native SDK dispatch to retry queue', {
        eventKey: claim.event_key,
        error: retryError,
      })
    }
    throw nativeError
  }
}

async function processIntent(
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

    const claim = data?.[0] as MetaEventClaim | undefined
    if (!claim) {
      const { data: status, error: statusError } = await supabase.rpc(
        'get_meta_app_event_claim_status',
        {
          p_event_key: eventKey,
          p_user_id: userId,
        },
      )
      if (statusError) throw statusError
      if (status === 'delivered') await removeIntent(userId, eventKey)
      return 'duplicate'
    }

    await deliverClaim(userId, claim)
    await removeIntent(userId, eventKey)
    return 'logged'
  } catch (error) {
    console.warn('[Meta App Events] Failed to log acquisition event', {
      eventKey,
      error,
    })
    return 'error'
  }
}

async function claimAndLog(
  userId: string,
  eventKey: MetaEventKey,
  eventPayload: MetaEventPayload,
): Promise<MetaAcquisitionEventResult> {
  try {
    // The intent must exist independently of the one-shot UI/auth call before
    // SDK initialization or network work can fail.
    await persistIntent(userId, eventKey, eventPayload)
  } catch (error) {
    console.warn('[Meta App Events] Failed to persist acquisition event intent', {
      eventKey,
      error,
    })
    return 'error'
  }

  return queueIntentDelivery(userId, eventKey, eventPayload)
}

function queueIntentDelivery(
  userId: string,
  eventKey: MetaEventKey,
  eventPayload: MetaEventPayload,
) {
  const deliveryKey = intentStorageKey(userId, eventKey)
  const existing = deliveryPromises.get(deliveryKey)
  if (existing) return existing

  const delivery = processIntent(userId, eventKey, eventPayload).finally(() => {
    deliveryPromises.delete(deliveryKey)
  })
  deliveryPromises.set(deliveryKey, delivery)
  return delivery
}

async function drainLocalMetaAppEventIntents(userId: string) {
  const prefix = `${META_EVENT_INTENT_PREFIX}:${userId}:`
  const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(prefix))
  const entries = await AsyncStorage.multiGet(keys)
  let deliveredCount = 0

  for (const [, serializedIntent] of entries) {
    if (!serializedIntent) continue
    try {
      const intent = JSON.parse(serializedIntent) as StoredMetaEventIntent
      const result = await queueIntentDelivery(userId, intent.eventKey, intent.eventPayload)
      if (result === 'logged') deliveredCount += 1
    } catch (error) {
      console.warn('[Meta App Events] Failed to replay local event intent', { error })
    }
  }

  return deliveredCount
}

async function drainPendingMetaAppEvents(userId: string) {
  let deliveredCount = await drainLocalMetaAppEventIntents(userId)
  if (!(await initializeMetaAppEvents())) return deliveredCount

  const { data, error } = await supabase.rpc('claim_pending_meta_app_events', {
    p_user_id: userId,
  })
  if (error) throw error

  for (const claim of data ?? []) {
    try {
      await deliverClaim(userId, claim)
      await removeIntent(userId, claim.event_key as MetaEventKey)
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
