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
 * This scaffold (DEV-44) handles request routing, auth, payload
 * parsing, and logging only. The actual business logic for each event
 * type is filled in by follow-up tickets:
 *
 *   - INITIAL_PURCHASE / NON_RENEWING_PURCHASE → DEV-45
 *   - REFUND                                   → DEV-46
 *
 * Any event type not explicitly handled is logged (so we can observe
 * what RevenueCat actually delivers during staging QA) and the
 * function returns 200 so RevenueCat doesn't retry.
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
 * Handlers should rely on natural UPDATE idempotency — writing
 * tier='lifetime' twice is a no-op, so re-delivery of the same event
 * is safe without a dedicated event-log table. If we start seeing
 * double-writes in the wild (e.g., due to concurrent RC retries and
 * client-side sync), we can add an event_log table in a follow-up.
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
  | 'TEST'

interface RevenueCatWebhookEvent {
  type: RevenueCatEventType
  app_user_id: string
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
  if (!event || typeof event !== 'object' || !event.type || !event.app_user_id) {
    console.error('[revenuecat-webhook] payload missing event.type or event.app_user_id', {
      hasEvent: !!event,
      type: event?.type,
      hasUserId: !!event?.app_user_id,
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

  // --- Event routing -----------------------------------------------------
  // This scaffold dispatches to the right handler but does not yet
  // implement any of them. Follow-up tickets wire in the actual
  // database writes.
  try {
    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'NON_RENEWING_PURCHASE': {
        // TODO(DEV-45): set profile.tier='lifetime', profile.purchased_at=now
        console.log('[revenuecat-webhook] purchase event received (handler pending DEV-45)', {
          type: event.type,
          app_user_id: event.app_user_id,
          event_id: event.id,
        })
        break
      }
      case 'REFUND': {
        // TODO(DEV-46): set profile.tier='none', profile.refunded_at=now
        console.log('[revenuecat-webhook] refund event received (handler pending DEV-46)', {
          app_user_id: event.app_user_id,
          event_id: event.id,
        })
        break
      }
      default: {
        // Log everything we don't explicitly handle. During early
        // staging testing this gives us visibility into what RC
        // actually delivers (TEST events, PRODUCT_CHANGE, etc.)
        // without crashing the function or returning an error that
        // would trigger RC's retry machinery.
        console.log('[revenuecat-webhook] unhandled event type', {
          type: event.type,
          app_user_id: event.app_user_id,
          event_id: event.id,
        })
      }
    }
  } catch (err) {
    console.error('[revenuecat-webhook] handler error:', err)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }

  // Reference the client so future handlers (DEV-45/46) have it wired
  // up and ready; suppress unused-variable lint for the scaffold.
  void supabase

  return jsonResponse({ received: true, type: event.type })
})
