import { Platform } from 'react-native'
import { useMutation } from '@tanstack/react-query'
import Constants from 'expo-constants'

import { supabase } from '~/lib/supabase'
import type { Json } from '~/types/supabase'
import { useAuth } from '~/hooks/useAuth'
import { requireAccountOwnedOperation } from '~/lib/accountLifecycleCoordinator'

export type PromoCodeFailureStatus =
  | 'invalid'
  | 'inactive'
  | 'expired'
  | 'over_limit'
  | 'already_redeemed'
  | 'platform_unavailable'

export type PromoCodeDiscountKind = 'free' | 'percent' | 'fixed_price'

export interface PromoCodeDisplay {
  name: string | null
  label: string | null
  discountPercent: number | null
  priceAmount: number | null
  priceCurrency: string | null
  paymentRequired: boolean
}

export interface PromoCodeRouting {
  platform: string | null
  storeAction:
    | 'ios_offer_code_sheet'
    | 'android_promo_code_flow'
    | 'revenuecat_purchase_package'
    | 'server_grant_lifetime'
    | 'local_test'
    | string
    | null
  productId: string | null
  revenueCatOfferingId: string | null
  revenueCatPackageId: string | null
  revenueCatEntitlementId: string | null
  fallbackUrl: string | null
}

export interface ValidPromoCodeResult {
  status: 'valid'
  messageKey: string | null
  campaignId: string
  campaignSlug: string | null
  codeId: string
  redemptionAttemptId: string
  campaignType: string | null
  discountKind: PromoCodeDiscountKind
  display: PromoCodeDisplay
  routing: PromoCodeRouting
}

export interface InvalidPromoCodeResult {
  status: PromoCodeFailureStatus
  messageKey: string | null
  redemptionAttemptId: string | null
  campaignId: string | null
  campaignSlug: string | null
  campaignType: string | null
  codeId: string | null
}

export type PromoCodeResult = ValidPromoCodeResult | InvalidPromoCodeResult

type JsonRecord = Record<string, Json | undefined>

const failureStatuses: PromoCodeFailureStatus[] = [
  'invalid',
  'inactive',
  'expired',
  'over_limit',
  'already_redeemed',
  'platform_unavailable',
]

const LOCAL_TEST_CODES = {
  FREE: 'LOCALFREE',
  DISCOUNT: 'LOCALDISCOUNT',
  EXPIRED: 'LOCALEXPIRED',
  USED: 'LOCALUSED',
  MAXED: 'LOCALMAXED',
  PLATFORM: 'LOCALPLATFORM',
} as const

export function normalizePromoCodeInput(value: string) {
  return value.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase()
}

function buildLocalValidPromoCodeResult(input: {
  code: string
  discountKind: PromoCodeDiscountKind
  paymentRequired: boolean
  label: string
  priceAmount: number | null
}) {
  return {
    status: 'valid',
    messageKey: 'local.valid',
    campaignId: `local-test-${input.code.toLowerCase()}`,
    campaignSlug: 'local-test',
    codeId: `local-code-${input.code.toLowerCase()}`,
    redemptionAttemptId: `local-attempt-${input.code.toLowerCase()}`,
    campaignType: input.paymentRequired ? 'percent_discount_lifetime' : 'free_lifetime',
    discountKind: input.discountKind,
    display: {
      name: input.label,
      label: input.label,
      discountPercent: input.discountKind === 'percent' ? 50 : null,
      priceAmount: input.priceAmount,
      priceCurrency: input.priceAmount === null ? null : 'USD',
      paymentRequired: input.paymentRequired,
    },
    routing: {
      platform: Platform.OS,
      storeAction: 'local_test',
      productId: 'domani_lifetime',
      revenueCatOfferingId: null,
      revenueCatPackageId: null,
      revenueCatEntitlementId: null,
      fallbackUrl: null,
    },
  } satisfies ValidPromoCodeResult
}

export function getLocalPromoCodeResult(code: string): PromoCodeResult | null {
  if (!__DEV__) return null

  switch (normalizePromoCodeInput(code)) {
    case LOCAL_TEST_CODES.FREE:
      return buildLocalValidPromoCodeResult({
        code,
        discountKind: 'free',
        paymentRequired: false,
        label: 'FREE Lifetime Access',
        priceAmount: null,
      })
    case LOCAL_TEST_CODES.DISCOUNT:
      return buildLocalValidPromoCodeResult({
        code,
        discountKind: 'percent',
        paymentRequired: true,
        label: '50% Off Lifetime Access',
        priceAmount: 4.99,
      })
    case LOCAL_TEST_CODES.EXPIRED:
      return {
        status: 'expired',
        messageKey: 'local.expired',
        redemptionAttemptId: `local-attempt-${code.toLowerCase()}`,
        campaignId: null,
        campaignSlug: null,
        campaignType: null,
        codeId: null,
      }
    case LOCAL_TEST_CODES.USED:
      return {
        status: 'already_redeemed',
        messageKey: 'local.already_redeemed',
        redemptionAttemptId: `local-attempt-${code.toLowerCase()}`,
        campaignId: null,
        campaignSlug: null,
        campaignType: null,
        codeId: null,
      }
    case LOCAL_TEST_CODES.MAXED:
      return {
        status: 'over_limit',
        messageKey: 'local.over_limit',
        redemptionAttemptId: `local-attempt-${code.toLowerCase()}`,
        campaignId: null,
        campaignSlug: null,
        campaignType: null,
        codeId: null,
      }
    case LOCAL_TEST_CODES.PLATFORM:
      return {
        status: 'platform_unavailable',
        messageKey: 'local.platform_unavailable',
        redemptionAttemptId: `local-attempt-${code.toLowerCase()}`,
        campaignId: null,
        campaignSlug: null,
        campaignType: null,
        codeId: null,
      }
    default:
      return null
  }
}

function asRecord(value: Json | undefined): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function asString(value: Json | undefined): string | null {
  return typeof value === 'string' ? value : null
}

function asNumber(value: Json | undefined): number | null {
  return typeof value === 'number' ? value : null
}

function asBoolean(value: Json | undefined): boolean | null {
  return typeof value === 'boolean' ? value : null
}

export function parsePromoCodeResult(value: Json): PromoCodeResult {
  const record = asRecord(value)
  const status = asString(record.status)

  if (status === 'valid') {
    const display = asRecord(record.display)
    const routing = asRecord(record.routing)
    const campaignId = asString(record.campaignId)
    const codeId = asString(record.codeId)
    const redemptionAttemptId = asString(record.redemptionAttemptId)

    if (!campaignId || !codeId || !redemptionAttemptId) {
      throw new Error('Invalid promo code validation response')
    }

    const discountKind = asString(record.discountKind)

    return {
      status,
      messageKey: asString(record.messageKey),
      campaignId,
      campaignSlug: asString(record.campaignSlug),
      codeId,
      redemptionAttemptId,
      campaignType: asString(record.campaignType),
      discountKind:
        discountKind === 'percent' || discountKind === 'fixed_price' ? discountKind : 'free',
      display: {
        name: asString(display.name),
        label: asString(display.label),
        discountPercent: asNumber(display.discountPercent),
        priceAmount: asNumber(display.priceAmount),
        priceCurrency: asString(display.priceCurrency),
        paymentRequired: asBoolean(display.paymentRequired) ?? false,
      },
      routing: {
        platform: asString(routing.platform),
        storeAction: asString(routing.storeAction),
        productId: asString(routing.productId),
        revenueCatOfferingId: asString(routing.revenueCatOfferingId),
        revenueCatPackageId: asString(routing.revenueCatPackageId),
        revenueCatEntitlementId: asString(routing.revenueCatEntitlementId),
        fallbackUrl: asString(routing.fallbackUrl),
      },
    }
  }

  if (status && failureStatuses.includes(status as PromoCodeFailureStatus)) {
    return {
      status: status as PromoCodeFailureStatus,
      messageKey: asString(record.messageKey),
      redemptionAttemptId: asString(record.redemptionAttemptId),
      campaignId: asString(record.campaignId),
      campaignSlug: asString(record.campaignSlug),
      campaignType: asString(record.campaignType),
      codeId: asString(record.codeId),
    }
  }

  throw new Error('Invalid promo code validation response')
}

export function useValidatePromoCode() {
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (code: string) => {
      const normalizedCode = normalizePromoCodeInput(code)
      const localResult = getLocalPromoCodeResult(normalizedCode)

      if (localResult) {
        return {
          code: normalizedCode,
          result: localResult,
        }
      }
      if (!user?.id) throw new Error('Not authenticated')
      const expectedUserId = user.id

      return requireAccountOwnedOperation(expectedUserId, async () => {
        const { data, error } = await supabase.rpc('validate_promo_code', {
          p_code: normalizedCode,
          p_platform: Platform.OS,
          p_app_version: Constants.expoConfig?.version ?? null,
        })

        if (error) throw error

        return {
          code: normalizedCode,
          result: parsePromoCodeResult(data),
        }
      })
    },
  })
}
