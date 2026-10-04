jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: { getOfferings: jest.fn() },
  LOG_LEVEL: { DEBUG: 'DEBUG' },
  REFUND_REQUEST_STATUS: {},
}))

import Purchases from 'react-native-purchases'
import { getOfferings, OFFERINGS } from '../revenuecat'

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
