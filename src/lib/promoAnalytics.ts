import { Platform } from 'react-native'

import { supabase } from '~/lib/supabase'
import { addBreadcrumb } from '~/lib/sentry'
import type { PromoCodeResult, ValidPromoCodeResult } from '~/hooks/usePromoCode'
import type { PurchaseAccessSyncAttemptContext } from '~/hooks/useSubscription'
import type { Json } from '~/types/supabase'

export type PromoAnalyticsOutcome = 'free' | 'discounted' | 'unknown'

export type PromoAnalyticsProps = {
  platform: string
  campaign_id?: string | null
  campaign_slug?: string | null
  campaign_type?: string | null
  code_id?: string | null
  redemption_attempt_id?: string | null
  discount_kind?: string | null
  promo_outcome?: PromoAnalyticsOutcome
  store_action?: string | null
  product_id?: string | null
  revenuecat_offering_id?: string | null
  revenuecat_package_id?: string | null
  validation_status?: string | null
  sync_status?: string | null
  source?: string | null
  fallback_available?: boolean
  error_code?: string | null
}

export function getPromoOutcomeFromOffer(offer: ValidPromoCodeResult): PromoAnalyticsOutcome {
  return offer.display.paymentRequired ? 'discounted' : 'free'
}

export function buildPromoAnalyticsProps(
  result: PromoCodeResult | null | undefined,
): PromoAnalyticsProps {
  if (!result) {
    return {
      platform: Platform.OS,
      validation_status: null,
      promo_outcome: 'unknown',
    }
  }

  if (result.status !== 'valid') {
    return {
      platform: Platform.OS,
      campaign_id: result.campaignId,
      campaign_slug: result.campaignSlug,
      campaign_type: result.campaignType,
      code_id: result.codeId,
      redemption_attempt_id: result.redemptionAttemptId,
      validation_status: result.status,
      promo_outcome: 'unknown',
    }
  }

  return {
    platform: Platform.OS,
    campaign_id: result.campaignId,
    campaign_slug: result.campaignSlug,
    campaign_type: result.campaignType,
    code_id: result.codeId,
    redemption_attempt_id: result.redemptionAttemptId,
    discount_kind: result.discountKind,
    promo_outcome: getPromoOutcomeFromOffer(result),
    store_action: result.routing.storeAction,
    product_id: result.routing.productId,
    revenuecat_offering_id: result.routing.revenueCatOfferingId,
    revenuecat_package_id: result.routing.revenueCatPackageId,
    validation_status: result.status,
    fallback_available: !!result.routing.fallbackUrl,
  }
}

export function buildPromoAttemptAnalyticsProps(
  context: PurchaseAccessSyncAttemptContext | null | undefined,
): PromoAnalyticsProps {
  return {
    platform: Platform.OS,
    campaign_id: context?.campaignId ?? null,
    code_id: context?.codeId ?? null,
    redemption_attempt_id: context?.redemptionAttemptId ?? null,
    promo_outcome: context?.promoOutcome ?? 'unknown',
  }
}

export async function recordPromoRedemptionAttemptEvent(input: {
  redemptionAttemptId?: string | null
  event: string
  status?: 'failed' | 'abandoned' | null
  errorCode?: string | null
  errorMessage?: string | null
  metadata?: Record<string, unknown>
}) {
  if (!input.redemptionAttemptId) return

  const metadata = (input.metadata ?? {}) as Json

  try {
    const { error } = await supabase.rpc('update_current_user_promo_redemption_attempt', {
      p_redemption_attempt_id: input.redemptionAttemptId,
      p_event: input.event,
      p_status: input.status ?? null,
      p_error_code: input.errorCode ?? null,
      p_error_message: input.errorMessage ?? null,
      p_metadata: metadata,
    })

    if (error) throw error
  } catch (error) {
    addBreadcrumb('Failed to update promo redemption audit event', 'promo.audit', {
      redemptionAttemptId: input.redemptionAttemptId,
      event: input.event,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
