import React from 'react'
import { Linking, Platform } from 'react-native'

import { fireEvent, renderWithProviders, screen, waitFor } from '~/test/test-utils'
import RedeemCodeScreen from '../redeem-code'
import { supabase } from '~/lib/supabase'
import { getOfferings, setRevenueCatPromoRedemptionAttributes } from '~/lib/revenuecat'
import { useAnalytics } from '~/providers/AnalyticsProvider'

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
      availablePackages: [
        {
          packageType: 'LIFETIME',
          product: { priceString: '$34.99' },
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
  getOfferings: jest.fn(),
  setRevenueCatPromoRedemptionAttributes: jest.fn(() => Promise.resolve()),
}))

const mockSupabaseRpc = supabase.rpc as unknown as jest.Mock
const mockGetOfferings = getOfferings as jest.Mock
const mockSetRevenueCatPromoRedemptionAttributes =
  setRevenueCatPromoRedemptionAttributes as jest.Mock
const mockUseAnalytics = useAnalytics as jest.Mock
const mockTrack = jest.fn()

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
        storeAction: 'ios_offer_code_sheet',
        productId: 'domani_lifetime',
        revenueCatOfferingId: null,
        revenueCatPackageId: null,
        revenueCatEntitlementId: 'Domani Lifetime',
        fallbackUrl: 'https://apps.apple.com/redeem?ctx=offercodes&id=1234567890&code=SAVE100',
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
        storeAction: 'android_promo_code_flow',
        productId: 'domani_lifetime',
        revenueCatOfferingId: 'android_promos',
        revenueCatPackageId: null,
        revenueCatEntitlementId: 'Domani Lifetime',
        fallbackUrl: 'https://play.google.com/redeem?code=SAVE100',
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

async function validateAndFailNativeRedemption() {
  renderWithProviders(<RedeemCodeScreen />)

  fireEvent.changeText(screen.getByPlaceholderText('ENTER-CODE-HERE'), 'SAVE100')
  fireEvent.press(screen.getByLabelText('Submit code'))

  await screen.findByText('Code Accepted')

  fireEvent.press(screen.getByText('Redeem Free Access'))

  await screen.findByText(
    "We couldn't open the in-app store confirmation. Use the store fallback or try syncing if you already finished redemption.",
  )
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
  })

  afterEach(() => {
    setPlatform(originalPlatform)
  })

  it('keeps the App Store fallback visible after sync recovery does not confirm access', async () => {
    await validateAndFailNativeRedemption()

    expect(screen.getByText('Open Store')).toBeTruthy()

    fireEvent.press(screen.getByText('Sync Access'))

    await screen.findByText('Finish store confirmation, then retry sync if access does not update.')
    expect(screen.getByText('Open Store')).toBeTruthy()
  })

  it('opens the App Store fallback even when RevenueCat promo attributes fail to sync', async () => {
    mockSetRevenueCatPromoRedemptionAttributes.mockRejectedValue(new Error('attribute sync failed'))

    await validateAndFailNativeRedemption()

    fireEvent.press(screen.getByText('Open Store'))

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://apps.apple.com/redeem?ctx=offercodes&id=1234567890&code=SAVE100',
      )
    })
    expect(
      screen.getByText(
        'Finish redemption in the store, then return to Domani and sync access.',
      ),
    ).toBeTruthy()
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
  })

  afterEach(() => {
    setPlatform(originalPlatform)
  })

  it('starts the mapped Play-backed RevenueCat package for a free Android promo code', async () => {
    const promoPackage = {
      identifier: 'android_lifetime',
      packageType: 'LIFETIME',
      product: { identifier: 'domani_lifetime', priceString: '$0.00' },
    }
    mockGetOfferings.mockResolvedValue({
      availablePackages: [promoPackage],
    })

    renderWithProviders(<RedeemCodeScreen />)

    fireEvent.changeText(screen.getByPlaceholderText('ENTER-CODE-HERE'), 'SAVE100')
    fireEvent.press(screen.getByLabelText('Submit code'))

    await screen.findByText('Code Accepted')

    fireEvent.press(screen.getByText('Redeem Free Access'))

    await waitFor(() => {
      expect(mockGetOfferings).toHaveBeenCalledWith('android_promos')
      expect(mockPurchase).toHaveBeenCalledWith({
        pkg: promoPackage,
        attemptContext: {
          promoCode: 'SAVE100',
          campaignId: 'campaign-android-free',
          codeId: 'code-android-free',
          redemptionAttemptId: 'attempt-android-free',
          promoOutcome: 'free',
          priceString: null,
        },
      })
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
    expect(mockTrack).toHaveBeenCalledWith(
      'promo_store_handoff_started',
      expect.objectContaining({
        campaign_id: 'campaign-android-free',
        promo_outcome: 'free',
        source: 'revenuecat_purchase_package',
      }),
    )
    expect(Linking.openURL).not.toHaveBeenCalled()
  })

  it('shows the Play Store fallback only when the mapped Android promo package is unavailable', async () => {
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

    await screen.findByText(
      "We couldn't open the in-app store confirmation. Use the store fallback or try syncing if you already finished redemption.",
    )
    expect(mockPurchase).not.toHaveBeenCalled()
    expect(Linking.openURL).not.toHaveBeenCalled()

    fireEvent.press(screen.getByText('Open Store'))

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith('https://play.google.com/redeem?code=SAVE100')
    })
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
