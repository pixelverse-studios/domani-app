import { supabase } from '~/lib/supabase'
import { OFFERINGS } from '~/lib/revenuecat'

export type VerifiedPricingOffer = typeof OFFERINGS.EARLY_ADOPTER | typeof OFFERINGS.GENERAL

export async function getVerifiedPricingOffer(
  expectedUserId: string,
): Promise<VerifiedPricingOffer | null> {
  try {
    const { data, error } = await supabase.rpc('get_my_lifetime_pricing_offer', {
      p_expected_user_id: expectedUserId,
    })

    if (error) {
      console.error('[Pricing] Eligibility verification failed', { code: error.code })
      return null
    }

    return data === OFFERINGS.EARLY_ADOPTER || data === OFFERINGS.GENERAL ? data : null
  } catch (error) {
    console.error('[Pricing] Eligibility verification failed', error)
    return null
  }
}
