import React, { useMemo, useState } from 'react'
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

import { Text } from '~/components/ui'
import { getOfferings, setRevenueCatPromoRedemptionAttributes } from '~/lib/revenuecat'
import { findPromoPackage } from '~/lib/promoPackages'
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
  const subscription = useSubscription()
  const validatePromoCode = useValidatePromoCode()
  const [code, setCode] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [isApplyingOffer, setIsApplyingOffer] = useState(false)
  const [localTestConfirmed, setLocalTestConfirmed] = useState(false)

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
  const activeLifetimePackage =
    subscription.offerings?.availablePackages?.find(
      (pkg) => pkg.packageType === PACKAGE_TYPE.LIFETIME,
    ) ??
    subscription.offerings?.availablePackages?.[0] ??
    null
  const activePriceString = activeLifetimePackage?.product.priceString ?? null
  const promoPriceString = validOffer
    ? validOffer.display.paymentRequired
      ? priceString
      : t('subscription.redeemCode.freePrice')
    : null

  const offerContext = useMemo(
    () =>
      validOffer
        ? {
            promoCode: normalizedCode,
            campaignId: validOffer.campaignId,
            codeId: validOffer.codeId,
            redemptionAttemptId: validOffer.redemptionAttemptId,
            promoOutcome: validOffer.display.paymentRequired
              ? ('discounted' as const)
              : ('free' as const),
            priceString,
          }
        : null,
    [normalizedCode, priceString, validOffer],
  )

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
    setLocalTestConfirmed(false)
    validatePromoCode.reset()
  }

  const handleSubmit = async () => {
    if (!normalizedCode || validatePromoCode.isPending) return
    setActionError(null)
    const response = await validatePromoCode.mutateAsync(normalizedCode)
    if (response.result.status === 'valid') {
      subscription.markPromoCodeValidated({
        promoCode: normalizedCode,
        campaignId: response.result.campaignId,
        codeId: response.result.codeId,
        redemptionAttemptId: response.result.redemptionAttemptId,
        promoOutcome: response.result.display.paymentRequired ? 'discounted' : 'free',
        priceString: formatPromoPrice(response.result),
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
    await setRevenueCatPromoRedemptionAttributes(offerContext)
    await Linking.openURL(offer.routing.fallbackUrl)
  }

  const handleApplyOffer = async () => {
    if (!validOffer || !offerContext || isApplyingOffer) return
    setActionError(null)
    setIsApplyingOffer(true)

    try {
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
        if (
          validOffer.routing.storeAction === 'android_promo_code_flow' &&
          Platform.OS === 'android'
        ) {
          await handleOpenFallback(validOffer)
          return
        }

        const result = await subscription.redeemPromoCode(offerContext)
        if (!result || result.status !== 'confirmed') {
          setActionError(t('subscription.redeemCode.syncPending'))
        }
        return
      }

      const offering = await getOfferings(validOffer.routing.revenueCatOfferingId ?? undefined)
      const promoPackage = findPromoPackage(offering?.availablePackages, validOffer)

      if (!promoPackage) {
        setActionError(t('subscription.redeemCode.errorPlatformUnavailable'))
        return
      }

      const customerInfo = await subscription.purchase({
        pkg: promoPackage,
        attemptContext: offerContext,
      })
      if (!customerInfo) {
        setActionError(t('subscription.redeemCode.purchaseCancelled'))
      }
    } catch {
      setActionError(t('subscription.redeemCode.applyFailed'))
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
                className="flex-1 rounded-xl px-4 text-base font-sans-semibold"
                style={[
                  styles.input,
                  {
                    backgroundColor: '#FFFFFF',
                    borderColor: showInvalid ? '#FF5A5F' : theme.colors.border.secondary,
                    color: theme.colors.text.primary,
                    lineHeight: 20,
                    paddingTop: 0,
                    paddingBottom: 0,
                    textAlignVertical: 'center',
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
                  {activePriceString && (
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-sm text-content-secondary">
                        {t('subscription.redeemCode.currentPrice')}
                      </Text>
                      <Text
                        className="text-sm text-content-tertiary"
                        style={{ textDecorationLine: 'line-through' }}
                      >
                        {activePriceString}
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
                        ? t('subscription.redeemCode.redeemDiscountedAccess')
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
    letterSpacing: 0.5,
  },
  submitButton: {
    width: 50,
    height: 50,
  },
})
