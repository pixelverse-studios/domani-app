import { useEffect, useState, useRef } from 'react'
import { AppState } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases'
import { addDays } from 'date-fns'

import { supabase } from '~/lib/supabase'
import { useAuth } from '~/hooks/useAuth'
import { useProfile } from '~/hooks/useProfile'
import { useAppConfig } from '~/stores/appConfigStore'
import { isBetaPhase } from '~/types/appConfig'
import type { Profile } from '~/types'
import {
  initializeRevenueCat,
  loginRevenueCat,
  logoutRevenueCat,
  getOfferings,
  getOfferingForCohort,
  purchasePackage,
  restorePurchases,
  ENTITLEMENT_ID,
} from '~/lib/revenuecat'

/**
 * Exhaustive subscription status state machine.
 *
 * - `beta`      → phase is beta; full access, short-circuits most other checks
 *                 (but `lifetime` still takes precedence — see
 *                 `computeSubscriptionState` for the exact resolution order)
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
  | 'lifetime'
  | 'trialing'
  | 'pre_trial'
  | 'expired'
  | 'refunded'

interface SubscriptionState {
  status: SubscriptionStatus
  trialDaysRemaining: number | null
  trialExpirationDate: Date | null
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
  return status === 'beta' || status === 'lifetime' || status === 'trialing'
}

const TRIAL_DURATION_DAYS = 14

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
  const { phase } = useAppConfig()

  const { status } = computeSubscriptionState(profile, null, isBetaPhase(phase))

  return { status, isLoading: profileLoading }
}

export function useSubscription() {
  const { user } = useAuth()
  const { profile, isLoading: profileLoading } = useProfile()
  const queryClient = useQueryClient()
  const [isInitialized, setIsInitialized] = useState(false)
  const previousUserId = useRef<string | undefined>(undefined)
  // Tracks whether a trial-start mutation is currently in flight so that
  // unrelated profile-invalidation triggers (e.g. the AppState foreground
  // listener) don't race the optimistic update and overwrite it with stale
  // pre-mutation data.
  const isStartTrialPendingRef = useRef(false)
  const { phase } = useAppConfig()

  // Check if we're in beta (skip RevenueCat entirely during beta)
  const isBeta = isBetaPhase(phase)

  // Initialize RevenueCat when user changes (skip during beta)
  useEffect(() => {
    let isMounted = true

    async function init() {
      // During beta, skip RevenueCat entirely
      if (isBeta) {
        if (isMounted) {
          setIsInitialized(true)
        }
        return
      }

      // Handle logout when user signs out (previous user existed, now gone)
      if (previousUserId.current && !user?.id) {
        logoutRevenueCat()
        if (isMounted) {
          setIsInitialized(false)
        }
      }

      // Handle login when user signs in
      if (user?.id) {
        try {
          await initializeRevenueCat(user.id)
          await loginRevenueCat(user.id)
        } catch (error) {
          // RevenueCat failed to initialize - continue without it
          // This can happen if Android API key is not configured
          console.warn('[useSubscription] RevenueCat initialization failed:', error)
        }
        // Always mark as initialized so Settings doesn't hang
        if (isMounted) {
          setIsInitialized(true)
        }
      }

      // Track the current user id for next comparison
      previousUserId.current = user?.id
    }
    init()

    return () => {
      isMounted = false
    }
  }, [user?.id, isBeta])

  // Query for RevenueCat customer info (disabled during beta)
  const {
    data: customerInfo,
    isLoading: isLoadingCustomerInfo,
    refetch: refetchCustomerInfo,
  } = useQuery({
    queryKey: ['customerInfo', user?.id],
    queryFn: async () => {
      if (!isInitialized || isBeta) return null
      try {
        const info = await Purchases.getCustomerInfo()
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
    enabled: isInitialized && !!user?.id && !isBeta,
    retry: false, // Don't retry if RevenueCat is not configured
  })

  // Get the cohort-specific offering identifier
  const offeringIdentifier = getOfferingForCohort(profile?.signup_cohort)

  // Query for offerings (available products) - disabled during beta
  // Uses cohort-specific offering based on user's signup_cohort
  const { data: offerings, isLoading: isLoadingOfferings } = useQuery({
    queryKey: ['offerings', offeringIdentifier],
    queryFn: () => getOfferings(offeringIdentifier),
    enabled: isInitialized && !isBeta && !!profile,
    retry: false, // Don't retry if RevenueCat is not configured
  })

  // Compute subscription state. Beta phase short-circuits everything else;
  // see computeSubscriptionState for the full state machine.
  const subscriptionState: SubscriptionState = computeSubscriptionState(
    profile,
    customerInfo,
    isBeta,
  )

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

    let wasBackground = AppState.currentState === 'background'

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background') {
        wasBackground = true
      } else if (nextState === 'active' && wasBackground) {
        wasBackground = false
        // Don't invalidate while a trial-start mutation is in flight —
        // doing so would race the optimistic cache update and could
        // overwrite the optimistic trialing state with a stale refetch
        // completing before the DB write commits.
        if (isStartTrialPendingRef.current) return
        queryClient.invalidateQueries({ queryKey: ['profile', user.id] })
      }
    })

    return () => subscription.remove()
  }, [queryClient, user?.id])

  // Start free trial (local trial, not RevenueCat).
  //
  // Uses an optimistic cache update so the transition from pre_trial →
  // trialing is instantaneous. Without the optimistic update there's a
  // brief window between the DB write succeeding and React Query refetching
  // the profile, during which the stale cache still reports tier='none'
  // and the PreTrialScreen flashes back into view for one render cycle.
  const startTrialMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated')
      if (subscriptionState.status !== 'pre_trial') {
        throw new Error('Trial cannot be started from current state')
      }

      const now = new Date()
      const trialEnd = addDays(now, TRIAL_DURATION_DAYS)

      const { data, error } = await supabase
        .from('profiles')
        .update({
          tier: 'trialing',
          trial_started_at: now.toISOString(),
          trial_ends_at: trialEnd.toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single()

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

  // Purchase subscription
  const purchaseMutation = useMutation({
    mutationFn: async (pkg: PurchasesPackage) => {
      console.log('[useSubscription] Purchase mutation started', {
        userId: user?.id ?? null,
        offeringIdentifier,
        signupCohort: profile?.signup_cohort ?? null,
        packageIdentifier: pkg.identifier,
        packageType: pkg.packageType,
        productIdentifier: pkg.product.identifier,
      })

      const info = await purchasePackage(pkg)
      if (info) {
        // Sync to Supabase
        await syncSubscriptionToSupabase(user?.id, info)
      }
      return info
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
      console.log('[useSubscription] Restore mutation started', {
        userId: user?.id ?? null,
      })
      const info = await restorePurchases()
      if (info) {
        await syncSubscriptionToSupabase(user?.id, info)
      }
      const hasEntitlement = !!info?.entitlements.active[ENTITLEMENT_ID]
      console.log('[useSubscription] Restore mutation result', {
        userId: user?.id ?? null,
        hasEntitlement,
        activeEntitlementIds: info ? Object.keys(info.entitlements.active ?? {}) : [],
      })
      return hasEntitlement ? info : null
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
    refetch: refetchCustomerInfo,
  }
}

/**
 * Compute subscription state from profile, RevenueCat data, and beta phase.
 *
 * The resolution order is:
 *  1. `beta` phase short-circuits everything → status='beta'
 *  2. DB tier='lifetime' → status='lifetime'
 *  3. DB tier='trialing' within trial window → status='trialing'
 *  4. RevenueCat entitlement (trial or lifetime) → status='trialing' | 'lifetime'
 *  5. Local trial_ends_at fallback (still in future) → status='trialing'
 *  6. refunded_at IS NOT NULL → status='refunded' (purchase was refunded)
 *  7. Otherwise, disambiguate pre_trial vs expired using `trial_started_at`:
 *     - trial_started_at IS NULL → status='pre_trial' (never started a trial)
 *     - trial_started_at IS NOT NULL → status='expired' (trial was used and ended)
 */
function computeSubscriptionState(
  profile: ReturnType<typeof useProfile>['profile'],
  customerInfo: CustomerInfo | null | undefined,
  isBeta: boolean,
): SubscriptionState {
  // Lifetime takes precedence over everything, including beta phase. Users
  // who actually paid should see their true entitlement regardless of which
  // build they're running — otherwise a lifetime purchaser in a beta build
  // would see a misleading "Beta Tester" status and lose visibility into
  // the permanent access they paid for.
  if (profile?.tier === 'lifetime') {
    return {
      status: 'lifetime',
      trialDaysRemaining: null,
      trialExpirationDate: null,
    }
  }

  // Beta phase overrides everything else — beta testers always have full
  // access regardless of tier/trial columns. Single source of truth for
  // "during beta, no one (without a real purchase) is gated".
  if (isBeta) {
    return {
      status: 'beta',
      trialDaysRemaining: null,
      trialExpirationDate: null,
    }
  }

  const now = new Date()

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
      }
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
      }
    }

    // Lifetime purchase via RevenueCat
    return {
      status: 'lifetime',
      trialDaysRemaining: null,
      trialExpirationDate: null,
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
      }
    }
  }

  // Refunded users: purchased and then got a refund. Distinct from trial
  // expiry — they didn't lose a trial, they lost a purchase.
  if (profile?.refunded_at) {
    return {
      status: 'refunded',
      trialDaysRemaining: null,
      trialExpirationDate: null,
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
  }
}

/**
 * Sync RevenueCat purchase status to Supabase
 * Lifetime-only model: purchases are either lifetime or trialing
 */
async function syncSubscriptionToSupabase(userId: string | undefined, customerInfo: CustomerInfo) {
  if (!userId) return

  const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID]

  console.log('[useSubscription] Syncing RevenueCat state to Supabase', {
    userId,
    originalAppUserId: customerInfo.originalAppUserId,
    entitlementId: ENTITLEMENT_ID,
    hasEntitlement: !!entitlement,
    activeEntitlementIds: Object.keys(customerInfo.entitlements.active ?? {}),
  })

  // Always update revenuecat_user_id so the customer is linked
  const { error: rcError } = await supabase
    .from('profiles')
    .update({ revenuecat_user_id: customerInfo.originalAppUserId })
    .eq('id', userId)
  if (rcError) throw rcError

  console.log('[useSubscription] Linked RevenueCat user in Supabase', {
    userId,
    revenuecatUserId: customerInfo.originalAppUserId,
  })

  // Only update tier when there is an active entitlement — never write 'none'
  // unconditionally, as a RevenueCat propagation delay could downgrade a valid user
  if (entitlement) {
    const isTrialing = entitlement.periodType === 'TRIAL'
    const tier: 'trialing' | 'lifetime' = isTrialing ? 'trialing' : 'lifetime'

    const { error: tierError } = await supabase.from('profiles').update({ tier }).eq('id', userId)
    if (tierError) throw tierError

    console.log('[useSubscription] Updated Supabase tier from RevenueCat', {
      userId,
      tier,
      entitlementId: ENTITLEMENT_ID,
      productIdentifier: entitlement.productIdentifier ?? null,
    })
  }
}
