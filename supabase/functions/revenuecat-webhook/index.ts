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
  try {
    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'NON_RENEWING_PURCHASE': {
        // Grant lifetime access. RevenueCat's app_user_id is the
        // Supabase auth user ID (set during loginRevenueCat in the
        // client). The UPDATE is naturally idempotent — writing
        // tier='lifetime' twice is a no-op — so duplicate events
        // from RC's retry machinery are safe.
        //
        // Note: if a `protect_monetisation_fields` BEFORE UPDATE
        // trigger exists (from 037_add_trial_columns.sql), it will
        // block direct tier writes unless the session variable
        // `app.bypass_monetisation_guard` is set. As of this
        // implementation, the trigger does NOT exist on staging
        // (confirmed by client-side Start Trial working without
        // bypass). If the trigger is added to production in the
        // future, this handler will need an RPC wrapper or a raw
        // SQL `set_config(...)` call before the UPDATE.
        const userId = event.app_user_id

        const { error } = await supabase
          .from('profiles')
          .update({
            tier: 'lifetime',
            purchased_at: event.event_timestamp_ms
              ? new Date(event.event_timestamp_ms).toISOString()
              : new Date().toISOString(),
            trial_ends_at: null,
          })
          .eq('id', userId)

        if (error) {
          console.error('[revenuecat-webhook] failed to grant lifetime access:', {
            userId,
            error,
            eventType: event.type,
            eventId: event.id,
          })
          return jsonResponse({ error: 'Database error' }, 500)
        }

        console.log('[revenuecat-webhook] granted lifetime access', {
          userId,
          eventType: event.type,
          eventId: event.id,
        })
        break
      }
      case 'REFUND': {
        // TODO(DEV-46): revoke access — set tier='none', refunded_at=now
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

  return jsonResponse({ received: true, type: event.type })
})
