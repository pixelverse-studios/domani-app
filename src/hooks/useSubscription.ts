import { useCallback, useEffect, useState, useRef } from 'react'
import { AppState, Platform } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases'
import { addDays, parseISO } from 'date-fns'

import { supabase } from '~/lib/supabase'
import { addBreadcrumb } from '~/lib/sentry'
import {
  buildPromoAttemptAnalyticsProps,
  recordPromoRedemptionAttemptEvent,
} from '~/lib/promoAnalytics'
import { useAuth } from '~/hooks/useAuth'
import { useProfile } from '~/hooks/useProfile'
import { useAnalytics } from '~/providers/AnalyticsProvider'
import { useAppConfig } from '~/stores/appConfigStore'
import { isBetaPhase } from '~/types/appConfig'
import type { Profile } from '~/types'
import {
  initializeRevenueCat,
  loginRevenueCat,
  logoutRevenueCat,
  syncRevenueCatSubscriberAttributes,
  getOfferings,
  getOfferingForCohort,
  purchasePackage,
  restorePurchases,
  syncPurchasesAndRefreshCustomerInfo,
  presentCodeRedemptionSheet,
  setRevenueCatPromoRedemptionAttributes,
  beginRefundRequestForActiveEntitlement,
  ENTITLEMENT_ID,
} from '~/lib/revenuecat'
import {
  RevenueCatAccountChangedError,
  isRevenueCatAccountChangedError,
  runRevenueCatUserOperation,
  transitionRevenueCatIdentity,
} from '~/lib/revenuecatCoordinator'

/**
 * Exhaustive subscription status state machine.
 *
 * - `beta`      → phase is beta; full access, short-circuits most other checks
 *                 (but `lifetime` still takes precedence — see
 *                 `computeSubscriptionState` for the exact resolution order)
 * - `grace_period` → legacy beta user in the post-beta purchase grace window;
 *                    full access with countdown messaging
 * - `lifetime`  → purchased lifetime; full access
 * - `trialing`  → trial active within window; full access
 * - `pre_trial` → never started a trial; gated at app entry, explicit user
 *                 action required to transition to `trialing`. NEVER auto-started.
 * - `expired`   → trial was used and ended with no purchase; locked
 * - `refunded`  → purchased lifetime then got refunded; locked
 *
 * Invariants:
 * - `isLocked(status) ⇔ status === 'expired' || status === 'refunded'`
 * - `pre_trial` never auto-transitions to anything without explicit user action
 * - Transitions are one-way: pre_trial → trialing → (lifetime | expired);
 *   expired → lifetime via purchase/restore only;
 *   refunded → lifetime via re-purchase/restore only
 *
 * Consumer guidance:
 * - For "can this user access the main app content?" checks, prefer the
 *   `hasFullAccess(status)` helper — it's the single source of truth used
 *   by `_layout.tsx` (tab gating) and `settings.tsx` (section gating).
 * - `isLocked(status)` and `needsToStartTrial(status)` are narrow predicates
 *   for the two specific gated states and are used by `index.tsx` to pick
 *   which gate screen to render.
 */
export type SubscriptionStatus =
  | 'beta'
  | 'grace_period'
  | 'lifetime'
  | 'trialing'
  | 'pre_trial'
  | 'expired'
  | 'refunded'

export type PurchaseAccessSyncSource =
  | 'purchase'
  | 'restore'
  | 'manual'
  | 'promo_redemption'
  | 'foreground'

export type PurchaseAccessSyncPhase =
  | 'idle'
  | 'code_validated'
  | 'os_confirmation_attempted'
  | 'syncing'
  | 'confirmed'
  | 'verification_failed'

export type PurchaseAccessSyncStatus =
  | 'confirmed'
  | 'non_lifetime_entitlement'
  | 'missing_entitlement'
  | 'supabase_sync_failed'
  | 'revenuecat_unavailable'
  | 'skipped'

export interface PurchaseAccessSyncAttemptContext {
  promoCode?: string | null
  campaignId?: string | null
  campaignSlug?: string | null
  campaignType?: string | null
  codeId?: string | null
  redemptionAttemptId?: string | null
  discountKind?: string | null
  promoOutcome?: 'free' | 'discounted' | null
  priceString?: string | null
}

export interface PurchaseAccessSyncRequest {
  source: PurchaseAccessSyncSource
  customerInfo?: CustomerInfo | null
  forceStoreSync?: boolean
  attemptContext?: PurchaseAccessSyncAttemptContext | null
}

interface PurchaseRequest {
  pkg: PurchasesPackage
  attemptContext?: PurchaseAccessSyncAttemptContext | null
}

export interface PurchaseAccessSyncResult {
  status: PurchaseAccessSyncStatus
  source: PurchaseAccessSyncSource
  customerInfo: CustomerInfo | null
  hasEntitlement: boolean
  profileSynced: boolean
  recoverable: boolean
  attemptContext: PurchaseAccessSyncAttemptContext | null
  error: unknown | null
}

interface SubscriptionState {
  status: SubscriptionStatus
  trialDaysRemaining: number | null
  trialExpirationDate: Date | null
  graceDaysRemaining: number | null
  graceExpirationDate: Date | null
}

type SupabaseSubscriptionSyncStatus = 'synced' | 'non_lifetime_entitlement'

function isSuccessfulPromoConfirmationStatus(status: unknown) {
  return status === 'confirmed' || status === 'already_confirmed'
}

function isPromoPurchaseAccessSync(request: PurchaseAccessSyncRequest) {
  return request.source === 'promo_redemption' || request.source === 'foreground'
}

const PROMO_GATED_LIFETIME_PRODUCT_IDS = new Set(['domani_lifetime_friends'])

function isPromoGatedLifetimeProduct(productIdentifier: string | null | undefined) {
  return !!productIdentifier && PROMO_GATED_LIFETIME_PRODUCT_IDS.has(productIdentifier)
}

function hasPromoRedemptionAttemptContext(attemptContext: PurchaseAccessSyncAttemptContext | null) {
  return !!(
    attemptContext?.redemptionAttemptId &&
    attemptContext.codeId &&
    attemptContext.campaignId
  )
}

async function confirmCurrentUserPromoRedemption(input: {
  attemptContext: PurchaseAccessSyncAttemptContext | null
  revenueCatAppUserId?: string | null
  storeProductId?: string | null
}) {
  const { attemptContext } = input
  if (
    !attemptContext?.redemptionAttemptId ||
    !attemptContext.codeId ||
    !attemptContext.campaignId
  ) {
    return
  }

  const { data, error } = await supabase.rpc('confirm_current_user_promo_redemption', {
    p_redemption_attempt_id: attemptContext.redemptionAttemptId,
    p_code_id: attemptContext.codeId,
    p_campaign_id: attemptContext.campaignId,
    p_revenuecat_app_user_id: input.revenueCatAppUserId ?? null,
    p_store_product_id: input.storeProductId ?? null,
    p_store_transaction_id: null,
  })

  if (error) throw error

  const status =
    data && typeof data === 'object' && !Array.isArray(data) && 'status' in data
      ? data.status
      : null

  if (!isSuccessfulPromoConfirmationStatus(status)) {
    throw new Error(`PROMO_CONFIRMATION_${typeof status === 'string' ? status : 'INVALID_RESULT'}`)
  }

  return data
}

/**
 * The user is locked out of the app. True for users whose trial has ended
 * without purchase OR whose purchase was refunded. Pre-trial users are NOT
 * locked — they are gated at the app entry but have full access to the
 * trial-start flow.
 */
export function isLocked(status: SubscriptionStatus): boolean {
  return status === 'expired' || status === 'refunded'
}

/**
 * The user needs to explicitly start their free trial before entering the app.
 * Distinct from `isLocked`: pre_trial users have never used a trial, while
 * locked users have already used theirs.
 */
export function needsToStartTrial(status: SubscriptionStatus): boolean {
  return status === 'pre_trial'
}

/**
 * The user can access the app's main content. True for beta testers,
 * lifetime purchasers, and users currently within their trial window.
 */
export function hasFullAccess(status: SubscriptionStatus): boolean {
  return (
    status === 'beta' || status === 'grace_period' || status === 'lifetime' || status === 'trialing'
  )
}

function hasActiveRecordedLifetime(
  profile: Pick<Profile, 'tier' | 'purchased_at' | 'refunded_at'> | null | undefined,
): boolean {
  const hasRecordedLifetime = profile?.tier === 'lifetime' || !!profile?.purchased_at
  return hasRecordedLifetime && !profile?.refunded_at
}

export function shouldUseRevenueCatCustomerInfoForAccess(input: {
  profile: Pick<Profile, 'tier' | 'purchased_at' | 'refunded_at'> | null | undefined
  accessSyncPhase: PurchaseAccessSyncPhase
  accessSyncResult: Pick<PurchaseAccessSyncResult, 'status'> | null | undefined
  hasPendingExternalPurchaseSync?: boolean
}): boolean {
  if (hasActiveRecordedLifetime(input.profile)) return true

  const blockingPhases: PurchaseAccessSyncPhase[] = [
    'code_validated',
    'os_confirmation_attempted',
    'syncing',
    'verification_failed',
  ]
  const blockingStatuses: PurchaseAccessSyncStatus[] = [
    'missing_entitlement',
    'non_lifetime_entitlement',
    'revenuecat_unavailable',
    'supabase_sync_failed',
  ]

  if (blockingPhases.includes(input.accessSyncPhase)) return false
  if (input.hasPendingExternalPurchaseSync) return false
  if (input.accessSyncResult && blockingStatuses.includes(input.accessSyncResult.status)) {
    return false
  }
  if (input.accessSyncResult?.status === 'confirmed') return true

  return false
}

const TRIAL_DURATION_DAYS = 14
const FALLBACK_LEGACY_BETA_SIGNUP_CUTOFF = new Date('2026-04-01T00:00:00Z')
const FALLBACK_BETA_END_DATE = new Date('2026-03-31T00:00:00Z')
const FALLBACK_BETA_GRACE_PERIOD_DAYS = 14
const PROMO_REDEMPTION_SYNC_DELAYS_MS = [1000, 3000, 7000]

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function assertAuthenticatedUser(expectedUserId: string): Promise<void> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || user?.id !== expectedUserId) throw new RevenueCatAccountChangedError()
}

/**
 * Lightweight read-only subscription status hook.
 *
 * Returns only `{ status, isLoading }` without wiring up any of the
 * heavy lifecycle side effects that `useSubscription()` owns:
 * - No RevenueCat initialization
 * - No AppState foreground listener
 * - No trial-expiry timer
 * - No mutations (startTrial, purchase, restore)
 * - No customerInfo / offerings queries
 *
 * Use this when a consumer only needs to branch on the subscription
 * status for conditional rendering (e.g. showing/hiding a beta-only
 * banner) and doesn't need any of the action methods. Prefer this
 * over `useSubscription()` for status-only reads to avoid spinning up
 * per-component AppState listeners and trial timers.
 *
 * ## Trade-offs vs useSubscription()
 *
 * This hook does NOT consult RevenueCat's `customerInfo` when
 * computing status, so for users whose entitlement exists in RC but
 * whose Supabase `profile.tier` hasn't synced yet, this hook may
 * report `pre_trial` or `expired` where the full hook would report
 * `trialing` or `lifetime`. For all other states (`beta`, DB-backed
 * `trialing`, DB-backed `lifetime`, fallthrough `pre_trial`/`expired`),
 * it returns the same value as `useSubscription().status`.
 *
 * For consumers that only need to check `status === 'beta'` — the
 * primary current use case — this is always correct, because the
 * beta branch doesn't depend on customerInfo.
 */
export function useSubscriptionStatus(): {
  status: SubscriptionStatus
  isLoading: boolean
} {
  const { profile, isLoading: profileLoading } = useProfile()
  const { phase, betaAccess } = useAppConfig()

  const { status } = computeSubscriptionState(profile, null, isBetaPhase(phase), betaAccess)

  return { status, isLoading: profileLoading }
}

export function useSubscription() {
  const { user } = useAuth()
  const { track } = useAnalytics()
  const { profile, isLoading: profileLoading } = useProfile()
  const queryClient = useQueryClient()
  const [initializedUserId, setInitializedUserId] = useState<string | null>(null)
  const [revenueCatAttributeSyncRetryToken, setRevenueCatAttributeSyncRetryToken] = useState(0)
  const previousRevenueCatAttributeSignatureRef = useRef<string | null>(null)
  const revenueCatAttributeRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previousAndroidMonetizationBreadcrumbRef = useRef<string | null>(null)
  const pendingExternalPurchaseSyncRef = useRef<PurchaseAccessSyncRequest | null>(null)
  const previousConfirmedAccessSyncSignatureRef = useRef<string | null>(null)
  const [accessSyncPhase, setAccessSyncPhase] = useState<PurchaseAccessSyncPhase>('idle')
  const [accessSyncResult, setAccessSyncResult] = useState<PurchaseAccessSyncResult | null>(null)
  const [accessSyncAttempt, setAccessSyncAttempt] =
    useState<PurchaseAccessSyncAttemptContext | null>(null)
  // Tracks whether a trial-start mutation is currently in flight so that
  // unrelated profile-invalidation triggers (e.g. the AppState foreground
  // listener) don't race the optimistic update and overwrite it with stale
  // pre-mutation data.
  const isStartTrialPendingRef = useRef(false)
  const { phase, betaAccess } = useAppConfig()

  // Check if we're in beta (skip RevenueCat entirely during beta)
  const isBeta = isBetaPhase(phase)
  const shouldBypassRevenueCat = isBeta
  const isInitialized = !!user?.id && (shouldBypassRevenueCat || initializedUserId === user.id)

  // Initialize RevenueCat when user changes (skip during beta)
  useEffect(() => {
    let isMounted = true
    const currentUserId = user?.id

    setInitializedUserId(null)
    pendingExternalPurchaseSyncRef.current = null
    previousConfirmedAccessSyncSignatureRef.current = null
    isStartTrialPendingRef.current = false
    setAccessSyncPhase('idle')
    setAccessSyncResult(null)
    setAccessSyncAttempt(null)

    previousRevenueCatAttributeSignatureRef.current = null
    previousAndroidMonetizationBreadcrumbRef.current = null
    setRevenueCatAttributeSyncRetryToken(0)
    if (revenueCatAttributeRetryTimeoutRef.current) {
      clearTimeout(revenueCatAttributeRetryTimeoutRef.current)
      revenueCatAttributeRetryTimeoutRef.current = null
    }

    // During beta, skip RevenueCat entirely.
    if (shouldBypassRevenueCat) {
      if (currentUserId) setInitializedUserId(currentUserId)
      return () => {
        isMounted = false
      }
    }

    void transitionRevenueCatIdentity(currentUserId ?? null, async () => {
      if (!currentUserId) {
        if (await Purchases.isConfigured()) await logoutRevenueCat()
        return
      }

      if (await Purchases.isConfigured()) {
        await loginRevenueCat(currentUserId)
      } else {
        await initializeRevenueCat(currentUserId)
      }
    })
      .then((applied) => {
        if (applied && isMounted && currentUserId) setInitializedUserId(currentUserId)
      })
      .catch((error) => {
        // Let the screen finish loading, but leave the coordinator without an
        // active identity so every account-sensitive SDK operation fails closed.
        console.warn('[useSubscription] RevenueCat identity transition failed:', error)
        if (isMounted && currentUserId) setInitializedUserId(currentUserId)
      })

    return () => {
      isMounted = false
    }
  }, [user?.id, shouldBypassRevenueCat])

  useEffect(() => {
    return () => {
      if (revenueCatAttributeRetryTimeoutRef.current) {
        clearTimeout(revenueCatAttributeRetryTimeoutRef.current)
        revenueCatAttributeRetryTimeoutRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!user?.id || !isInitialized || shouldBypassRevenueCat || !profile) return

    const attributeSignature = JSON.stringify({
      email: user.email ?? null,
      displayName: profile.full_name ?? null,
      pushToken: profile.expo_push_token ?? null,
      signupCohort: profile.signup_cohort ?? null,
      signupMethod: profile.signup_method ?? null,
    })

    if (previousRevenueCatAttributeSignatureRef.current === attributeSignature) return

    previousRevenueCatAttributeSignatureRef.current = attributeSignature

    runRevenueCatUserOperation(user.id, () =>
      syncRevenueCatSubscriberAttributes({
        email: user.email ?? null,
        displayName: profile.full_name ?? null,
        pushToken: profile.expo_push_token ?? null,
        signupCohort: profile.signup_cohort ?? null,
        signupMethod: profile.signup_method ?? null,
      }),
    ).catch((error) => {
      if (isRevenueCatAccountChangedError(error)) return
      previousRevenueCatAttributeSignatureRef.current = null
      console.warn('[useSubscription] Failed to sync RevenueCat subscriber attributes', {
        userId: user.id,
        error,
      })

      if (!revenueCatAttributeRetryTimeoutRef.current) {
        revenueCatAttributeRetryTimeoutRef.current = setTimeout(() => {
          revenueCatAttributeRetryTimeoutRef.current = null
          setRevenueCatAttributeSyncRetryToken((value) => value + 1)
        }, 5000)
      }
    })
  }, [
    isInitialized,
    shouldBypassRevenueCat,
    user?.email,
    user?.id,
    profile?.expo_push_token,
    profile?.full_name,
    profile?.signup_cohort,
    profile?.signup_method,
    revenueCatAttributeSyncRetryToken,
  ])

  // Query for RevenueCat customer info (disabled during beta)
  const {
    data: customerInfo,
    isLoading: isLoadingCustomerInfo,
    refetch: refetchCustomerInfo,
  } = useQuery({
    queryKey: ['customerInfo', user?.id],
    queryFn: async () => {
      if (!isInitialized || shouldBypassRevenueCat) return null
      try {
        const info = await runRevenueCatUserOperation(user!.id, () => Purchases.getCustomerInfo())
        console.log('[useSubscription] Loaded RevenueCat customer info', {
          userId: user?.id ?? null,
          originalAppUserId: info.originalAppUserId,
          activeEntitlementIds: Object.keys(info.entitlements.active ?? {}),
        })
        return info
      } catch (error) {
        // RevenueCat might not be configured - return null gracefully
        console.warn('[useSubscription] Failed to get customer info:', error)
        return null
      }
    },
    enabled: isInitialized && !!user?.id && !shouldBypassRevenueCat,
    retry: false, // Don't retry if RevenueCat is not configured
  })

  const shouldUseRevenueCatForAccess = shouldUseRevenueCatCustomerInfoForAccess({
    profile,
    accessSyncPhase,
    accessSyncResult,
    hasPendingExternalPurchaseSync: !!pendingExternalPurchaseSyncRef.current,
  })
  const effectiveCustomerInfo =
    shouldBypassRevenueCat || !shouldUseRevenueCatForAccess ? null : customerInfo

  // Get the cohort-specific offering identifier
  const offeringIdentifier = getOfferingForCohort(profile?.signup_cohort)

  // Query for offerings (available products) - disabled during beta
  // Uses cohort-specific offering based on user's signup_cohort
  const { data: offerings, isLoading: isLoadingOfferings } = useQuery({
    queryKey: ['offerings', offeringIdentifier],
    queryFn: () => runRevenueCatUserOperation(user!.id, () => getOfferings(offeringIdentifier)),
    enabled: isInitialized && !shouldBypassRevenueCat && !!profile,
    retry: false, // Don't retry if RevenueCat is not configured
  })

  // Compute subscription state. Beta phase short-circuits everything else;
  // see computeSubscriptionState for the full state machine.
  const subscriptionState: SubscriptionState = computeSubscriptionState(
    profile,
    effectiveCustomerInfo,
    isBeta,
    betaAccess,
  )
  const activeRevenueCatEntitlement = effectiveCustomerInfo?.entitlements.active[ENTITLEMENT_ID]
  const hasActiveRevenueCatEntitlement = !!activeRevenueCatEntitlement
  const canRequestIosRefund = Platform.OS === 'ios' && hasActiveRevenueCatEntitlement
  const canRequestAndroidRefund =
    Platform.OS === 'android' && activeRevenueCatEntitlement?.store === 'PLAY_STORE'
  const canRedeemPromoCode = Platform.OS === 'ios' || Platform.OS === 'android'

  const runCurrentUserRevenueCatOperation = useCallback(
    async <T>(operation: () => Promise<T>): Promise<T> => {
      if (!user?.id || shouldBypassRevenueCat || !isInitialized) {
        throw new RevenueCatAccountChangedError()
      }

      const expectedUserId = user.id
      await assertAuthenticatedUser(expectedUserId)
      const result = await runRevenueCatUserOperation(expectedUserId, operation)
      await assertAuthenticatedUser(expectedUserId)
      return result
    },
    [isInitialized, shouldBypassRevenueCat, user?.id],
  )

  const loadOffering = useCallback(
    (identifier?: string) => runCurrentUserRevenueCatOperation(() => getOfferings(identifier)),
    [runCurrentUserRevenueCatOperation],
  )

  const syncPromoRedemptionAttributes = useCallback(
    (attemptContext: PurchaseAccessSyncAttemptContext | null) =>
      runCurrentUserRevenueCatOperation(() =>
        setRevenueCatPromoRedemptionAttributes(attemptContext),
      ),
    [runCurrentUserRevenueCatOperation],
  )

  const requestRefundForActiveEntitlement = useCallback(
    () => runCurrentUserRevenueCatOperation(() => beginRefundRequestForActiveEntitlement()),
    [runCurrentUserRevenueCatOperation],
  )

  const markPromoCodeValidated = useCallback((context?: PurchaseAccessSyncAttemptContext) => {
    const nextContext = context ?? null
    setAccessSyncAttempt(nextContext)
    setAccessSyncResult(null)
    setAccessSyncPhase('code_validated')
  }, [])

  const markExternalPurchaseAttempted = useCallback(
    (request?: Partial<PurchaseAccessSyncRequest>) => {
      const nextContext = request?.attemptContext ?? null
      const nextRequest: PurchaseAccessSyncRequest = {
        source: request?.source ?? 'promo_redemption',
        customerInfo: request?.customerInfo,
        forceStoreSync: request?.forceStoreSync ?? true,
        attemptContext: nextContext,
      }

      pendingExternalPurchaseSyncRef.current = nextRequest
      setAccessSyncAttempt(nextContext)
      setAccessSyncResult(null)
      setAccessSyncPhase('os_confirmation_attempted')
      addBreadcrumb('Marked external purchase confirmation attempt', 'monetization.sync', {
        userId: user?.id ?? null,
        source: nextRequest.source,
        campaignId: nextContext?.campaignId ?? null,
        promoOutcome: nextContext?.promoOutcome ?? null,
      })
    },
    [user?.id],
  )

  const recordPromoSyncFailure = useCallback(
    async (
      request: PurchaseAccessSyncRequest,
      status: PurchaseAccessSyncStatus | SupabaseSubscriptionSyncStatus,
      error?: unknown,
    ) => {
      const attemptContext = request.attemptContext ?? null
      if (!attemptContext?.redemptionAttemptId) return

      const errorCode = String(status)

      track('promo_sync_failed', {
        ...buildPromoAttemptAnalyticsProps(attemptContext),
        source: request.source,
        sync_status: errorCode,
        error_code: error instanceof Error ? error.message : errorCode,
      })

      await recordPromoRedemptionAttemptEvent({
        redemptionAttemptId: attemptContext.redemptionAttemptId,
        event: 'sync_failed',
        errorCode,
        errorMessage: error instanceof Error ? error.message : null,
        metadata: {
          source: request.source,
          platform: Platform.OS,
          status: errorCode,
        },
      })
    },
    [track],
  )

  const syncExternalPurchaseAccess = useCallback(
    async (request: PurchaseAccessSyncRequest): Promise<PurchaseAccessSyncResult> => {
      const attemptContext = request.attemptContext ?? null
      const baseResult = {
        source: request.source,
        customerInfo: null,
        hasEntitlement: false,
        profileSynced: false,
        recoverable: true,
        attemptContext,
      }

      if (!user?.id || shouldBypassRevenueCat || !isInitialized) {
        const result: PurchaseAccessSyncResult = {
          ...baseResult,
          status: 'skipped',
          recoverable: false,
          error: null,
        }
        setAccessSyncResult(result)
        setAccessSyncPhase('idle')
        addBreadcrumb('Skipped purchase access sync', 'monetization.sync', {
          userId: user?.id ?? null,
          source: request.source,
          shouldBypassRevenueCat,
          revenueCatInitialized: isInitialized,
        })
        return result
      }

      const expectedUserId = user.id
      await assertAuthenticatedUser(expectedUserId)

      setAccessSyncAttempt(attemptContext)
      setAccessSyncResult(null)
      setAccessSyncPhase('syncing')

      addBreadcrumb('Started purchase access sync', 'monetization.sync', {
        userId: expectedUserId,
        source: request.source,
        forceStoreSync: request.forceStoreSync ?? null,
        hasProvidedCustomerInfo: !!request.customerInfo,
        campaignId: attemptContext?.campaignId ?? null,
        promoOutcome: attemptContext?.promoOutcome ?? null,
      })

      if (isPromoPurchaseAccessSync(request) && !hasPromoRedemptionAttemptContext(attemptContext)) {
        const result: PurchaseAccessSyncResult = {
          ...baseResult,
          status: 'supabase_sync_failed',
          recoverable: true,
          error: new Error('PROMO_ATTEMPT_CONTEXT_REQUIRED'),
        }
        setAccessSyncResult(result)
        setAccessSyncPhase('verification_failed')
        addBreadcrumb('Blocked promo access sync without validated attempt', 'promo.confirmation', {
          userId: user.id,
          source: request.source,
          hasRedemptionAttemptId: !!attemptContext?.redemptionAttemptId,
          hasCodeId: !!attemptContext?.codeId,
          hasCampaignId: !!attemptContext?.campaignId,
        })
        return result
      }

      let info: CustomerInfo | null = null

      try {
        if (request.customerInfo) {
          info = request.customerInfo
        } else if (request.forceStoreSync) {
          info = await runRevenueCatUserOperation(expectedUserId, () =>
            syncPurchasesAndRefreshCustomerInfo(),
          )
        } else {
          info = await runRevenueCatUserOperation(expectedUserId, () => Purchases.getCustomerInfo())
        }
        await assertAuthenticatedUser(expectedUserId)
      } catch (error) {
        if (isRevenueCatAccountChangedError(error)) throw error
        const result: PurchaseAccessSyncResult = {
          ...baseResult,
          status: 'revenuecat_unavailable',
          error,
        }
        setAccessSyncResult(result)
        setAccessSyncPhase('verification_failed')
        addBreadcrumb('Purchase access sync could not refresh RevenueCat', 'monetization.sync', {
          userId: user.id,
          source: request.source,
          error: error instanceof Error ? error.message : String(error),
        })
        await recordPromoSyncFailure(request, result.status, error)
        return result
      }

      const entitlement = info.entitlements.active[ENTITLEMENT_ID]
      if (!entitlement) {
        const result: PurchaseAccessSyncResult = {
          ...baseResult,
          status: 'missing_entitlement',
          customerInfo: info,
          error: null,
        }
        setAccessSyncResult(result)
        setAccessSyncPhase('verification_failed')
        addBreadcrumb('Purchase access sync found no active entitlement', 'monetization.sync', {
          userId: user.id,
          source: request.source,
          entitlementId: ENTITLEMENT_ID,
          activeEntitlementIds: Object.keys(info.entitlements.active ?? {}),
        })
        refetchCustomerInfo()
        queryClient.invalidateQueries({ queryKey: ['profile', user.id] })
        await recordPromoSyncFailure(request, result.status)
        return result
      }

      if (
        isPromoGatedLifetimeProduct(entitlement.productIdentifier) &&
        !hasPromoRedemptionAttemptContext(attemptContext)
      ) {
        const result: PurchaseAccessSyncResult = {
          ...baseResult,
          status: 'supabase_sync_failed',
          customerInfo: info,
          hasEntitlement: true,
          profileSynced: false,
          recoverable: true,
          error: new Error('PROMO_GATED_PRODUCT_ATTEMPT_CONTEXT_REQUIRED'),
        }
        setAccessSyncResult(result)
        setAccessSyncPhase('verification_failed')
        addBreadcrumb(
          'Blocked promo-gated product sync without validated attempt',
          'promo.confirmation',
          {
            userId: user.id,
            source: request.source,
            entitlementId: ENTITLEMENT_ID,
            productIdentifier: entitlement.productIdentifier ?? null,
            hasRedemptionAttemptId: !!attemptContext?.redemptionAttemptId,
            hasCodeId: !!attemptContext?.codeId,
            hasCampaignId: !!attemptContext?.campaignId,
          },
        )
        await recordPromoSyncFailure(request, result.status, result.error)
        refetchCustomerInfo()
        queryClient.invalidateQueries({ queryKey: ['profile', user.id] })
        return result
      }

      let supabaseSyncStatus: SupabaseSubscriptionSyncStatus
      try {
        await assertAuthenticatedUser(expectedUserId)
        supabaseSyncStatus = await syncSubscriptionToSupabase(expectedUserId, attemptContext)
        await assertAuthenticatedUser(expectedUserId)
      } catch (error) {
        if (isRevenueCatAccountChangedError(error)) throw error
        const result: PurchaseAccessSyncResult = {
          ...baseResult,
          status: 'supabase_sync_failed',
          customerInfo: info,
          hasEntitlement: true,
          error,
        }
        setAccessSyncResult(result)
        setAccessSyncPhase('verification_failed')
        addBreadcrumb('Purchase access sync failed to update Supabase', 'monetization.sync', {
          userId: user.id,
          source: request.source,
          entitlementId: ENTITLEMENT_ID,
          productIdentifier: entitlement.productIdentifier ?? null,
          error: error instanceof Error ? error.message : String(error),
        })
        refetchCustomerInfo()
        queryClient.invalidateQueries({ queryKey: ['profile', user.id] })
        await recordPromoSyncFailure(request, result.status, error)
        return result
      }

      if (supabaseSyncStatus !== 'synced') {
        const result: PurchaseAccessSyncResult = {
          ...baseResult,
          status: supabaseSyncStatus,
          customerInfo: info,
          hasEntitlement: true,
          profileSynced: false,
          recoverable: true,
          error: null,
        }

        setAccessSyncResult(result)
        setAccessSyncPhase('verification_failed')
        addBreadcrumb('Purchase access sync did not apply lifetime tier', 'monetization.sync', {
          userId: user.id,
          source: request.source,
          status: supabaseSyncStatus,
          entitlementId: ENTITLEMENT_ID,
          productIdentifier: entitlement.productIdentifier ?? null,
          periodType: entitlement.periodType ?? null,
        })
        refetchCustomerInfo()
        queryClient.invalidateQueries({ queryKey: ['profile', user.id] })
        await recordPromoSyncFailure(request, supabaseSyncStatus)
        return result
      }

      const result: PurchaseAccessSyncResult = {
        ...baseResult,
        status: 'confirmed',
        customerInfo: info,
        hasEntitlement: true,
        profileSynced: true,
        recoverable: false,
        error: null,
      }
      const successSignature = JSON.stringify({
        userId: user.id,
        entitlementId: ENTITLEMENT_ID,
        productIdentifier: entitlement.productIdentifier ?? null,
        originalPurchaseDate: entitlement.originalPurchaseDate ?? null,
        redemptionAttemptId: attemptContext?.redemptionAttemptId ?? null,
        campaignId: attemptContext?.campaignId ?? null,
      })

      if (previousConfirmedAccessSyncSignatureRef.current !== successSignature) {
        previousConfirmedAccessSyncSignatureRef.current = successSignature
        if (attemptContext?.redemptionAttemptId) {
          const promoProps = {
            ...buildPromoAttemptAnalyticsProps(attemptContext),
            source: request.source,
            sync_status: 'confirmed',
          }
          track('promo_sync_succeeded', promoProps)
          track('promo_redemption_completed', promoProps)
          await recordPromoRedemptionAttemptEvent({
            redemptionAttemptId: attemptContext.redemptionAttemptId,
            event: 'sync_succeeded',
            metadata: {
              source: request.source,
              platform: Platform.OS,
              entitlementId: ENTITLEMENT_ID,
              productIdentifier: entitlement.productIdentifier ?? null,
            },
          })
          await recordPromoRedemptionAttemptEvent({
            redemptionAttemptId: attemptContext.redemptionAttemptId,
            event: 'redemption_completed',
            metadata: {
              source: request.source,
              platform: Platform.OS,
              entitlementId: ENTITLEMENT_ID,
              productIdentifier: entitlement.productIdentifier ?? null,
            },
          })
        }
        addBreadcrumb('Purchase access sync confirmed entitlement', 'monetization.sync', {
          userId: user.id,
          source: request.source,
          entitlementId: ENTITLEMENT_ID,
          productIdentifier: entitlement.productIdentifier ?? null,
          periodType: entitlement.periodType ?? null,
          campaignId: attemptContext?.campaignId ?? null,
        })
      }

      await assertAuthenticatedUser(expectedUserId)

      pendingExternalPurchaseSyncRef.current = null
      setAccessSyncResult(result)
      setAccessSyncPhase('confirmed')
      refetchCustomerInfo()
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] })
      return result
    },
    [
      isInitialized,
      profile?.purchased_at,
      profile?.refunded_at,
      profile?.tier,
      queryClient,
      recordPromoSyncFailure,
      refetchCustomerInfo,
      shouldBypassRevenueCat,
      track,
      user?.id,
    ],
  )

  const syncAccessMutation = useMutation({
    mutationFn: (request?: Partial<PurchaseAccessSyncRequest>) =>
      syncExternalPurchaseAccess({
        source: request?.source ?? 'manual',
        customerInfo: request?.customerInfo,
        forceStoreSync: request?.forceStoreSync ?? true,
        attemptContext: request?.attemptContext ?? accessSyncAttempt,
      }),
  })

  const redeemPromoCodeMutation = useMutation({
    mutationFn: async (context?: PurchaseAccessSyncAttemptContext) => {
      if (!user?.id) throw new Error('Not authenticated')
      const expectedUserId = user.id
      await assertAuthenticatedUser(expectedUserId)

      const attemptContext = context ?? null
      markPromoCodeValidated(context)

      if (attemptContext?.promoOutcome === 'free') {
        try {
          await assertAuthenticatedUser(expectedUserId)
          await confirmCurrentUserPromoRedemption({
            attemptContext,
            revenueCatAppUserId: null,
            storeProductId: null,
          })
          await assertAuthenticatedUser(expectedUserId)

          const result: PurchaseAccessSyncResult = {
            status: 'confirmed',
            source: 'promo_redemption',
            customerInfo: null,
            hasEntitlement: true,
            profileSynced: true,
            recoverable: false,
            attemptContext,
            error: null,
          }

          pendingExternalPurchaseSyncRef.current = null
          setAccessSyncAttempt(attemptContext)
          setAccessSyncResult(result)
          setAccessSyncPhase('confirmed')
          queryClient.invalidateQueries({ queryKey: ['profile', user?.id] })
          return result
        } catch (error) {
          if (isRevenueCatAccountChangedError(error)) throw error
          const result: PurchaseAccessSyncResult = {
            status: 'supabase_sync_failed',
            source: 'promo_redemption',
            customerInfo: null,
            hasEntitlement: false,
            profileSynced: false,
            recoverable: true,
            attemptContext,
            error,
          }

          pendingExternalPurchaseSyncRef.current = null
          setAccessSyncAttempt(attemptContext)
          setAccessSyncResult(result)
          setAccessSyncPhase('verification_failed')
          addBreadcrumb('Free promo code server grant failed', 'monetization.sync', {
            userId: user?.id ?? null,
            campaignId: attemptContext?.campaignId ?? null,
            redemptionAttemptId: attemptContext?.redemptionAttemptId ?? null,
            error: error instanceof Error ? error.message : String(error),
          })
          return result
        }
      }

      await runRevenueCatUserOperation(expectedUserId, () =>
        setRevenueCatPromoRedemptionAttributes(attemptContext),
      )
      await assertAuthenticatedUser(expectedUserId)

      let wasPresented = false
      try {
        wasPresented = await runRevenueCatUserOperation(expectedUserId, () =>
          presentCodeRedemptionSheet(),
        )
        await assertAuthenticatedUser(expectedUserId)
      } catch (error) {
        if (isRevenueCatAccountChangedError(error)) throw error
        const result: PurchaseAccessSyncResult = {
          status: 'revenuecat_unavailable',
          source: 'promo_redemption',
          customerInfo: null,
          hasEntitlement: false,
          profileSynced: false,
          recoverable: true,
          attemptContext,
          error,
        }

        pendingExternalPurchaseSyncRef.current = null
        setAccessSyncAttempt(attemptContext)
        setAccessSyncResult(result)
        setAccessSyncPhase('verification_failed')
        addBreadcrumb('Promo code redemption sheet could not be presented', 'monetization.sync', {
          userId: user?.id ?? null,
          platform: Platform.OS,
          campaignId: attemptContext?.campaignId ?? null,
          promoOutcome: attemptContext?.promoOutcome ?? null,
          error: error instanceof Error ? error.message : String(error),
        })
        return result
      }

      markExternalPurchaseAttempted({
        source: 'promo_redemption',
        forceStoreSync: true,
        attemptContext,
      })

      if (!wasPresented) {
        return syncExternalPurchaseAccess({
          source: 'promo_redemption',
          forceStoreSync: true,
          attemptContext,
        })
      }

      let latestResult: PurchaseAccessSyncResult | null = null
      for (const delayMs of PROMO_REDEMPTION_SYNC_DELAYS_MS) {
        await wait(delayMs)
        await assertAuthenticatedUser(expectedUserId)
        latestResult = await syncExternalPurchaseAccess({
          source: 'promo_redemption',
          forceStoreSync: true,
          attemptContext,
        })
        if (latestResult.status === 'confirmed') return latestResult
      }

      return latestResult
    },
  })

  useEffect(() => {
    if (Platform.OS !== 'android' || !user?.id) return

    const breadcrumbSignature = JSON.stringify({
      userId: user.id,
      subscriptionStatus: subscriptionState.status,
      offeringIdentifier,
      revenueCatInitialized: isInitialized,
      shouldBypassRevenueCat,
      hasCustomerInfo: !!effectiveCustomerInfo,
      activeEntitlementId: activeRevenueCatEntitlement ? ENTITLEMENT_ID : null,
      activeEntitlementStore: activeRevenueCatEntitlement?.store ?? null,
      activeProductIdentifier: activeRevenueCatEntitlement?.productIdentifier ?? null,
      canRequestAndroidRefund,
      refundedAt: profile?.refunded_at ?? null,
      purchasedAt: profile?.purchased_at ?? null,
      signupCohort: profile?.signup_cohort ?? null,
    })

    if (previousAndroidMonetizationBreadcrumbRef.current === breadcrumbSignature) return
    previousAndroidMonetizationBreadcrumbRef.current = breadcrumbSignature

    addBreadcrumb('Resolved Android monetization state', 'monetization.android', {
      userId: user.id,
      subscriptionStatus: subscriptionState.status,
      offeringIdentifier,
      revenueCatInitialized: isInitialized,
      shouldBypassRevenueCat,
      hasCustomerInfo: !!effectiveCustomerInfo,
      activeEntitlementId: activeRevenueCatEntitlement ? ENTITLEMENT_ID : null,
      activeEntitlementStore: activeRevenueCatEntitlement?.store ?? null,
      activeProductIdentifier: activeRevenueCatEntitlement?.productIdentifier ?? null,
      canRequestAndroidRefund,
      refundedAt: profile?.refunded_at ?? null,
      purchasedAt: profile?.purchased_at ?? null,
      signupCohort: profile?.signup_cohort ?? null,
    })
  }, [
    activeRevenueCatEntitlement,
    canRequestAndroidRefund,
    effectiveCustomerInfo,
    isInitialized,
    offeringIdentifier,
    profile?.purchased_at,
    profile?.refunded_at,
    profile?.signup_cohort,
    shouldBypassRevenueCat,
    subscriptionState.status,
    user?.id,
  ])

  // Stable primitive for the effect dep array — avoids timer churn from Date object identity.
  const trialExpiresAt = subscriptionState.trialExpirationDate?.getTime() ?? null

  // Auto-lock when trial expires mid-session: schedule a profile refetch at the
  // exact expiration time so computeSubscriptionState re-evaluates with a fresh Date.
  useEffect(() => {
    if (subscriptionState.status !== 'trialing' || trialExpiresAt === null) return

    const msUntilExpiry = trialExpiresAt - Date.now()

    // Already expired but profile still shows trialing (e.g. cold launch after expiry) —
    // force an immediate refresh so the locked state renders without waiting for AppState.
    if (msUntilExpiry <= 0) {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] })
      return
    }

    // setTimeout overflows for delays > ~24.85 days (2^31-1 ms); clamp to avoid
    // silent immediate fire. The AppState listener covers the remaining window.
    const MAX_SAFE_TIMEOUT_MS = 2_147_483_647
    const timer = setTimeout(
      () => {
        queryClient.invalidateQueries({ queryKey: ['profile', user?.id] })
      },
      Math.min(msUntilExpiry, MAX_SAFE_TIMEOUT_MS),
    )

    return () => clearTimeout(timer)
  }, [subscriptionState.status, trialExpiresAt, queryClient, user?.id])

  // Re-check subscription state when app returns from background (handles trial
  // expiry while app was backgrounded or device was asleep). Uses a wasBackground
  // flag because iOS inserts an `inactive` hop (background → inactive → active),
  // so a direct previousState === 'background' check would never match.
  useEffect(() => {
    if (!user?.id) return

    let wasInactive = AppState.currentState !== 'active'

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        wasInactive = true
      } else if (wasInactive) {
        wasInactive = false
        // Don't invalidate while a trial-start mutation is in flight —
        // doing so would race the optimistic cache update and could
        // overwrite the optimistic trialing state with a stale refetch
        // completing before the DB write commits.
        if (isStartTrialPendingRef.current) return
        const pendingExternalSync = pendingExternalPurchaseSyncRef.current
        if (pendingExternalSync) {
          track('promo_app_returned', {
            ...buildPromoAttemptAnalyticsProps(pendingExternalSync.attemptContext),
            source: pendingExternalSync.source,
          })
          recordPromoRedemptionAttemptEvent({
            redemptionAttemptId: pendingExternalSync.attemptContext?.redemptionAttemptId,
            event: 'app_returned',
            metadata: {
              source: pendingExternalSync.source,
              platform: Platform.OS,
            },
          }).catch((error) => {
            console.warn('[useSubscription] Failed to record promo app return', {
              userId: user.id,
              error,
            })
          })
          syncExternalPurchaseAccess({
            ...pendingExternalSync,
            source: 'foreground',
            forceStoreSync: true,
          }).catch((error) => {
            console.warn('[useSubscription] Foreground purchase access sync failed', {
              userId: user.id,
              error,
            })
          })
          return
        }
        queryClient.invalidateQueries({ queryKey: ['profile', user.id] })
      }
    })

    return () => subscription.remove()
  }, [queryClient, syncExternalPurchaseAccess, track, user?.id])

  // Start the app-managed trial through the authenticated atomic server RPC.
  //
  // Uses an optimistic cache update so the transition from pre_trial →
  // trialing is instantaneous. Without the optimistic update there's a
  // brief window between the DB write succeeding and React Query refetching
  // the profile, during which the stale cache still reports tier='none'
  // and the PreTrialScreen flashes back into view for one render cycle.
  const startTrialMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated')
      if (profile?.purchased_at) {
        console.warn('[useSubscription] Blocking trial start for user with recorded purchase', {
          userId: user.id,
          purchasedAt: profile.purchased_at,
          tier: profile.tier,
        })
        throw new Error('Trial cannot be started after purchase')
      }
      if (subscriptionState.status !== 'pre_trial') {
        throw new Error('Trial cannot be started from current state')
      }

      const { data, error } = await supabase.rpc('start_current_user_trial')

      if (error) throw error
      return data
    },
    onMutate: async () => {
      // Mark a trial-start as in-flight so the AppState foreground listener
      // skips its invalidation until the mutation settles. Cleared in
      // onSettled regardless of success or failure.
      isStartTrialPendingRef.current = true

      if (!user?.id) return { previousProfile: undefined }

      // Cancel any in-flight profile refetches so they don't overwrite our
      // optimistic value.
      await queryClient.cancelQueries({ queryKey: ['profile', user.id] })

      const previousProfile = queryClient.getQueryData<Profile>(['profile', user.id])
      const now = new Date()
      const trialEnd = addDays(now, TRIAL_DURATION_DAYS)

      queryClient.setQueryData<Profile>(['profile', user.id], (old) =>
        old
          ? {
              ...old,
              tier: 'trialing',
              trial_started_at: now.toISOString(),
              trial_ends_at: trialEnd.toISOString(),
            }
          : old,
      )

      return { previousProfile }
    },
    onError: (_err, _vars, context) => {
      // Roll back the optimistic update if the mutation failed.
      if (user?.id && context?.previousProfile !== undefined) {
        queryClient.setQueryData<Profile>(['profile', user.id], context.previousProfile)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] })
    },
    onSettled: () => {
      // Always clear the in-flight flag so the AppState listener resumes
      // normal behavior, whether the mutation succeeded or failed.
      isStartTrialPendingRef.current = false
    },
  })

  // Purchase lifetime access
  const purchaseMutation = useMutation({
    mutationFn: async (input: PurchasesPackage | PurchaseRequest) => {
      if (!user?.id) throw new Error('Not authenticated')
      const expectedUserId = user.id
      await assertAuthenticatedUser(expectedUserId)

      const pkg = 'pkg' in input ? input.pkg : input
      const attemptContext =
        'pkg' in input
          ? (input.attemptContext ?? null)
          : {
              promoCode: null,
              campaignId: null,
              promoOutcome: null,
              priceString: pkg.product.priceString ?? null,
            }

      if (attemptContext?.redemptionAttemptId) {
        await runRevenueCatUserOperation(expectedUserId, () =>
          setRevenueCatPromoRedemptionAttributes(attemptContext),
        )
      } else {
        try {
          await runRevenueCatUserOperation(expectedUserId, () =>
            setRevenueCatPromoRedemptionAttributes(null),
          )
        } catch (error) {
          if (isRevenueCatAccountChangedError(error)) throw error
          console.warn('[useSubscription] Failed to clear promo RevenueCat attributes', {
            userId: user?.id ?? null,
            error,
          })
          throw new Error('PROMO_ATTRIBUTE_CLEAR_FAILED')
        }
      }

      console.log('[useSubscription] Purchase mutation started', {
        userId: user?.id ?? null,
        offeringIdentifier,
        signupCohort: profile?.signup_cohort ?? null,
        packageIdentifier: pkg.identifier,
        packageType: pkg.packageType,
        productIdentifier: pkg.product.identifier,
      })

      await assertAuthenticatedUser(expectedUserId)
      const info = await runRevenueCatUserOperation(expectedUserId, () => purchasePackage(pkg))
      await assertAuthenticatedUser(expectedUserId)
      if (info) {
        const result = await syncExternalPurchaseAccess({
          source: 'purchase',
          customerInfo: info,
          forceStoreSync: false,
          attemptContext,
        })
        if (result.status !== 'confirmed') {
          throw new Error('PURCHASE_VERIFICATION_FAILED')
        }
        return result.customerInfo
      }
      return null
    },
    onSuccess: (info) => {
      console.log('[useSubscription] Purchase mutation completed', {
        userId: user?.id ?? null,
        hasCustomerInfo: !!info,
        activeEntitlementIds: info ? Object.keys(info.entitlements.active ?? {}) : [],
      })
      refetchCustomerInfo()
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] })
    },
  })

  // Restore purchases — returns null if no active entitlement found
  const restoreMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated')
      const expectedUserId = user.id
      await assertAuthenticatedUser(expectedUserId)

      console.log('[useSubscription] Restore mutation started', {
        userId: user?.id ?? null,
      })
      const info = await runRevenueCatUserOperation(expectedUserId, () => restorePurchases())
      await assertAuthenticatedUser(expectedUserId)
      if (info) {
        const result = await syncExternalPurchaseAccess({
          source: 'restore',
          customerInfo: info,
          forceStoreSync: false,
          attemptContext: accessSyncAttempt,
        })
        console.log('[useSubscription] Restore mutation result', {
          userId: user?.id ?? null,
          hasEntitlement: result.hasEntitlement,
          profileSynced: result.profileSynced,
          activeEntitlementIds: info ? Object.keys(info.entitlements.active ?? {}) : [],
        })
        return result.status === 'confirmed' ? result.customerInfo : null
      }
      console.log('[useSubscription] Restore mutation result', {
        userId: user?.id ?? null,
        hasEntitlement: false,
        activeEntitlementIds: [],
      })
      return null
    },
    onSuccess: () => {
      refetchCustomerInfo()
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] })
    },
  })

  return {
    ...subscriptionState,
    offerings,
    offeringIdentifier, // Which pricing tier the user qualifies for
    isLoading: isLoadingCustomerInfo || isLoadingOfferings || !isInitialized || profileLoading,
    startTrial: startTrialMutation.mutateAsync,
    isStartingTrial: startTrialMutation.isPending,
    purchase: purchaseMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
    restore: restoreMutation.mutateAsync,
    isRestoring: restoreMutation.isPending,
    syncAccess: syncAccessMutation.mutateAsync,
    isSyncingAccess: syncAccessMutation.isPending,
    redeemPromoCode: redeemPromoCodeMutation.mutateAsync,
    isRedeemingPromoCode: redeemPromoCodeMutation.isPending,
    accessSyncPhase,
    accessSyncResult,
    accessSyncAttempt,
    markPromoCodeValidated,
    markExternalPurchaseAttempted,
    canRequestIosRefund,
    canRequestAndroidRefund,
    canRedeemPromoCode,
    loadOffering,
    syncPromoRedemptionAttributes,
    requestRefundForActiveEntitlement,
    refetch: refetchCustomerInfo,
  }
}

/**
 * Compute subscription state from profile, RevenueCat data, and beta phase.
 *
 * The resolution order is:
 *  1. refunded_at IS NOT NULL → status='refunded' (purchase was refunded)
 *  2. DB tier='lifetime' or purchased_at is set → status='lifetime'
 *  3. `beta` phase short-circuits non-purchase users → status='beta'
 *  4. RevenueCat entitlement (trial or lifetime) → status='trialing' | 'lifetime'
 *  5. Legacy beta grace logic for users created before 2026-04-01 UTC:
 *     - before 2026-04-15 UTC → status='grace_period'
 *     - on/after 2026-04-15 UTC → status='expired'
 *  6. DB tier='trialing' within trial window → status='trialing'
 *  7. Local trial_ends_at fallback (still in future) → status='trialing'
 *  8. Otherwise, disambiguate pre_trial vs expired using `trial_started_at`:
 *     - trial_started_at IS NULL → status='pre_trial' (never started a trial)
 *     - trial_started_at IS NOT NULL → status='expired' (trial was used and ended)
 */
function computeSubscriptionState(
  profile: ReturnType<typeof useProfile>['profile'],
  customerInfo: CustomerInfo | null | undefined,
  isBeta: boolean,
  betaAccessConfig?: {
    legacy_beta_signup_cutoff: string
    beta_end_date: string
    grace_period_days: number
  },
): SubscriptionState {
  const legacyBetaSignupCutoff = betaAccessConfig?.legacy_beta_signup_cutoff
    ? parseISO(betaAccessConfig.legacy_beta_signup_cutoff)
    : FALLBACK_LEGACY_BETA_SIGNUP_CUTOFF
  const betaEndDate = betaAccessConfig?.beta_end_date
    ? parseISO(betaAccessConfig.beta_end_date)
    : FALLBACK_BETA_END_DATE
  const betaGracePeriodDays =
    typeof betaAccessConfig?.grace_period_days === 'number'
      ? betaAccessConfig.grace_period_days
      : FALLBACK_BETA_GRACE_PERIOD_DAYS
  const betaGraceEnd = addDays(betaEndDate, betaGracePeriodDays)

  const now = new Date()

  // Refund state is authoritative. A refunded user must not regain access from
  // stale tier or cached RevenueCat state until a new purchase/restore clears
  // refunded_at through the verified sync path.
  if (profile?.refunded_at) {
    return {
      status: 'refunded',
      trialDaysRemaining: null,
      trialExpirationDate: null,
      graceDaysRemaining: null,
      graceExpirationDate: null,
    }
  }

  // Lifetime takes precedence over beta phase. Users who actually paid should
  // see their true entitlement regardless of which build they're running.
  if (hasActiveRecordedLifetime(profile)) {
    return {
      status: 'lifetime',
      trialDaysRemaining: null,
      trialExpirationDate: null,
      graceDaysRemaining: null,
      graceExpirationDate: null,
    }
  }

  // Beta phase overrides everything else for users without an active purchase.
  if (isBeta) {
    return {
      status: 'beta',
      trialDaysRemaining: null,
      trialExpirationDate: null,
      graceDaysRemaining: null,
      graceExpirationDate: null,
    }
  }

  // Check RevenueCat entitlements (lifetime purchase or trial)
  const entitlement = customerInfo?.entitlements.active[ENTITLEMENT_ID]
  if (entitlement) {
    const isEntitlementTrialing = entitlement.periodType === 'TRIAL'

    // For lifetime purchases, no expiration; for trials, track expiration
    if (isEntitlementTrialing) {
      const trialExpirationDate = entitlement.expirationDate
        ? new Date(entitlement.expirationDate)
        : null
      const trialDaysRemaining = trialExpirationDate
        ? Math.max(
            0,
            Math.ceil((trialExpirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
          )
        : null

      return {
        status: 'trialing',
        trialDaysRemaining,
        trialExpirationDate,
        graceDaysRemaining: null,
        graceExpirationDate: null,
      }
    }

    // Lifetime purchase via RevenueCat
    return {
      status: 'lifetime',
      trialDaysRemaining: null,
      trialExpirationDate: null,
      graceDaysRemaining: null,
      graceExpirationDate: null,
    }
  }

  // DEV-36 targets legacy beta users who signed up before April 1, 2026.
  // We intentionally key this off profile.created_at rather than the
  // early_adopter cohort, because later tickets extended early_adopter
  // pricing beyond the original beta window.
  const createdAt = profile?.created_at ? new Date(profile.created_at) : null
  const isLegacyBetaUser = !!createdAt && createdAt < legacyBetaSignupCutoff

  if (isLegacyBetaUser) {
    if (now < betaGraceEnd) {
      const graceDaysRemaining = Math.max(
        0,
        Math.ceil((betaGraceEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      )

      return {
        status: 'grace_period',
        trialDaysRemaining: null,
        trialExpirationDate: null,
        graceDaysRemaining,
        graceExpirationDate: betaGraceEnd,
      }
    }

    return {
      status: 'expired',
      trialDaysRemaining: null,
      trialExpirationDate: null,
      graceDaysRemaining: null,
      graceExpirationDate: null,
    }
  }

  // Offline fallback: if profile says trialing but RevenueCat is unavailable,
  // use local trial_ends_at to determine if the trial is still active.
  // If expired, fall through to the final pre_trial/expired disambiguation.
  //
  // Edge case: if tier='trialing' but trial_ends_at IS NULL, we treat it as
  // an open-ended trial (no expiry date known) and return trialing with a
  // null trialDaysRemaining. This state should not normally occur — the
  // trial-start flow always writes both columns together — but the code
  // handles it gracefully rather than bailing out.
  if (profile?.tier === 'trialing') {
    const trialExpirationDate = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null
    if (!trialExpirationDate || trialExpirationDate > now) {
      const trialDaysRemaining = trialExpirationDate
        ? Math.max(
            0,
            Math.ceil((trialExpirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
          )
        : null
      return {
        status: 'trialing',
        trialDaysRemaining,
        trialExpirationDate,
        graceDaysRemaining: null,
        graceExpirationDate: null,
      }
    }
  }

  // Check local trial (app-managed trial) — fallback when DB tier disagrees
  // with trial_ends_at. Only treat as trialing if the window is still open.
  if (profile?.trial_ends_at) {
    const trialEnd = new Date(profile.trial_ends_at)
    if (trialEnd > now) {
      const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return {
        status: 'trialing',
        trialDaysRemaining: daysRemaining,
        trialExpirationDate: trialEnd,
        graceDaysRemaining: null,
        graceExpirationDate: null,
      }
    }
  }

  // Disambiguate the final state using trial_started_at:
  // - Never started a trial → 'pre_trial' (welcome/start flow)
  // - Started a trial and it ended → 'expired' (locked, purchase required)
  const hasUsedTrial = !!profile?.trial_started_at

  return {
    status: hasUsedTrial ? 'expired' : 'pre_trial',
    trialDaysRemaining: null,
    trialExpirationDate: null,
    graceDaysRemaining: null,
    graceExpirationDate: null,
  }
}

/**
 * Ask the authenticated server endpoint to verify RevenueCat directly and
 * atomically apply the resulting lifetime access. CustomerInfo remains useful
 * for immediate UX, but is never sent as authority to Supabase.
 */
async function syncSubscriptionToSupabase(
  userId: string | undefined,
  attemptContext: PurchaseAccessSyncAttemptContext | null,
): Promise<SupabaseSubscriptionSyncStatus> {
  if (!userId) return 'non_lifetime_entitlement'

  const promoContext =
    attemptContext && hasPromoRedemptionAttemptContext(attemptContext)
      ? {
          redemptionAttemptId: attemptContext.redemptionAttemptId!,
          codeId: attemptContext.codeId!,
          campaignId: attemptContext.campaignId!,
        }
      : null
  const { data, error } = await supabase.functions.invoke('sync-revenuecat-access', {
    body: { promoContext, expectedUserId: userId },
  })

  if (error) throw error

  const status =
    data && typeof data === 'object' && !Array.isArray(data) && 'status' in data
      ? data.status
      : null

  if (status === 'synced') return 'synced'
  if (
    status === 'missing_entitlement' ||
    status === 'expired_entitlement' ||
    status === 'invalid_entitlement'
  ) {
    return 'non_lifetime_entitlement'
  }

  throw new Error('INVALID_SERVER_ACCESS_SYNC_RESULT')
}
