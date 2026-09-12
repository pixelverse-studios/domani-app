import {
  parseExpectedUserId,
  parsePromoConfirmationContext,
  parseVerifiedLifetimeAccess,
} from '../accessSyncCore'

const entitlementId = 'Domani Staging Lifetime'

function buildPayload(
  entitlement: Record<string, unknown> = {
    expires_date: null,
    product_identifier: 'domani_lifetime',
    purchase_date: '2026-08-20T12:00:00.000Z',
  },
) {
  return {
    subscriber: {
      entitlements: {
        [entitlementId]: entitlement,
      },
    },
  }
}

describe('RevenueCat access sync core', () => {
  it('accepts a verified active lifetime entitlement', () => {
    expect(parseVerifiedLifetimeAccess(buildPayload(), entitlementId)).toEqual({
      status: 'verified',
      productId: 'domani_lifetime',
      purchasedAt: '2026-08-20T12:00:00.000Z',
    })
  })

  it('rejects missing and expired entitlements', () => {
    expect(
      parseVerifiedLifetimeAccess({ subscriber: { entitlements: {} } }, entitlementId),
    ).toEqual({ status: 'missing_entitlement' })
    expect(
      parseVerifiedLifetimeAccess(
        buildPayload({
          expires_date: '2026-08-19T12:00:00.000Z',
          product_identifier: 'domani_lifetime',
          purchase_date: '2026-08-18T12:00:00.000Z',
        }),
        entitlementId,
        new Date('2026-08-20T12:00:00.000Z'),
      ),
    ).toEqual({ status: 'expired_entitlement' })
  })

  it('rejects unknown products and malformed purchase timestamps', () => {
    expect(
      parseVerifiedLifetimeAccess(
        buildPayload({
          expires_date: null,
          product_identifier: 'forged_product',
          purchase_date: '2026-08-20T12:00:00.000Z',
        }),
        entitlementId,
      ),
    ).toEqual({ status: 'invalid_entitlement' })
    expect(
      parseVerifiedLifetimeAccess(
        buildPayload({
          expires_date: null,
          product_identifier: 'domani_lifetime',
          purchase_date: 'not-a-date',
        }),
        entitlementId,
      ),
    ).toEqual({ status: 'invalid_entitlement' })
  })

  it('accepts only complete UUID-bound promo context', () => {
    expect(
      parsePromoConfirmationContext({
        redemptionAttemptId: '10000000-0000-4000-8000-000000000001',
        codeId: '20000000-0000-4000-8000-000000000002',
        campaignId: '30000000-0000-4000-8000-000000000003',
      }),
    ).toEqual({
      redemptionAttemptId: '10000000-0000-4000-8000-000000000001',
      codeId: '20000000-0000-4000-8000-000000000002',
      campaignId: '30000000-0000-4000-8000-000000000003',
    })
    expect(() => parsePromoConfirmationContext({ redemptionAttemptId: 'not-a-uuid' })).toThrow(
      'INVALID_PROMO_CONTEXT',
    )
  })

  it('accepts an optional UUID-bound expected user id', () => {
    expect(parseExpectedUserId(null)).toBeNull()
    expect(parseExpectedUserId('10000000-0000-4000-8000-000000000001')).toBe(
      '10000000-0000-4000-8000-000000000001',
    )
    expect(() => parseExpectedUserId('user-1')).toThrow('INVALID_EXPECTED_USER_ID')
  })
})
