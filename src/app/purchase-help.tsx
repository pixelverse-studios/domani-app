import React, { useEffect, useState } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  StyleSheet,
  Linking,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { REFUND_REQUEST_STATUS } from 'react-native-purchases'
import {
  ArrowLeft,
  MessageCircle,
  Receipt,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  BadgeHelp,
  Smartphone,
} from 'lucide-react-native'

import { Text } from '~/components/ui'
import { GradientButton } from '~/components/ui/GradientButton'
import { useAppTheme } from '~/hooks/useAppTheme'
import { usePurchaseRefundState } from '~/hooks/usePurchaseRefundState'
import { useScreenTracking } from '~/hooks/useScreenTracking'
import { useSubscription } from '~/hooks/useSubscription'
import { useTranslation } from '~/hooks/useTranslation'
import { beginRefundRequestForActiveEntitlement } from '~/lib/revenuecat'
import { addBreadcrumb, captureException, captureMessage } from '~/lib/sentry'

type PurchaseHelpSource = 'locked' | 'settings' | 'paywall'

export default function PurchaseHelpScreen() {
  useScreenTracking('purchase_help')
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const theme = useAppTheme()
  const subscription = useSubscription()
  const purchaseRefundState = usePurchaseRefundState()
  const { catalog, t } = useTranslation()
  const { source } = useLocalSearchParams<{ source?: PurchaseHelpSource }>()
  const [isRequestingRefund, setIsRequestingRefund] = useState(false)
  const previousAndroidPurchaseHelpBreadcrumbRef = React.useRef<string | null>(null)
  const [refundStatusState, setRefundStatusState] = useState<
    'idle' | 'submitted' | 'pending' | 'approved' | 'existing_request' | 'denied'
  >('idle')
  const isIos = Platform.OS === 'ios'
  const isRefunded = subscription.status === 'refunded'
  const isLifetime = subscription.status === 'lifetime'
  const canRequestIosRefund = subscription.canRequestIosRefund
  const canRequestAndroidRefund = subscription.canRequestAndroidRefund
  const persistedRefundStatus = purchaseRefundState.refundState?.status ?? null
  const persistedClientHint = purchaseRefundState.refundState?.client_hint ?? null
  const hasPendingRefundReview = persistedRefundStatus === 'pending_review'
  const hasApprovedRefund = persistedRefundStatus === 'approved'
  const hasDeniedRefund = persistedRefundStatus === 'denied'
  const hasDuplicateRequestHint =
    persistedRefundStatus === null && persistedClientHint === 'duplicate_request'
  const canStartRefundRequest =
    canRequestIosRefund &&
    !hasPendingRefundReview &&
    !hasApprovedRefund &&
    !hasDeniedRefund &&
    !hasDuplicateRequestHint &&
    !purchaseRefundState.isLoading
  const effectiveRefundStatusState =
    persistedRefundStatus === 'approved'
      ? 'approved'
      : persistedRefundStatus === 'pending_review'
        ? 'pending'
        : persistedRefundStatus === 'denied'
          ? 'denied'
          : hasDuplicateRequestHint
            ? 'existing_request'
            : refundStatusState
  const isBusy =
    subscription.isRestoring ||
    isRequestingRefund ||
    purchaseRefundState.isMarkingPending ||
    purchaseRefundState.isRecordingDuplicateRequestHint ||
    purchaseRefundState.isClearingState

  const androidRefundUrl = 'https://play.google.com/store/account/orderhistory'

  useEffect(() => {
    if (isIos) return

    const breadcrumbSignature = JSON.stringify({
      source: source ?? 'purchase_help',
      subscriptionStatus: subscription.status,
      canRequestAndroidRefund,
      isRefunded,
      persistedRefundStatus,
      persistedClientHint,
      isLoadingSubscription: subscription.isLoading,
      isLoadingRefundState: purchaseRefundState.isLoading,
    })

    if (previousAndroidPurchaseHelpBreadcrumbRef.current === breadcrumbSignature) return
    previousAndroidPurchaseHelpBreadcrumbRef.current = breadcrumbSignature

    addBreadcrumb('Viewed Android purchase help', 'purchase_help.android', {
      source: source ?? 'purchase_help',
      subscriptionStatus: subscription.status,
      canRequestAndroidRefund,
      isRefunded,
      persistedRefundStatus,
      persistedClientHint,
      isLoadingSubscription: subscription.isLoading,
      isLoadingRefundState: purchaseRefundState.isLoading,
    })
  }, [
    canRequestAndroidRefund,
    isIos,
    isRefunded,
    persistedClientHint,
    persistedRefundStatus,
    purchaseRefundState.isLoading,
    source,
    subscription.isLoading,
    subscription.status,
  ])

  const openExternalUrl = async (url: string) => {
    try {
      addBreadcrumb('Attempting Android external billing handoff', 'purchase_help.android', {
        source: source ?? 'purchase_help',
        url,
        subscriptionStatus: subscription.status,
        canRequestAndroidRefund,
      })

      const supported = await Linking.canOpenURL(url)
      if (!supported) {
        captureMessage('Android purchase help URL cannot be opened', 'warning')
        Alert.alert(
          t('subscription.purchaseHelp.androidOpenErrorTitle'),
          t('subscription.purchaseHelp.androidOpenErrorBody'),
        )
        return
      }

      await Linking.openURL(url)
      addBreadcrumb('Opened Android external billing handoff', 'purchase_help.android', {
        source: source ?? 'purchase_help',
        url,
      })
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'purchase_help_android_open_external_url',
        source: source ?? 'purchase_help',
        url,
        subscriptionStatus: subscription.status,
        canRequestAndroidRefund,
      })
      Alert.alert(
        t('subscription.purchaseHelp.androidOpenErrorTitle'),
        t('subscription.purchaseHelp.androidOpenErrorBody'),
      )
    }
  }

  const openBillingSupport = (context: string) => {
    if (!isIos) {
      addBreadcrumb('Opened Android billing support from purchase help', 'purchase_help.android', {
        source: source ?? 'purchase_help',
        context,
        subscriptionStatus: subscription.status,
        canRequestAndroidRefund,
        isRefunded,
      })
    }

    router.push({
      pathname: '/contact-support',
      params: {
        category: 'billing_question',
        context,
        source: source ?? 'purchase_help',
      },
    })
  }

  const handleRequestRefund = async () => {
    try {
      setIsRequestingRefund(true)
      const status = await beginRefundRequestForActiveEntitlement()

      if (status === REFUND_REQUEST_STATUS.SUCCESS) {
        try {
          await purchaseRefundState.markPending({
            platform: 'ios',
            source: source ?? 'purchase_help',
          })
        } catch (persistError) {
          console.warn('[purchase-help] failed to persist refund pending state after success', {
            source: source ?? 'purchase_help',
            error: persistError,
          })
        }
        setRefundStatusState('submitted')
        return
      }

      if (status === REFUND_REQUEST_STATUS.USER_CANCELLED) {
        return
      }

      Alert.alert(
        t('subscription.purchaseHelp.iosRefundErrorTitle'),
        t('subscription.purchaseHelp.iosRefundErrorBody'),
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)

      if (message.includes('Refund already requested')) {
        try {
          await purchaseRefundState.recordDuplicateRequestHint({
            platform: 'ios',
            source: source ?? 'purchase_help',
            error: message,
          })
        } catch (persistError) {
          console.warn(
            '[purchase-help] failed to persist duplicate refund request hint',
            {
              source: source ?? 'purchase_help',
              error: persistError,
            },
          )
        }
        setRefundStatusState('existing_request')
        return
      }

      Alert.alert(
        t('subscription.purchaseHelp.iosRefundErrorTitle'),
        t('subscription.purchaseHelp.iosRefundErrorBody'),
      )
    } finally {
      setIsRequestingRefund(false)
    }
  }

  const handleRepurchase = () => {
    if (!isIos) {
      addBreadcrumb('Tapped Android repurchase CTA from purchase help', 'purchase_help.android', {
        source: source ?? 'purchase_help',
        subscriptionStatus: subscription.status,
      })
    }

    router.push('/(tabs)/settings?openPaywall=1')
  }

  if (isIos) {
    return (
      <View
        className="flex-1"
        style={{ paddingTop: insets.top, backgroundColor: theme.colors.background }}
      >
        <View className="flex-row items-center px-5 pt-4 pb-2">
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={24} color={theme.colors.brand.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        >
          {effectiveRefundStatusState !== 'idle' ? (
            <View className="flex-1 pt-8 pb-2">
              <View
                className="self-start rounded-full px-4 py-4"
                style={{ backgroundColor: `${theme.colors.brand.primary}14` }}
              >
                <CheckCircle2 size={28} color={theme.colors.brand.primary} />
              </View>

              <Text
                className="text-3xl font-sans-semibold mt-7 pr-6"
                style={{ color: theme.colors.brand.primary }}
              >
                {effectiveRefundStatusState === 'pending'
                  ? t('subscription.purchaseHelp.iosPendingTitle')
                  : effectiveRefundStatusState === 'existing_request'
                    ? t('subscription.purchaseHelp.iosExistingRequestTitle')
                    : effectiveRefundStatusState === 'approved'
                    ? t('subscription.purchaseHelp.iosApprovedTitle')
                    : effectiveRefundStatusState === 'denied'
                      ? t('subscription.purchaseHelp.iosDeniedTitle')
                    : t('subscription.purchaseHelp.iosSubmittedTitle')}
              </Text>
              <Text
                className="text-base text-content-secondary mt-3 pr-4"
                style={{ lineHeight: 24 }}
              >
                {effectiveRefundStatusState === 'pending'
                  ? t('subscription.purchaseHelp.iosPendingBody')
                  : effectiveRefundStatusState === 'existing_request'
                    ? t('subscription.purchaseHelp.iosExistingRequestBody')
                    : effectiveRefundStatusState === 'approved'
                    ? t('subscription.purchaseHelp.iosApprovedBody')
                    : effectiveRefundStatusState === 'denied'
                      ? t('subscription.purchaseHelp.iosDeniedBody')
                    : t('subscription.purchaseHelp.iosSubmittedBody')}
              </Text>

              <View
                className="mt-8 pl-4 pr-1 py-1"
                style={{
                  borderLeftWidth: 2,
                  borderLeftColor: `${theme.colors.brand.primary}33`,
                }}
              >
                <Text className="text-sm font-sans-semibold text-content-primary mb-1">
                  {effectiveRefundStatusState === 'pending'
                    ? t('subscription.purchaseHelp.iosPendingNoteTitle')
                    : effectiveRefundStatusState === 'existing_request'
                      ? t('subscription.purchaseHelp.iosExistingRequestNoteTitle')
                      : effectiveRefundStatusState === 'approved'
                      ? t('subscription.purchaseHelp.iosApprovedNoteTitle')
                      : effectiveRefundStatusState === 'denied'
                        ? t('subscription.purchaseHelp.iosDeniedNoteTitle')
                      : t('subscription.purchaseHelp.iosSubmittedNoteTitle')}
                </Text>
                <Text
                  className="text-sm text-content-secondary"
                  style={{ lineHeight: 21 }}
                >
                  {effectiveRefundStatusState === 'pending'
                    ? t('subscription.purchaseHelp.iosPendingNoteBody')
                    : effectiveRefundStatusState === 'existing_request'
                      ? t('subscription.purchaseHelp.iosExistingRequestNoteBody')
                      : effectiveRefundStatusState === 'approved'
                      ? t('subscription.purchaseHelp.iosApprovedNoteBody')
                      : effectiveRefundStatusState === 'denied'
                        ? t('subscription.purchaseHelp.iosDeniedNoteBody')
                      : t('subscription.purchaseHelp.iosSubmittedNoteBody')}
                </Text>
              </View>

              <View className="mt-10">
                <GradientButton
                  onPress={() => router.replace('/(tabs)/settings')}
                  fullWidth
                  icon={<CheckCircle2 size={18} color="#ffffff" />}
                >
                  {effectiveRefundStatusState === 'approved'
                    ? t('subscription.purchaseHelp.iosApprovedDoneCta')
                    : effectiveRefundStatusState === 'denied'
                      ? t('subscription.purchaseHelp.iosDeniedDoneCta')
                    : t('subscription.purchaseHelp.iosSubmittedDoneCta')}
                </GradientButton>

                <TouchableOpacity
                  onPress={() => openBillingSupport('ios_refund_submitted_support')}
                  activeOpacity={0.82}
                  className="mt-4 py-4 flex-row items-center justify-between"
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.border.primary,
                  }}
                >
                  <View className="flex-1 pr-4">
                    <Text className="text-sm font-sans-semibold text-content-primary mb-1">
                      {t('subscription.purchaseHelp.contactSupportCta')}
                    </Text>
                    <Text className="text-xs text-content-secondary" style={{ lineHeight: 19 }}>
                      {effectiveRefundStatusState === 'pending'
                        ? t('subscription.purchaseHelp.iosPendingSupportBody')
                        : effectiveRefundStatusState === 'existing_request'
                          ? t('subscription.purchaseHelp.iosExistingRequestSupportBody')
                          : effectiveRefundStatusState === 'approved'
                          ? t('subscription.purchaseHelp.iosApprovedSupportBody')
                          : effectiveRefundStatusState === 'denied'
                            ? t('subscription.purchaseHelp.iosDeniedSupportBody')
                          : t('subscription.purchaseHelp.iosSubmittedSupportBody')}
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <MessageCircle size={16} color={theme.colors.brand.primary} />
                    <ChevronRight
                      size={18}
                      color={theme.colors.text.tertiary}
                      style={{ marginLeft: 10 }}
                    />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
          <View className="pt-4 pb-2">
            <Text
              className="text-3xl font-sans-semibold pr-6"
              style={{ color: theme.colors.brand.primary }}
            >
              {isRefunded
                ? t('subscription.purchaseHelp.iosRefundedTitle')
                : t('subscription.purchaseHelp.iosTitle')}
            </Text>
            <Text
              className="text-base text-content-secondary mt-3 pr-4"
              style={{ lineHeight: 24 }}
            >
              {isRefunded
                ? t('subscription.purchaseHelp.iosRefundedBody')
                : canStartRefundRequest
                  ? t('subscription.purchaseHelp.iosBody')
                  : t('subscription.purchaseHelp.iosUnavailableBody')}
            </Text>

            <View
              className="mt-7 pl-4 pr-1 py-1"
              style={{
                borderLeftWidth: 2,
                borderLeftColor: 'rgba(245, 158, 11, 0.35)',
              }}
            >
              <View className="flex-row items-start">
                <ShieldCheck
                  size={17}
                  color={theme.colors.brand.primary}
                  style={{ marginTop: 2 }}
                />
                <View className="flex-1 ml-3">
                  <Text className="text-sm font-sans-semibold text-content-primary mb-1">
                    {isRefunded
                      ? t('subscription.purchaseHelp.iosRefundedNoteTitle')
                      : canStartRefundRequest
                        ? t('subscription.purchaseHelp.iosNoteTitle')
                        : t('subscription.purchaseHelp.iosUnavailableNoteTitle')}
                  </Text>
                  <Text
                    className="text-sm text-content-secondary"
                    style={{ lineHeight: 21 }}
                  >
                    {isRefunded
                      ? t('subscription.purchaseHelp.iosRefundedNoteBody')
                      : canStartRefundRequest
                        ? t('subscription.purchaseHelp.iosNoteBody')
                        : t('subscription.purchaseHelp.iosUnavailableNoteBody')}
                  </Text>
                </View>
              </View>
            </View>

            <View className="mt-9">
              {isRefunded ? (
                <GradientButton
                  onPress={handleRepurchase}
                  disabled={isBusy}
                  fullWidth
                  icon={<Receipt size={18} color="#ffffff" />}
                >
                  {t('subscription.purchaseHelp.iosRepurchaseCta')}
                </GradientButton>
              ) : canStartRefundRequest ? (
                <GradientButton
                  onPress={handleRequestRefund}
                  disabled={!isLifetime || isBusy}
                  loading={isRequestingRefund}
                  fullWidth
                  icon={!isRequestingRefund ? <Receipt size={18} color="#ffffff" /> : undefined}
                >
                  {t('subscription.purchaseHelp.iosRefundCta')}
                </GradientButton>
              ) : null}

              <TouchableOpacity
                onPress={() =>
                  openBillingSupport(
                    isRefunded
                      ? 'ios_refunded_purchase_help'
                      : canStartRefundRequest
                        ? 'ios_refund_request_support'
                        : 'ios_refund_unavailable_support',
                  )
                }
                disabled={isBusy}
                activeOpacity={0.82}
                className={`${isRefunded || canStartRefundRequest ? 'mt-4' : 'mt-2'} py-4 flex-row items-center justify-between`}
                style={{
                  borderTopWidth: 1,
                  borderTopColor: theme.colors.border.primary,
                  opacity: isBusy ? 0.6 : 1,
                }}
              >
                <View className="flex-1 pr-4">
                  <Text className="text-sm font-sans-semibold text-content-primary mb-1">
                    {t('subscription.purchaseHelp.contactSupportCta')}
                  </Text>
                  <Text className="text-xs text-content-secondary" style={{ lineHeight: 19 }}>
                    {isRefunded
                      ? t('subscription.purchaseHelp.iosRefundedSupportBody')
                      : canStartRefundRequest
                        ? t('subscription.purchaseHelp.iosSupportBody')
                        : t('subscription.purchaseHelp.iosUnavailableSupportBody')}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <MessageCircle size={16} color={theme.colors.brand.primary} />
                  <ChevronRight
                    size={18}
                    color={theme.colors.text.tertiary}
                    style={{ marginLeft: 10 }}
                  />
                </View>
              </TouchableOpacity>
            </View>
          </View>
          )}
        </ScrollView>
      </View>
    )
  }

  return (
    <View
      className="flex-1"
      style={{ paddingTop: insets.top, backgroundColor: theme.colors.background }}
    >
      <View className="flex-row items-center px-5 pt-4 pb-2">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={24} color={theme.colors.brand.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        <View className="pt-4 pb-2">
          <Text
            className="text-3xl font-sans-semibold pr-6"
            style={{ color: theme.colors.brand.primary }}
          >
            {isRefunded
              ? t('subscription.purchaseHelp.androidRefundedTitle')
              : canRequestAndroidRefund
                ? t('subscription.purchaseHelp.androidTitle')
                : t('subscription.purchaseHelp.androidUnavailableTitle')}
          </Text>
          <Text
            className="text-base text-content-secondary mt-3 pr-4"
            style={{ lineHeight: 24 }}
          >
            {isRefunded
              ? t('subscription.purchaseHelp.androidRefundedBody')
              : canRequestAndroidRefund
                ? t('subscription.purchaseHelp.androidBody')
                : t('subscription.purchaseHelp.androidUnavailableBody')}
          </Text>

          <View
            className="mt-7 pl-4 pr-1 py-1"
            style={{
              borderLeftWidth: 2,
              borderLeftColor: 'rgba(245, 158, 11, 0.35)',
            }}
          >
            <View className="flex-row items-start">
              <ShieldCheck
                size={17}
                color={theme.colors.brand.primary}
                style={{ marginTop: 2 }}
              />
              <View className="flex-1 ml-3">
                <Text className="text-sm font-sans-semibold text-content-primary mb-1">
                  {isRefunded
                    ? t('subscription.purchaseHelp.androidRefundedNoteTitle')
                    : canRequestAndroidRefund
                      ? t('subscription.purchaseHelp.androidNoteTitle')
                      : t('subscription.purchaseHelp.androidUnavailableNoteTitle')}
                </Text>
                <Text
                  className="text-sm text-content-secondary"
                  style={{ lineHeight: 21 }}
                >
                  {isRefunded
                    ? t('subscription.purchaseHelp.androidRefundedNoteBody')
                    : canRequestAndroidRefund
                      ? t('subscription.purchaseHelp.androidNoteBody')
                      : t('subscription.purchaseHelp.androidUnavailableNoteBody')}
                </Text>
              </View>
            </View>
          </View>

          <View className="mt-9">
            {isRefunded ? (
              <GradientButton
                onPress={handleRepurchase}
                disabled={isBusy}
                fullWidth
                icon={<Receipt size={18} color="#ffffff" />}
              >
                {t('subscription.purchaseHelp.androidRepurchaseCta')}
              </GradientButton>
            ) : canRequestAndroidRefund ? (
              <GradientButton
                onPress={() => openExternalUrl(androidRefundUrl)}
                disabled={isBusy}
                fullWidth
                icon={<Smartphone size={18} color="#ffffff" />}
              >
                {t('subscription.purchaseHelp.androidRefundCta')}
              </GradientButton>
            ) : null}

            <TouchableOpacity
              onPress={() =>
                openBillingSupport(
                  isRefunded
                    ? 'android_refunded_purchase_help'
                    : canRequestAndroidRefund
                      ? 'android_refund_request_support'
                      : 'android_refund_unavailable_support',
                )
              }
              disabled={isBusy}
              activeOpacity={0.82}
              className={`${isRefunded || canRequestAndroidRefund ? 'mt-4' : 'mt-2'} py-4 flex-row items-center justify-between`}
              style={{
                borderTopWidth: 1,
                borderTopColor: theme.colors.border.primary,
                opacity: isBusy ? 0.6 : 1,
              }}
            >
              <View className="flex-1 pr-4">
                <Text className="text-sm font-sans-semibold text-content-primary mb-1">
                  {t('subscription.purchaseHelp.contactSupportCta')}
                </Text>
                <Text className="text-xs text-content-secondary" style={{ lineHeight: 19 }}>
                  {isRefunded
                    ? t('subscription.purchaseHelp.androidRefundedSupportBody')
                    : canRequestAndroidRefund
                      ? t('subscription.purchaseHelp.androidSupportBody')
                      : t('subscription.purchaseHelp.androidUnavailableSupportBody')}
                </Text>
              </View>
              <View className="flex-row items-center">
                <MessageCircle size={16} color={theme.colors.brand.primary} />
                <ChevronRight
                  size={18}
                  color={theme.colors.text.tertiary}
                  style={{ marginLeft: 10 }}
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
