jest.mock('~/lib/revenuecat', () => ({
  ENTITLEMENT_ID: 'test-entitlement',
  getOfferingForCohort: jest.fn(),
  getOfferings: jest.fn(),
  initializeRevenueCat: jest.fn(),
  loginRevenueCat: jest.fn(),
  logoutRevenueCat: jest.fn(),
  purchasePackage: jest.fn(),
  restorePurchases: jest.fn(),
  syncRevenueCatSubscriberAttributes: jest.fn(),
}))

import {
  hasFullAccess,
  isLocked,
  needsToStartTrial,
  type SubscriptionStatus,
} from '../useSubscription'

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
