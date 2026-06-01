import React, { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AlertCircle, ArrowLeft, ArrowRight, Check, Crown } from 'lucide-react-native'
import { PACKAGE_TYPE } from 'react-native-purchases'
import { useQuery } from '@tanstack/react-query'

import { Text } from '~/components/ui'
import { useAnalytics } from '~/providers/AnalyticsProvider'
import { addBreadcrumb } from '~/lib/sentry'
import { getOfferings, OFFERINGS, setRevenueCatPromoRedemptionAttributes } from '~/lib/revenuecat'
import { findPromoPackage } from '~/lib/promoPackages'
import {
  buildPromoAnalyticsProps,
  recordPromoRedemptionAttemptEvent,
} from '~/lib/promoAnalytics'
import { useAppTheme } from '~/hooks/useAppTheme'
import {
  normalizePromoCodeInput,
  type PromoCodeFailureStatus,
  type PromoCodeResult,
  type ValidPromoCodeResult,
  useValidatePromoCode,
} from '~/hooks/usePromoCode'
import { useSubscription } from '~/hooks/useSubscription'
import { useTranslation } from '~/hooks/useTranslation'

function getPromoErrorKey(status: PromoCodeFailureStatus) {
  switch (status) {
    case 'expired':
      return 'subscription.redeemCode.errorExpired'
    case 'already_redeemed':
      return 'subscription.redeemCode.errorAlreadyRedeemed'
    case 'over_limit':
      return 'subscription.redeemCode.errorOverLimit'
    case 'platform_unavailable':
      return 'subscription.redeemCode.errorPlatformUnavailable'
    case 'inactive':
    case 'invalid':
    default:
      return 'subscription.redeemCode.errorInvalid'
  }
}

function formatPromoPrice(offer: ValidPromoCodeResult) {
  if (offer.display.priceAmount === null || !offer.display.priceCurrency) {
    return null
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: offer.display.priceCurrency,
    }).format(offer.display.priceAmount)
  } catch {
    return `${offer.display.priceAmount / 100} ${offer.display.priceCurrency}`
  }
}

function isValidPromoCodeResult(
  result: PromoCodeResult | null | undefined,
): result is ValidPromoCodeResult {
  return result?.status === 'valid'
}

export default function RedeemCodeScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { track } = useAnalytics()
  const subscription = useSubscription()
  const validatePromoCode = useValidatePromoCode()
  const [code, setCode] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [isApplyingOffer, setIsApplyingOffer] = useState(false)
  const [localTestConfirmed, setLocalTestConfirmed] = useState(false)
  const [showStoreFallback, setShowStoreFallback] = useState(false)

  const normalizedCode = normalizePromoCodeInput(code)
  const validation = validatePromoCode.data
  const validOffer = isValidPromoCodeResult(validation?.result) ? validation.result : null
  const invalidResult =
    validation?.result.status && validation.result.status !== 'valid' ? validation.result : null
  const showInvalid = !!invalidResult || !!validatePromoCode.error
  const priceString = validOffer ? formatPromoPrice(validOffer) : null
  const isConfirmed = localTestConfirmed || subscription.accessSyncPhase === 'confirmed'
  const isSyncing =
    subscription.accessSyncPhase === 'syncing' ||
    subscription.accessSyncPhase === 'os_confirmation_attempted' ||
    subscription.isSyncingAccess
  const shouldLoadGeneralOfferingPrice =
    !!validOffer && subscription.offeringIdentifier !== OFFERINGS.GENERAL
  const { data: generalOffering } = useQuery({
    queryKey: ['offerings', OFFERINGS.GENERAL],
    queryFn: () => getOfferings(OFFERINGS.GENERAL),
    enabled: shouldLoadGeneralOfferingPrice,
    retry: false,
  })
  const comparisonOffering =
    subscription.offeringIdentifier === OFFERINGS.GENERAL ? subscription.offerings : generalOffering
  const comparisonLifetimePackage =
    comparisonOffering?.availablePackages?.find(
      (pkg) => pkg.packageType === PACKAGE_TYPE.LIFETIME,
    ) ??
    comparisonOffering?.availablePackages?.[0] ??
    null
  const currentPriceString = comparisonLifetimePackage?.product.priceString ?? null
  const promoPriceString = validOffer
    ? validOffer.display.paymentRequired
      ? priceString
      : t('subscription.redeemCode.freePrice')
    : null
  const shouldShowCurrentPrice =
    !!currentPriceString && !!promoPriceString && currentPriceString !== promoPriceString
  const discountLabel =
    validOffer?.display.discountPercent !== null &&
    validOffer?.display.discountPercent !== undefined
      ? t('subscription.redeemCode.discountPercentLabel', {
          percent: validOffer.display.discountPercent,
        })
      : null

  const offerContext = useMemo(
    () =>
      validOffer
        ? {
            promoCode: normalizedCode,
            campaignId: validOffer.campaignId,
            campaignSlug: validOffer.campaignSlug,
            campaignType: validOffer.campaignType,
            codeId: validOffer.codeId,
            redemptionAttemptId: validOffer.redemptionAttemptId,
            discountKind: validOffer.discountKind,
            promoOutcome: validOffer.display.paymentRequired
              ? ('discounted' as const)
              : ('free' as const),
            priceString,
          }
        : null,
    [normalizedCode, priceString, validOffer],
  )

  useEffect(() => {
    track('promo_entry_opened', {})
  }, [track])

  const trackValidOfferEvent = (
    eventName: 'promo_applied' | 'promo_store_handoff_started',
    offer: ValidPromoCodeResult,
    source?: string,
  ) => {
    track(eventName, {
      ...buildPromoAnalyticsProps(offer),
      source,
    })
  }

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/(tabs)/settings')
    }
  }

  const handleCodeChange = (value: string) => {
    setCode(normalizePromoCodeInput(value))
    setActionError(null)
    setShowStoreFallback(false)
    setLocalTestConfirmed(false)
    validatePromoCode.reset()
  }

  const handleSubmit = async () => {
    if (!normalizedCode || validatePromoCode.isPending) return
    setActionError(null)
    setShowStoreFallback(false)

    track('promo_validation_attempted', {
      platform: Platform.OS,
      code_length: normalizedCode.length,
    })

    try {
      const response = await validatePromoCode.mutateAsync(normalizedCode)
      if (response.result.status === 'valid') {
        track('promo_validation_succeeded', buildPromoAnalyticsProps(response.result))
        subscription.markPromoCodeValidated({
          promoCode: normalizedCode,
          campaignId: response.result.campaignId,
          campaignSlug: response.result.campaignSlug,
          campaignType: response.result.campaignType,
          codeId: response.result.codeId,
          redemptionAttemptId: response.result.redemptionAttemptId,
          discountKind: response.result.discountKind,
          promoOutcome: response.result.display.paymentRequired ? 'discounted' : 'free',
          priceString: formatPromoPrice(response.result),
        })
      } else {
        track('promo_validation_failed', {
          ...buildPromoAnalyticsProps(response.result),
          error_code: response.result.status,
        })
        addBreadcrumb('Promo code validation failed', 'promo.validation', {
          status: response.result.status,
          campaignId: response.result.campaignId,
          redemptionAttemptId: response.result.redemptionAttemptId,
          platform: Platform.OS,
        })
      }
    } catch (error) {
      track('promo_validation_failed', {
        platform: Platform.OS,
        validation_status: 'request_failed',
        error_code: error instanceof Error ? error.message : String(error),
      })
      addBreadcrumb('Promo code validation request failed', 'promo.validation', {
        platform: Platform.OS,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const handleOpenFallback = async (offer: ValidPromoCodeResult) => {
    if (!offer.routing.fallbackUrl) {
      setActionError(t('subscription.redeemCode.errorPlatformUnavailable'))
      return
    }

    subscription.markExternalPurchaseAttempted({
      source: 'promo_redemption',
      forceStoreSync: true,
      attemptContext: offerContext,
    })
    trackValidOfferEvent('promo_store_handoff_started', offer, 'store_fallback')
    void recordPromoRedemptionAttemptEvent({
      redemptionAttemptId: offer.redemptionAttemptId,
      event: 'store_handoff_started',
      metadata: {
        source: 'store_fallback',
        platform: Platform.OS,
        storeAction: offer.routing.storeAction,
        productId: offer.routing.productId,
      },
    })
    addBreadcrumb('Started promo store fallback handoff', 'promo.handoff', {
      campaignId: offer.campaignId,
      redemptionAttemptId: offer.redemptionAttemptId,
      platform: Platform.OS,
    })
    try {
      await setRevenueCatPromoRedemptionAttributes(offerContext)
    } catch {
      // The fallback is the recovery path; do not block it on support metadata.
    }
    try {
      await Linking.openURL(offer.routing.fallbackUrl)
      setActionError(t('subscription.redeemCode.storeFallbackOpened'))
    } catch {
      void recordPromoRedemptionAttemptEvent({
        redemptionAttemptId: offer.redemptionAttemptId,
        event: 'redemption_failed',
        status: 'failed',
        errorCode: 'store_fallback_open_failed',
        errorMessage: 'subscription.redeemCode.storeFallbackFailed',
        metadata: {
          source: 'store_fallback',
          platform: Platform.OS,
        },
      })
      setActionError(t('subscription.redeemCode.storeFallbackFailed'))
    }
  }

  const handleSyncAccess = async () => {
    if (!offerContext || isApplyingOffer) return
    setActionError(null)
    setIsApplyingOffer(true)

    try {
      const result = await subscription.syncAccess({
        source: 'promo_redemption',
        forceStoreSync: true,
        attemptContext: offerContext,
      })
      if (result.status !== 'confirmed') {
        setActionError(t('subscription.redeemCode.syncPending'))
      } else {
        setShowStoreFallback(false)
      }
    } catch {
      setActionError(t('subscription.redeemCode.applyFailed'))
    } finally {
      setIsApplyingOffer(false)
    }
  }

  const handleRestore = async () => {
    setActionError(null)
    setIsApplyingOffer(true)

    try {
      const customerInfo = await subscription.restore()
      if (!customerInfo) {
        setActionError(t('subscription.redeemCode.restoreNotFound'))
      } else {
        setShowStoreFallback(false)
      }
    } catch {
      setActionError(t('subscription.redeemCode.restoreFailed'))
    } finally {
      setIsApplyingOffer(false)
    }
  }

  const purchasePromoPackage = async (offer: ValidPromoCodeResult) => {
    const offering = await getOfferings(offer.routing.revenueCatOfferingId ?? undefined)
    const promoPackage = findPromoPackage(offering?.availablePackages, offer)

    if (!promoPackage) {
      return 'package_unavailable' as const
    }

    trackValidOfferEvent('promo_store_handoff_started', offer, 'revenuecat_purchase_package')
    void recordPromoRedemptionAttemptEvent({
      redemptionAttemptId: offer.redemptionAttemptId,
      event: 'store_handoff_started',
      metadata: {
        source: 'revenuecat_purchase_package',
        platform: Platform.OS,
        storeAction: offer.routing.storeAction,
        productId: offer.routing.productId,
        revenueCatOfferingId: offer.routing.revenueCatOfferingId,
        revenueCatPackageId: offer.routing.revenueCatPackageId,
      },
    })

    const customerInfo = await subscription.purchase({
      pkg: promoPackage,
      attemptContext: offerContext,
    })

    return customerInfo ? ('confirmed' as const) : ('cancelled' as const)
  }

  const handleApplyOffer = async () => {
    if (!validOffer || !offerContext || isApplyingOffer) return
    setActionError(null)
    setShowStoreFallback(false)
    setIsApplyingOffer(true)

    try {
      trackValidOfferEvent('promo_applied', validOffer)
      void recordPromoRedemptionAttemptEvent({
        redemptionAttemptId: validOffer.redemptionAttemptId,
        event: 'promo_applied',
        metadata: {
          platform: Platform.OS,
          storeAction: validOffer.routing.storeAction,
          promoOutcome: validOffer.display.paymentRequired ? 'discounted' : 'free',
        },
      })

      if (normalizedCode === 'SYNCFAIL') {
        subscription.markExternalPurchaseAttempted({
          source: 'promo_redemption',
          forceStoreSync: true,
          attemptContext: offerContext,
        })
        const result = await subscription.syncAccess({
          source: 'promo_redemption',
          forceStoreSync: true,
          attemptContext: offerContext,
        })
        if (result.status !== 'confirmed') {
          setActionError(t('subscription.redeemCode.syncFailureTest'))
        }
        return
      }

      if (__DEV__ && validOffer.routing.storeAction === 'local_test') {
        await new Promise((resolve) => setTimeout(resolve, 450))
        setLocalTestConfirmed(true)
        return
      }

      if (!validOffer.display.paymentRequired) {
        const result = await subscription.redeemPromoCode(offerContext)
        if (!result || result.status !== 'confirmed') {
          setActionError(t('subscription.redeemCode.applyFailed'))
        }
        return
      }

      const purchaseResult = await purchasePromoPackage(validOffer)
      if (purchaseResult === 'package_unavailable') {
        if (validOffer.routing.fallbackUrl) {
          setShowStoreFallback(true)
          setActionError(t('subscription.redeemCode.nativeRedemptionUnavailable'))
        } else {
          setActionError(t('subscription.redeemCode.errorPlatformUnavailable'))
        }
        return
      }
      if (purchaseResult === 'cancelled') {
        setActionError(t('subscription.redeemCode.purchaseCancelled'))
      }
    } catch {
      void recordPromoRedemptionAttemptEvent({
        redemptionAttemptId: validOffer.redemptionAttemptId,
        event: 'redemption_failed',
        status: 'failed',
        errorCode: 'promo_apply_failed',
        errorMessage: 'subscription.redeemCode.applyFailed',
        metadata: {
          platform: Platform.OS,
          storeAction: validOffer.routing.storeAction,
        },
      })
      if (validOffer.routing.fallbackUrl) {
        setShowStoreFallback(true)
        setActionError(t('subscription.redeemCode.nativeRedemptionUnavailable'))
      } else {
        setActionError(t('subscription.redeemCode.applyFailed'))
      }
    } finally {
      setIsApplyingOffer(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
      style={{ backgroundColor: theme.colors.background }}
    >
      <ScrollView
        className="flex-1 px-5"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }}
      >
        <TouchableOpacity
          onPress={handleBack}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel={t('common.actions.back')}
          accessibilityRole="button"
        >
          <ArrowLeft size={22} color={theme.colors.brand.dark} />
        </TouchableOpacity>

        <Text className="text-3xl font-sans-bold text-content-primary mt-5">
          {t('subscription.redeemCode.title')}
        </Text>
        <Text className="text-base text-content-secondary mt-2">
          {t('subscription.redeemCode.subtitle')}
        </Text>

        {!validOffer && (
          <>
            <Text className="text-sm text-content-primary mt-7 mb-3">
              {t('subscription.redeemCode.fieldLabel')}
            </Text>
            <View className="flex-row items-center" style={{ gap: 12 }}>
              <TextInput
                value={code}
                onChangeText={handleCodeChange}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!validatePromoCode.isPending}
                placeholder={t('subscription.redeemCode.placeholder')}
                placeholderTextColor={theme.colors.text.tertiary}
                className="flex-1 rounded-xl font-sans-semibold"
                style={[
                  styles.input,
                  {
                    backgroundColor: '#FFFFFF',
                    borderColor: showInvalid ? '#FF5A5F' : theme.colors.border.secondary,
                    color: theme.colors.text.primary,
                  },
                ]}
                accessibilityLabel={t('subscription.redeemCode.fieldLabel')}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!normalizedCode || validatePromoCode.isPending}
                activeOpacity={0.8}
                className="rounded-xl items-center justify-center"
                style={[
                  styles.submitButton,
                  {
                    backgroundColor: theme.colors.brand.primary,
                    opacity: !normalizedCode || validatePromoCode.isPending ? 0.45 : 1,
                  },
                ]}
                accessibilityLabel={t('subscription.redeemCode.submit')}
                accessibilityRole="button"
              >
                {validatePromoCode.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <ArrowRight size={22} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>

            {showInvalid && (
              <View
                className="rounded-xl p-5 mt-4 flex-row"
                style={{
                  backgroundColor: '#FFF4F2',
                  borderWidth: 1,
                  borderColor: '#FFB4B4',
                }}
                accessibilityRole="alert"
              >
                <AlertCircle size={22} color="#FF343D" />
                <View className="ml-3 flex-1">
                  <Text className="font-sans-semibold text-content-primary">
                    {t('subscription.redeemCode.invalidTitle')}
                  </Text>
                  <Text className="text-sm leading-5 text-content-secondary mt-1">
                    {invalidResult
                      ? t(getPromoErrorKey(invalidResult.status))
                      : t('subscription.redeemCode.errorInvalid')}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}

        {validOffer && (
          <View
            className="rounded-2xl p-6 mt-8"
            style={{
              backgroundColor: theme.colors.interactive.hover,
              borderWidth: 1.5,
              borderColor: theme.colors.brand.primary,
            }}
          >
            <View
              className="self-center rounded-full items-center justify-center mb-5"
              style={{
                width: 64,
                height: 64,
                marginTop: 4,
                backgroundColor: `${theme.colors.brand.primary}1F`,
              }}
            >
              {isConfirmed ? (
                <Check size={30} color={theme.colors.brand.primary} />
              ) : (
                <Crown size={28} color={theme.colors.brand.primary} />
              )}
            </View>

            <Text className="text-xl font-sans-semibold text-content-primary text-center">
              {isConfirmed
                ? t('subscription.redeemCode.confirmedTitle')
                : t('subscription.redeemCode.acceptedTitle')}
            </Text>
            <Text className="text-sm text-content-secondary text-center mt-3">
              {normalizedCode}
            </Text>

            <View className="rounded-xl bg-white p-6 mt-6">
              <Text
                className="text-3xl font-sans-bold text-center"
                style={{ color: theme.colors.brand.primary, lineHeight: 36 }}
              >
                {validOffer.display.paymentRequired
                  ? (validOffer.display.label ?? t('subscription.redeemCode.discountedAccess'))
                  : t('subscription.redeemCode.freeLifetimeAccess')}
              </Text>
              {validOffer.display.paymentRequired ? (
                <Text className="text-sm text-content-secondary text-center mt-3">
                  {priceString
                    ? t('subscription.redeemCode.discountPrice', { price: priceString })
                    : t('subscription.redeemCode.paymentRequired')}
                </Text>
              ) : (
                <Text className="text-sm text-content-secondary text-center mt-3">
                  {t('subscription.redeemCode.noPaymentRequired')}
                </Text>
              )}
              {promoPriceString && (
                <View
                  className="mt-5 pt-4"
                  style={{ borderTopWidth: 1, borderTopColor: theme.colors.border.primary }}
                >
                  {shouldShowCurrentPrice && (
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-sm text-content-secondary">
                        {t('subscription.redeemCode.currentPrice')}
                      </Text>
                      <Text
                        className="text-sm text-content-tertiary"
                        style={{ textDecorationLine: 'line-through' }}
                      >
                        {currentPriceString}
                      </Text>
                    </View>
                  )}
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-content-secondary">
                      {t('subscription.redeemCode.promoPrice')}
                    </Text>
                    <Text
                      className="text-base font-sans-bold"
                      style={{ color: theme.colors.brand.primary }}
                    >
                      {promoPriceString}
                    </Text>
                  </View>
                  {discountLabel && (
                    <View className="flex-row items-center justify-between mt-2">
                      <Text className="text-sm text-content-secondary">
                        {t('subscription.redeemCode.discountLabel')}
                      </Text>
                      <Text
                        className="text-sm font-sans-semibold"
                        style={{ color: theme.colors.brand.primary }}
                      >
                        {discountLabel}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {actionError && (
              <Text
                className="text-sm text-center mt-4"
                style={{ color: theme.colors.accent.brick }}
              >
                {actionError}
              </Text>
            )}

            {actionError && !isConfirmed && (
              <View className="flex-row flex-wrap justify-center mt-4" style={{ gap: 10 }}>
                <TouchableOpacity
                  onPress={handleSyncAccess}
                  disabled={isApplyingOffer || isSyncing}
                  activeOpacity={0.8}
                  className="px-4 py-2 rounded-full"
                  style={{
                    backgroundColor: theme.colors.card,
                    borderWidth: 1,
                    borderColor: theme.colors.border.primary,
                    opacity: isApplyingOffer || isSyncing ? 0.55 : 1,
                  }}
                >
                  <Text className="text-sm font-sans-semibold text-content-primary">
                    {t('subscription.redeemCode.syncAccess')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleRestore}
                  disabled={isApplyingOffer || isSyncing}
                  activeOpacity={0.8}
                  className="px-4 py-2 rounded-full"
                  style={{
                    backgroundColor: theme.colors.card,
                    borderWidth: 1,
                    borderColor: theme.colors.border.primary,
                    opacity: isApplyingOffer || isSyncing ? 0.55 : 1,
                  }}
                >
                  <Text className="text-sm font-sans-semibold text-content-primary">
                    {t('subscription.redeemCode.restorePurchases')}
                  </Text>
                </TouchableOpacity>
                {showStoreFallback && validOffer.routing.fallbackUrl && (
                  <TouchableOpacity
                    onPress={() => handleOpenFallback(validOffer)}
                    disabled={isApplyingOffer || isSyncing}
                    activeOpacity={0.8}
                    className="px-4 py-2 rounded-full"
                    style={{
                      backgroundColor: theme.colors.card,
                      borderWidth: 1,
                      borderColor: theme.colors.border.primary,
                      opacity: isApplyingOffer || isSyncing ? 0.55 : 1,
                    }}
                  >
                    <Text className="text-sm font-sans-semibold text-content-primary">
                      {t('subscription.redeemCode.openAppStore')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {isSyncing && !isConfirmed && (
              <View className="flex-row justify-center items-center mt-5">
                <ActivityIndicator size="small" color={theme.colors.brand.primary} />
                <Text className="text-sm text-content-secondary ml-2">
                  {t('subscription.redeemCode.syncing')}
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={isConfirmed ? handleBack : handleApplyOffer}
              disabled={isApplyingOffer || isSyncing}
              activeOpacity={0.85}
              className="rounded-full py-4 mt-6 flex-row justify-center items-center"
              style={{
                backgroundColor: theme.colors.brand.primary,
                opacity: isApplyingOffer || isSyncing ? 0.55 : 1,
              }}
              accessibilityRole="button"
            >
              {isApplyingOffer || isSyncing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  {!isConfirmed && <Crown size={18} color="#FFFFFF" />}
                  <Text className="text-white font-sans-bold ml-2">
                    {isConfirmed
                      ? t('subscription.redeemCode.done')
                      : validOffer.display.paymentRequired
                        ? priceString
                          ? t('subscription.redeemCode.redeemDiscountedAccessWithPrice', {
                              price: priceString,
                            })
                          : t('subscription.redeemCode.redeemDiscountedAccess')
                        : t('subscription.redeemCode.redeemFreeAccess')}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {!isConfirmed && (
              <TouchableOpacity
                onPress={() => {
                  validatePromoCode.reset()
                  setActionError(null)
                  setShowStoreFallback(false)
                  setLocalTestConfirmed(false)
                }}
                activeOpacity={0.7}
                className="items-center mt-5"
              >
                <Text className="text-sm text-content-secondary">
                  {t('subscription.redeemCode.tryDifferentCode')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  input: {
    height: 54,
    borderWidth: 1,
    fontSize: 16,
    letterSpacing: 0.5,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 1 : 0,
    paddingBottom: 0,
    textAlignVertical: 'center',
  },
  submitButton: {
    width: 50,
    height: 50,
  },
})
