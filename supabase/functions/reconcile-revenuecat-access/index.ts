import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  parseVerifiedLifetimeAccess,
  PROMO_GATED_LIFETIME_PRODUCT_IDS,
} from '../sync-revenuecat-access/accessSyncCore.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const REVENUECAT_SECRET_API_KEY = Deno.env.get('REVENUECAT_SECRET_API_KEY')
const REVENUECAT_ENTITLEMENT_ID = Deno.env.get('REVENUECAT_ENTITLEMENT_ID')
const REVENUECAT_RECONCILIATION_SECRET = Deno.env.get('REVENUECAT_RECONCILIATION_SECRET')

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)
  if (
    !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !REVENUECAT_SECRET_API_KEY ||
    !REVENUECAT_ENTITLEMENT_ID || !REVENUECAT_RECONCILIATION_SECRET
  ) {
    console.error('[reconcile-revenuecat-access] Required server configuration is missing')
    return jsonResponse({ error: 'Server not configured' }, 500)
  }
  if (req.headers.get('Authorization') !== `Bearer ${REVENUECAT_RECONCILIATION_SECRET}`) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
  const { data: claimed, error: claimError } = await admin.rpc(
    'claim_pending_revenuecat_reconciliations',
    { p_limit: 5 },
  )
  if (claimError) {
    console.error('[reconcile-revenuecat-access] Queue claim failed', {
      code: claimError.code ?? null,
    })
    return jsonResponse({ error: 'Queue unavailable' }, 503)
  }

  let verified = 0
  let pending = 0
  let failed = 0
  for (const request of claimed ?? []) {
    try {
      const response = await fetch(
        `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(request.user_id)}`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${REVENUECAT_SECRET_API_KEY}`,
          },
          signal: AbortSignal.timeout(8000),
        },
      )
      if (!response.ok) {
        failed += 1
        continue
      }
      const access = parseVerifiedLifetimeAccess(
        await response.json(), REVENUECAT_ENTITLEMENT_ID,
      )
      if (access.status !== 'verified') {
        pending += 1
        continue
      }

      let promoCandidates: Array<{
        id: string
        code_id: string
        campaign_id: string
      }> = []
      const { data: attempts, error: attemptError } = await admin
        .from('promo_redemption_attempts')
        .select('id,code_id,campaign_id')
        .eq('user_id', request.user_id)
        .eq('status', 'valid')
        .order('created_at', { ascending: false })
        .limit(5)
      if (attemptError) {
        failed += 1
        continue
      }
      promoCandidates = attempts ?? []
      const isPromoGated = PROMO_GATED_LIFETIME_PRODUCT_IDS.has(access.productId)
      if (isPromoGated && !promoCandidates.length) {
        pending += 1
        continue
      }

      const candidates: Array<(typeof promoCandidates)[number] | null> = isPromoGated
        ? promoCandidates
        : [...promoCandidates, null]
      let applied = false
      for (const promo of candidates) {
        const { data, error } = await admin.rpc('apply_verified_revenuecat_lifetime_access', {
          p_user_id: request.user_id,
          p_verified_purchased_at: access.purchasedAt,
          p_store_product_id: access.productId,
          p_redemption_attempt_id: promo?.id ?? null,
          p_code_id: promo?.code_id ?? null,
          p_campaign_id: promo?.campaign_id ?? null,
          p_request_seen_at: request.requested_at,
        })
        if (!error && data?.accessGranted === true) {
          applied = true
          break
        }
        if (!error && data?.status === 'stale_refund') break
      }
      if (applied) verified += 1
      else pending += 1
    } catch {
      failed += 1
    }
  }

  return jsonResponse({ claimed: claimed?.length ?? 0, verified, pending, failed })
})
