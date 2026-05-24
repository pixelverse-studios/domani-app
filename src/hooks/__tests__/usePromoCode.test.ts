import {
  act,
  renderHookWithProviders,
  waitFor,
} from '~/test/test-utils'
import { Platform } from 'react-native'

import { supabase } from '~/lib/supabase'
import {
  getLocalPromoCodeResult,
  normalizePromoCodeInput,
  parsePromoCodeResult,
  useValidatePromoCode,
} from '~/hooks/usePromoCode'
import { findPromoPackage } from '~/lib/promoPackages'

const mockSupabaseRpc = supabase.rpc as unknown as jest.Mock
const originalPlatform = Platform.OS

function setPlatform(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    get: () => os,
  })
}

describe('promo code helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    setPlatform(originalPlatform)
  })

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

  it.each([
    ['invalid', 'promo.invalid'],
    ['expired', 'promo.expired'],
    ['inactive', 'promo.inactive'],
    ['already_redeemed', 'promo.already_redeemed'],
    ['over_limit', 'promo.over_limit'],
    ['platform_unavailable', 'promo.platform_unavailable'],
  ] as const)('parses %s validation responses', (status, messageKey) => {
    expect(
      parsePromoCodeResult({
        status,
        messageKey,
        redemptionAttemptId: `attempt-${status}`,
        campaignId: 'campaign-1',
        campaignSlug: 'launch',
        campaignType: 'free_lifetime',
        codeId: 'code-1',
      }),
    ).toEqual({
      status,
      messageKey,
      redemptionAttemptId: `attempt-${status}`,
      campaignId: 'campaign-1',
      campaignSlug: 'launch',
      campaignType: 'free_lifetime',
      codeId: 'code-1',
    })
  })

  it('sends normalized validation payloads to Supabase', async () => {
    setPlatform('android')
    mockSupabaseRpc.mockResolvedValueOnce({
      error: null,
      data: {
        status: 'invalid',
        messageKey: 'promo.invalid',
        redemptionAttemptId: 'attempt-1',
      },
    })

    const { result } = renderHookWithProviders(() => useValidatePromoCode())

    await act(async () => {
      await result.current.mutateAsync(' save 50! ')
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockSupabaseRpc).toHaveBeenCalledWith('validate_promo_code', {
      p_code: 'SAVE50',
      p_platform: 'android',
      p_app_version: null,
    })
  })

  it('does not call validation RPC for local dev codes', async () => {
    const { result } = renderHookWithProviders(() => useValidatePromoCode())

    await act(async () => {
      await result.current.mutateAsync('localfree')
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
      expect(result.current.data?.result.status).toBe('valid')
    })
    expect(mockSupabaseRpc).not.toHaveBeenCalled()
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
