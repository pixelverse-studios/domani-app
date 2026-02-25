import { useEffect, useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases'
import { addDays } from 'date-fns'

import { supabase } from '~/lib/supabase'
import { useAuth } from '~/hooks/useAuth'
import { useProfile } from '~/hooks/useProfile'
import { useAppConfig } from '~/stores/appConfigStore'
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

export type SubscriptionStatus = 'none' | 'trialing' | 'lifetime'

interface SubscriptionState {
  status: SubscriptionStatus
  isTrialing: boolean
  trialDaysRemaining: number | null
  trialExpirationDate: Date | null
  canStartTrial: boolean
}

const TRIAL_DURATION_DAYS = 14

export function useSubscription() {
  const { user } = useAuth()
  const { profile } = useProfile()
  const queryClient = useQueryClient()
  const [isInitialized, setIsInitialized] = useState(false)
  const previousUserId = useRef<string | undefined>(undefined)
  const { phase } = useAppConfig()

  // Check if we're in beta (skip RevenueCat entirely during beta)
  const isBeta = phase === 'closed_beta' || phase === 'open_beta'

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

  // Compute subscription state
  const subscriptionState: SubscriptionState = computeSubscriptionState(profile, customerInfo)

  // Start free trial (local trial, not RevenueCat)
  const startTrialMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated')
      if (!subscriptionState.canStartTrial) throw new Error('Trial already used')

      const now = new Date()
      const trialEnd = addDays(now, TRIAL_DURATION_DAYS)

      const { data, error } = await supabase
        .from('profiles')
        .update({
          tier: 'trialing',
          trial_started_at: now.toISOString(),
          trial_ends_at: trialEnd.toISOString(),
          subscription_status: 'trialing',
        })
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] })
    },
  })

  // Purchase subscription
  const purchaseMutation = useMutation({
    mutationFn: async (pkg: PurchasesPackage) => {
      const info = await purchasePackage(pkg)
      if (info) {
        // Sync to Supabase
        await syncSubscriptionToSupabase(user?.id, info)
      }
      return info
    },
    onSuccess: () => {
      refetchCustomerInfo()
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] })
    },
  })

  // Restore purchases
  const restoreMutation = useMutation({
    mutationFn: async () => {
      const info = await restorePurchases()
      if (info) {
        await syncSubscriptionToSupabase(user?.id, info)
      }
      return info
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
    isLoading: isLoadingCustomerInfo || isLoadingOfferings || !isInitialized,
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
 * Compute subscription state from profile and RevenueCat data
 * Lifetime-only model: no subscriptions, just lifetime purchases and trials
 */
function computeSubscriptionState(
  profile: ReturnType<typeof useProfile>['profile'],
  customerInfo: CustomerInfo | null | undefined,
): SubscriptionState {
  const now = new Date()

  // Check lifetime tier first (manual upgrade or RevenueCat lifetime purchase)
  if (profile?.tier === 'lifetime') {
    return {
      status: 'lifetime',
      isTrialing: false,
      trialDaysRemaining: null,
      trialExpirationDate: null,
      canStartTrial: false,
    }
  }

  // Offline fallback: if profile says trialing but RevenueCat is unavailable,
  // use local trial_ends_at to determine if the trial is still active.
  // If expired, fall through to the 'none' default so access is correctly revoked.
  if (profile?.tier === 'trialing') {
    const trialExpirationDate = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null
    if (!trialExpirationDate || trialExpirationDate > now) {
      const trialDaysRemaining = trialExpirationDate
        ? Math.max(0, Math.ceil((trialExpirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : null
      return {
        status: 'trialing',
        isTrialing: true,
        trialDaysRemaining,
        trialExpirationDate,
        canStartTrial: false,
      }
    }
  }

  // Check RevenueCat entitlements (lifetime purchase or trial)
  const entitlement = customerInfo?.entitlements.active[ENTITLEMENT_ID]
  if (entitlement) {
    const isTrialing = entitlement.periodType === 'TRIAL'

    // For lifetime purchases, no expiration; for trials, track expiration
    if (isTrialing) {
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
        isTrialing: true,
        trialDaysRemaining,
        trialExpirationDate,
        canStartTrial: false,
      }
    }

    // Lifetime purchase via RevenueCat
    return {
      status: 'lifetime',
      isTrialing: false,
      trialDaysRemaining: null,
      trialExpirationDate: null,
      canStartTrial: false,
    }
  }

  // Check local trial (app-managed trial)
  if (profile?.trial_ends_at) {
    const trialEnd = new Date(profile.trial_ends_at)
    if (trialEnd > now) {
      const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return {
        status: 'trialing',
        isTrialing: true,
        trialDaysRemaining: daysRemaining,
        trialExpirationDate: trialEnd,
        canStartTrial: false,
      }
    }
  }

  // Check if user already used their trial
  const hasUsedTrial = !!profile?.trial_started_at

  // Default: no active tier (trial expired or never started)
  return {
    status: 'none',
    isTrialing: false,
    trialDaysRemaining: null,
    trialExpirationDate: null,
    canStartTrial: !hasUsedTrial,
  }
}

/**
 * Sync RevenueCat purchase status to Supabase
 * Lifetime-only model: purchases are either lifetime or trialing
 */
async function syncSubscriptionToSupabase(userId: string | undefined, customerInfo: CustomerInfo) {
  if (!userId) return

  const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID]

  let tier: 'none' | 'trialing' | 'lifetime' = 'none'
  let subscriptionStatus: string = 'none'
  let expiresAt: string | null = null

  if (entitlement) {
    const isTrialing = entitlement.periodType === 'TRIAL'

    if (isTrialing) {
      // Trial period
      tier = 'trialing'
      subscriptionStatus = 'trialing'
      expiresAt = entitlement.expirationDate || null
    } else {
      // Lifetime purchase - no expiration
      tier = 'lifetime'
      subscriptionStatus = 'active'
      expiresAt = null
    }
  }

  await supabase
    .from('profiles')
    .update({
      tier,
      subscription_status: subscriptionStatus,
      subscription_expires_at: expiresAt,
      revenuecat_user_id: customerInfo.originalAppUserId,
    })
    .eq('id', userId)
}
