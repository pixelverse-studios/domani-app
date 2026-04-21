import React, { useState } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  StyleSheet,
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
  BadgeHelp,
  Smartphone,
  RotateCcw,
  CircleHelp,
} from 'lucide-react-native'

import { Text } from '~/components/ui'
import { GradientButton } from '~/components/ui/GradientButton'
import { useAppTheme } from '~/hooks/useAppTheme'
import { useScreenTracking } from '~/hooks/useScreenTracking'
import { useSubscription } from '~/hooks/useSubscription'
import { useTranslation } from '~/hooks/useTranslation'
import { beginRefundRequestForActiveEntitlement } from '~/lib/revenuecat'

type PurchaseHelpSource = 'locked' | 'settings' | 'paywall'

export default function PurchaseHelpScreen() {
  useScreenTracking('purchase_help')
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const theme = useAppTheme()
  const subscription = useSubscription()
  const { catalog, t } = useTranslation()
  const { source } = useLocalSearchParams<{ source?: PurchaseHelpSource }>()
  const [isRequestingRefund, setIsRequestingRefund] = useState(false)
  const helpTopics = catalog.subscription.purchaseHelp.helpTopics
  const isIos = Platform.OS === 'ios'
  const isRefunded = subscription.status === 'refunded'
  const isLifetime = subscription.status === 'lifetime'
  const isBusy = subscription.isRestoring || isRequestingRefund

  const platformAction =
    isIos
      ? {
          title: t('subscription.purchaseHelp.iosActionTitle'),
          body: t('subscription.purchaseHelp.iosActionBody'),
          cta: t('subscription.purchaseHelp.iosActionCta'),
          context: 'ios_refund_request',
        }
      : {
          title: t('subscription.purchaseHelp.androidActionTitle'),
          body: t('subscription.purchaseHelp.androidActionBody'),
          cta: t('subscription.purchaseHelp.androidActionCta'),
          context: 'android_billing_help',
        }

  const openBillingSupport = (context: string) => {
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
        Alert.alert(
          t('subscription.purchaseHelp.iosRefundSuccessTitle'),
          t('subscription.purchaseHelp.iosRefundSuccessBody'),
        )
        return
      }

      if (status === REFUND_REQUEST_STATUS.USER_CANCELLED) {
        return
      }

      Alert.alert(
        t('subscription.purchaseHelp.iosRefundErrorTitle'),
        t('subscription.purchaseHelp.iosRefundErrorBody'),
      )
    } catch {
      Alert.alert(
        t('subscription.purchaseHelp.iosRefundErrorTitle'),
        t('subscription.purchaseHelp.iosRefundErrorBody'),
      )
    } finally {
      setIsRequestingRefund(false)
    }
  }

  const handleRepurchase = () => {
    router.push('/(tabs)/settings?openPaywall=1')
  }

  const handleRestore = async () => {
    try {
      const result = await subscription.restore()
      if (!result) {
        Alert.alert(
          t('subscription.purchaseHelp.restoreNotFoundTitle'),
          t('subscription.purchaseHelp.restoreNotFoundBody'),
        )
      }
    } catch {
      Alert.alert(
        t('subscription.purchaseHelp.restoreErrorTitle'),
        t('subscription.purchaseHelp.restoreErrorBody'),
      )
    }
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
                : t('subscription.purchaseHelp.iosBody')}
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
                      : t('subscription.purchaseHelp.iosNoteTitle')}
                  </Text>
                  <Text
                    className="text-sm text-content-secondary"
                    style={{ lineHeight: 21 }}
                  >
                    {isRefunded
                      ? t('subscription.purchaseHelp.iosRefundedNoteBody')
                      : t('subscription.purchaseHelp.iosNoteBody')}
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
              ) : (
                <GradientButton
                  onPress={handleRequestRefund}
                  disabled={!isLifetime || isBusy}
                  loading={isRequestingRefund}
                  fullWidth
                  icon={!isRequestingRefund ? <Receipt size={18} color="#ffffff" /> : undefined}
                >
                  {t('subscription.purchaseHelp.iosRefundCta')}
                </GradientButton>
              )}

              <TouchableOpacity
                onPress={() =>
                  openBillingSupport(
                    isRefunded ? 'ios_refunded_purchase_help' : 'ios_refund_request_support',
                  )
                }
                disabled={isBusy}
                activeOpacity={0.82}
                className="mt-4 py-4 flex-row items-center justify-between"
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
                      : t('subscription.purchaseHelp.iosSupportBody')}
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
        <View
          className="rounded-3xl p-6 mb-5"
          style={{
            backgroundColor: theme.colors.card,
            borderWidth: 1,
            borderColor: theme.colors.border.primary,
          }}
        >
          <View
            style={[
              styles.heroIcon,
              {
                backgroundColor: `${theme.colors.brand.primary}14`,
              },
            ]}
          >
            <BadgeHelp size={28} color={theme.colors.brand.primary} />
          </View>

          <Text className="text-3xl font-sans-semibold text-content-primary mt-5">
            {t('subscription.purchaseHelp.title')}
          </Text>
          <Text
            className="text-base text-content-secondary mt-3"
            style={{ lineHeight: 23 }}
          >
            {t('subscription.purchaseHelp.subtitle')}
          </Text>

          <View
            className="rounded-2xl px-4 py-3 mt-5"
            style={{ backgroundColor: `${theme.colors.brand.primary}10` }}
          >
            <View className="flex-row items-start">
              <Smartphone
                size={16}
                color={theme.colors.brand.primary}
                style={{ marginTop: 2 }}
              />
              <Text
                className="text-sm text-content-secondary ml-2"
                style={{ flex: 1, lineHeight: 20 }}
              >
                {t('subscription.purchaseHelp.platformNote')}
              </Text>
            </View>
          </View>
        </View>

        <View
          className="rounded-3xl p-5 mb-4"
          style={{
            backgroundColor: theme.colors.card,
            borderWidth: 1,
            borderColor: theme.colors.border.primary,
          }}
        >
          <View className="flex-row items-center mb-3">
            <Receipt size={18} color={theme.colors.brand.primary} />
            <Text className="text-lg font-sans-semibold text-content-primary ml-2">
              {platformAction.title}
            </Text>
          </View>
          <Text className="text-sm text-content-secondary" style={{ lineHeight: 21 }}>
            {platformAction.body}
          </Text>
          <GradientButton
            onPress={() => openBillingSupport(platformAction.context)}
            disabled={subscription.isRestoring}
            fullWidth
            style={{ marginTop: 16 }}
          >
            {platformAction.cta}
          </GradientButton>
        </View>

        <View
          className="rounded-3xl p-5 mb-4"
          style={{
            backgroundColor: theme.colors.card,
            borderWidth: 1,
            borderColor: theme.colors.border.primary,
          }}
        >
          <View className="flex-row items-center justify-between">
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View className="flex-row items-center mb-2">
                <RotateCcw size={18} color={theme.colors.brand.primary} />
                <Text className="text-lg font-sans-semibold text-content-primary ml-2">
                  {t('subscription.purchaseHelp.restoreTitle')}
                </Text>
              </View>
              <Text className="text-sm text-content-secondary" style={{ lineHeight: 21 }}>
                {t('subscription.purchaseHelp.restoreBody')}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleRestore}
            disabled={subscription.isRestoring}
            activeOpacity={0.8}
            className="py-3 rounded-xl flex-row items-center justify-center mt-4"
            style={{
              backgroundColor: theme.colors.interactive.hover,
              borderWidth: 1,
              borderColor: theme.colors.border.primary,
              opacity: subscription.isRestoring ? 0.6 : 1,
            }}
          >
            {subscription.isRestoring ? (
              <ActivityIndicator size="small" color={theme.colors.text.secondary} />
            ) : (
              <>
                <RotateCcw size={16} color={theme.colors.text.secondary} />
                <Text
                  className="text-sm font-sans-semibold ml-2"
                  style={{ color: theme.colors.text.secondary }}
                >
                  {t('subscription.purchaseHelp.restoreCta')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View
          className="rounded-3xl p-5 mb-4"
          style={{
            backgroundColor: theme.colors.card,
            borderWidth: 1,
            borderColor: theme.colors.border.primary,
          }}
        >
          <View className="flex-row items-center mb-3">
            <CircleHelp size={18} color={theme.colors.brand.primary} />
            <Text className="text-lg font-sans-semibold text-content-primary ml-2">
              {t('subscription.purchaseHelp.helpWithTitle')}
            </Text>
          </View>

          {helpTopics.map((topic) => (
            <View key={topic} className="flex-row items-start mb-2.5">
              <View
                style={[
                  styles.topicDot,
                  {
                    backgroundColor: theme.colors.brand.primary,
                  },
                ]}
              />
              <Text
                className="text-sm text-content-secondary ml-3"
                style={{ flex: 1, lineHeight: 20 }}
              >
                {topic}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          onPress={() => openBillingSupport('purchase_help_general')}
          activeOpacity={0.8}
          className="flex-row items-center justify-center py-4 rounded-2xl mb-8"
          style={{
            borderWidth: 1,
            borderColor: theme.colors.brand.primary,
            backgroundColor: theme.colors.interactive.activeShadow,
          }}
        >
          <MessageCircle size={18} color={theme.colors.brand.primary} />
          <Text
            className="font-sans-semibold ml-2"
            style={{ color: theme.colors.brand.primary }}
          >
            {t('subscription.purchaseHelp.contactSupportCta')}
          </Text>
        </TouchableOpacity>
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
  topicDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    marginTop: 7,
  },
})
