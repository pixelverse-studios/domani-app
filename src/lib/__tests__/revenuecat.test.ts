jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    getOfferings: jest.fn(),
    getAppUserID: jest.fn(),
    logIn: jest.fn(),
    logOut: jest.fn(),
    purchasePackage: jest.fn(),
  },
  LOG_LEVEL: { DEBUG: 'DEBUG' },
  REFUND_REQUEST_STATUS: {},
}))

import Purchases from 'react-native-purchases'
import {
  getOfferings,
  OFFERINGS,
  purchasePackageForUser,
  setRevenueCatSessionUser,
} from '../revenuecat'
import { waitFor } from '~/test/test-utils'

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

describe('RevenueCat session coordination', () => {
  it('skips stale logins and holds account switches until checkout finishes', async () => {
    let sdkUserId = 'anonymous'
    let finishOldLogin: (() => void) | undefined
    let finishPurchase: (() => void) | undefined
    const mockLogIn = Purchases.logIn as jest.Mock
    const mockPurchase = Purchases.purchasePackage as jest.Mock
    ;(Purchases.getAppUserID as jest.Mock).mockImplementation(async () => sdkUserId)
    mockLogIn.mockImplementation((userId: string) => {
      if (userId === 'user-a') {
        return new Promise((resolve) => {
          finishOldLogin = () => {
            sdkUserId = userId
            resolve({ customerInfo: { entitlements: { active: {} } } })
          }
        })
      }
      sdkUserId = userId
      return Promise.resolve({ customerInfo: { entitlements: { active: {} } } })
    })
    mockPurchase.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishPurchase = () =>
            resolve({
              transaction: { transactionIdentifier: 'transaction-1' },
              customerInfo: { entitlements: { active: {} } },
            })
        }),
    )

    const oldLogin = setRevenueCatSessionUser('user-a')
    await waitFor(() => expect(mockLogIn).toHaveBeenCalledWith('user-a'))
    const staleLogin = setRevenueCatSessionUser('user-a')
    const newLogin = setRevenueCatSessionUser('user-b')
    finishOldLogin?.()

    await expect(oldLogin).resolves.toBe(false)
    await expect(staleLogin).resolves.toBe(false)
    await expect(newLogin).resolves.toBe(true)
    expect(sdkUserId).toBe('user-b')
    expect(mockLogIn.mock.calls.map(([id]) => id)).toEqual(['user-a', 'user-b'])

    const pkg = {
      identifier: 'lifetime',
      packageType: 'LIFETIME',
      product: { identifier: 'domani_lifetime' },
    }
    const purchase = purchasePackageForUser(pkg as never, 'user-b')
    await waitFor(() => expect(mockPurchase).toHaveBeenCalledTimes(1))
    const followingLogin = setRevenueCatSessionUser('user-c')
    expect(sdkUserId).toBe('user-b')
    expect(mockLogIn).not.toHaveBeenCalledWith('user-c')
    finishPurchase?.()
    await purchase
    await expect(followingLogin).resolves.toBe(true)
    expect(sdkUserId).toBe('user-c')
    await expect(purchasePackageForUser(pkg as never, 'user-b')).rejects.toThrow(
      'PRICE_OFFER_UNAVAILABLE',
    )

    let nextLogin: Promise<boolean> | undefined
    await expect(
      purchasePackageForUser(pkg as never, 'user-c', async () => {
        nextLogin = setRevenueCatSessionUser('user-d')
      }),
    ).rejects.toThrow('PRICE_OFFER_UNAVAILABLE')
    await expect(nextLogin).resolves.toBe(true)
    expect(mockPurchase).toHaveBeenCalledTimes(1)
  })
})
