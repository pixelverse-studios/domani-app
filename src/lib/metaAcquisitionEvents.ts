import { Platform } from 'react-native'
import { AppEventsLogger } from 'react-native-fbsdk-next'

import { initializeMetaAppEvents } from '~/lib/metaAppEvents'
import { supabase } from '~/lib/supabase'

export type MetaAcquisitionEventResult = 'logged' | 'duplicate' | 'not_configured' | 'error'

type RegistrationMethod = 'google' | 'apple'
type ScheduledFor = 'today' | 'tomorrow'

interface PurchaseEventInput {
  userId: string
  productId: string
  purchaseDate?: string | null
  amount?: number | null
  currency?: string | null
  offer?: string | null
  store?: string | null
}

function safeKeyPart(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._:-]/g, '_')
    .slice(0, 80)
}

async function claimAndLog(
  userId: string,
  eventKey: string,
  log: () => void,
): Promise<MetaAcquisitionEventResult> {
  try {
    if (!(await initializeMetaAppEvents())) return 'not_configured'

    const { data, error } = await supabase.rpc('claim_meta_app_event', {
      p_event_key: eventKey,
      p_user_id: userId,
    })
    if (error) throw error
    if (!data) return 'duplicate'

    try {
      log()
    } catch (error) {
      await supabase.rpc('release_meta_app_event_claim', {
        p_event_key: eventKey,
        p_user_id: userId,
      })
      throw error
    }

    const { data: completed, error: completionError } = await supabase.rpc(
      'complete_meta_app_event_claim',
      {
        p_event_key: eventKey,
        p_user_id: userId,
      },
    )
    if (completionError) throw completionError
    if (!completed) throw new Error('Meta app event claim could not be completed')

    return 'logged'
  } catch (error) {
    console.warn('[Meta App Events] Failed to log acquisition event', {
      eventKey,
      error,
    })
    return 'error'
  }
}

function purchaseEventKey(prefix: 'purchase' | 'purchase_restored', input: PurchaseEventInput) {
  const product = safeKeyPart(input.productId)
  const occurrence = safeKeyPart(input.purchaseDate ?? 'unknown')
  return `${prefix}:${product}:${occurrence}`
}

function purchaseParameters(input: PurchaseEventInput) {
  return {
    product_id: input.productId,
    platform: Platform.OS,
    ...(input.offer && { offer: input.offer }),
    ...(input.store && { store: input.store }),
  }
}

export function logMetaCompletedRegistration(input: {
  userId: string
  method: RegistrationMethod
}) {
  return claimAndLog(input.userId, 'completed_registration', () => {
    AppEventsLogger.logEvent(AppEventsLogger.AppEvents.CompletedRegistration, {
      [AppEventsLogger.AppEventParams.RegistrationMethod]: input.method,
      platform: Platform.OS,
    })
  })
}

export function logMetaStartTrial(input: { userId: string; offer?: string | null }) {
  return claimAndLog(input.userId, 'start_trial', () => {
    AppEventsLogger.logEvent(AppEventsLogger.AppEvents.StartTrial, {
      platform: Platform.OS,
      ...(input.offer && { offer: input.offer }),
    })
  })
}

export function logMetaPlanningActivated(input: { userId: string; scheduledFor: ScheduledFor }) {
  return claimAndLog(input.userId, 'planning_activated', () => {
    AppEventsLogger.logEvent('planning_activated', {
      platform: Platform.OS,
      scheduled_for: input.scheduledFor,
    })
  })
}

export function logMetaPurchase(input: PurchaseEventInput) {
  return claimAndLog(input.userId, purchaseEventKey('purchase', input), () => {
    const params = purchaseParameters(input)
    if (
      typeof input.amount === 'number' &&
      Number.isFinite(input.amount) &&
      input.amount >= 0 &&
      input.currency
    ) {
      AppEventsLogger.logPurchase(input.amount, input.currency, params)
      return
    }

    AppEventsLogger.logEvent(AppEventsLogger.AppEvents.Purchased, params)
  })
}

export function logMetaPurchaseRestored(input: PurchaseEventInput) {
  return claimAndLog(input.userId, purchaseEventKey('purchase_restored', input), () => {
    AppEventsLogger.logEvent('purchase_restored', purchaseParameters(input))
  })
}
