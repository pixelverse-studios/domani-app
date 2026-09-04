export const LIFETIME_PRODUCT_IDS = new Set([
  'domani_lifetime',
  'domani_lifetime_early',
  'domani_lifetime_friends',
])

export const PROMO_GATED_LIFETIME_PRODUCT_IDS = new Set(['domani_lifetime_friends'])

export interface PromoConfirmationContext {
  redemptionAttemptId: string
  codeId: string
  campaignId: string
}

interface RevenueCatEntitlement {
  expires_date?: unknown
  product_identifier?: unknown
  purchase_date?: unknown
}

export type VerifiedLifetimeAccess =
  | {
      status: 'verified'
      productId: string
      purchasedAt: string
    }
  | {
      status: 'missing_entitlement' | 'expired_entitlement' | 'invalid_entitlement'
    }

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export function parseExpectedUserId(value: unknown): string | null {
  if (value == null) return null
  if (typeof value !== 'string') throw new Error('INVALID_EXPECTED_USER_ID')

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidPattern.test(value)) throw new Error('INVALID_EXPECTED_USER_ID')
  return value
}

function parseIsoDate(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function parsePromoConfirmationContext(value: unknown): PromoConfirmationContext | null {
  if (value == null) return null
  if (!isRecord(value)) throw new Error('INVALID_PROMO_CONTEXT')

  const redemptionAttemptId = value.redemptionAttemptId
  const codeId = value.codeId
  const campaignId = value.campaignId
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  if (
    typeof redemptionAttemptId !== 'string' ||
    typeof codeId !== 'string' ||
    typeof campaignId !== 'string' ||
    !uuidPattern.test(redemptionAttemptId) ||
    !uuidPattern.test(codeId) ||
    !uuidPattern.test(campaignId)
  ) {
    throw new Error('INVALID_PROMO_CONTEXT')
  }

  return { redemptionAttemptId, codeId, campaignId }
}

export function parseVerifiedLifetimeAccess(
  payload: unknown,
  entitlementId: string,
  now = new Date(),
): VerifiedLifetimeAccess {
  if (!isRecord(payload)) return { status: 'invalid_entitlement' }

  const subscriber = payload.subscriber
  if (!isRecord(subscriber)) return { status: 'invalid_entitlement' }

  const entitlements = subscriber.entitlements
  if (!isRecord(entitlements)) return { status: 'missing_entitlement' }

  const entitlement = entitlements[entitlementId]
  if (!isRecord(entitlement)) return { status: 'missing_entitlement' }

  const productId = entitlement.product_identifier
  const purchasedAt = parseIsoDate(entitlement.purchase_date)
  if (typeof productId !== 'string' || !LIFETIME_PRODUCT_IDS.has(productId) || !purchasedAt) {
    return { status: 'invalid_entitlement' }
  }

  if (entitlement.expires_date != null) {
    const expiresAt = parseIsoDate(entitlement.expires_date)
    if (!expiresAt) return { status: 'invalid_entitlement' }
    if (new Date(expiresAt).getTime() <= now.getTime()) {
      return { status: 'expired_entitlement' }
    }
  }

  return {
    status: 'verified',
    productId,
    purchasedAt,
  }
}
