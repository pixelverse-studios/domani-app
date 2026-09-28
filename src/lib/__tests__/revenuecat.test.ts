jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: { getOfferings: jest.fn() },
  LOG_LEVEL: { DEBUG: 'DEBUG' },
  REFUND_REQUEST_STATUS: {},
}))

import Purchases from 'react-native-purchases'
import { getOfferingForCohort, getOfferings, OFFERINGS } from '../revenuecat'

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

describe('RevenueCat offering availability', () => {
  const mockGetOfferings = Purchases.getOfferings as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('does not substitute the current offer when the selected price is unavailable', async () => {
    const current = { identifier: OFFERINGS.GENERAL, availablePackages: [] }
    mockGetOfferings.mockResolvedValue({ all: { general: current }, current })

    await expect(getOfferings(OFFERINGS.EARLY_ADOPTER)).resolves.toBeNull()
  })

  it('returns the exact selected offer when available', async () => {
    const earlyAdopter = { identifier: OFFERINGS.EARLY_ADOPTER, availablePackages: [] }
    const current = { identifier: OFFERINGS.GENERAL, availablePackages: [] }
    mockGetOfferings.mockResolvedValue({
      all: { early_adopter: earlyAdopter, general: current },
      current,
    })

    await expect(getOfferings(OFFERINGS.EARLY_ADOPTER)).resolves.toBe(earlyAdopter)
  })
})
