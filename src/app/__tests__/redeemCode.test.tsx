import React from 'react'
import { Linking, Platform } from 'react-native'

import { fireEvent, renderWithProviders, screen, waitFor } from '~/test/test-utils'
import RedeemCodeScreen from '../redeem-code'
import { supabase } from '~/lib/supabase'
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
const mockLoadOffering = jest.fn()
const mockSyncPromoRedemptionAttributes = jest.fn()

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
      availablePackages: [
        {
          packageType: 'LIFETIME',
          product: { priceString: '$34.99' },
        },
      ],
    },
    markExternalPurchaseAttempted: mockMarkExternalPurchaseAttempted,
    markPromoCodeValidated: mockMarkPromoCodeValidated,
    loadOffering: mockLoadOffering,
    syncPromoRedemptionAttributes: mockSyncPromoRedemptionAttributes,
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
}))

const mockSupabaseRpc = supabase.rpc as unknown as jest.Mock
const mockUseAnalytics = useAnalytics as jest.Mock
const mockUseSubscription = useSubscription as jest.Mock
const mockTrack = jest.fn()

function buildMockSubscription(overrides = {}) {
  return {
    accessSyncPhase: 'idle',
    isSyncingAccess: false,
    offerings: {
      availablePackages: [
        {
          packageType: 'LIFETIME',
          product: { priceString: '$34.99' },
        },
      ],
    },
    offeringIdentifier: 'general',
    markExternalPurchaseAttempted: mockMarkExternalPurchaseAttempted,
    markPromoCodeValidated: mockMarkPromoCodeValidated,
    loadOffering: mockLoadOffering,
    syncPromoRedemptionAttributes: mockSyncPromoRedemptionAttributes,
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

function mockValidAndroidDiscountCode() {
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
        name: '50% off lifetime',
        label: '50% Off Lifetime Access',
        discountPercent: 50,
        priceAmount: 17.49,
        priceCurrency: 'USD',
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
    mockLoadOffering.mockResolvedValue(null)
    mockSyncPromoRedemptionAttributes.mockResolvedValue(undefined)
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
    mockSyncPromoRedemptionAttributes.mockRejectedValue(new Error('attribute sync failed'))

    await validateAndFailFreeGrant()

    expect(mockSyncPromoRedemptionAttributes).not.toHaveBeenCalled()
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
    mockSyncPromoRedemptionAttributes.mockResolvedValue(undefined)
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
    expect(mockLoadOffering).not.toHaveBeenCalledWith('android_promos')
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
      product: { identifier: 'domani_lifetime_discount_50', priceString: '$17.49' },
    }
    mockLoadOffering.mockResolvedValue({
      availablePackages: [promoPackage],
    })

    renderWithProviders(<RedeemCodeScreen />)

    fireEvent.changeText(screen.getByPlaceholderText('ENTER-CODE-HERE'), 'SAVE50')
    fireEvent.press(screen.getByLabelText('Submit code'))

    await screen.findByText('Code Accepted')

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
      expect(mockLoadOffering).toHaveBeenCalledWith('android_promos')
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
    mockUseSubscription.mockImplementation(() =>
      buildMockSubscription({
        offerings: {
          availablePackages: [
            {
              packageType: 'LIFETIME',
              product: { priceString: '$17.49' },
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

  it('uses the general lifetime price for cohort promo comparisons', async () => {
    mockValidAndroidDiscountCode()
    mockUseSubscription.mockImplementation(() =>
      buildMockSubscription({
        offeringIdentifier: 'friends_family',
        offerings: {
          availablePackages: [
            {
              packageType: 'LIFETIME',
              product: { priceString: '$4.99' },
            },
          ],
        },
      }),
    )
    mockLoadOffering.mockResolvedValue({
      availablePackages: [
        {
          packageType: 'LIFETIME',
          product: { priceString: '$34.99' },
        },
      ],
    })

    renderWithProviders(<RedeemCodeScreen />)

    fireEvent.changeText(screen.getByPlaceholderText('ENTER-CODE-HERE'), 'SAVE50')
    fireEvent.press(screen.getByLabelText('Submit code'))

    await screen.findByText('Code Accepted')

    expect(await screen.findByText('$34.99')).toBeTruthy()
    expect(screen.getByText('Current price')).toBeTruthy()
    expect(screen.getByText('Promo price')).toBeTruthy()
    expect(screen.getAllByText('$17.49').length).toBeGreaterThan(0)
    expect(mockLoadOffering).toHaveBeenCalledWith('general')
  })

  it('does not show the Play Store fallback when a free Android grant is not confirmed', async () => {
    mockLoadOffering.mockResolvedValue({
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
    mockLoadOffering.mockResolvedValue({
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

    fireEvent.press(screen.getByText('Continue to Purchase - $17.49'))

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
    mockLoadOffering.mockResolvedValue({
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
