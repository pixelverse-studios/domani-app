jest.mock('~/lib/revenuecat', () => ({
  ENTITLEMENT_ID: 'test-entitlement',
  getOfferingForCohort: jest.fn(),
  getOfferings: jest.fn(),
  initializeRevenueCat: jest.fn(),
  loginRevenueCat: jest.fn(),
  logoutRevenueCat: jest.fn(),
  presentCodeRedemptionSheet: jest.fn(),
  purchasePackage: jest.fn(),
  restorePurchases: jest.fn(),
  syncPurchasesAndRefreshCustomerInfo: jest.fn(),
  syncRevenueCatSubscriberAttributes: jest.fn(),
}))

const mockUseAuth = jest.fn()
const mockUseProfile = jest.fn()

jest.mock('~/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

jest.mock('~/hooks/useProfile', () => ({
  useProfile: () => mockUseProfile(),
}))

import { act, renderHookWithProviders, waitFor } from '~/test/test-utils'
import { supabase } from '~/lib/supabase'
import {
  getOfferingForCohort,
  getOfferings,
  initializeRevenueCat,
  loginRevenueCat,
  presentCodeRedemptionSheet,
  syncPurchasesAndRefreshCustomerInfo,
  syncRevenueCatSubscriberAttributes,
} from '~/lib/revenuecat'
import {
  hasFullAccess,
  isLocked,
  needsToStartTrial,
  shouldUseRevenueCatCustomerInfoForAccess,
  type SubscriptionStatus,
  useSubscription,
} from '../useSubscription'

const mockSupabaseFrom = supabase.from as unknown as jest.Mock
const mockSupabaseRpc = supabase.rpc as unknown as jest.Mock
const mockGetOfferingForCohort = getOfferingForCohort as jest.Mock
const mockGetOfferings = getOfferings as jest.Mock
const mockInitializeRevenueCat = initializeRevenueCat as jest.Mock
const mockLoginRevenueCat = loginRevenueCat as jest.Mock
const mockPresentCodeRedemptionSheet = presentCodeRedemptionSheet as jest.Mock
const mockSyncPurchasesAndRefreshCustomerInfo = syncPurchasesAndRefreshCustomerInfo as jest.Mock
const mockSyncRevenueCatSubscriberAttributes = syncRevenueCatSubscriberAttributes as jest.Mock
const revenueCatBlockingPhases = [
  'code_validated',
  'os_confirmation_attempted',
  'syncing',
  'verification_failed',
] as const

type SupabaseQueryMock = {
  select: jest.Mock<SupabaseQueryMock, [string?]>
  update: jest.Mock<SupabaseQueryMock, [unknown]>
  eq: jest.Mock<SupabaseQueryMock, [string, unknown]>
  maybeSingle: jest.Mock<Promise<{ data: unknown; error: unknown }>, []>
  then: jest.Mock<unknown, [(result: { data: unknown; error: unknown }) => unknown]>
}

function createSupabaseQueryMock(
  result: { data: unknown; error: unknown } = { data: null, error: null },
) {
  const query: SupabaseQueryMock = {
    select: jest.fn(() => query),
    update: jest.fn((_values: unknown) => query),
    eq: jest.fn((_column: string, _value: unknown) => query),
    maybeSingle: jest.fn(() => Promise.resolve(result)),
    then: jest.fn((resolve) => resolve(result)),
  }

  return query
}

function buildCustomerInfo(activeEntitlements: Record<string, unknown>) {
  return {
    originalAppUserId: 'user-1',
    entitlements: {
      active: activeEntitlements,
    },
  }
}

function setupSubscriptionHookMocks() {
  mockUseAuth.mockReturnValue({
    user: { id: 'user-1', email: 'test@example.com' },
  })
  mockUseProfile.mockReturnValue({
    isLoading: false,
    profile: {
      id: 'user-1',
      tier: 'none',
      purchased_at: null,
      refunded_at: null,
      trial_started_at: null,
      trial_ends_at: null,
      created_at: '2026-05-20T12:00:00.000Z',
      email: 'test@example.com',
      expo_push_token: null,
      full_name: 'Test User',
      signup_cohort: null,
      signup_method: null,
    },
  })
  mockGetOfferingForCohort.mockReturnValue('default')
  mockGetOfferings.mockResolvedValue(null)
  mockInitializeRevenueCat.mockResolvedValue(undefined)
  mockLoginRevenueCat.mockResolvedValue(undefined)
  mockPresentCodeRedemptionSheet.mockResolvedValue(true)
  mockSyncRevenueCatSubscriberAttributes.mockResolvedValue(undefined)
  mockSupabaseFrom.mockImplementation(() => createSupabaseQueryMock())
  mockSupabaseRpc.mockResolvedValue({ data: null, error: null })
}

beforeEach(() => {
  jest.clearAllMocks()
  setupSubscriptionHookMocks()
})

afterEach(() => {
  jest.useRealTimers()
})

describe('subscription access helpers', () => {
  it.each<SubscriptionStatus>(['expired', 'refunded'])(
    'treats %s as locked without full access',
    (status) => {
      expect(isLocked(status)).toBe(true)
      expect(hasFullAccess(status)).toBe(false)
      expect(needsToStartTrial(status)).toBe(false)
    },
  )

  it('treats pre_trial as needing trial start but not locked', () => {
    expect(needsToStartTrial('pre_trial')).toBe(true)
    expect(isLocked('pre_trial')).toBe(false)
    expect(hasFullAccess('pre_trial')).toBe(false)
  })

  it.each<SubscriptionStatus>(['beta', 'grace_period', 'lifetime', 'trialing'])(
    'grants full access for %s',
    (status) => {
      expect(hasFullAccess(status)).toBe(true)
      expect(isLocked(status)).toBe(false)
      expect(needsToStartTrial(status)).toBe(false)
    },
  )
})

describe('RevenueCat access gating', () => {
  it.each([
    'missing_entitlement',
    'non_lifetime_entitlement',
    'revenuecat_unavailable',
    'supabase_sync_failed',
  ] as const)('suppresses RevenueCat-only access after %s', (status) => {
    expect(
      shouldUseRevenueCatCustomerInfoForAccess({
        profile: { tier: 'none', purchased_at: null, refunded_at: null },
        accessSyncPhase: 'idle',
        accessSyncResult: { status },
      }),
    ).toBe(false)
  })

  revenueCatBlockingPhases.forEach((accessSyncPhase) => {
    it(`suppresses RevenueCat-only access while sync phase is ${accessSyncPhase}`, () => {
      expect(
        shouldUseRevenueCatCustomerInfoForAccess({
          profile: { tier: 'none', purchased_at: null, refunded_at: null },
          accessSyncPhase,
          accessSyncResult: null,
        }),
      ).toBe(false)
    })
  })

  it('preserves access for an already recorded active lifetime profile', () => {
    expect(
      shouldUseRevenueCatCustomerInfoForAccess({
        profile: {
          tier: 'lifetime',
          purchased_at: '2026-05-20T12:00:00.000Z',
          refunded_at: null,
        },
        accessSyncPhase: 'verification_failed',
        accessSyncResult: { status: 'supabase_sync_failed' },
      }),
    ).toBe(true)
  })

  it('suppresses access for a refunded profile even when a purchase was previously recorded', () => {
    expect(
      shouldUseRevenueCatCustomerInfoForAccess({
        profile: {
          tier: 'lifetime',
          purchased_at: '2026-05-20T12:00:00.000Z',
          refunded_at: '2026-05-21T12:00:00.000Z',
        },
        accessSyncPhase: 'idle',
        accessSyncResult: { status: 'supabase_sync_failed' },
      }),
    ).toBe(false)
  })

  it('does not suppress RevenueCat access for other sync outcomes', () => {
    expect(
      shouldUseRevenueCatCustomerInfoForAccess({
        profile: { tier: 'none', purchased_at: null, refunded_at: null },
        accessSyncPhase: 'confirmed',
        accessSyncResult: { status: 'confirmed' },
      }),
    ).toBe(true)
  })
})

describe('purchase access sync', () => {
  it('reports refunded when a stale lifetime profile also has refunded_at', async () => {
    mockUseProfile.mockReturnValue({
      isLoading: false,
      profile: {
        id: 'user-1',
        tier: 'lifetime',
        purchased_at: '2026-05-20T12:00:00.000Z',
        refunded_at: '2026-05-21T12:00:00.000Z',
        trial_started_at: null,
        trial_ends_at: null,
        created_at: '2026-05-20T12:00:00.000Z',
        email: 'test@example.com',
        expo_push_token: null,
        full_name: 'Test User',
        signup_cohort: null,
        signup_method: null,
      },
    })

    const { result, unmount } = renderHookWithProviders(() => useSubscription())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.status).toBe('refunded')

    unmount()
  })

  it('confirms access when RevenueCat entitlement and Supabase sync both succeed', async () => {
    mockSyncPurchasesAndRefreshCustomerInfo.mockResolvedValue(
      buildCustomerInfo({
        'test-entitlement': {
          periodType: 'NORMAL',
          productIdentifier: 'domani_lifetime',
          originalPurchaseDate: '2026-05-20T12:00:00.000Z',
          latestPurchaseDate: '2026-05-20T12:00:00.000Z',
          expirationDate: null,
        },
      }),
    )

    const { result, unmount } = renderHookWithProviders(() => useSubscription())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.syncAccess({ source: 'manual', forceStoreSync: true })
    })

    expect(result.current.accessSyncPhase).toBe('confirmed')
    expect(result.current.accessSyncResult).toMatchObject({
      status: 'confirmed',
      hasEntitlement: true,
      profileSynced: true,
      recoverable: false,
    })
    expect(mockSupabaseRpc).toHaveBeenCalledWith('clear_current_user_refund_request_state')

    unmount()
  })

  it('moves to verification failed when RevenueCat does not return the lifetime entitlement', async () => {
    mockSyncPurchasesAndRefreshCustomerInfo.mockResolvedValue(buildCustomerInfo({}))

    const { result, unmount } = renderHookWithProviders(() => useSubscription())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.syncAccess({ source: 'manual', forceStoreSync: true })
    })

    expect(result.current.accessSyncPhase).toBe('verification_failed')
    expect(result.current.accessSyncResult).toMatchObject({
      status: 'missing_entitlement',
      hasEntitlement: false,
      profileSynced: false,
      recoverable: true,
    })

    unmount()
  })

  it('syncs after native promo code redemption is presented', async () => {
    jest.useFakeTimers()
    mockSyncPurchasesAndRefreshCustomerInfo.mockResolvedValue(
      buildCustomerInfo({
        'test-entitlement': {
          periodType: 'NORMAL',
          productIdentifier: 'domani_lifetime',
          originalPurchaseDate: '2026-05-20T12:00:00.000Z',
          latestPurchaseDate: '2026-05-20T12:00:00.000Z',
          expirationDate: null,
        },
      }),
    )
    const { result, unmount } = renderHookWithProviders(() => useSubscription())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    let redemptionResult: unknown
    const redemptionPromise = result.current.redeemPromoCode({
      promoCode: 'SAVE100',
      campaignId: 'campaign-1',
      promoOutcome: 'free',
    })

    await act(async () => {
      await Promise.resolve()
    })

    expect(mockPresentCodeRedemptionSheet).toHaveBeenCalled()
    expect(result.current.accessSyncPhase).toBe('os_confirmation_attempted')

    await act(async () => {
      jest.advanceTimersByTime(1000)
      redemptionResult = await redemptionPromise
    })

    expect(redemptionResult).toMatchObject({ status: 'confirmed' })
    expect(result.current.accessSyncPhase).toBe('confirmed')
    expect(result.current.accessSyncAttempt).toMatchObject({
      promoCode: 'SAVE100',
      campaignId: 'campaign-1',
      promoOutcome: 'free',
    })

    jest.useRealTimers()
    unmount()
  })

  it('falls back to immediate sync when native promo redemption cannot be presented', async () => {
    mockPresentCodeRedemptionSheet.mockResolvedValue(false)
    mockSyncPurchasesAndRefreshCustomerInfo.mockResolvedValue(buildCustomerInfo({}))
    const { result, unmount } = renderHookWithProviders(() => useSubscription())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.redeemPromoCode({
        promoCode: 'SAVE100',
        campaignId: 'campaign-1',
        promoOutcome: 'free',
      })
    })

    expect(mockPresentCodeRedemptionSheet).toHaveBeenCalled()
    expect(mockSyncPurchasesAndRefreshCustomerInfo).toHaveBeenCalled()
    expect(result.current.accessSyncPhase).toBe('verification_failed')

    unmount()
  })

  it('moves to verification failed when native promo redemption presentation throws', async () => {
    const presentationError = new Error('presentation failed')
    mockPresentCodeRedemptionSheet.mockRejectedValue(presentationError)

    const { result, unmount } = renderHookWithProviders(() => useSubscription())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    let redemptionResult: unknown
    await act(async () => {
      redemptionResult = await result.current.redeemPromoCode({
        promoCode: 'SAVE100',
        campaignId: 'campaign-1',
        promoOutcome: 'free',
      })
    })

    expect(redemptionResult).toMatchObject({
      status: 'revenuecat_unavailable',
      source: 'promo_redemption',
      recoverable: true,
      error: presentationError,
    })
    expect(mockSyncPurchasesAndRefreshCustomerInfo).not.toHaveBeenCalled()
    expect(result.current.accessSyncPhase).toBe('verification_failed')
    expect(result.current.accessSyncResult).toMatchObject({
      status: 'revenuecat_unavailable',
      recoverable: true,
      error: presentationError,
    })

    unmount()
  })
})
