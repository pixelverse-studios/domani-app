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
  setRevenueCatPromoRedemptionAttributes: jest.fn(),
  syncPurchasesAndRefreshCustomerInfo: jest.fn(),
  syncRevenueCatSubscriberAttributes: jest.fn(),
}))

const mockLogMetaPurchase = jest.fn()
const mockLogMetaPurchaseRestored = jest.fn()
const mockLogMetaStartTrial = jest.fn()
const mockCandidateMatchesEntitlement = jest.fn()
const mockClearMetaPurchaseCandidate = jest.fn()
const mockCreateMetaPurchaseCandidate = jest.fn()
const mockGetMetaPurchaseCandidate = jest.fn()
const mockIsMetaPurchaseCandidateExpired = jest.fn()
const mockRecordMetaPurchaseCandidateTransaction = jest.fn()

jest.mock('~/lib/metaAcquisitionEvents', () => ({
  logMetaPurchase: (...args: unknown[]) => mockLogMetaPurchase(...args),
  logMetaPurchaseRestored: (...args: unknown[]) => mockLogMetaPurchaseRestored(...args),
  logMetaStartTrial: (...args: unknown[]) => mockLogMetaStartTrial(...args),
}))

jest.mock('~/lib/metaPurchaseCandidate', () => ({
  candidateMatchesEntitlement: (...args: unknown[]) => mockCandidateMatchesEntitlement(...args),
  clearMetaPurchaseCandidate: (...args: unknown[]) => mockClearMetaPurchaseCandidate(...args),
  createMetaPurchaseCandidate: (...args: unknown[]) => mockCreateMetaPurchaseCandidate(...args),
  getMetaPurchaseCandidate: (...args: unknown[]) => mockGetMetaPurchaseCandidate(...args),
  isMetaPurchaseCandidateExpired: (...args: unknown[]) =>
    mockIsMetaPurchaseCandidateExpired(...args),
  recordMetaPurchaseCandidateTransaction: (...args: unknown[]) =>
    mockRecordMetaPurchaseCandidateTransaction(...args),
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
import Purchases from 'react-native-purchases'
import { supabase } from '~/lib/supabase'
import { useAnalytics } from '~/providers/AnalyticsProvider'
import {
  getOfferingForCohort,
  getOfferings,
  initializeRevenueCat,
  loginRevenueCat,
  presentCodeRedemptionSheet,
  purchasePackage,
  restorePurchases,
  setRevenueCatPromoRedemptionAttributes,
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
const mockUseAnalytics = useAnalytics as jest.Mock
const mockGetCustomerInfo = Purchases.getCustomerInfo as jest.Mock
const mockTrack = jest.fn()
const mockGetOfferingForCohort = getOfferingForCohort as jest.Mock
const mockGetOfferings = getOfferings as jest.Mock
const mockInitializeRevenueCat = initializeRevenueCat as jest.Mock
const mockLoginRevenueCat = loginRevenueCat as jest.Mock
const mockPresentCodeRedemptionSheet = presentCodeRedemptionSheet as jest.Mock
const mockPurchasePackage = purchasePackage as jest.Mock
const mockRestorePurchases = restorePurchases as jest.Mock
const mockSetRevenueCatPromoRedemptionAttributes =
  setRevenueCatPromoRedemptionAttributes as jest.Mock
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
  single: jest.Mock<Promise<{ data: unknown; error: unknown }>, []>
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
    single: jest.fn(() => Promise.resolve(result)),
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

function buildLifetimeCustomerInfo() {
  return buildCustomerInfo({
    'test-entitlement': {
      periodType: 'NORMAL',
      productIdentifier: 'domani_lifetime',
      originalPurchaseDate: '2026-05-20T12:00:00.000Z',
      latestPurchaseDate: '2026-05-20T12:00:00.000Z',
      expirationDate: null,
    },
  })
}

function buildPurchaseResult() {
  return {
    productIdentifier: 'domani_lifetime',
    customerInfo: buildLifetimeCustomerInfo(),
    transaction: {
      transactionIdentifier: 'transaction-1',
      productIdentifier: 'domani_lifetime',
      purchaseDate: '2026-05-20T12:00:00.000Z',
    },
  }
}

function buildPurchasesPackage() {
  return {
    identifier: 'lifetime',
    packageType: 'LIFETIME',
    product: {
      identifier: 'domani_lifetime',
      priceString: '$9.99',
      price: 9.99,
      currencyCode: 'USD',
    },
  }
}

function setupSubscriptionHookMocks() {
  mockGetCustomerInfo.mockResolvedValue(buildCustomerInfo({}))
  mockUseAnalytics.mockReturnValue({
    identify: jest.fn(),
    reset: jest.fn(),
    screen: jest.fn(),
    track: mockTrack,
  })
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
  mockPurchasePackage.mockResolvedValue(null)
  mockRestorePurchases.mockResolvedValue(null)
  mockSetRevenueCatPromoRedemptionAttributes.mockResolvedValue(undefined)
  mockSyncRevenueCatSubscriberAttributes.mockResolvedValue(undefined)
  mockLogMetaPurchase.mockResolvedValue('logged')
  mockCandidateMatchesEntitlement.mockReturnValue(true)
  mockClearMetaPurchaseCandidate.mockResolvedValue(undefined)
  mockCreateMetaPurchaseCandidate.mockResolvedValue({
    userId: 'user-1',
    productId: 'domani_lifetime',
    amount: 9.99,
    currency: 'USD',
    offer: 'default',
    startedAt: '2026-05-20T11:59:00.000Z',
    baselinePurchaseDate: null,
    transactionId: null,
    transactionPurchaseDate: null,
  })
  mockGetMetaPurchaseCandidate.mockResolvedValue(null)
  mockIsMetaPurchaseCandidateExpired.mockReturnValue(false)
  mockRecordMetaPurchaseCandidateTransaction.mockImplementation(async (candidate, transaction) => ({
    ...candidate,
    transactionId: transaction.transactionId,
    transactionPurchaseDate: transaction.purchaseDate,
  }))
  mockSupabaseFrom.mockImplementation(() =>
    createSupabaseQueryMock({
      data: {
        id: 'user-1',
        tier: 'none',
        purchased_at: null,
        refunded_at: null,
      },
      error: null,
    }),
  )
  mockSupabaseRpc.mockImplementation((functionName: string) => {
    if (functionName === 'confirm_current_user_promo_redemption') {
      return Promise.resolve({ data: { status: 'confirmed' }, error: null })
    }

    return Promise.resolve({ data: null, error: null })
  })
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

describe('subscription product analytics', () => {
  it('tracks a trial only after the profile update succeeds', async () => {
    mockSupabaseFrom.mockReturnValue(
      createSupabaseQueryMock({
        data: {
          tier: 'trialing',
          trial_started_at: '2026-08-16T12:00:00.000Z',
          trial_ends_at: '2026-08-30T12:00:00.000Z',
        },
        error: null,
      }),
    )
    const { result, unmount } = renderHookWithProviders(() => useSubscription())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    await act(async () => {
      await result.current.startTrial()
    })

    expect(mockTrack).toHaveBeenCalledWith(
      'trial_started',
      expect.objectContaining({
        offer: 'default',
        trial_expires_at: '2026-08-30T12:00:00.000Z',
      }),
    )
    expect(mockLogMetaStartTrial).toHaveBeenCalledWith({ userId: 'user-1', offer: 'default' })

    unmount()
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

  it('uses general pricing for friends-family cohort users outside promo redemption', async () => {
    mockGetOfferingForCohort.mockReturnValue('general')
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
        signup_cohort: 'friends_family',
        signup_method: null,
      },
    })

    const { result, unmount } = renderHookWithProviders(() => useSubscription())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(mockGetOfferingForCohort).toHaveBeenCalledWith('friends_family')
    expect(result.current.offeringIdentifier).toBe('general')

    unmount()
  })

  it('confirms access when RevenueCat entitlement and Supabase sync both succeed', async () => {
    mockSyncPurchasesAndRefreshCustomerInfo.mockResolvedValue(buildLifetimeCustomerInfo())

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

  it('uses the latest lifetime purchase date when syncing RevenueCat access', async () => {
    mockSyncPurchasesAndRefreshCustomerInfo.mockResolvedValue(
      buildCustomerInfo({
        'test-entitlement': {
          periodType: 'NORMAL',
          productIdentifier: 'domani_lifetime_friends',
          originalPurchaseDate: '2026-05-06T16:00:01.000Z',
          latestPurchaseDate: '2026-06-02T23:52:24.253Z',
          expirationDate: null,
        },
      }),
    )

    const { result, unmount } = renderHookWithProviders(() => useSubscription())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.syncAccess({
        source: 'promo_redemption',
        forceStoreSync: true,
        attemptContext: {
          promoCode: 'LY49',
          campaignId: 'campaign-1',
          campaignSlug: 'launch',
          campaignType: 'fixed_price_lifetime',
          codeId: 'code-1',
          redemptionAttemptId: 'attempt-1',
          discountKind: 'fixed_price',
          promoOutcome: 'discounted',
          priceString: '$4.99',
        },
      })
    })

    expect(
      mockSupabaseFrom.mock.results.some((result) => {
        const query = result.value as SupabaseQueryMock
        return query.update.mock.calls.some(([values]) => {
          const update = values as Record<string, unknown>
          return update.tier === 'lifetime' && update.purchased_at === '2026-06-02T23:52:24.253Z'
        })
      }),
    ).toBe(true)

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

  it('blocks promo access sync when no validated redemption attempt exists', async () => {
    mockSyncPurchasesAndRefreshCustomerInfo.mockResolvedValue(buildLifetimeCustomerInfo())

    const { result, unmount } = renderHookWithProviders(() => useSubscription())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    let syncResult: unknown
    await act(async () => {
      syncResult = await result.current.syncAccess({
        source: 'promo_redemption',
        forceStoreSync: true,
        attemptContext: null,
      })
    })

    expect(syncResult).toMatchObject({
      status: 'supabase_sync_failed',
      source: 'promo_redemption',
      hasEntitlement: false,
      profileSynced: false,
      recoverable: true,
    })
    expect(result.current.accessSyncPhase).toBe('verification_failed')
    expect(mockSyncPurchasesAndRefreshCustomerInfo).not.toHaveBeenCalled()

    unmount()
  })

  it('blocks manual sync of promo-gated lifetime product without a validated attempt', async () => {
    mockSyncPurchasesAndRefreshCustomerInfo.mockResolvedValue(
      buildCustomerInfo({
        'test-entitlement': {
          periodType: 'NORMAL',
          productIdentifier: 'domani_lifetime_friends',
          originalPurchaseDate: '2026-06-02T23:52:24.253Z',
          latestPurchaseDate: '2026-06-02T23:52:24.253Z',
          expirationDate: null,
        },
      }),
    )

    const { result, unmount } = renderHookWithProviders(() => useSubscription())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    let syncResult: unknown
    await act(async () => {
      syncResult = await result.current.syncAccess({ source: 'manual', forceStoreSync: true })
    })

    expect(syncResult).toMatchObject({
      status: 'supabase_sync_failed',
      source: 'manual',
      hasEntitlement: true,
      profileSynced: false,
      recoverable: true,
    })
    expect(result.current.accessSyncPhase).toBe('verification_failed')
    expect(
      mockSupabaseFrom.mock.results.some((result) => {
        const query = result.value as SupabaseQueryMock
        return query.update.mock.calls.some(([values]) => {
          const update = values as Record<string, unknown>
          return update.tier === 'lifetime'
        })
      }),
    ).toBe(false)

    unmount()
  })

  it('blocks restore of promo-gated lifetime product without a validated attempt', async () => {
    mockRestorePurchases.mockResolvedValue(
      buildCustomerInfo({
        'test-entitlement': {
          periodType: 'NORMAL',
          productIdentifier: 'domani_lifetime_friends',
          originalPurchaseDate: '2026-06-02T23:52:24.253Z',
          latestPurchaseDate: '2026-06-02T23:52:24.253Z',
          expirationDate: null,
        },
      }),
    )

    const { result, unmount } = renderHookWithProviders(() => useSubscription())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    let restoreResult: unknown
    await act(async () => {
      restoreResult = await result.current.restore()
    })

    expect(restoreResult).toBeNull()
    expect(result.current.accessSyncResult).toMatchObject({
      status: 'supabase_sync_failed',
      source: 'restore',
      hasEntitlement: true,
      profileSynced: false,
    })
    expect(result.current.accessSyncPhase).toBe('verification_failed')
    expect(mockLogMetaPurchaseRestored).not.toHaveBeenCalled()
    expect(mockLogMetaPurchase).not.toHaveBeenCalled()
    expect(
      mockSupabaseFrom.mock.results.some((result) => {
        const query = result.value as SupabaseQueryMock
        return query.update.mock.calls.some(([values]) => {
          const update = values as Record<string, unknown>
          return update.tier === 'lifetime'
        })
      }),
    ).toBe(false)

    unmount()
  })

  it('logs a verified restore without logging Purchase', async () => {
    mockRestorePurchases.mockResolvedValue(buildLifetimeCustomerInfo())

    const { result, unmount } = renderHookWithProviders(() => useSubscription())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    await act(async () => {
      await result.current.restore()
    })

    expect(mockLogMetaPurchaseRestored).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        productId: 'domani_lifetime',
      }),
    )
    expect(mockLogMetaPurchase).not.toHaveBeenCalled()

    unmount()
  })

  it('records promo sync failure analytics and audit when entitlement is missing', async () => {
    mockSyncPurchasesAndRefreshCustomerInfo.mockResolvedValue(buildCustomerInfo({}))
    const { result, unmount } = renderHookWithProviders(() => useSubscription())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.syncAccess({
        source: 'promo_redemption',
        forceStoreSync: true,
        attemptContext: {
          promoCode: 'SAVE50',
          campaignId: 'campaign-1',
          campaignSlug: 'launch',
          campaignType: 'fixed_price_lifetime',
          codeId: 'code-1',
          redemptionAttemptId: 'attempt-1',
          discountKind: 'fixed_price',
          promoOutcome: 'discounted',
          priceString: '$17.49',
        },
      })
    })

    expect(result.current.accessSyncResult).toMatchObject({
      status: 'missing_entitlement',
      hasEntitlement: false,
      profileSynced: false,
    })
    expect(mockTrack).toHaveBeenCalledWith(
      'promo_sync_failed',
      expect.objectContaining({
        campaign_id: 'campaign-1',
        campaign_type: 'fixed_price_lifetime',
        discount_kind: 'fixed_price',
        error_code: 'missing_entitlement',
        redemption_attempt_id: 'attempt-1',
        sync_status: 'missing_entitlement',
      }),
    )
    expect(mockSupabaseRpc).toHaveBeenCalledWith(
      'update_current_user_promo_redemption_attempt',
      expect.objectContaining({
        p_error_code: 'missing_entitlement',
        p_event: 'sync_failed',
        p_redemption_attempt_id: 'attempt-1',
      }),
    )

    unmount()
  })

  it('syncs after native promo code redemption is presented', async () => {
    jest.useFakeTimers()
    mockSyncPurchasesAndRefreshCustomerInfo.mockResolvedValue(buildLifetimeCustomerInfo())
    const { result, unmount } = renderHookWithProviders(() => useSubscription())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    let redemptionResult: unknown
    const redemptionPromise = result.current.redeemPromoCode({
      promoCode: 'SAVE100',
      campaignId: 'campaign-1',
      campaignSlug: 'launch',
      campaignType: 'percent_discount_lifetime',
      codeId: 'code-1',
      redemptionAttemptId: 'attempt-1',
      discountKind: 'percent',
      promoOutcome: 'discounted',
    })

    await act(async () => {
      await Promise.resolve()
    })

    expect(mockPresentCodeRedemptionSheet).toHaveBeenCalled()
    expect(mockSetRevenueCatPromoRedemptionAttributes).toHaveBeenCalledWith({
      promoCode: 'SAVE100',
      campaignId: 'campaign-1',
      campaignSlug: 'launch',
      campaignType: 'percent_discount_lifetime',
      codeId: 'code-1',
      redemptionAttemptId: 'attempt-1',
      discountKind: 'percent',
      promoOutcome: 'discounted',
    })
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
      campaignSlug: 'launch',
      campaignType: 'percent_discount_lifetime',
      codeId: 'code-1',
      redemptionAttemptId: 'attempt-1',
      discountKind: 'percent',
      promoOutcome: 'discounted',
    })
    expect(mockTrack).toHaveBeenCalledWith(
      'promo_sync_succeeded',
      expect.objectContaining({
        campaign_id: 'campaign-1',
        campaign_slug: 'launch',
        campaign_type: 'percent_discount_lifetime',
        discount_kind: 'percent',
        redemption_attempt_id: 'attempt-1',
        sync_status: 'confirmed',
      }),
    )
    expect(mockSupabaseRpc).toHaveBeenCalledWith('confirm_current_user_promo_redemption', {
      p_campaign_id: 'campaign-1',
      p_code_id: 'code-1',
      p_redemption_attempt_id: 'attempt-1',
      p_revenuecat_app_user_id: 'user-1',
      p_store_product_id: 'domani_lifetime',
      p_store_transaction_id: null,
    })
    expect(mockTrack).toHaveBeenCalledWith(
      'promo_redemption_completed',
      expect.objectContaining({
        campaign_id: 'campaign-1',
        campaign_slug: 'launch',
        campaign_type: 'percent_discount_lifetime',
        discount_kind: 'percent',
        redemption_attempt_id: 'attempt-1',
        sync_status: 'confirmed',
      }),
    )

    const completedCount = mockTrack.mock.calls.filter(
      ([eventName]) => eventName === 'promo_redemption_completed',
    ).length

    await act(async () => {
      await result.current.syncAccess({
        source: 'foreground',
        forceStoreSync: true,
        attemptContext: {
          promoCode: 'SAVE100',
          campaignId: 'campaign-1',
          campaignSlug: 'launch',
          campaignType: 'percent_discount_lifetime',
          codeId: 'code-1',
          redemptionAttemptId: 'attempt-1',
          discountKind: 'percent',
          promoOutcome: 'discounted',
        },
      })
    })

    expect(
      mockTrack.mock.calls.filter(([eventName]) => eventName === 'promo_redemption_completed')
        .length,
    ).toBe(completedCount)

    unmount()
    jest.useRealTimers()
  })

  it('does not report paid promo redemption as confirmed when attempt confirmation fails', async () => {
    mockSyncPurchasesAndRefreshCustomerInfo.mockResolvedValue(buildLifetimeCustomerInfo())
    mockSupabaseRpc.mockImplementation((functionName: string) => {
      if (functionName === 'confirm_current_user_promo_redemption') {
        return Promise.resolve({
          data: { status: 'product_mismatch' },
          error: null,
        })
      }

      return Promise.resolve({ data: null, error: null })
    })

    const { result, unmount } = renderHookWithProviders(() => useSubscription())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    let syncResult: unknown
    await act(async () => {
      syncResult = await result.current.syncAccess({
        source: 'promo_redemption',
        forceStoreSync: true,
        attemptContext: {
          promoCode: 'SAVE100',
          campaignId: 'campaign-1',
          campaignSlug: 'launch',
          campaignType: 'percent_discount_lifetime',
          codeId: 'code-1',
          redemptionAttemptId: 'attempt-1',
          discountKind: 'percent',
          promoOutcome: 'discounted',
        },
      })
    })

    expect(syncResult).toMatchObject({
      status: 'supabase_sync_failed',
      source: 'promo_redemption',
      hasEntitlement: true,
      profileSynced: false,
      recoverable: true,
    })
    expect(result.current.accessSyncPhase).toBe('verification_failed')
    expect(mockSupabaseFrom).toHaveBeenCalledWith('profiles')
    expect(
      mockSupabaseFrom.mock.results.some((result) => {
        const query = result.value as SupabaseQueryMock
        return query.update.mock.calls.some(([values]) => {
          const update = values as Record<string, unknown>
          return (
            update.tier === 'none' &&
            update.purchased_at === null &&
            update.refunded_at === null &&
            update.trial_ends_at === null &&
            update.revenuecat_user_id === null
          )
        })
      }),
    ).toBe(true)
    expect(mockTrack).toHaveBeenCalledWith(
      'promo_sync_failed',
      expect.objectContaining({
        campaign_id: 'campaign-1',
        redemption_attempt_id: 'attempt-1',
        sync_status: 'supabase_sync_failed',
      }),
    )
    expect(mockTrack).not.toHaveBeenCalledWith('promo_redemption_completed', expect.any(Object))
    expect(mockLogMetaPurchase).not.toHaveBeenCalled()

    unmount()
  })

  it('confirms free promo codes through the server without presenting native redemption', async () => {
    const { result, unmount } = renderHookWithProviders(() => useSubscription())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    let redemptionResult: unknown
    await act(async () => {
      redemptionResult = await result.current.redeemPromoCode({
        promoCode: 'GIFT03',
        campaignId: 'campaign-1',
        campaignSlug: 'private-gifts',
        campaignType: 'free_lifetime',
        codeId: 'code-1',
        redemptionAttemptId: 'attempt-1',
        discountKind: 'free',
        promoOutcome: 'free',
      })
    })

    expect(redemptionResult).toMatchObject({
      status: 'confirmed',
      source: 'promo_redemption',
      hasEntitlement: true,
      profileSynced: true,
    })
    expect(mockPresentCodeRedemptionSheet).not.toHaveBeenCalled()
    expect(mockSyncPurchasesAndRefreshCustomerInfo).not.toHaveBeenCalled()
    expect(mockSupabaseRpc).toHaveBeenCalledWith('confirm_current_user_promo_redemption', {
      p_campaign_id: 'campaign-1',
      p_code_id: 'code-1',
      p_redemption_attempt_id: 'attempt-1',
      p_revenuecat_app_user_id: null,
      p_store_product_id: null,
      p_store_transaction_id: null,
    })
    expect(result.current.accessSyncPhase).toBe('confirmed')

    unmount()
  })

  it('waits for stale promo attributes to clear before starting a normal purchase', async () => {
    let resolveAttributeClear: (() => void) | undefined
    mockSetRevenueCatPromoRedemptionAttributes.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveAttributeClear = resolve
        }),
    )
    mockPurchasePackage.mockResolvedValue(buildPurchaseResult())

    const { result, unmount } = renderHookWithProviders(() => useSubscription())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const pkg = buildPurchasesPackage()
    let purchasePromise: Promise<unknown>
    await act(async () => {
      purchasePromise = result.current.purchase(pkg as never)
      await Promise.resolve()
    })

    expect(mockSetRevenueCatPromoRedemptionAttributes).toHaveBeenCalledWith(null)
    expect(mockPurchasePackage).not.toHaveBeenCalled()

    await act(async () => {
      resolveAttributeClear?.()
      await purchasePromise
    })

    expect(mockPurchasePackage).toHaveBeenCalledWith(pkg)
    expect(mockCreateMetaPurchaseCandidate.mock.invocationCallOrder[0]).toBeLessThan(
      mockPurchasePackage.mock.invocationCallOrder[0],
    )
    expect(mockTrack).toHaveBeenCalledWith(
      'lifetime_purchase_completed',
      expect.objectContaining({
        currency: 'USD',
        price: 9.99,
        product_id: 'domani_lifetime',
      }),
    )
    expect(mockLogMetaPurchase).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        productId: 'domani_lifetime',
        amount: 9.99,
        currency: 'USD',
      }),
    )

    unmount()
  })

  it('clears a durable purchase candidate when native checkout is cancelled', async () => {
    mockPurchasePackage.mockResolvedValue(null)
    const { result, unmount } = renderHookWithProviders(() => useSubscription())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    await act(async () => {
      await result.current.purchase(buildPurchasesPackage() as never)
    })

    expect(mockCreateMetaPurchaseCandidate).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', productId: 'domani_lifetime' }),
    )
    expect(mockClearMetaPurchaseCandidate).toHaveBeenCalledWith('user-1')
    expect(mockLogMetaPurchase).not.toHaveBeenCalled()

    unmount()
  })

  it('recovers a confirmed purchase candidate after an app restart', async () => {
    const customerInfo = buildLifetimeCustomerInfo()
    mockGetCustomerInfo.mockResolvedValue(customerInfo)
    mockGetMetaPurchaseCandidate.mockResolvedValue({
      userId: 'user-1',
      productId: 'domani_lifetime',
      amount: 9.99,
      currency: 'USD',
      offer: 'default',
      startedAt: '2026-05-20T11:59:00.000Z',
      baselinePurchaseDate: null,
      transactionId: null,
      transactionPurchaseDate: null,
    })
    mockUseProfile.mockReturnValue({
      isLoading: false,
      profile: {
        id: 'user-1',
        tier: 'lifetime',
        purchased_at: '2026-05-20T12:00:00.000Z',
        refunded_at: null,
        trial_started_at: null,
        trial_ends_at: null,
        created_at: '2026-05-20T11:00:00.000Z',
        email: 'test@example.com',
        expo_push_token: null,
        full_name: 'Test User',
        signup_cohort: null,
        signup_method: null,
      },
    })
    mockSupabaseFrom.mockImplementation(() =>
      createSupabaseQueryMock({
        data: {
          id: 'user-1',
          tier: 'lifetime',
          purchased_at: '2026-05-20T12:00:00.000Z',
          refunded_at: null,
        },
        error: null,
      }),
    )

    const { unmount } = renderHookWithProviders(() => useSubscription())

    await waitFor(() => expect(mockLogMetaPurchase).toHaveBeenCalledTimes(1))
    expect(mockLogMetaPurchase).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        productId: 'domani_lifetime',
        amount: 9.99,
      }),
    )
    expect(mockClearMetaPurchaseCandidate).toHaveBeenCalledWith('user-1')

    unmount()
  })

  it('retains the purchase candidate when Meta intent persistence fails', async () => {
    mockPurchasePackage.mockResolvedValue(buildPurchaseResult())
    mockLogMetaPurchase.mockResolvedValue('error')
    const { result, unmount } = renderHookWithProviders(() => useSubscription())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    await act(async () => {
      await result.current.purchase(buildPurchasesPackage() as never)
    })

    expect(mockLogMetaPurchase).toHaveBeenCalledTimes(1)
    expect(mockClearMetaPurchaseCandidate).not.toHaveBeenCalled()

    unmount()
  })

  it('logs the acquisition when a webhook records lifetime before client sync', async () => {
    mockPurchasePackage.mockResolvedValue(buildPurchaseResult())
    mockSupabaseFrom.mockImplementation(() =>
      createSupabaseQueryMock({
        data: {
          id: 'user-1',
          tier: 'lifetime',
          purchased_at: '2026-05-20T12:00:00.000Z',
          refunded_at: null,
        },
        error: null,
      }),
    )
    const { result, unmount } = renderHookWithProviders(() => useSubscription())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    await act(async () => {
      await result.current.purchase(buildPurchasesPackage() as never)
    })

    expect(mockLogMetaPurchase).toHaveBeenCalledTimes(1)
    expect(mockClearMetaPurchaseCandidate).toHaveBeenCalledWith('user-1')

    unmount()
  })

  it('does not confirm access when the profile link update affects zero rows', async () => {
    mockSyncPurchasesAndRefreshCustomerInfo.mockResolvedValue(buildLifetimeCustomerInfo())
    let profileQueryCount = 0
    mockSupabaseFrom.mockImplementation(() => {
      profileQueryCount += 1
      return createSupabaseQueryMock(
        profileQueryCount === 1
          ? {
              data: {
                id: 'user-1',
                tier: 'none',
                purchased_at: null,
                refunded_at: null,
              },
              error: null,
            }
          : { data: null, error: null },
      )
    })

    const { result, unmount } = renderHookWithProviders(() => useSubscription())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    let syncResult: unknown
    await act(async () => {
      syncResult = await result.current.syncAccess({ source: 'manual', forceStoreSync: true })
    })

    expect(syncResult).toMatchObject({
      status: 'supabase_sync_failed',
      profileSynced: false,
    })
    expect(mockLogMetaPurchase).not.toHaveBeenCalled()

    unmount()
  })

  it('does not confirm access when the lifetime tier update affects zero rows', async () => {
    mockSyncPurchasesAndRefreshCustomerInfo.mockResolvedValue(buildLifetimeCustomerInfo())
    let profileQueryCount = 0
    mockSupabaseFrom.mockImplementation(() => {
      profileQueryCount += 1
      return createSupabaseQueryMock(
        profileQueryCount < 3
          ? {
              data: {
                id: 'user-1',
                tier: 'none',
                purchased_at: null,
                refunded_at: null,
              },
              error: null,
            }
          : { data: null, error: null },
      )
    })

    const { result, unmount } = renderHookWithProviders(() => useSubscription())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    let syncResult: unknown
    await act(async () => {
      syncResult = await result.current.syncAccess({ source: 'manual', forceStoreSync: true })
    })

    expect(syncResult).toMatchObject({
      status: 'supabase_sync_failed',
      profileSynced: false,
    })
    expect(mockSupabaseRpc).not.toHaveBeenCalledWith('clear_current_user_refund_request_state')

    unmount()
  })

  it('does not report an already-recorded lifetime owner as a new acquisition', async () => {
    mockPurchasePackage.mockResolvedValue(buildPurchaseResult())
    mockUseProfile.mockReturnValue({
      isLoading: false,
      profile: {
        id: 'user-1',
        tier: 'lifetime',
        purchased_at: '2026-05-20T12:00:00.000Z',
        refunded_at: null,
        trial_started_at: null,
        trial_ends_at: null,
        created_at: '2026-05-20T11:00:00.000Z',
        email: 'test@example.com',
        expo_push_token: null,
        full_name: 'Test User',
        signup_cohort: null,
        signup_method: null,
      },
    })
    mockSupabaseFrom.mockImplementation(() =>
      createSupabaseQueryMock({
        data: {
          tier: 'lifetime',
          purchased_at: '2026-05-20T12:00:00.000Z',
          refunded_at: null,
        },
        error: null,
      }),
    )

    const { result, unmount } = renderHookWithProviders(() => useSubscription())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    await act(async () => {
      await result.current.purchase(buildPurchasesPackage() as never)
    })

    expect(mockTrack).not.toHaveBeenCalledWith(
      'lifetime_purchase_completed',
      expect.any(Object),
    )
    expect(mockLogMetaPurchase).not.toHaveBeenCalled()

    unmount()
  })

  it('does not start a normal purchase when stale promo attributes cannot be cleared', async () => {
    mockSetRevenueCatPromoRedemptionAttributes.mockRejectedValueOnce(new Error('clear failed'))

    const { result, unmount } = renderHookWithProviders(() => useSubscription())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await expect(result.current.purchase(buildPurchasesPackage() as never)).rejects.toThrow(
      'PROMO_ATTRIBUTE_CLEAR_FAILED',
    )

    expect(mockSetRevenueCatPromoRedemptionAttributes).toHaveBeenCalledWith(null)
    expect(mockPurchasePackage).not.toHaveBeenCalled()

    unmount()
  })

  it('keeps promo attributes after a promo package purchase settles', async () => {
    mockPurchasePackage.mockResolvedValue(buildPurchaseResult())
    const { result, unmount } = renderHookWithProviders(() => useSubscription())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const attemptContext = {
      promoCode: 'SAVE50',
      campaignId: 'campaign-1',
      codeId: 'code-1',
      redemptionAttemptId: 'attempt-1',
      promoOutcome: 'discounted' as const,
      priceString: '$4.99',
    }

    await act(async () => {
      await result.current.purchase({
        pkg: buildPurchasesPackage() as never,
        attemptContext,
      })
    })

    expect(mockSetRevenueCatPromoRedemptionAttributes).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining(attemptContext),
    )
    expect(mockSetRevenueCatPromoRedemptionAttributes).not.toHaveBeenCalledWith(null)

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
        codeId: 'code-1',
        redemptionAttemptId: 'attempt-1',
        promoOutcome: 'discounted',
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
        promoOutcome: 'discounted',
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
