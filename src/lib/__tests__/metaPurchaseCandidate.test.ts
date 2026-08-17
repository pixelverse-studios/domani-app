import AsyncStorage from '@react-native-async-storage/async-storage'

import {
  candidateMatchesEntitlement,
  clearMetaPurchaseCandidate,
  createMetaPurchaseCandidate,
  getMetaPurchaseCandidate,
  isMetaPurchaseCandidateExpired,
  recordMetaPurchaseCandidateTransaction,
} from '../metaPurchaseCandidate'

describe('Meta purchase candidates', () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
    jest.useRealTimers()
  })

  it('persists checkout context and transaction confirmation', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-17T12:00:00.000Z'))
    const candidate = await createMetaPurchaseCandidate({
      userId: 'user-1',
      productId: 'domani_lifetime',
      amount: 9.99,
      currency: 'usd',
      offer: 'general',
      baselinePurchaseDate: null,
    })

    await recordMetaPurchaseCandidateTransaction(candidate, {
      transactionId: 'transaction-1',
      purchaseDate: '2026-08-17T12:01:00.000Z',
    })

    await expect(getMetaPurchaseCandidate('user-1')).resolves.toMatchObject({
      amount: 9.99,
      currency: 'USD',
      transactionId: 'transaction-1',
      transactionPurchaseDate: '2026-08-17T12:01:00.000Z',
    })
  })

  it('matches a post-attempt entitlement but rejects the baseline purchase', () => {
    const candidate = {
      userId: 'user-1',
      productId: 'domani_lifetime',
      amount: 9.99,
      currency: 'USD',
      offer: 'general',
      startedAt: '2026-08-17T12:00:00.000Z',
      baselinePurchaseDate: '2026-08-01T12:00:00.000Z',
      transactionId: null,
      transactionPurchaseDate: null,
    }

    expect(
      candidateMatchesEntitlement(candidate, {
        productIdentifier: 'domani_lifetime',
        latestPurchaseDate: '2026-08-17T12:01:00.000Z',
      }),
    ).toBe(true)
    expect(
      candidateMatchesEntitlement(candidate, {
        productIdentifier: 'domani_lifetime',
        latestPurchaseDate: '2026-08-01T12:00:00.000Z',
      }),
    ).toBe(false)
  })

  it('expires abandoned candidates and clears them explicitly', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-01T12:00:00.000Z'))
    const candidate = await createMetaPurchaseCandidate({
      userId: 'user-1',
      productId: 'domani_lifetime',
    })

    expect(isMetaPurchaseCandidateExpired(candidate, Date.parse('2026-08-09T12:00:00.000Z'))).toBe(
      true,
    )
    await clearMetaPurchaseCandidate('user-1')
    await expect(getMetaPurchaseCandidate('user-1')).resolves.toBeNull()
  })
})
