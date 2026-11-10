import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { recordRolloutEvent } from '../_shared/rolloutTelemetry.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  parsePromoConfirmationContext,
  parseVerifiedLifetimeAccess,
  PROMO_GATED_LIFETIME_PRODUCT_IDS,
} from './accessSyncCore.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const REVENUECAT_SECRET_API_KEY = Deno.env.get('REVENUECAT_SECRET_API_KEY')
const REVENUECAT_ENTITLEMENT_ID = Deno.env.get('REVENUECAT_ENTITLEMENT_ID')

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  if (
    !SUPABASE_URL ||
    !SUPABASE_ANON_KEY ||
    !SUPABASE_SERVICE_ROLE_KEY ||
    !REVENUECAT_SECRET_API_KEY ||
    !REVENUECAT_ENTITLEMENT_ID
  ) {
    console.error('[sync-revenuecat-access] Required server configuration is missing')
    return jsonResponse({ error: 'Server not configured' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!accessToken) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader! } },
    auth: { persistSession: false },
  })
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser(accessToken)

  if (authError || !user) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
  const metric = (event: Parameters<typeof recordRolloutEvent>[1]) =>
    recordRolloutEvent(adminClient, event, user.id)

  let promoContext = null
  try {
    const rawBody = await req.text()
    const body = rawBody ? JSON.parse(rawBody) : {}
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return jsonResponse({ error: 'Invalid request body' }, 400)
    }
    if (body.userId !== user.id) {
      await metric('rejection')
      return jsonResponse({ error: 'User mismatch' }, 403)
    }
    promoContext = parsePromoConfirmationContext(body.promoContext)
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_PROMO_CONTEXT') {
      return jsonResponse({ error: 'Invalid promo context' }, 400)
    }
    return jsonResponse({ error: 'Invalid request body' }, 400)
  }

  const { error: queueError } = await authClient.rpc(
    'request_current_user_revenuecat_reconciliation',
  )
  if (queueError) {
    console.error('[sync-revenuecat-access] Could not queue verification', {
      code: queueError.code ?? null,
    })
    return jsonResponse({ error: 'Access verification unavailable' }, 503)
  }

  const { data: requestSeenAt, error: queueClaimError } = await adminClient.rpc(
    'claim_current_user_revenuecat_sync',
    { p_user_id: user.id },
  )
  if (queueClaimError) {
    return jsonResponse({ error: 'Access verification unavailable' }, 503)
  }
  if (!requestSeenAt) {
    return jsonResponse({ status: 'rate_limited', retryAfterSeconds: 10 }, 429)
  }

  let revenueCatResponse: Response
  try {
    revenueCatResponse = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(user.id)}`,
      {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${REVENUECAT_SECRET_API_KEY}`,
        },
        signal: AbortSignal.timeout(8000),
      },
    )
  } catch {
    await metric('unresolved_failure')
    return jsonResponse({ error: 'RevenueCat unavailable' }, 502)
  }

  if (!revenueCatResponse.ok) {
    console.error('[sync-revenuecat-access] RevenueCat lookup failed', {
      status: revenueCatResponse.status,
    })
    await metric('unresolved_failure')
    return jsonResponse({ error: 'RevenueCat verification failed' }, 502)
  }

  let verifiedAccess
  try {
    verifiedAccess = parseVerifiedLifetimeAccess(
      await revenueCatResponse.json(),
      REVENUECAT_ENTITLEMENT_ID,
    )
  } catch {
    await metric('unresolved_failure')
    return jsonResponse({ error: 'RevenueCat response invalid' }, 502)
  }

  if (verifiedAccess.status !== 'verified') {
    await metric('delayed_reconciliation')
    return jsonResponse({ status: verifiedAccess.status, accessGranted: false, recoverable: true })
  }

  if (PROMO_GATED_LIFETIME_PRODUCT_IDS.has(verifiedAccess.productId) && !promoContext) {
    await metric('rejection')
    return jsonResponse({ error: 'Promo confirmation context required' }, 400)
  }

  const { data, error } = await adminClient.rpc('apply_verified_revenuecat_lifetime_access', {
    p_user_id: user.id,
    p_verified_purchased_at: verifiedAccess.purchasedAt,
    p_store_product_id: verifiedAccess.productId,
    p_redemption_attempt_id: promoContext?.redemptionAttemptId ?? null,
    p_code_id: promoContext?.codeId ?? null,
    p_campaign_id: promoContext?.campaignId ?? null,
    p_request_seen_at: requestSeenAt,
  })

  if (error) {
    console.error('[sync-revenuecat-access] Verified access transaction failed', {
      code: error.code ?? null,
    })
    await metric('unresolved_failure')
    return jsonResponse({ error: 'Access sync failed' }, 500)
  }

  if (!data || typeof data !== 'object' || !('status' in data)) {
    await metric('unresolved_failure')
    return jsonResponse({ error: 'Invalid access sync result' }, 500)
  }
  await metric(data.accessGranted === true ? 'verified_success' : 'rejection')
  return jsonResponse(data)
})
