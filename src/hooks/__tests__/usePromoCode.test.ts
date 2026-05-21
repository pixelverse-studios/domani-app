import {
  getLocalPromoCodeResult,
  normalizePromoCodeInput,
  parsePromoCodeResult,
} from '~/hooks/usePromoCode'
import { findPromoPackage } from '~/lib/promoPackages'

describe('promo code helpers', () => {
  it('normalizes user input to the store code format', () => {
    expect(normalizePromoCodeInput(' free demo! ')).toBe('FREEDEMO')
    expect(normalizePromoCodeInput('family-2026')).toBe('FAMILY-2026')
  })

  it('parses a valid free lifetime code response', () => {
    const result = parsePromoCodeResult({
      status: 'valid',
      messageKey: 'promo.valid',
      campaignId: 'campaign-1',
      campaignSlug: 'friends-family',
      codeId: 'code-1',
      redemptionAttemptId: 'attempt-1',
      campaignType: 'free_lifetime',
      discountKind: 'free',
      display: {
        name: 'Free lifetime',
        label: 'FREE Lifetime Access',
        discountPercent: null,
        priceAmount: null,
        priceCurrency: null,
        paymentRequired: false,
      },
      routing: {
        platform: 'ios',
        storeAction: 'ios_offer_code_sheet',
        productId: 'domani_lifetime',
        revenueCatOfferingId: null,
        revenueCatPackageId: null,
        revenueCatEntitlementId: 'Domani Lifetime',
        fallbackUrl: null,
      },
    })

    expect(result.status).toBe('valid')
    if (result.status === 'valid') {
      expect(result.discountKind).toBe('free')
      expect(result.display.paymentRequired).toBe(false)
      expect(result.routing.storeAction).toBe('ios_offer_code_sheet')
    }
  })

  it('parses invalid code responses without campaign metadata', () => {
    expect(
      parsePromoCodeResult({
        status: 'invalid',
        messageKey: 'promo.invalid',
        redemptionAttemptId: 'attempt-2',
      }),
    ).toEqual({
      status: 'invalid',
      messageKey: 'promo.invalid',
      redemptionAttemptId: 'attempt-2',
      campaignId: null,
      campaignSlug: null,
      campaignType: null,
      codeId: null,
    })
  })

  it('provides local dev codes without requiring the validation RPC', () => {
    const result = getLocalPromoCodeResult('localfree')

    expect(result?.status).toBe('valid')
    if (result?.status === 'valid') {
      expect(result.routing.storeAction).toBe('local_test')
      expect(result.display.paymentRequired).toBe(false)
    }
  })

  it('provides local dev error states', () => {
    expect(getLocalPromoCodeResult('localexpired')?.status).toBe('expired')
    expect(getLocalPromoCodeResult('localused')?.status).toBe('already_redeemed')
    expect(getLocalPromoCodeResult('localmaxed')?.status).toBe('over_limit')
    expect(getLocalPromoCodeResult('localplatform')?.status).toBe('platform_unavailable')
  })

  it('does not fall back to the first RevenueCat package for promo purchases', () => {
    const offer = parsePromoCodeResult({
      status: 'valid',
      messageKey: 'promo.valid',
      campaignId: 'campaign-1',
      campaignSlug: 'friends-family',
      codeId: 'code-1',
      redemptionAttemptId: 'attempt-1',
      campaignType: 'fixed_price_lifetime',
      discountKind: 'fixed_price',
      display: {
        name: 'Friends and family',
        label: 'Friends and Family Lifetime',
        discountPercent: null,
        priceAmount: 4.99,
        priceCurrency: 'USD',
        paymentRequired: true,
      },
      routing: {
        platform: 'ios',
        storeAction: 'revenuecat_purchase_package',
        productId: 'domani_lifetime_friends',
        revenueCatOfferingId: 'friends_family',
        revenueCatPackageId: 'friends_family_lifetime',
        revenueCatEntitlementId: 'Domani Lifetime',
        fallbackUrl: null,
      },
    })

    expect(offer.status).toBe('valid')
    if (offer.status !== 'valid') return

    expect(
      findPromoPackage(
        [
          {
            identifier: 'default_lifetime',
            product: { identifier: 'domani_lifetime' },
          },
        ] as never,
        offer,
      ),
    ).toBeNull()
  })
})
