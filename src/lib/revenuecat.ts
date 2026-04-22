import Purchases, {
  LOG_LEVEL,
  PurchasesOffering,
  PurchasesPackage,
  REFUND_REQUEST_STATUS,
} from 'react-native-purchases'
import { Platform } from 'react-native'

// RevenueCat API keys - these should be in environment variables for production
const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || ''
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || ''
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || ''
const REVENUECAT_ENTITLEMENT_ID = process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID || ''

// Product identifiers (configure these in RevenueCat dashboard)
// Lifetime-only model - no subscriptions
export const PRODUCT_IDS = {
  LIFETIME: 'domani_lifetime',
} as const

function resolveEntitlementId() {
  if (REVENUECAT_ENTITLEMENT_ID) return REVENUECAT_ENTITLEMENT_ID

  if (SUPABASE_URL.includes('ftgltnzejaxasdvfkqut.supabase.co')) {
    return 'Domani Staging Lifetime'
  }

  if (
    SUPABASE_URL.includes('domani.supabase.co') ||
    SUPABASE_URL.includes('exxnnlhxcjujxnnwwrxv.supabase.co')
  ) {
    return 'Domani Lifetime'
  }

  console.warn(
    '[RevenueCat] Could not infer entitlement ID from EXPO_PUBLIC_SUPABASE_URL; defaulting to staging entitlement',
    {
      supabaseUrl: SUPABASE_URL || null,
    },
  )

  return 'Domani Staging Lifetime'
}

// Entitlement identifier (configure in RevenueCat dashboard)
export const ENTITLEMENT_ID = resolveEntitlementId()

// Beta sunset date - after this, new users get general pricing
export const BETA_END_DATE = new Date('2026-03-01T00:00:00Z')

// Cohort-specific offerings (must match RevenueCat dashboard identifiers)
export const OFFERINGS = {
  EARLY_ADOPTER: 'early_adopter', // $9.99 lifetime
  FRIENDS_FAMILY: 'friends_family', // $4.99 lifetime
  GENERAL: 'general', // $34.99 lifetime
} as const

function getActiveEntitlementSummary(customerInfo: {
  entitlements?: {
    active?: Record<
      string,
      {
        productIdentifier?: string
        periodType?: string
        expirationDate?: string | null
      }
    >
  }
  originalAppUserId?: string | null
}) {
  const activeEntitlements = Object.entries(customerInfo.entitlements?.active ?? {}).map(
    ([entitlementId, entitlement]) => ({
      entitlementId,
      productIdentifier: entitlement.productIdentifier ?? null,
      periodType: entitlement.periodType ?? null,
      expirationDate: entitlement.expirationDate ?? null,
    }),
  )

  return {
    originalAppUserId: customerInfo.originalAppUserId ?? null,
    activeEntitlements,
  }
}

function getOfferingSummary(offering: PurchasesOffering | null | undefined) {
  if (!offering) return null

  return {
    identifier: offering.identifier,
    serverDescription: offering.serverDescription ?? null,
    availablePackages:
      offering.availablePackages?.map((pkg) => ({
        packageIdentifier: pkg.identifier,
        packageType: pkg.packageType,
        productIdentifier: pkg.product.identifier,
        productPrice: pkg.product.priceString ?? null,
      })) ?? [],
  }
}

/**
 * Initialize RevenueCat SDK
 * Call this once on app startup after user authentication
 */
export async function initializeRevenueCat(userId?: string) {
  const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID

  console.log('[RevenueCat] Initializing SDK', {
    platform: Platform.OS,
    userId: userId ?? null,
    apiKeyConfigured: !!apiKey,
  })

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

  console.log('[RevenueCat] Initialized SDK', {
    platform: Platform.OS,
    userId: userId ?? 'anonymous',
  })
}

/**
 * Log in user to RevenueCat (call after Supabase auth)
 */
export async function loginRevenueCat(userId: string) {
  try {
    const { customerInfo } = await Purchases.logIn(userId)
    console.log('[RevenueCat] User logged in', {
      userId,
      ...getActiveEntitlementSummary(customerInfo),
    })
    return customerInfo
  } catch (error) {
    console.error('[RevenueCat] Login error:', error)
    throw error
  }
}

/**
 * Log out user from RevenueCat (call on Supabase sign out)
 * Silently ignores rate limit errors since they're common during rapid auth state changes
 */
export async function logoutRevenueCat() {
  try {
    await Purchases.logOut()
    console.log('[RevenueCat] User logged out')
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    // RevenueCat can already be in its anonymous state during sign-out races.
    // In that case there is nothing left to do, so don't surface noisy logs.
    if (errorMessage.includes('current user is anonymous')) {
      console.log('[RevenueCat] Logout skipped - current user already anonymous')
      return
    }

    // Ignore rate limit errors (code 16, status 429) - these happen when
    // another request is in flight, which is common during rapid auth changes
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: number }).code === 16
    ) {
      console.log('[RevenueCat] Logout skipped - another request in progress')
      return
    }
    console.error('[RevenueCat] Logout error:', error)
  }
}

/**
 * Get current offerings (products available for purchase)
 * @param offeringIdentifier - Optional specific offering to fetch (for cohort-based pricing)
 */
export async function getOfferings(offeringIdentifier?: string): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings()
    const availableOfferingIds = Object.keys(offerings.all ?? {})

    // If a specific offering is requested, return that one
    if (offeringIdentifier && offerings.all[offeringIdentifier]) {
      const selectedOffering = offerings.all[offeringIdentifier]
      console.log('[RevenueCat] Returning cohort-specific offering', {
        requestedOfferingIdentifier: offeringIdentifier,
        availableOfferingIds,
        selectedOffering: getOfferingSummary(selectedOffering),
      })
      return offerings.all[offeringIdentifier]
    }

    // Fall back to the default/current offering
    console.log('[RevenueCat] Returning current offering', {
      requestedOfferingIdentifier: offeringIdentifier ?? null,
      availableOfferingIds,
      currentOffering: getOfferingSummary(offerings.current),
    })
    return offerings.current
  } catch (error) {
    console.error('[RevenueCat] Error fetching offerings:', error)
    return null
  }
}

/**
 * Get the appropriate offering identifier based on user's signup cohort
 * Maps cohort to corresponding RevenueCat offering:
 * - early_adopter → early_adopter offering ($9.99)
 * - friends_family → friends_family offering ($4.99)
 * - general (or null/undefined) → general offering ($34.99)
 */
export function getOfferingForCohort(
  signupCohort: string | null | undefined,
): (typeof OFFERINGS)[keyof typeof OFFERINGS] {
  switch (signupCohort) {
    case 'early_adopter':
      return OFFERINGS.EARLY_ADOPTER
    case 'friends_family':
      return OFFERINGS.FRIENDS_FAMILY
    default:
      return OFFERINGS.GENERAL
  }
}

/**
 * Check if user has premium access (lifetime purchase or trial)
 * Lifetime purchases have no expiration date; trials have expiration dates
 */
export async function checkPremiumAccess(): Promise<{
  hasPremium: boolean
  isTrialing: boolean
  trialExpirationDate: string | null
}> {
  try {
    const customerInfo = await Purchases.getCustomerInfo()
    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID]

    console.log('[RevenueCat] Checked premium access', {
      entitlementId: ENTITLEMENT_ID,
      hasEntitlement: !!entitlement,
      ...getActiveEntitlementSummary(customerInfo),
    })

    if (entitlement) {
      const isTrialing = entitlement.periodType === 'TRIAL'
      return {
        hasPremium: true,
        isTrialing,
        // Only include expiration for trials (lifetime has no expiration)
        trialExpirationDate: isTrialing ? entitlement.expirationDate : null,
      }
    }

    return {
      hasPremium: false,
      isTrialing: false,
      trialExpirationDate: null,
    }
  } catch (error) {
    console.error('[RevenueCat] Error checking premium access:', error)
    return {
      hasPremium: false,
      isTrialing: false,
      trialExpirationDate: null,
    }
  }
}

/**
 * Purchase a package (subscription)
 */
export async function purchasePackage(packageToPurchase: PurchasesPackage) {
  try {
    console.log('[RevenueCat] Starting purchase', {
      packageIdentifier: packageToPurchase.identifier,
      packageType: packageToPurchase.packageType,
      productIdentifier: packageToPurchase.product.identifier,
      priceString: packageToPurchase.product.priceString ?? null,
      offeringIdentifier: packageToPurchase.presentedOfferingContext?.offeringIdentifier ?? null,
    })

    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase)
    console.log('[RevenueCat] Purchase completed', {
      packageIdentifier: packageToPurchase.identifier,
      productIdentifier: packageToPurchase.product.identifier,
      ...getActiveEntitlementSummary(customerInfo),
    })
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
    console.log('[RevenueCat] Purchases restored', getActiveEntitlementSummary(customerInfo))
    return customerInfo
  } catch (error) {
    console.error('[RevenueCat] Restore error:', error)
    throw error
  }
}

/**
 * Begin an iOS refund request for the user's active entitlement.
 */
export async function beginRefundRequestForActiveEntitlement(): Promise<REFUND_REQUEST_STATUS> {
  try {
    const status = await Purchases.beginRefundRequestForActiveEntitlement()
    console.log('[RevenueCat] Refund request started', { status })
    return status
  } catch (error) {
    console.error('[RevenueCat] Refund request error:', error)
    throw error
  }
}
