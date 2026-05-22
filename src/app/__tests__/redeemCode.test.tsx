import React from 'react'
import { Linking } from 'react-native'

import { fireEvent, renderWithProviders, screen, waitFor } from '~/test/test-utils'
import RedeemCodeScreen from '../redeem-code'
import { supabase } from '~/lib/supabase'
import { setRevenueCatPromoRedemptionAttributes } from '~/lib/revenuecat'

const mockBack = jest.fn()
const mockReplace = jest.fn()
const mockRedeemPromoCode = jest.fn()
const mockSyncAccess = jest.fn()
const mockRestore = jest.fn()
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
const mockSetRevenueCatPromoRedemptionAttributes =
  setRevenueCatPromoRedemptionAttributes as jest.Mock

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

async function validateAndFailNativeRedemption() {
  renderWithProviders(<RedeemCodeScreen />)

  fireEvent.changeText(screen.getByPlaceholderText('ENTER-CODE-HERE'), 'SAVE100')
  fireEvent.press(screen.getByLabelText('Submit code'))

  await screen.findByText('Code Accepted')

  fireEvent.press(screen.getByText('Redeem Free Access'))

  await screen.findByText(
    "We couldn't open Apple's in-app redemption sheet. Use the App Store fallback or try syncing if you already finished redemption.",
  )
}

describe('RedeemCodeScreen iOS promo recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks()
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
    mockSetRevenueCatPromoRedemptionAttributes.mockResolvedValue(undefined)
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
  })

  it('keeps the App Store fallback visible after sync recovery does not confirm access', async () => {
    await validateAndFailNativeRedemption()

    expect(screen.getByText('Open App Store')).toBeTruthy()

    fireEvent.press(screen.getByText('Sync Access'))

    await screen.findByText('Finish store confirmation, then retry sync if access does not update.')
    expect(screen.getByText('Open App Store')).toBeTruthy()
  })

  it('opens the App Store fallback even when RevenueCat promo attributes fail to sync', async () => {
    mockSetRevenueCatPromoRedemptionAttributes.mockRejectedValue(new Error('attribute sync failed'))

    await validateAndFailNativeRedemption()

    fireEvent.press(screen.getByText('Open App Store'))

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://apps.apple.com/redeem?ctx=offercodes&id=1234567890&code=SAVE100',
      )
    })
    expect(
      screen.getByText(
        'Finish redemption in the App Store, then return to Domani and sync access.',
      ),
    ).toBeTruthy()
  })
})
