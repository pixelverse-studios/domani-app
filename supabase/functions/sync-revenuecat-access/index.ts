import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  parseExpectedUserId,
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

  let promoContext = null
  let expectedUserId = null
  try {
    const body = await req.json().catch(() => ({}))
    promoContext = parsePromoConfirmationContext(body?.promoContext)
    expectedUserId = parseExpectedUserId(body?.expectedUserId)
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_PROMO_CONTEXT') {
      return jsonResponse({ error: 'Invalid promo context' }, 400)
    }
    if (error instanceof Error && error.message === 'INVALID_EXPECTED_USER_ID') {
      return jsonResponse({ error: 'Invalid expected user' }, 400)
    }
    return jsonResponse({ error: 'Invalid request body' }, 400)
  }

  if (expectedUserId && expectedUserId !== user.id) {
    return jsonResponse({ error: 'Authenticated account changed' }, 409)
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
      },
    )
  } catch {
    return jsonResponse({ error: 'RevenueCat unavailable' }, 502)
  }

  if (!revenueCatResponse.ok) {
    console.error('[sync-revenuecat-access] RevenueCat lookup failed', {
      status: revenueCatResponse.status,
    })
    return jsonResponse({ error: 'RevenueCat verification failed' }, 502)
  }

  const verifiedAccess = parseVerifiedLifetimeAccess(
    await revenueCatResponse.json(),
    REVENUECAT_ENTITLEMENT_ID,
  )

  if (verifiedAccess.status !== 'verified') {
    return jsonResponse({ status: verifiedAccess.status, accessGranted: false })
  }

  if (PROMO_GATED_LIFETIME_PRODUCT_IDS.has(verifiedAccess.productId) && !promoContext) {
    return jsonResponse({ error: 'Promo confirmation context required' }, 400)
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
  const { data, error } = await adminClient.rpc('apply_verified_revenuecat_lifetime_access', {
    p_user_id: user.id,
    p_verified_purchased_at: verifiedAccess.purchasedAt,
    p_store_product_id: verifiedAccess.productId,
    p_redemption_attempt_id: promoContext?.redemptionAttemptId ?? null,
    p_code_id: promoContext?.codeId ?? null,
    p_campaign_id: promoContext?.campaignId ?? null,
  })

  if (error) {
    console.error('[sync-revenuecat-access] Verified access transaction failed', {
      code: error.code ?? null,
    })
    return jsonResponse({ error: 'Access sync failed' }, 500)
  }

  return jsonResponse({ status: 'synced', accessGranted: true, result: data })
})
