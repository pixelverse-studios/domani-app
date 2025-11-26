import Purchases, { LOG_LEVEL, PurchasesOffering, PurchasesPackage } from 'react-native-purchases'
import { Platform } from 'react-native'

// RevenueCat API keys - these should be in environment variables for production
const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || ''
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || ''

// Product identifiers (configure these in RevenueCat dashboard)
export const PRODUCT_IDS = {
  MONTHLY: 'domani_pro_monthly',
  YEARLY: 'domani_pro_yearly',
} as const

// Entitlement identifier (configure in RevenueCat dashboard)
export const ENTITLEMENT_ID = 'premium'

/**
 * Initialize RevenueCat SDK
 * Call this once on app startup after user authentication
 */
export async function initializeRevenueCat(userId?: string) {
  const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID

  if (!apiKey) {
    console.warn('[RevenueCat] No API key configured for', Platform.OS)
    return
  }

  // Enable debug logs in development
  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG)
  }

  await Purchases.configure({
    apiKey,
    appUserID: userId, // Use Supabase user ID for cross-platform sync
  })

  console.log('[RevenueCat] Initialized for user:', userId || 'anonymous')
}

/**
 * Log in user to RevenueCat (call after Supabase auth)
 */
export async function loginRevenueCat(userId: string) {
  try {
    const { customerInfo } = await Purchases.logIn(userId)
    console.log('[RevenueCat] User logged in:', userId)
    return customerInfo
  } catch (error) {
    console.error('[RevenueCat] Login error:', error)
    throw error
  }
}

/**
 * Log out user from RevenueCat (call on Supabase sign out)
 */
export async function logoutRevenueCat() {
  try {
    await Purchases.logOut()
    console.log('[RevenueCat] User logged out')
  } catch (error) {
    console.error('[RevenueCat] Logout error:', error)
  }
}

/**
 * Get current offerings (products available for purchase)
 */
export async function getOfferings(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings()
    return offerings.current
  } catch (error) {
    console.error('[RevenueCat] Error fetching offerings:', error)
    return null
  }
}

/**
 * Check if user has premium access (active subscription or trial)
 */
export async function checkPremiumAccess(): Promise<{
  hasPremium: boolean
  isTrialing: boolean
  expirationDate: string | null
  willRenew: boolean
}> {
  try {
    const customerInfo = await Purchases.getCustomerInfo()
    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID]

    if (entitlement) {
      return {
        hasPremium: true,
        isTrialing: entitlement.periodType === 'TRIAL',
        expirationDate: entitlement.expirationDate,
        willRenew: entitlement.willRenew,
      }
    }

    return {
      hasPremium: false,
      isTrialing: false,
      expirationDate: null,
      willRenew: false,
    }
  } catch (error) {
    console.error('[RevenueCat] Error checking premium access:', error)
    return {
      hasPremium: false,
      isTrialing: false,
      expirationDate: null,
      willRenew: false,
    }
  }
}

/**
 * Purchase a package (subscription)
 */
export async function purchasePackage(packageToPurchase: PurchasesPackage) {
  try {
    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase)
    return customerInfo
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'userCancelled' in error &&
      (error as { userCancelled: boolean }).userCancelled
    ) {
      console.log('[RevenueCat] Purchase cancelled by user')
      return null
    }
    console.error('[RevenueCat] Purchase error:', error)
    throw error
  }
}

/**
 * Restore previous purchases
 */
export async function restorePurchases() {
  try {
    const customerInfo = await Purchases.restorePurchases()
    console.log('[RevenueCat] Purchases restored')
    return customerInfo
  } catch (error) {
    console.error('[RevenueCat] Restore error:', error)
    throw error
  }
}
