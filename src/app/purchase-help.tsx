import React from 'react'
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
import {
  ArrowLeft,
  CircleHelp,
  BadgeHelp,
  RotateCcw,
  MessageCircle,
  Receipt,
  Smartphone,
} from 'lucide-react-native'

import { Text } from '~/components/ui'
import { GradientButton } from '~/components/ui/GradientButton'
import { useAppTheme } from '~/hooks/useAppTheme'
import { useScreenTracking } from '~/hooks/useScreenTracking'
import { useSubscription } from '~/hooks/useSubscription'
import { useTranslation } from '~/hooks/useTranslation'

type PurchaseHelpSource = 'locked' | 'settings' | 'paywall'

export default function PurchaseHelpScreen() {
  useScreenTracking('purchase_help')
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const theme = useAppTheme()
  const subscription = useSubscription()
  const { t } = useTranslation()
  const { source } = useLocalSearchParams<{ source?: PurchaseHelpSource }>()

  const platformAction =
    Platform.OS === 'ios'
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

          {(
            t('subscription.purchaseHelp.helpTopics') as unknown as readonly string[]
          ).map((topic) => (
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
