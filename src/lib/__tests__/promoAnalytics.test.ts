import { supabase } from '~/lib/supabase'
import {
  buildPromoAttemptAnalyticsProps,
  buildPromoAnalyticsProps,
  recordPromoRedemptionAttemptEvent,
} from '~/lib/promoAnalytics'
import {
  resetAccountLifecycleCoordinatorForTests,
  setActiveAccount,
} from '~/lib/accountLifecycleCoordinator'

const mockSupabaseRpc = supabase.rpc as unknown as jest.Mock

describe('promo analytics helpers', () => {
  beforeEach(() => {
    resetAccountLifecycleCoordinatorForTests()
    setActiveAccount('user-1')
  })

  it('builds privacy-safe props for valid promo responses', () => {
    const props = buildPromoAnalyticsProps({
      status: 'valid',
      messageKey: 'promo.valid',
      campaignId: 'campaign-1',
      campaignSlug: 'launch',
      codeId: 'code-1',
      redemptionAttemptId: 'attempt-1',
      campaignType: 'percent_discount_lifetime',
      discountKind: 'percent',
      display: {
        name: 'Launch',
        label: '50% off',
        discountPercent: 50,
        priceAmount: null,
        priceCurrency: null,
        paymentRequired: true,
      },
      routing: {
        platform: 'ios',
        storeAction: 'revenuecat_purchase_package',
        productId: 'domani_lifetime_discount',
        revenueCatOfferingId: 'promo',
        revenueCatPackageId: 'discount',
        revenueCatEntitlementId: 'Domani Lifetime',
        fallbackUrl: 'https://example.com/redeem',
      },
    })

    expect(props).toMatchObject({
      campaign_id: 'campaign-1',
      code_id: 'code-1',
      discount_kind: 'percent',
      promo_outcome: 'discounted',
      redemption_attempt_id: 'attempt-1',
      store_action: 'revenuecat_purchase_package',
    })
    expect(JSON.stringify(props)).not.toContain('SAVE')
  })

  it('preserves promo type fields for post-validation sync events', () => {
    expect(
      buildPromoAttemptAnalyticsProps({
        promoCode: 'SAVE100',
        campaignId: 'campaign-1',
        campaignSlug: 'launch',
        campaignType: 'percent_discount_lifetime',
        codeId: 'code-1',
        redemptionAttemptId: 'attempt-1',
        discountKind: 'percent',
        promoOutcome: 'discounted',
      }),
    ).toMatchObject({
      campaign_id: 'campaign-1',
      campaign_slug: 'launch',
      campaign_type: 'percent_discount_lifetime',
      code_id: 'code-1',
      discount_kind: 'percent',
      promo_outcome: 'discounted',
      redemption_attempt_id: 'attempt-1',
    })
  })

  it('updates backend audit rows without raw code metadata', async () => {
    mockSupabaseRpc.mockResolvedValueOnce({
      data: { status: 'updated' },
      error: null,
    })

    await recordPromoRedemptionAttemptEvent({
      expectedUserId: 'user-1',
      redemptionAttemptId: 'attempt-1',
      event: 'store_handoff_started',
      metadata: {
        platform: 'ios',
        source: 'native_redemption_sheet',
      },
    })

    expect(mockSupabaseRpc).toHaveBeenCalledWith('update_expected_user_promo_redemption_attempt', {
      p_error_code: null,
      p_error_message: null,
      p_event: 'store_handoff_started',
      p_expected_user_id: 'user-1',
      p_metadata: {
        platform: 'ios',
        source: 'native_redemption_sheet',
      },
      p_redemption_attempt_id: 'attempt-1',
      p_status: null,
    })
  })
})
