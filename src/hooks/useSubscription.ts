import { useEffect, useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases'
import { addDays } from 'date-fns'

import { supabase } from '~/lib/supabase'
import { useAuth } from '~/hooks/useAuth'
import { useProfile, useUpdateProfile } from '~/hooks/useProfile'
import {
  initializeRevenueCat,
  loginRevenueCat,
  logoutRevenueCat,
  getOfferings,
  checkPremiumAccess,
  purchasePackage,
  restorePurchases,
  ENTITLEMENT_ID,
} from '~/lib/revenuecat'

export type SubscriptionStatus = 'free' | 'trialing' | 'premium' | 'lifetime'

interface SubscriptionState {
  status: SubscriptionStatus
  isTrialing: boolean
  trialDaysRemaining: number | null
  expirationDate: Date | null
  willRenew: boolean
  canStartTrial: boolean
}

const TRIAL_DURATION_DAYS = 14

export function useSubscription() {
  const { user } = useAuth()
  const { profile } = useProfile()
  const updateProfile = useUpdateProfile()
  const queryClient = useQueryClient()
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize RevenueCat when user changes
  useEffect(() => {
    let isMounted = true

    async function init() {
      if (user?.id) {
        await initializeRevenueCat(user.id)
        await loginRevenueCat(user.id)
        if (isMounted) {
          setIsInitialized(true)
        }
      }
    }
    init()

    return () => {
      isMounted = false
      // Only logout when user actually changes (signs out), not on component unmount
      // The cleanup runs when user?.id changes, so if it becomes undefined/null,
      // that means user signed out
    }
  }, [user?.id])

  // Handle logout when user signs out (user becomes null)
  useEffect(() => {
    if (!user && isInitialized) {
      logoutRevenueCat()
      setIsInitialized(false)
    }
  }, [user, isInitialized])

  // Query for RevenueCat customer info
  const {
    data: customerInfo,
    isLoading: isLoadingCustomerInfo,
    refetch: refetchCustomerInfo,
  } = useQuery({
    queryKey: ['customerInfo', user?.id],
    queryFn: async () => {
      if (!isInitialized) return null
      const info = await Purchases.getCustomerInfo()
      return info
    },
    enabled: isInitialized && !!user?.id,
  })

  // Query for offerings (available products)
  const { data: offerings, isLoading: isLoadingOfferings } = useQuery({
    queryKey: ['offerings'],
    queryFn: getOfferings,
    enabled: isInitialized,
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
 */
function computeSubscriptionState(
  profile: ReturnType<typeof useProfile>['profile'],
  customerInfo: CustomerInfo | null | undefined,
): SubscriptionState {
  const now = new Date()

  // Check lifetime tier first (manual upgrade)
  if (profile?.tier === 'lifetime') {
    return {
      status: 'lifetime',
      isTrialing: false,
      trialDaysRemaining: null,
      expirationDate: null,
      willRenew: false,
      canStartTrial: false,
    }
  }

  // Check RevenueCat entitlements
  const entitlement = customerInfo?.entitlements.active[ENTITLEMENT_ID]
  if (entitlement) {
    const isTrialing = entitlement.periodType === 'TRIAL'
    const expirationDate = entitlement.expirationDate ? new Date(entitlement.expirationDate) : null
    const trialDaysRemaining =
      isTrialing && expirationDate
        ? Math.max(0, Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : null

    return {
      status: isTrialing ? 'trialing' : 'premium',
      isTrialing,
      trialDaysRemaining,
      expirationDate,
      willRenew: entitlement.willRenew,
      canStartTrial: false, // Already using RevenueCat
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
        expirationDate: trialEnd,
        willRenew: false,
        canStartTrial: false, // Already used trial
      }
    }
  }

  // Check if user already used their trial
  const hasUsedTrial = !!profile?.trial_started_at

  // Default: free tier
  return {
    status: 'free',
    isTrialing: false,
    trialDaysRemaining: null,
    expirationDate: null,
    willRenew: false,
    canStartTrial: !hasUsedTrial,
  }
}

/**
 * Sync RevenueCat subscription status to Supabase
 */
async function syncSubscriptionToSupabase(userId: string | undefined, customerInfo: CustomerInfo) {
  if (!userId) return

  const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID]

  let tier: 'free' | 'premium' | 'lifetime' = 'free'
  let subscriptionStatus: string = 'none'
  let expiresAt: string | null = null

  if (entitlement) {
    tier = 'premium'
    subscriptionStatus = entitlement.periodType === 'TRIAL' ? 'trialing' : 'active'
    expiresAt = entitlement.expirationDate || null
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
