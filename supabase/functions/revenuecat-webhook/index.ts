import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * RevenueCat webhook handler.
 *
 * Receives purchase/refund events from RevenueCat and persists the
 * authoritative result to Supabase, so app state stays correct even
 * if the client-side sync in useSubscription fails (crash mid-purchase,
 * backgrounded app, network drop, etc.).
 *
 * ## Authentication
 *
 * Uses a shared-secret Bearer token. The secret is set via:
 *
 *   supabase secrets set REVENUECAT_WEBHOOK_SECRET=<value> \
 *     --project-ref <staging-or-prod-ref>
 *
 * and the same value is entered in the RevenueCat dashboard
 * (Integrations → Webhooks → Authorization header) as:
 *
 *   Bearer <value>
 *
 * If the headers don't match, the function returns 401 without
 * touching the database.
 *
 * ## Event handling
 *
 * This handler currently treats the following events as authoritative
 * for Domani's lifetime product:
 *
 *   - INITIAL_PURCHASE / NON_RENEWING_PURCHASE → grant lifetime access
 *   - REFUND                                   → revoke access
 *   - REFUND_REVERSED                          → restore access
 *   - CANCELLATION with refund-like reasons    → revoke access
 *
 * Any event type not explicitly handled is logged and acknowledged
 * with 200 so RevenueCat doesn't retry indefinitely.
 *
 * ## Body parsing
 *
 * The raw request body is read as text first, then parsed as JSON.
 * This keeps the HMAC signature upgrade path open: if we ever switch
 * from Bearer auth to `X-RevenueCat-Signature` HMAC verification, we
 * need the raw body bytes to compute the signature, and we can only
 * read a request body once. Parsing after reading preserves both.
 *
 * ## Idempotency
 *
 * RevenueCat `event.id` is stored in `public.revenuecat_webhook_events`
 * and used as the idempotency key. Duplicate deliveries are logged and
 * acknowledged without reapplying the state transition.
 */

// RevenueCat webhook event types we know about, even if we don't handle
// all of them. See https://www.revenuecat.com/docs/webhooks for the full
// list. Keeping this typed helps the switch statement stay honest.
type RevenueCatEventType =
  | 'INITIAL_PURCHASE'
  | 'NON_RENEWING_PURCHASE'
  | 'RENEWAL'
  | 'PRODUCT_CHANGE'
  | 'CANCELLATION'
  | 'UNCANCELLATION'
  | 'EXPIRATION'
  | 'BILLING_ISSUE'
  | 'SUBSCRIBER_ALIAS'
  | 'SUBSCRIPTION_PAUSED'
  | 'SUBSCRIPTION_EXTENDED'
  | 'TRANSFER'
  | 'TEMPORARY_ENTITLEMENT_GRANT'
  | 'REFUND'
  | 'REFUND_REVERSED'
  | 'TEST'

interface RevenueCatWebhookEvent {
  type: RevenueCatEventType
  app_user_id?: string
  // RevenueCat sends many more fields on the event. We only type the
  // ones this scaffold touches; handlers for specific events will add
  // their own narrower types as they're implemented.
  id?: string
  event_timestamp_ms?: number
  [key: string]: unknown
}

interface RevenueCatWebhookPayload {
  event: RevenueCatWebhookEvent
  api_version?: string
}

const REVENUECAT_WEBHOOK_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET')
const LIFETIME_PRODUCT_IDS = new Set(['domani_lifetime'])
const REFUND_LIKE_CANCELLATION_REASONS = new Set(['CUSTOMER_SUPPORT'])

function getEventLogContext(event: RevenueCatWebhookEvent) {
  return {
    eventType: event.type,
    eventId: event.id ?? null,
    appUserId: event.app_user_id,
    productId: typeof event.product_id === 'string' ? event.product_id : null,
    entitlementIds: Array.isArray(event.entitlement_ids) ? event.entitlement_ids : [],
    store: typeof event.store === 'string' ? event.store : null,
    environment: typeof event.environment === 'string' ? event.environment : null,
    eventTimestampMs: typeof event.event_timestamp_ms === 'number' ? event.event_timestamp_ms : null,
    originalTransactionId:
      typeof event.original_transaction_id === 'string' ? event.original_transaction_id : null,
    transactionId: typeof event.transaction_id === 'string' ? event.transaction_id : null,
  }
}

function getEventTimestampIso(
  event: RevenueCatWebhookEvent,
  field: 'purchased_at_ms' | 'event_timestamp_ms' = 'event_timestamp_ms',
) {
  const timestamp = typeof event[field] === 'number' ? event[field] : null
  return timestamp ? new Date(timestamp).toISOString() : new Date().toISOString()
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  )
}

function getCandidateUserIds(event: RevenueCatWebhookEvent): string[] {
  const aliases = Array.isArray(event.aliases) ? event.aliases : []
  const candidates = [
    event.app_user_id,
    typeof event.original_app_user_id === 'string' ? event.original_app_user_id : null,
    ...aliases,
  ]

  return [...new Set(candidates.filter(isUuid))]
}

function getRevenueCatIdentityCandidates(event: RevenueCatWebhookEvent): string[] {
  const aliases = getAliases(event)
  const candidates = [
    typeof event.app_user_id === 'string' ? event.app_user_id : null,
    typeof event.original_app_user_id === 'string' ? event.original_app_user_id : null,
    ...aliases,
  ]

  return [...new Set(candidates.filter((candidate): candidate is string => !!candidate))]
}

function getAliases(event: RevenueCatWebhookEvent): string[] {
  return Array.isArray(event.aliases) ? event.aliases.filter((alias): alias is string => typeof alias === 'string') : []
}

function isRefundLikeCancellation(event: RevenueCatWebhookEvent) {
  const cancelReason =
    typeof event.cancel_reason === 'string' ? event.cancel_reason.toUpperCase() : null
  const productId = typeof event.product_id === 'string' ? event.product_id : null

  return (
    event.type === 'CANCELLATION' &&
    !!productId &&
    LIFETIME_PRODUCT_IDS.has(productId) &&
    !!cancelReason &&
    REFUND_LIKE_CANCELLATION_REASONS.has(cancelReason)
  )
}

async function claimWebhookEvent(
  supabase: ReturnType<typeof createClient>,
  event: RevenueCatWebhookEvent,
) {
  if (!event.id) return false

  const { data, error } = await supabase
    .from('revenuecat_webhook_events')
    .upsert(
      {
        event_id: event.id,
        event_type: event.type,
        app_user_id: typeof event.app_user_id === 'string' ? event.app_user_id : null,
        original_app_user_id:
          typeof event.original_app_user_id === 'string' ? event.original_app_user_id : null,
        aliases: getAliases(event),
        product_id: typeof event.product_id === 'string' ? event.product_id : null,
        store: typeof event.store === 'string' ? event.store : null,
        environment: typeof event.environment === 'string' ? event.environment : null,
        event_timestamp:
          typeof event.event_timestamp_ms === 'number'
            ? new Date(event.event_timestamp_ms).toISOString()
            : null,
        processed_action: 'processing',
        raw_event: event,
      },
      {
        onConflict: 'event_id',
        ignoreDuplicates: true,
      },
    )
    .select('event_id')

  if (error) {
    console.error('[revenuecat-webhook] failed to claim event:', {
      ...getEventLogContext(event),
      error,
    })
    throw error
  }

  return !!data?.length
}

async function finalizeWebhookEvent(
  supabase: ReturnType<typeof createClient>,
  event: RevenueCatWebhookEvent,
  processedAction: string,
  processingError: string | null = null,
) {
  if (!event.id) return

  const { error } = await supabase
    .from('revenuecat_webhook_events')
    .update({
      processed_action: processedAction,
      processed_at: new Date().toISOString(),
      processing_error: processingError,
    })
    .eq('event_id', event.id)

  if (error) {
    console.error('[revenuecat-webhook] failed to finalize event log:', {
      ...getEventLogContext(event),
      processedAction,
      error,
    })
    throw error
  }
}

async function releaseWebhookClaim(
  supabase: ReturnType<typeof createClient>,
  event: RevenueCatWebhookEvent,
) {
  if (!event.id) return

  const { error } = await supabase.from('revenuecat_webhook_events').delete().eq('event_id', event.id)

  if (error) {
    console.error('[revenuecat-webhook] failed to release claimed event:', {
      ...getEventLogContext(event),
      error,
    })
  }
}

async function resolveProfileUserId(
  supabase: ReturnType<typeof createClient>,
  event: RevenueCatWebhookEvent,
) {
  for (const candidateUserId of getCandidateUserIds(event)) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', candidateUserId)
      .maybeSingle()

    if (error) {
      console.error('[revenuecat-webhook] failed to resolve user from candidate:', {
        ...getEventLogContext(event),
        candidateUserId,
        error,
      })
      throw error
    }

    if (data?.id) {
      return data.id
    }
  }

  for (const revenueCatIdentity of getRevenueCatIdentityCandidates(event)) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('revenuecat_user_id', revenueCatIdentity)
      .maybeSingle()

    if (error) {
      console.error('[revenuecat-webhook] failed to resolve user from RevenueCat identity:', {
        ...getEventLogContext(event),
        revenueCatIdentity,
        error,
      })
      throw error
    }

    if (data?.id) {
      return data.id
    }
  }

  return null
}

async function grantLifetimeAccess(
  supabase: ReturnType<typeof createClient>,
  event: RevenueCatWebhookEvent,
  processedAction: 'granted_lifetime' | 'restored_refund',
) {
  const userId = await resolveProfileUserId(supabase, event)

  if (!userId) {
    console.warn('[revenuecat-webhook] no matching profile found for grant event', {
      ...getEventLogContext(event),
      candidateUserIds: getCandidateUserIds(event),
    })
    await finalizeWebhookEvent(supabase, event, 'ignored_user_not_found')
    return jsonResponse({ received: true, ignored: 'user_not_found' })
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      tier: 'lifetime',
      purchased_at: getEventTimestampIso(event, 'purchased_at_ms'),
      refunded_at: null,
      trial_ends_at: null,
    })
    .eq('id', userId)

  if (error) {
    console.error('[revenuecat-webhook] failed to grant lifetime access:', {
      ...getEventLogContext(event),
      userId,
      error,
    })
    throw error
  }

  await clearRefundState(supabase, userId, event)

  await finalizeWebhookEvent(supabase, event, processedAction)

  console.log('[revenuecat-webhook] granted lifetime access', {
    ...getEventLogContext(event),
    userId,
    processedAction,
    updatedTier: 'lifetime',
  })

  return null
}

async function clearRefundState(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  event: RevenueCatWebhookEvent,
) {
  const { error } = await supabase.from('purchase_refund_states').delete().eq('user_id', userId)

  if (error) {
    console.error('[revenuecat-webhook] failed to clear purchase refund state:', {
      ...getEventLogContext(event),
      userId,
      error,
    })
    throw error
  }
}

async function upsertApprovedRefundState(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  event: RevenueCatWebhookEvent,
) {
  const eventTimestamp = getEventTimestampIso(event)
  const { error } = await supabase.from('purchase_refund_states').upsert(
    {
      user_id: userId,
      platform: 'ios',
      status: 'approved',
      client_hint: null,
      requested_at: eventTimestamp,
      resolved_at: eventTimestamp,
      last_source: `revenuecat:${event.type}`,
      last_error: null,
    },
    { onConflict: 'user_id' },
  )

  if (error) {
    console.error('[revenuecat-webhook] failed to persist approved refund state:', {
      ...getEventLogContext(event),
      userId,
      error,
    })
    throw error
  }
}

async function revokeLifetimeAccess(
  supabase: ReturnType<typeof createClient>,
  event: RevenueCatWebhookEvent,
  processedAction: 'revoked_refund' | 'revoked_cancellation',
) {
  const userId = await resolveProfileUserId(supabase, event)

  if (!userId) {
    console.warn('[revenuecat-webhook] no matching profile found for revoke event', {
      ...getEventLogContext(event),
      candidateUserIds: getCandidateUserIds(event),
    })
    await finalizeWebhookEvent(supabase, event, 'ignored_user_not_found')
    return jsonResponse({ received: true, ignored: 'user_not_found' })
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      tier: 'none',
      purchased_at: null,
      refunded_at: getEventTimestampIso(event),
    })
    .eq('id', userId)

  if (error) {
    console.error('[revenuecat-webhook] failed to revoke access:', {
      ...getEventLogContext(event),
      userId,
      error,
    })
    throw error
  }

  await upsertApprovedRefundState(supabase, userId, event)

  await finalizeWebhookEvent(supabase, event, processedAction)

  console.log('[revenuecat-webhook] revoked access', {
    ...getEventLogContext(event),
    userId,
    processedAction,
    updatedTier: 'none',
  })

  return null
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  // --- Method guard ------------------------------------------------------
  // RevenueCat always POSTs webhook events. Reject anything else so we
  // don't accidentally process a GET/HEAD health check as an event.
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  // --- Configuration guard -----------------------------------------------
  // Fail loud if the secret isn't configured so we don't silently accept
  // every request. Returning 500 here (rather than 401) makes it clear
  // the problem is on our side, not the caller's.
  if (!REVENUECAT_WEBHOOK_SECRET) {
    console.error(
      '[revenuecat-webhook] REVENUECAT_WEBHOOK_SECRET is not set; rejecting all requests',
    )
    return jsonResponse({ error: 'Server not configured' }, 500)
  }

  // --- Auth check --------------------------------------------------------
  // Bearer-token scheme. Constant-time comparison isn't necessary for a
  // shared secret of this length over TLS — standard equality is fine.
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${REVENUECAT_WEBHOOK_SECRET}`) {
    console.warn('[revenuecat-webhook] unauthorized request')
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  // --- Body parsing ------------------------------------------------------
  // Read as text first so the raw body is still available if we ever
  // switch to HMAC signature verification. Parse separately so a bad
  // JSON payload produces a clear 400 instead of a generic 500.
  let rawBody: string
  try {
    rawBody = await req.text()
  } catch (err) {
    console.error('[revenuecat-webhook] failed to read request body:', err)
    return jsonResponse({ error: 'Invalid request body' }, 400)
  }

  let payload: RevenueCatWebhookPayload
  try {
    payload = JSON.parse(rawBody) as RevenueCatWebhookPayload
  } catch (err) {
    console.error('[revenuecat-webhook] invalid JSON payload:', err)
    return jsonResponse({ error: 'Invalid JSON payload' }, 400)
  }

  const event = payload?.event
  if (!event || typeof event !== 'object' || !event.type || !event.id) {
    console.error('[revenuecat-webhook] payload missing required event fields', {
      hasEvent: !!event,
      type: event?.type,
      eventId: event?.id ?? null,
    })
    return jsonResponse({ error: 'Malformed event payload' }, 400)
  }

  // --- Supabase client ---------------------------------------------------
  // Uses the service role key because webhook handlers need to bypass
  // RLS to write to profiles on behalf of any user. The SUPABASE_URL
  // and SUPABASE_SERVICE_ROLE_KEY env vars are injected automatically
  // by the Supabase Edge Runtime — we don't set them ourselves.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  console.log('[revenuecat-webhook] received event', getEventLogContext(event))

  const claimedEvent = await claimWebhookEvent(supabase, event)
  if (!claimedEvent) {
    console.log('[revenuecat-webhook] duplicate event ignored', getEventLogContext(event))
    return jsonResponse({ received: true, duplicate: true })
  }

  // --- Event routing -----------------------------------------------------
  try {
    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'NON_RENEWING_PURCHASE': {
        const response = await grantLifetimeAccess(supabase, event, 'granted_lifetime')
        if (response) return response
        break
      }
      case 'REFUND': {
        const response = await revokeLifetimeAccess(supabase, event, 'revoked_refund')
        if (response) return response
        break
      }
      case 'REFUND_REVERSED': {
        const response = await grantLifetimeAccess(supabase, event, 'restored_refund')
        if (response) return response
        break
      }
      case 'CANCELLATION': {
        if (isRefundLikeCancellation(event)) {
          const response = await revokeLifetimeAccess(supabase, event, 'revoked_cancellation')
          if (response) return response
        } else {
          await finalizeWebhookEvent(supabase, event, 'ignored_cancellation')
          console.log('[revenuecat-webhook] non-refund cancellation ignored', {
            ...getEventLogContext(event),
            cancelReason: typeof event.cancel_reason === 'string' ? event.cancel_reason : null,
          })
        }
        break
      }
      default: {
        // Log everything we don't explicitly handle. During early
        // staging testing this gives us visibility into what RC
        // actually delivers (TEST events, PRODUCT_CHANGE, etc.)
        // without crashing the function or returning an error that
        // would trigger RC's retry machinery.
        await finalizeWebhookEvent(supabase, event, 'ignored_unhandled')
        console.log('[revenuecat-webhook] unhandled event type', {
          ...getEventLogContext(event),
        })
      }
    }
  } catch (err) {
    await releaseWebhookClaim(supabase, event)
    console.error('[revenuecat-webhook] handler error:', err)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }

  return jsonResponse({ received: true, type: event.type })
})
