jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {},
  LOG_LEVEL: { DEBUG: 'DEBUG' },
  REFUND_REQUEST_STATUS: {},
}))

import { getOfferingForCohort, OFFERINGS } from '../revenuecat'

describe('RevenueCat offering routing', () => {
  it('routes friends-family cohort users to general pricing outside promo redemption', () => {
    expect(getOfferingForCohort('friends_family')).toBe(OFFERINGS.GENERAL)
  })

  it('keeps early adopter cohort pricing available outside promo redemption', () => {
    expect(getOfferingForCohort('early_adopter')).toBe(OFFERINGS.EARLY_ADOPTER)
  })

  it('routes unknown or missing cohorts to general pricing', () => {
    expect(getOfferingForCohort('general')).toBe(OFFERINGS.GENERAL)
    expect(getOfferingForCohort(null)).toBe(OFFERINGS.GENERAL)
    expect(getOfferingForCohort(undefined)).toBe(OFFERINGS.GENERAL)
  })
})
