import React from 'react'
import { Linking, Platform } from 'react-native'

import { fireEvent, renderWithProviders, screen, waitFor } from '~/test/test-utils'
import RedeemCodeScreen from '../redeem-code'
import { supabase } from '~/lib/supabase'
import { getOfferings, setRevenueCatPromoRedemptionAttributes } from '~/lib/revenuecat'
import { useAnalytics } from '~/providers/AnalyticsProvider'
import { useSubscription } from '~/hooks/useSubscription'

const mockBack = jest.fn()
const mockReplace = jest.fn()
const mockRedeemPromoCode = jest.fn()
const mockSyncAccess = jest.fn()
const mockRestore = jest.fn()
const mockPurchase = jest.fn()
const mockMarkPromoCodeValidated = jest.fn()
const mockMarkExternalPurchaseAttempted = jest.fn()

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    back: mockBack,
    canGoBack: jest.fn(() => true),
    replace: mockReplace,
  })),
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 0, right: 0, bottom: 0, left: 0 })),
}))

jest.mock('~/hooks/useSubscription', () => ({
  useSubscription: jest.fn(() => ({
    accessSyncPhase: 'idle',
    isSyncingAccess: false,
    offerings: {
      identifier: 'general',
      availablePackages: [
        {
          packageType: 'LIFETIME',
          product: {
            identifier: 'domani_lifetime',
            priceString: '$34.99',
            price: 34.99,
            currencyCode: 'USD',
          },
        },
      ],
    },
    markExternalPurchaseAttempted: mockMarkExternalPurchaseAttempted,
    markPromoCodeValidated: mockMarkPromoCodeValidated,
    purchase: mockPurchase,
    redeemPromoCode: mockRedeemPromoCode,
    restore: mockRestore,
    syncAccess: mockSyncAccess,
  })),
}))

jest.mock('~/lib/revenuecat', () => ({
  OFFERINGS: {
    EARLY_ADOPTER: 'early_adopter',
    FRIENDS_FAMILY: 'friends_family',
    GENERAL: 'general',
  },
  getOfferings: jest.fn(),
  setRevenueCatPromoRedemptionAttributes: jest.fn(() => Promise.resolve()),
}))

const mockSupabaseRpc = supabase.rpc as unknown as jest.Mock
const mockGetOfferings = getOfferings as jest.Mock
const mockSetRevenueCatPromoRedemptionAttributes =
  setRevenueCatPromoRedemptionAttributes as jest.Mock
const mockUseAnalytics = useAnalytics as jest.Mock
const mockUseSubscription = useSubscription as jest.Mock
const mockTrack = jest.fn()

function buildMockSubscription(overrides = {}) {
  return {
    accessSyncPhase: 'idle',
    isSyncingAccess: false,
    offerings: {
      identifier: 'general',
      availablePackages: [
        {
          packageType: 'LIFETIME',
          product: {
            identifier: 'domani_lifetime',
            priceString: '$34.99',
            price: 34.99,
            currencyCode: 'USD',
          },
        },
      ],
    },
    offeringIdentifier: 'general',
    markExternalPurchaseAttempted: mockMarkExternalPurchaseAttempted,
    markPromoCodeValidated: mockMarkPromoCodeValidated,
    purchase: mockPurchase,
    redeemPromoCode: mockRedeemPromoCode,
    restore: mockRestore,
    syncAccess: mockSyncAccess,
    ...overrides,
  }
}

const originalPlatform = Platform.OS

function setPlatform(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    get: () => os,
  })
}

function mockValidFreeCode() {
  mockSupabaseRpc.mockResolvedValue({
    error: null,
    data: {
      status: 'valid',
      messageKey: 'promo.valid',
      campaignId: 'campaign-1',
      campaignSlug: 'free-ios',
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
        storeAction: 'server_grant_lifetime',
        productId: null,
        revenueCatOfferingId: null,
        revenueCatPackageId: null,
        revenueCatEntitlementId: 'Domani Lifetime',
        fallbackUrl: null,
      },
    },
  })
}

function mockValidAndroidFreeCode() {
  mockSupabaseRpc.mockResolvedValue({
    error: null,
    data: {
      status: 'valid',
      messageKey: 'promo.valid',
      campaignId: 'campaign-android-free',
      campaignSlug: 'android-free',
      codeId: 'code-android-free',
      redemptionAttemptId: 'attempt-android-free',
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
        platform: 'android',
        storeAction: 'server_grant_lifetime',
        productId: null,
        revenueCatOfferingId: null,
        revenueCatPackageId: null,
        revenueCatEntitlementId: 'Domani Lifetime',
        fallbackUrl: null,
      },
    },
  })
}

function mockValidAndroidDiscountCode(discountPercent = 50) {
  mockSupabaseRpc.mockResolvedValue({
    error: null,
    data: {
      status: 'valid',
      messageKey: 'promo.valid',
      campaignId: 'campaign-android-discount',
      campaignSlug: 'android-discount',
      codeId: 'code-android-discount',
      redemptionAttemptId: 'attempt-android-discount',
      campaignType: 'percent_discount_lifetime',
      discountKind: 'percent',
      display: {
        name: `${discountPercent}% off lifetime`,
        label: `${discountPercent}% Off Lifetime Access`,
        discountPercent,
        priceAmount: null,
        priceCurrency: null,
        paymentRequired: true,
      },
      routing: {
        platform: 'android',
        storeAction: 'revenuecat_purchase_package',
        productId: 'domani_lifetime_discount_50',
        revenueCatOfferingId: 'android_promos',
        revenueCatPackageId: 'discount_50_lifetime',
        revenueCatEntitlementId: 'Domani Lifetime',
        fallbackUrl: 'https://play.google.com/redeem?code=SAVE50',
      },
    },
  })
}

async function validateAndFailFreeGrant() {
  renderWithProviders(<RedeemCodeScreen />)

  fireEvent.changeText(screen.getByPlaceholderText('ENTER-CODE-HERE'), 'SAVE100')
  fireEvent.press(screen.getByLabelText('Submit code'))

  await screen.findByText('Code Accepted')

  fireEvent.press(screen.getByText('Redeem Free Access'))

  await screen.findByText('We could not apply this code. Please try again.')
}

describe('RedeemCodeScreen iOS promo recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAnalytics.mockReturnValue({
      identify: jest.fn(),
      reset: jest.fn(),
      screen: jest.fn(),
      track: mockTrack,
    })
    setPlatform('ios')
    mockValidFreeCode()
    mockRedeemPromoCode.mockResolvedValue({
      status: 'revenuecat_unavailable',
      source: 'promo_redemption',
    })
    mockSyncAccess.mockResolvedValue({
      status: 'missing_entitlement',
      source: 'promo_redemption',
    })
    mockRestore.mockResolvedValue(null)
    mockPurchase.mockResolvedValue(null)
    mockGetOfferings.mockResolvedValue(null)
    mockSetRevenueCatPromoRedemptionAttributes.mockResolvedValue(undefined)
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
    mockUseSubscription.mockImplementation(() => buildMockSubscription())
  })

  afterEach(() => {
    setPlatform(originalPlatform)
  })

  it('does not open the App Store sheet for a free lifetime code', async () => {
    await validateAndFailFreeGrant()

    expect(mockRedeemPromoCode).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignId: 'campaign-1',
        promoCode: 'SAVE100',
        promoOutcome: 'free',
        redemptionAttemptId: 'attempt-1',
      }),
    )
    expect(screen.queryByText('Open Store')).toBeNull()
    expect(Linking.openURL).not.toHaveBeenCalled()
  })

  it('does not depend on RevenueCat promo attributes for free lifetime codes', async () => {
    mockSetRevenueCatPromoRedemptionAttributes.mockRejectedValue(new Error('attribute sync failed'))

    await validateAndFailFreeGrant()

    expect(mockSetRevenueCatPromoRedemptionAttributes).not.toHaveBeenCalled()
    expect(Linking.openURL).not.toHaveBeenCalled()
  })
})

describe('RedeemCodeScreen Android promo routing', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAnalytics.mockReturnValue({
      identify: jest.fn(),
      reset: jest.fn(),
      screen: jest.fn(),
      track: mockTrack,
    })
    setPlatform('android')
    mockValidAndroidFreeCode()
    mockRedeemPromoCode.mockResolvedValue(null)
    mockSyncAccess.mockResolvedValue({
      status: 'missing_entitlement',
      source: 'promo_redemption',
    })
    mockRestore.mockResolvedValue(null)
    mockPurchase.mockResolvedValue({ entitlements: { active: {} } })
    mockSetRevenueCatPromoRedemptionAttributes.mockResolvedValue(undefined)
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
    mockUseSubscription.mockImplementation(() => buildMockSubscription())
  })

  afterEach(() => {
    setPlatform(originalPlatform)
  })

  it('confirms a free Android promo code through the in-app server grant', async () => {
    renderWithProviders(<RedeemCodeScreen />)

    fireEvent.changeText(screen.getByPlaceholderText('ENTER-CODE-HERE'), 'SAVE100')
    fireEvent.press(screen.getByLabelText('Submit code'))

    await screen.findByText('Code Accepted')

    fireEvent.press(screen.getByText('Redeem Free Access'))

    await waitFor(() => {
      expect(mockRedeemPromoCode).toHaveBeenCalledWith(
        expect.objectContaining({
          promoCode: 'SAVE100',
          campaignId: 'campaign-android-free',
          campaignSlug: 'android-free',
          campaignType: 'free_lifetime',
          codeId: 'code-android-free',
          redemptionAttemptId: 'attempt-android-free',
          discountKind: 'free',
          promoOutcome: 'free',
          priceString: null,
        }),
      )
    })
    expect(mockTrack).toHaveBeenCalledWith(
      'promo_validation_attempted',
      expect.objectContaining({
        code_length: 7,
        platform: 'android',
      }),
    )
    expect(mockTrack).toHaveBeenCalledWith(
      'promo_validation_succeeded',
      expect.objectContaining({
        campaign_id: 'campaign-android-free',
        promo_outcome: 'free',
        redemption_attempt_id: 'attempt-android-free',
      }),
    )
    expect(mockGetOfferings).not.toHaveBeenCalledWith('android_promos')
    expect(mockPurchase).not.toHaveBeenCalled()
    expect(Linking.openURL).not.toHaveBeenCalled()
  })

  it('does not grant access from valid free-code validation alone', async () => {
    renderWithProviders(<RedeemCodeScreen />)

    fireEvent.changeText(screen.getByPlaceholderText('ENTER-CODE-HERE'), 'SAVE100')
    fireEvent.press(screen.getByLabelText('Submit code'))

    await screen.findByText('Code Accepted')

    expect(mockMarkPromoCodeValidated).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignId: 'campaign-android-free',
        promoCode: 'SAVE100',
        promoOutcome: 'free',
        redemptionAttemptId: 'attempt-android-free',
      }),
    )
    expect(screen.queryByText('Lifetime Access Active')).toBeNull()
    expect(mockPurchase).not.toHaveBeenCalled()
    expect(mockRedeemPromoCode).not.toHaveBeenCalled()
    expect(mockSyncAccess).not.toHaveBeenCalled()
  })

  it('renders discounted promo pricing and starts the mapped package by default', async () => {
    mockValidAndroidDiscountCode()
    const promoPackage = {
      identifier: 'discount_50_lifetime',
      packageType: 'LIFETIME',
      product: {
        identifier: 'domani_lifetime_discount_50',
        priceString: '$17.49',
        price: 17.49,
        currencyCode: 'USD',
      },
    }
    mockGetOfferings.mockResolvedValue({
      availablePackages: [promoPackage],
    })

    renderWithProviders(<RedeemCodeScreen />)

    fireEvent.changeText(screen.getByPlaceholderText('ENTER-CODE-HERE'), 'SAVE50')
    fireEvent.press(screen.getByLabelText('Submit code'))

    await screen.findByText('Code Accepted')
    await screen.findByText('Price after discount: $17.49')

    expect(screen.getByText('SAVE50')).toBeTruthy()
    expect(screen.getByText('50% Off Lifetime Access')).toBeTruthy()
    expect(screen.getByText('Price after discount: $17.49')).toBeTruthy()
    expect(screen.getByText('Current price')).toBeTruthy()
    expect(screen.getByText('$34.99')).toBeTruthy()
    expect(screen.getByText('Promo price')).toBeTruthy()
    expect(screen.getAllByText('$17.49').length).toBeGreaterThan(0)
    expect(screen.getByText('Discount')).toBeTruthy()
    expect(screen.getByText('50% off')).toBeTruthy()
    expect(screen.getByText('Continue to Purchase - $17.49')).toBeTruthy()
    expect(screen.queryByText('Open Store')).toBeNull()
    expect(
      screen.queryByText(
        "We couldn't open the in-app store confirmation. Use the store fallback or try syncing if you already finished redemption.",
      ),
    ).toBeNull()

    fireEvent.press(screen.getByText('Continue to Purchase - $17.49'))

    await waitFor(() => {
      expect(mockGetOfferings).toHaveBeenCalledWith('android_promos')
      expect(mockPurchase).toHaveBeenCalledWith({
        pkg: promoPackage,
        attemptContext: expect.objectContaining({
          campaignId: 'campaign-android-discount',
          campaignType: 'percent_discount_lifetime',
          discountKind: 'percent',
          priceString: '$17.49',
          promoCode: 'SAVE50',
          promoOutcome: 'discounted',
          redemptionAttemptId: 'attempt-android-discount',
        }),
      })
    })
    expect(Linking.openURL).not.toHaveBeenCalled()
  })

  it('does not show a current-price comparison when it matches the promo price', async () => {
    mockValidAndroidDiscountCode()
    mockGetOfferings.mockResolvedValue({
      availablePackages: [
        {
          identifier: 'discount_50_lifetime',
          product: {
            identifier: 'domani_lifetime_discount_50',
            priceString: '$17.49',
            price: 17.49,
            currencyCode: 'USD',
          },
        },
      ],
    })
    mockUseSubscription.mockImplementation(() =>
      buildMockSubscription({
        offerings: {
          identifier: 'general',
          availablePackages: [
            {
              packageType: 'LIFETIME',
              product: {
                identifier: 'domani_lifetime',
                priceString: '$17.49',
                price: 17.49,
                currencyCode: 'USD',
              },
            },
          ],
        },
      }),
    )

    renderWithProviders(<RedeemCodeScreen />)

    fireEvent.changeText(screen.getByPlaceholderText('ENTER-CODE-HERE'), 'SAVE50')
    fireEvent.press(screen.getByLabelText('Submit code'))

    await screen.findByText('Code Accepted')

    expect(screen.queryByText('Current price')).toBeNull()
    expect(screen.getByText('Promo price')).toBeTruthy()
    expect(screen.getAllByText('$17.49').length).toBeGreaterThan(0)
  })

  it('uses the grandfathered lifetime price for promo comparisons', async () => {
    mockValidAndroidDiscountCode()
    mockGetOfferings.mockResolvedValue({
      availablePackages: [
        {
          identifier: 'discount_50_lifetime',
          product: {
            identifier: 'domani_lifetime_discount_50',
            priceString: '$17.49',
            price: 17.49,
            currencyCode: 'USD',
          },
        },
      ],
    })
    mockUseSubscription.mockImplementation(() =>
      buildMockSubscription({
        offeringIdentifier: 'early_adopter',
        offerings: {
          identifier: 'early_adopter',
          availablePackages: [
            {
              packageType: 'LIFETIME',
              product: {
                identifier: 'domani_lifetime_early',
                priceString: '$9.99',
                price: 9.99,
                currencyCode: 'USD',
              },
            },
          ],
        },
      }),
    )

    renderWithProviders(<RedeemCodeScreen />)

    fireEvent.changeText(screen.getByPlaceholderText('ENTER-CODE-HERE'), 'SAVE50')
    fireEvent.press(screen.getByLabelText('Submit code'))

    await screen.findByText('Code Accepted')

    expect(screen.queryByText('$34.99')).toBeNull()
    expect(screen.queryByText('Current price')).toBeNull()
    expect(screen.queryByText('50% off')).toBeNull()
    expect(screen.queryByText('50% Off Lifetime Access')).toBeNull()
    expect(screen.queryByText('Price after discount: $17.49')).toBeNull()
    expect(screen.getByText('Get Lifetime Access')).toBeTruthy()
    expect(await screen.findByText('Promo price')).toBeTruthy()
    expect(screen.getAllByText('$17.49').length).toBeGreaterThan(0)
    expect(mockGetOfferings).not.toHaveBeenCalledWith('general')
  })

  it('compares a cheaper promo with the grandfathered store price', async () => {
    mockValidAndroidDiscountCode()
    mockGetOfferings.mockResolvedValue({
      availablePackages: [
        {
          identifier: 'discount_50_lifetime',
          product: {
            identifier: 'domani_lifetime_discount_50',
            priceString: '$4.99',
            price: 4.99,
            currencyCode: 'USD',
          },
        },
      ],
    })
    mockUseSubscription.mockImplementation(() =>
      buildMockSubscription({
        offeringIdentifier: 'early_adopter',
        offerings: {
          identifier: 'early_adopter',
          availablePackages: [
            {
              packageType: 'LIFETIME',
              product: {
                identifier: 'domani_lifetime_early',
                priceString: '$9.99',
                price: 9.99,
                currencyCode: 'USD',
              },
            },
          ],
        },
      }),
    )

    renderWithProviders(<RedeemCodeScreen />)
    fireEvent.changeText(screen.getByPlaceholderText('ENTER-CODE-HERE'), 'SAVE50')
    fireEvent.press(screen.getByLabelText('Submit code'))

    await screen.findByText('Code Accepted')

    expect(await screen.findByText('Current price')).toBeTruthy()
    expect(screen.getByText('$9.99')).toBeTruthy()
    expect(screen.getAllByText('$4.99').length).toBeGreaterThan(0)
    expect(screen.queryByText('$34.99')).toBeNull()
  })

  it('calculates percentage savings from the grandfathered price', async () => {
    mockValidAndroidDiscountCode(80)
    mockGetOfferings.mockResolvedValue({
      availablePackages: [
        {
          identifier: 'discount_50_lifetime',
          product: {
            identifier: 'domani_lifetime_discount_50',
            priceString: '$6.99',
            price: 6.99,
            currencyCode: 'USD',
          },
        },
      ],
    })
    mockUseSubscription.mockImplementation(() =>
      buildMockSubscription({
        offeringIdentifier: 'early_adopter',
        offerings: {
          identifier: 'early_adopter',
          availablePackages: [
            {
              packageType: 'LIFETIME',
              product: {
                identifier: 'domani_lifetime_early',
                priceString: '$9.99',
                price: 9.99,
                currencyCode: 'USD',
              },
            },
          ],
        },
      }),
    )

    renderWithProviders(<RedeemCodeScreen />)
    fireEvent.changeText(screen.getByPlaceholderText('ENTER-CODE-HERE'), 'SAVE80')
    fireEvent.press(screen.getByLabelText('Submit code'))

    await screen.findByText('30% off')

    expect(screen.getByText('Discounted Lifetime Access')).toBeTruthy()
    expect(screen.queryByText('80% Off Lifetime Access')).toBeNull()
    expect(screen.getByText('$9.99')).toBeTruthy()
    expect(screen.getAllByText('$6.99').length).toBeGreaterThan(0)
  })

  it('shows no regular price when account pricing is unavailable', async () => {
    mockValidAndroidDiscountCode()
    mockGetOfferings.mockResolvedValue({
      availablePackages: [
        {
          identifier: 'discount_50_lifetime',
          product: {
            identifier: 'domani_lifetime_discount_50',
            priceString: '$17.49',
            price: 17.49,
            currencyCode: 'USD',
          },
        },
      ],
    })
    mockUseSubscription.mockImplementation(() =>
      buildMockSubscription({ offeringIdentifier: null, offerings: null }),
    )

    renderWithProviders(<RedeemCodeScreen />)
    fireEvent.changeText(screen.getByPlaceholderText('ENTER-CODE-HERE'), 'SAVE50')
    fireEvent.press(screen.getByLabelText('Submit code'))

    await screen.findByText('Code Accepted')

    expect(screen.queryByText('Current price')).toBeNull()
    expect(screen.queryByText('50% off')).toBeNull()
    expect(screen.queryByText('50% Off Lifetime Access')).toBeNull()
    expect(screen.getByText('Get Lifetime Access')).toBeTruthy()
    expect(screen.getByText('Promo price')).toBeTruthy()
    expect(mockGetOfferings).not.toHaveBeenCalledWith('general')
  })

  it('does not show the Play Store fallback when a free Android grant is not confirmed', async () => {
    mockGetOfferings.mockResolvedValue({
      availablePackages: [
        {
          identifier: 'other_lifetime',
          packageType: 'LIFETIME',
          product: { identifier: 'other_product', priceString: '$34.99' },
        },
      ],
    })

    renderWithProviders(<RedeemCodeScreen />)

    fireEvent.changeText(screen.getByPlaceholderText('ENTER-CODE-HERE'), 'SAVE100')
    fireEvent.press(screen.getByLabelText('Submit code'))

    await screen.findByText('Code Accepted')

    fireEvent.press(screen.getByText('Redeem Free Access'))

    await screen.findByText('We could not apply this code. Please try again.')
    expect(mockPurchase).not.toHaveBeenCalled()
    expect(Linking.openURL).not.toHaveBeenCalled()
    expect(screen.queryByText('Open Store')).toBeNull()
  })

  it('shows the Play Store fallback when a discounted Android promo package is unavailable', async () => {
    mockValidAndroidDiscountCode()
    mockGetOfferings.mockResolvedValue({
      availablePackages: [
        {
          identifier: 'other_lifetime',
          packageType: 'LIFETIME',
          product: { identifier: 'other_product', priceString: '$34.99' },
        },
      ],
    })

    renderWithProviders(<RedeemCodeScreen />)

    fireEvent.changeText(screen.getByPlaceholderText('ENTER-CODE-HERE'), 'SAVE50')
    fireEvent.press(screen.getByLabelText('Submit code'))

    await screen.findByText('Code Accepted')

    fireEvent.press(screen.getByText('Continue to Purchase'))

    await screen.findByText(
      "We couldn't open the in-app store confirmation. Use the store fallback or try syncing if you already finished redemption.",
    )
    expect(mockPurchase).not.toHaveBeenCalled()
    expect(Linking.openURL).not.toHaveBeenCalled()

    fireEvent.press(screen.getByText('Open Store'))

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith('https://play.google.com/redeem?code=SAVE50')
    })
  })

  it('shows the Play Store fallback when a discounted Android promo purchase fails', async () => {
    mockValidAndroidDiscountCode()
    mockGetOfferings.mockResolvedValue({
      availablePackages: [
        {
          identifier: 'discount_50_lifetime',
          packageType: 'LIFETIME',
          product: { identifier: 'domani_lifetime_discount_50', priceString: '$17.49' },
        },
      ],
    })
    mockPurchase.mockRejectedValue(new Error('purchase failed'))

    renderWithProviders(<RedeemCodeScreen />)

    fireEvent.changeText(screen.getByPlaceholderText('ENTER-CODE-HERE'), 'SAVE50')
    fireEvent.press(screen.getByLabelText('Submit code'))

    await screen.findByText('Code Accepted')

    fireEvent.press(screen.getByText('Continue to Purchase - $17.49'))

    await screen.findByText(
      "We couldn't open the in-app store confirmation. Use the store fallback or try syncing if you already finished redemption.",
    )
    expect(mockPurchase).toHaveBeenCalled()

    fireEvent.press(screen.getByText('Open Store'))

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith('https://play.google.com/redeem?code=SAVE50')
    })
  })
})
